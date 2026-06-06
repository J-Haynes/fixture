import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { fixtures, teams, seasons, leagues, externalIds, syncLog } from '@/db/schema';
import { fetchSeasonEvents, type TsdbEvent } from './thesportsdb';
import type { FixtureStatus } from '@/lib/types';

const PROVIDER = 'thesportsdb';

const LEAGUES_TO_SYNC = [
  { apiId: '4551', season: '2026', slug: 'super-rugby-pacific' },
  { apiId: '4416', season: '2026', slug: 'nrl' },
] as const;

// ── Status mapping ────────────────────────────────────────────────────────────

function mapStatus(event: TsdbEvent): FixtureStatus {
  if (event.strPostponed === 'yes') return 'postponed';
  if (event.strStatus === 'FT')     return 'finished';
  // TheSportsDB occasionally returns "NS" for completed games — trust scores
  // over the status field when both are present.
  if (event.intHomeScore != null && event.intAwayScore != null &&
      event.intHomeScore !== '' && event.intAwayScore !== '') return 'finished';
  // Kickoff has passed but TheSportsDB hasn't marked FT yet — game is in progress.
  if (new Date(event.strTimestamp + 'Z') < new Date()) return 'live';
  return 'scheduled';
}

// ── Team name normalisation ───────────────────────────────────────────────────
// TheSportsDB appends league names as suffixes (e.g. "Blues Super Rugby",
// "Brisbane Broncos NRL"). Strip those, then substring-match against our teams
// to handle short names ("Brumbies" ↔ "ACT Brumbies", "Reds" ↔ "Queensland Reds").

function normaliseName(name: string): string {
  return name
    .replace(/\s+(Super Rugby|NRL)\s*$/i, '')
    .replace(/\./g, '')   // "St." → "St"
    .trim()
    .toLowerCase();
}

function findTeamByName(
  tsdbName: string,
  allTeams: { id: number; name: string }[],
): number | undefined {
  const needle = normaliseName(tsdbName);

  // 1. Exact / substring match
  const bySubstring = allTeams.find(t => {
    const hay = t.name.toLowerCase();
    return hay === needle || hay.includes(needle) || needle.includes(hay);
  });
  if (bySubstring) return bySubstring.id;

  // 2. Nickname (last word) fallback — handles "Canterbury Bankstown Bulldogs" ↔
  //    "Canterbury Bulldogs" and TheSportsDB typos like "Illawara" ↔ "Illawarra".
  const nickname = needle.split(/\s+/).at(-1) ?? '';
  if (nickname.length > 3) {
    return allTeams.find(t => t.name.toLowerCase().endsWith(nickname))?.id;
  }

  return undefined;
}

// ── Per-league sync ───────────────────────────────────────────────────────────

async function syncLeague(
  apiId: string,
  seasonYear: string,
  leagueSlug: string,
): Promise<number> {
  // 1. Resolve league + season in our DB
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

  // 2. Fetch events from TheSportsDB
  const events = await fetchSeasonEvents(apiId, seasonYear);
  console.log(`[sync:${leagueSlug}] ${events.length} events from API`);

  // 3. Load teams + existing external_id mappings
  const allTeams = await db.select({ id: teams.id, name: teams.name }).from(teams);

  const teamMappings = await db
    .select({ externalId: externalIds.externalId, entityId: externalIds.entityId })
    .from(externalIds)
    .where(and(eq(externalIds.entityType, 'team'), eq(externalIds.provider, PROVIDER)));

  const fixtureMappings = await db
    .select({ externalId: externalIds.externalId, entityId: externalIds.entityId })
    .from(externalIds)
    .where(and(eq(externalIds.entityType, 'fixture'), eq(externalIds.provider, PROVIDER)));

  const teamExtMap    = new Map(teamMappings.map(m => [m.externalId, m.entityId]));
  const fixtureExtMap = new Map(fixtureMappings.map(m => [m.externalId, m.entityId]));

  // 4. Process each event
  let upserted = 0;

  for (const event of events) {
    // Resolve home team
    let homeTeamId = teamExtMap.get(event.idHomeTeam);
    if (homeTeamId == null) {
      homeTeamId = findTeamByName(event.strHomeTeam, allTeams);
      if (homeTeamId != null) {
        await db.insert(externalIds).values({
          entityType: 'team', entityId: homeTeamId,
          provider: PROVIDER, externalId: event.idHomeTeam,
        }).onConflictDoNothing();
        teamExtMap.set(event.idHomeTeam, homeTeamId);
      }
    }

    // Resolve away team
    let awayTeamId = teamExtMap.get(event.idAwayTeam);
    if (awayTeamId == null) {
      awayTeamId = findTeamByName(event.strAwayTeam, allTeams);
      if (awayTeamId != null) {
        await db.insert(externalIds).values({
          entityType: 'team', entityId: awayTeamId,
          provider: PROVIDER, externalId: event.idAwayTeam,
        }).onConflictDoNothing();
        teamExtMap.set(event.idAwayTeam, awayTeamId);
      }
    }

    const status    = mapStatus(event);
    const homeScore = event.intHomeScore != null && event.intHomeScore !== ''
      ? parseInt(event.intHomeScore, 10) : null;
    const awayScore = event.intAwayScore != null && event.intAwayScore !== ''
      ? parseInt(event.intAwayScore, 10) : null;
    const round     = event.intRound ? `Round ${event.intRound}` : null;

    let existingId = fixtureExtMap.get(event.idEvent);

    if (existingId != null) {
      const updated = await db
        .update(fixtures)
        .set({
          status,
          homeScore,
          awayScore,
          // Backfill team IDs that were null on the first sync pass
          ...(homeTeamId != null && { homeTeamId }),
          ...(awayTeamId != null && { awayTeamId }),
        })
        .where(eq(fixtures.id, existingId))
        .returning({ id: fixtures.id });

      if (updated.length === 0) {
        // Stale mapping — fixture was deleted, clean up and re-insert
        await db.delete(externalIds).where(
          and(
            eq(externalIds.entityType, 'fixture'),
            eq(externalIds.provider, PROVIDER),
            eq(externalIds.externalId, event.idEvent),
          )
        );
        existingId = undefined;
      }
    }

    if (existingId == null) {
      const [inserted] = await db
        .insert(fixtures)
        .values({
          seasonId:    season.id,
          homeTeamId:  homeTeamId ?? null,
          awayTeamId:  awayTeamId ?? null,
          scheduledAt: new Date(event.strTimestamp + 'Z'), // strTimestamp is UTC, no Z suffix
          status,
          round,
          homeScore,
          awayScore,
        })
        .returning({ id: fixtures.id });

      await db.insert(externalIds).values({
        entityType: 'fixture', entityId: inserted.id,
        provider: PROVIDER, externalId: event.idEvent,
      }).onConflictDoNothing();

      fixtureExtMap.set(event.idEvent, inserted.id);
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
    for (const { apiId, season, slug } of LEAGUES_TO_SYNC) {
      const count = await syncLeague(apiId, season, slug);
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
