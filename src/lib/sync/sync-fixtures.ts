import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { fixtures, teams, seasons, leagues, externalIds, syncLog } from '@/db/schema';
import { fetchSeasonEvents, fetchEventResults, type TsdbEvent } from './thesportsdb';
import type { FixtureStatus } from '@/lib/types';

const PROVIDER = 'thesportsdb';

interface LeagueConfig {
  apiId:                string;
  season:               string;
  slug:                 string;
  maxGameDurationHours: number;
  /** Call eventresults.php for finished events to populate sportMeta.podium */
  fetchResults?:        boolean;
  /** Use strEvent as the round/title label instead of "Round N" */
  eventNameAsLabel?:    boolean;
  /** Drop events that don't pass this filter (e.g. practice sessions) */
  sessionFilter?:       (event: TsdbEvent) => boolean;
}

const LEAGUES_TO_SYNC: LeagueConfig[] = [
  { apiId: '4551', season: '2026', slug: 'super-rugby-pacific', maxGameDurationHours: 3 },
  { apiId: '4416', season: '2026', slug: 'nrl',                 maxGameDurationHours: 3 },
  { apiId: '4429', season: '2026', slug: 'fifa-world-cup',      maxGameDurationHours: 3 },
  {
    apiId: '4370', season: '2026', slug: 'formula-1',
    maxGameDurationHours: 4,
    fetchResults:     true,
    eventNameAsLabel: true,
    // Skip practice sessions and testing days; keep races, sprints, qualifying
    sessionFilter: e => !/(Practice|Testing|Sprint Qualifying)/i.test(e.strEvent),
  },
  {
    apiId: '4489', season: '2026', slug: 'v8-supercars',
    maxGameDurationHours: 2,
    fetchResults:     true,
    eventNameAsLabel: true,
  },
];

// ── Status mapping ────────────────────────────────────────────────────────────

const LIVE_STATUSES = new Set(['1H', 'HT', '2H', 'ET', 'PEN', 'Break', 'Live', 'Q1', 'Q2', 'Q3', 'Q4']);

function mapStatus(event: TsdbEvent, maxGameDurationHours: number): FixtureStatus {
  if (event.strPostponed === 'yes')        return 'postponed';
  if (event.strStatus === 'FT')            return 'finished';
  if (LIVE_STATUSES.has(event.strStatus))  return 'live';

  const kickoff = new Date(event.strTimestamp + 'Z');
  const now     = new Date();

  if (kickoff >= now) return 'scheduled';

  const elapsed = now.getTime() - kickoff.getTime();
  if (elapsed > maxGameDurationHours * 60 * 60 * 1000) {
    return 'finished';
  }

  return 'live';
}

// ── Team name normalisation ───────────────────────────────────────────────────

function normaliseName(name: string): string {
  return name
    .replace(/\s+(Super Rugby|NRL)\s*$/i, '')
    .replace(/\./g, '')
    .trim()
    .toLowerCase();
}

function findTeamByName(
  tsdbName: string,
  allTeams: { id: number; name: string }[],
): number | undefined {
  const needle = normaliseName(tsdbName);

  const exact = allTeams.find(t => t.name.toLowerCase() === needle);
  if (exact) return exact.id;

  if (needle.length > 3) {
    const bySubstring = allTeams.find(t => {
      const hay = t.name.toLowerCase();
      return hay.includes(needle) || needle.includes(hay);
    });
    if (bySubstring) return bySubstring.id;
  }

  const nickname = needle.split(/\s+/).at(-1) ?? '';
  if (nickname.length > 3) {
    return allTeams.find(t => t.name.toLowerCase().endsWith(nickname))?.id;
  }

  return undefined;
}

// ── Per-league sync ───────────────────────────────────────────────────────────

type FixtureEntry = { id: number; sportMeta: Record<string, unknown> | null };

async function syncLeague(config: LeagueConfig): Promise<number> {
  const {
    apiId, season: seasonYear, slug: leagueSlug,
    maxGameDurationHours, fetchResults, eventNameAsLabel, sessionFilter,
  } = config;

  // 1. Resolve league + season
  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.slug, leagueSlug))
    .limit(1);

  if (!league) {
    console.warn(`[sync:${leagueSlug}] League not found — run db:seed first`);
    return 0;
  }

  const [season] = await db
    .select()
    .from(seasons)
    .where(and(eq(seasons.leagueId, league.id), eq(seasons.year, seasonYear)))
    .limit(1);

  if (!season) {
    console.warn(`[sync:${leagueSlug}] Season ${seasonYear} not found — run db:seed first`);
    return 0;
  }

  // 2. Fetch + filter events
  let events = await fetchSeasonEvents(apiId, seasonYear);
  if (sessionFilter) events = events.filter(sessionFilter);
  console.log(`[sync:${leagueSlug}] ${events.length} events from API`);

  // 3. Load teams + external ID mappings
  const allTeams = await db.select({ id: teams.id, name: teams.name }).from(teams);

  const teamMappings = await db
    .select({ externalId: externalIds.externalId, entityId: externalIds.entityId })
    .from(externalIds)
    .where(and(eq(externalIds.entityType, 'team'), eq(externalIds.provider, PROVIDER)));

  // Join fixtures so we can check whether sportMeta.podium already exists
  const fixtureMappingRows = await db
    .select({
      externalId: externalIds.externalId,
      entityId:   externalIds.entityId,
      sportMeta:  fixtures.sportMeta,
    })
    .from(externalIds)
    .leftJoin(fixtures, eq(fixtures.id, externalIds.entityId))
    .where(and(eq(externalIds.entityType, 'fixture'), eq(externalIds.provider, PROVIDER)));

  const teamExtMap    = new Map(teamMappings.map(m => [m.externalId, m.entityId]));
  const fixtureExtMap = new Map<string, FixtureEntry>(
    fixtureMappingRows.map(m => [
      m.externalId,
      { id: m.entityId, sportMeta: m.sportMeta as Record<string, unknown> | null },
    ])
  );

  // 4. Process each event
  let upserted = 0;

  for (const event of events) {
    // Resolve teams (null for motorsport events)
    let homeTeamId = event.idHomeTeam ? teamExtMap.get(event.idHomeTeam) : undefined;
    if (homeTeamId == null && event.strHomeTeam) {
      homeTeamId = findTeamByName(event.strHomeTeam, allTeams);
      if (homeTeamId != null && event.idHomeTeam) {
        await db.insert(externalIds).values({
          entityType: 'team', entityId: homeTeamId,
          provider: PROVIDER, externalId: event.idHomeTeam,
        }).onConflictDoNothing();
        teamExtMap.set(event.idHomeTeam, homeTeamId);
      }
    }

    let awayTeamId = event.idAwayTeam ? teamExtMap.get(event.idAwayTeam) : undefined;
    if (awayTeamId == null && event.strAwayTeam) {
      awayTeamId = findTeamByName(event.strAwayTeam, allTeams);
      if (awayTeamId != null && event.idAwayTeam) {
        await db.insert(externalIds).values({
          entityType: 'team', entityId: awayTeamId,
          provider: PROVIDER, externalId: event.idAwayTeam,
        }).onConflictDoNothing();
        teamExtMap.set(event.idAwayTeam, awayTeamId);
      }
    }

    const status    = mapStatus(event, maxGameDurationHours);
    const homeScore = event.intHomeScore != null && event.intHomeScore !== ''
      ? parseInt(event.intHomeScore, 10) : null;
    const awayScore = event.intAwayScore != null && event.intAwayScore !== ''
      ? parseInt(event.intAwayScore, 10) : null;

    // For motorsport: round = session type ("Qualifying", "Race", "Sprint")
    //                 strEvent = the event name ("Spanish Grand Prix") → goes in sportMeta.eventName
    // For team sports: round = named round or "Round N"
    const round = eventNameAsLabel
      ? (event.strRound ?? null)
      : (event.strRound || (event.intRound ? `Round ${event.intRound}` : null));

    const existing  = fixtureExtMap.get(event.idEvent);
    let   fixtureId = existing?.id;
    // Track sportMeta locally so podium merge is always accurate
    let   currentSportMeta: Record<string, unknown> | null = existing?.sportMeta ?? null;

    if (fixtureId != null) {
      // For motorsport, also persist the event name into sportMeta and update round
      const metaUpdate = eventNameAsLabel
        ? { ...(currentSportMeta ?? {}), eventName: event.strEvent }
        : undefined;

      const updated = await db
        .update(fixtures)
        .set({
          status, homeScore, awayScore,
          ...(homeTeamId != null && { homeTeamId }),
          ...(awayTeamId != null && { awayTeamId }),
          ...(metaUpdate != null && { round, sportMeta: metaUpdate }),
        })
        .where(eq(fixtures.id, fixtureId))
        .returning({ id: fixtures.id });

      if (updated.length === 0) {
        await db.delete(externalIds).where(
          and(
            eq(externalIds.entityType, 'fixture'),
            eq(externalIds.provider, PROVIDER),
            eq(externalIds.externalId, event.idEvent),
          )
        );
        fixtureId       = undefined;
        currentSportMeta = null;
      } else if (metaUpdate != null) {
        currentSportMeta = metaUpdate;
      }
    }

    if (fixtureId == null) {
      const initMeta = eventNameAsLabel ? { eventName: event.strEvent } : null;

      const [inserted] = await db
        .insert(fixtures)
        .values({
          seasonId:    season.id,
          homeTeamId:  homeTeamId ?? null,
          awayTeamId:  awayTeamId ?? null,
          scheduledAt: new Date(event.strTimestamp + 'Z'),
          status,
          round,
          homeScore,
          awayScore,
          ...(initMeta != null && { sportMeta: initMeta }),
        })
        .returning({ id: fixtures.id });

      fixtureId       = inserted.id;
      currentSportMeta = initMeta;

      await db.insert(externalIds).values({
        entityType: 'fixture', entityId: fixtureId,
        provider: PROVIDER, externalId: event.idEvent,
      }).onConflictDoNothing();
      fixtureExtMap.set(event.idEvent, { id: fixtureId, sportMeta: initMeta });
    }

    // Fetch podium for finished motorsport events — once only (skip if already stored)
    if (fetchResults && status === 'finished' && fixtureId != null) {
      const hasPodium = Array.isArray(currentSportMeta?.podium);
      if (!hasPodium) {
        try {
          const results = await fetchEventResults(event.idEvent);
          const podium  = results
            .sort((a, b) => parseInt(a.intPosition) - parseInt(b.intPosition))
            .slice(0, 3)
            .map(r => r.strPlayer);

          if (podium.length > 0) {
            const newMeta = { ...(currentSportMeta ?? {}), podium };
            await db.update(fixtures)
              .set({ sportMeta: newMeta })
              .where(eq(fixtures.id, fixtureId));
            fixtureExtMap.set(event.idEvent, { id: fixtureId, sportMeta: newMeta });
            currentSportMeta = newMeta;
          }
        } catch (err) {
          console.warn(`[sync:${leagueSlug}] Results fetch failed for ${event.idEvent}:`, err);
        }
      }
    }

    upserted++;
  }

  return upserted;
}

// ── Public entry point ────────────────────────────────────────────────────────

export async function syncFixtures(): Promise<{ upserted: number }> {
  const startedAt = Date.now();
  let totalUpserted = 0;

  try {
    for (const config of LEAGUES_TO_SYNC) {
      const count = await syncLeague(config);
      totalUpserted += count;
    }

    await db.insert(syncLog).values({
      provider: PROVIDER, entityType: 'fixtures',
      status: 'success', recordsUpserted: totalUpserted,
    });

    console.log(`[sync] OK — ${totalUpserted} fixtures processed in ${Date.now() - startedAt}ms`);
    return { upserted: totalUpserted };

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[sync] Error:', message);

    await db.insert(syncLog).values({
      provider: PROVIDER, entityType: 'fixtures',
      status: 'error', errorMessage: message,
    }).catch(() => {});

    throw err;
  }
}
