import { eq, and, lt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { fixtures, teams, seasons, leagues, externalIds, syncLog } from '@/db/schema';
import { fetchSeasonEvents, fetchEventResults, type TsdbEvent } from './thesportsdb';
import { nextSeasonYear, setCurrentSeason } from './seasons';
import type { FixtureStatus } from '@/lib/types';

const PROVIDER = 'thesportsdb';

interface LeagueConfig {
  apiId:                string;
  maxGameDurationHours: number;
  /** Call eventresults.php for finished events to populate sportMeta.podium */
  fetchResults?:        boolean;
  /** Use strEvent as the round/title label instead of "Round N" */
  eventNameAsLabel?:    boolean;
  /** Drop events that don't pass this filter (e.g. practice sessions) */
  sessionFilter?:       (event: TsdbEvent) => boolean;
}

// Provider config, keyed by league slug. Which season gets synced comes from the DB
// (seasons.is_current + leagues.is_active), so no code change is needed between seasons.
const LEAGUE_CONFIG: Record<string, LeagueConfig> = {
  'super-rugby-pacific': { apiId: '4551', maxGameDurationHours: 3 },
  'nrl':                 { apiId: '4416', maxGameDurationHours: 3 },
  'fifa-world-cup':      { apiId: '4429', maxGameDurationHours: 3 },
  'formula-1': {
    apiId: '4370',
    maxGameDurationHours: 4,
    fetchResults:     true,
    eventNameAsLabel: true,
    // Skip practice sessions and testing days; keep races, sprints, qualifying
    sessionFilter: e => !/(Practice|Testing|Sprint Qualifying)/i.test(e.strEvent),
  },
  'v8-supercars': {
    apiId: '4489',
    maxGameDurationHours: 2,
    fetchResults:     true,
    eventNameAsLabel: true,
  },
};

// ── Sync cadence ──────────────────────────────────────────────────────────────
// The cron fires every 2 minutes, but a league is only fetched from the provider
// when it's due. Quiet runs cost one DB query and no API calls.

const MINUTE = 60 * 1000;
const HOUR   = 60 * MINUTE;

const CADENCE = {
  live:      0,            // fixture in play, or kicking off within 15 min — every run
  matchday:  15 * MINUTE,  // fixture kicked off in the last 12h or kicks off within 3h
  inSeason:  6 * HOUR,     // fixtures still to play — picks up reschedules
  offSeason: 24 * HOUR,    // every fixture finished
};

/** Keep polling past maxGameDurationHours so late final scores still land */
const LIVE_GRACE_MS = 30 * MINUTE;
/** Cron runs aren't exactly on the minute; don't miss a slot by a few seconds */
const CADENCE_TOLERANCE_MS = MINUTE;

const PODIUM_RETRY_MS   = 30 * MINUTE;
const PODIUM_GIVE_UP_MS = 3 * 24 * HOUR;

const SYNC_LOG_RETENTION_MS = 30 * 24 * HOUR;

/** A season counts as over once its last fixture is this far in the past */
const SEASON_OVER_AFTER_MS = 7 * 24 * HOUR;

interface SeasonActivity {
  seasonId:            number;
  leagueId:            number;
  year:                string;
  lastSyncedAt:        Date | null;
  slug:                string;
  total:               number;
  open:                number;
  matchday:            number;
  latestOpenKickoffMs: number | null;
  lastKickoffMs:       number | null;
}

async function loadSeasonActivity(): Promise<SeasonActivity[]> {
  return db
    .select({
      seasonId:     seasons.id,
      leagueId:     seasons.leagueId,
      year:         seasons.year,
      lastSyncedAt: seasons.lastSyncedAt,
      slug:         leagues.slug,
      total: sql<number>`count(${fixtures.id})`.mapWith(Number),
      open:  sql<number>`count(${fixtures.id}) filter (
        where ${fixtures.status} in ('scheduled', 'live', 'postponed'))`.mapWith(Number),
      matchday: sql<number>`count(${fixtures.id}) filter (
        where ${fixtures.scheduledAt} between now() - interval '12 hours' and now() + interval '3 hours')`.mapWith(Number),
      // Most recent kickoff of a not-yet-finished fixture, including ones starting within 15 min
      latestOpenKickoffMs: sql<number | null>`extract(epoch from max(${fixtures.scheduledAt}) filter (
        where ${fixtures.status} in ('scheduled', 'live')
          and ${fixtures.scheduledAt} <= now() + interval '15 minutes')) * 1000`.mapWith(Number),
      lastKickoffMs: sql<number | null>`extract(epoch from max(${fixtures.scheduledAt})) * 1000`.mapWith(Number),
    })
    .from(seasons)
    .innerJoin(leagues, eq(seasons.leagueId, leagues.id))
    .leftJoin(fixtures, eq(fixtures.seasonId, seasons.id))
    .where(and(eq(seasons.isCurrent, true), eq(leagues.isActive, true)))
    .groupBy(seasons.id, leagues.id);
}

function syncInterval(activity: SeasonActivity, config: LeagueConfig, now: number): number {
  const liveWindowMs = config.maxGameDurationHours * HOUR + LIVE_GRACE_MS;
  if (activity.latestOpenKickoffMs != null && activity.latestOpenKickoffMs >= now - liveWindowMs) {
    return CADENCE.live;
  }
  if (activity.matchday > 0)                       return CADENCE.matchday;
  if (activity.open > 0 || activity.total === 0)   return CADENCE.inSeason;
  return CADENCE.offSeason;
}

function isDue(activity: SeasonActivity, config: LeagueConfig, now: number): boolean {
  if (!activity.lastSyncedAt) return true;
  const elapsed = now - activity.lastSyncedAt.getTime();
  return elapsed >= syncInterval(activity, config, now) - CADENCE_TOLERANCE_MS;
}

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

// ── Shared lookups (loaded once per run) ──────────────────────────────────────

interface SyncContext {
  allTeams:   { id: number; name: string }[];
  teamExtMap: Map<string, number>;
}

async function loadContext(): Promise<SyncContext> {
  const allTeams = await db.select({ id: teams.id, name: teams.name }).from(teams);

  const teamMappings = await db
    .select({ externalId: externalIds.externalId, entityId: externalIds.entityId })
    .from(externalIds)
    .where(and(eq(externalIds.entityType, 'team'), eq(externalIds.provider, PROVIDER)));

  return { allTeams, teamExtMap: new Map(teamMappings.map(m => [m.externalId, m.entityId])) };
}

async function resolveTeam(
  externalId: string | null,
  name:       string | null,
  ctx:        SyncContext,
): Promise<number | undefined> {
  const mapped = externalId ? ctx.teamExtMap.get(externalId) : undefined;
  if (mapped != null || !name) return mapped;

  const teamId = findTeamByName(name, ctx.allTeams);
  if (teamId != null && externalId) {
    await db.insert(externalIds).values({
      entityType: 'team', entityId: teamId,
      provider: PROVIDER, externalId,
    }).onConflictDoNothing();
    ctx.teamExtMap.set(externalId, teamId);
  }
  return teamId;
}

// ── Motorsport podium ─────────────────────────────────────────────────────────

type SportMeta = Record<string, unknown>;

/** Podiums are fetched once; empty results are retried every 30 min for 3 days, then given up on */
function podiumDue(meta: SportMeta | null, scheduledAt: Date, now: number): boolean {
  if (Array.isArray(meta?.podium))                         return false;
  if (now - scheduledAt.getTime() > PODIUM_GIVE_UP_MS)     return false;
  const checkedAt = typeof meta?.podiumCheckedAt === 'string' ? Date.parse(meta.podiumCheckedAt) : NaN;
  return Number.isNaN(checkedAt) || now - checkedAt >= PODIUM_RETRY_MS;
}

/** Returns true if a podium was stored (a user-visible change) */
async function syncPodium(
  eventId:    string,
  fixtureId:  number,
  meta:       SportMeta | null,
  leagueSlug: string,
): Promise<boolean> {
  let podium: string[] = [];
  try {
    const results = await fetchEventResults(eventId);
    podium = results
      .sort((a, b) => parseInt(a.intPosition) - parseInt(b.intPosition))
      .slice(0, 3)
      .map(r => r.strPlayer);
  } catch (err) {
    console.warn(`[sync:${leagueSlug}] Results fetch failed for ${eventId}:`, err);
  }

  const newMeta = podium.length > 0
    ? { ...(meta ?? {}), podium }
    : { ...(meta ?? {}), podiumCheckedAt: new Date().toISOString() };

  await db.update(fixtures).set({ sportMeta: newMeta }).where(eq(fixtures.id, fixtureId));
  return podium.length > 0;
}

// ── Per-league sync ───────────────────────────────────────────────────────────

async function syncLeague(
  season: SeasonActivity,
  config: LeagueConfig,
  ctx:    SyncContext,
): Promise<{ processed: number; changed: number }> {
  const { seasonId, year, slug: leagueSlug } = season;
  const { apiId, maxGameDurationHours, fetchResults, eventNameAsLabel, sessionFilter } = config;
  const now = Date.now();

  let events = await fetchSeasonEvents(apiId, year);
  if (sessionFilter) events = events.filter(sessionFilter);

  // Current DB state for this season, keyed by provider event ID, so unchanged rows can be skipped
  const existingRows = await db
    .select({
      externalId:  externalIds.externalId,
      id:          fixtures.id,
      status:      fixtures.status,
      homeScore:   fixtures.homeScore,
      awayScore:   fixtures.awayScore,
      scheduledAt: fixtures.scheduledAt,
      round:       fixtures.round,
      homeTeamId:  fixtures.homeTeamId,
      awayTeamId:  fixtures.awayTeamId,
      sportMeta:   fixtures.sportMeta,
    })
    .from(externalIds)
    .innerJoin(fixtures, eq(fixtures.id, externalIds.entityId))
    .where(and(
      eq(externalIds.entityType, 'fixture'),
      eq(externalIds.provider, PROVIDER),
      eq(fixtures.seasonId, seasonId),
    ));
  const existingByExtId = new Map(existingRows.map(r => [r.externalId, r]));

  let changed = 0;

  for (const event of events) {
    // Resolve teams (null for motorsport events)
    const homeTeamId = await resolveTeam(event.idHomeTeam, event.strHomeTeam, ctx);
    const awayTeamId = await resolveTeam(event.idAwayTeam, event.strAwayTeam, ctx);

    const status      = mapStatus(event, maxGameDurationHours);
    const scheduledAt = new Date(event.strTimestamp + 'Z');
    const homeScore   = event.intHomeScore != null && event.intHomeScore !== ''
      ? parseInt(event.intHomeScore, 10) : null;
    const awayScore   = event.intAwayScore != null && event.intAwayScore !== ''
      ? parseInt(event.intAwayScore, 10) : null;

    // For motorsport: round = session type ("Qualifying", "Race", "Sprint")
    //                 strEvent = the event name ("Spanish Grand Prix") → goes in sportMeta.eventName
    // For team sports: round = named round or "Round N"
    const round = eventNameAsLabel
      ? (event.strRound ?? null)
      : (event.strRound || (event.intRound ? `Round ${event.intRound}` : null));

    const existing = existingByExtId.get(event.idEvent);
    let fixtureId: number;
    let sportMeta: SportMeta | null;

    if (existing) {
      fixtureId = existing.id;
      sportMeta = existing.sportMeta ?? null;

      // Only write columns that actually changed — most runs touch no rows at all
      const patch: Partial<typeof fixtures.$inferInsert> = {};
      if (existing.status    !== status)    patch.status    = status;
      if (existing.homeScore !== homeScore) patch.homeScore = homeScore;
      if (existing.awayScore !== awayScore) patch.awayScore = awayScore;
      if (existing.scheduledAt.getTime() !== scheduledAt.getTime()) patch.scheduledAt = scheduledAt;
      if (homeTeamId != null && existing.homeTeamId !== homeTeamId) patch.homeTeamId = homeTeamId;
      if (awayTeamId != null && existing.awayTeamId !== awayTeamId) patch.awayTeamId = awayTeamId;
      // For motorsport, also keep the round and event name in sync
      if (eventNameAsLabel) {
        if (existing.round !== round) patch.round = round;
        if (sportMeta?.eventName !== event.strEvent) {
          sportMeta = { ...(sportMeta ?? {}), eventName: event.strEvent };
          patch.sportMeta = sportMeta;
        }
      }

      if (Object.keys(patch).length > 0) {
        await db.update(fixtures).set(patch).where(eq(fixtures.id, fixtureId));
        changed++;
      }
    } else {
      sportMeta = eventNameAsLabel ? { eventName: event.strEvent } : null;

      const [inserted] = await db
        .insert(fixtures)
        .values({
          seasonId,
          homeTeamId:  homeTeamId ?? null,
          awayTeamId:  awayTeamId ?? null,
          scheduledAt,
          status,
          round,
          homeScore,
          awayScore,
          ...(sportMeta != null && { sportMeta }),
        })
        .returning({ id: fixtures.id });
      fixtureId = inserted.id;

      // Re-points a stale mapping whose fixture row was deleted
      await db.insert(externalIds).values({
        entityType: 'fixture', entityId: fixtureId,
        provider: PROVIDER, externalId: event.idEvent,
      }).onConflictDoUpdate({
        target: [externalIds.provider, externalIds.entityType, externalIds.externalId],
        set:    { entityId: fixtureId },
      });
      changed++;
    }

    if (fetchResults && status === 'finished' && podiumDue(sportMeta, scheduledAt, now)) {
      if (await syncPodium(event.idEvent, fixtureId, sportMeta, leagueSlug)) changed++;
    }
  }

  return { processed: events.length, changed };
}

// ── Season rollover ───────────────────────────────────────────────────────────
// Once a season is over, each sync of it also asks the provider for the next one
// (one extra call, at the off-season cadence). When the next season has events,
// it becomes the current season and the following cron run imports it.

function seasonIsOver(season: SeasonActivity, now: number): boolean {
  return season.lastKickoffMs != null && season.lastKickoffMs < now - SEASON_OVER_AFTER_MS;
}

/** Returns the new season's year if the league was rolled over */
async function rollSeasonIfAvailable(season: SeasonActivity, config: LeagueConfig): Promise<string | null> {
  const next = nextSeasonYear(season.year);
  if (!next) return null;

  let events = await fetchSeasonEvents(config.apiId, next);
  if (config.sessionFilter) events = events.filter(config.sessionFilter);
  if (events.length === 0) return null;

  await setCurrentSeason(season.leagueId, next);
  return next;
}

// ── Public entry point ────────────────────────────────────────────────────────

export interface SyncResult {
  /** League slugs fetched from the provider this run */
  synced:    string[];
  /** Current seasons that weren't due */
  skipped:   number;
  /** Provider events examined */
  processed: number;
  /** Fixtures inserted or updated (drives cache revalidation) */
  changed:   number;
  /** Leagues moved to their next season this run, e.g. "nrl → 2027" */
  rolled:    string[];
  errors:    string[];
}

async function writeSyncLog(
  entry: Pick<typeof syncLog.$inferInsert, 'status' | 'recordsUpserted' | 'errorMessage'>,
  entityType = 'fixtures',
) {
  await db.insert(syncLog).values({ provider: PROVIDER, entityType, ...entry });
  await db.delete(syncLog).where(lt(syncLog.ranAt, new Date(Date.now() - SYNC_LOG_RETENTION_MS)));
}

/**
 * Syncs every current season that is due (see CADENCE). `force` syncs all of them.
 * One league failing doesn't stop the others; failures are returned in `errors`.
 */
export async function syncFixtures({ force = false } = {}): Promise<SyncResult> {
  const startedAt = Date.now();
  const result: SyncResult = { synced: [], skipped: 0, processed: 0, changed: 0, rolled: [], errors: [] };

  try {
    const activity = await loadSeasonActivity();
    const due = activity.filter(a => {
      const config = LEAGUE_CONFIG[a.slug];
      return config != null && (force || isDue(a, config, startedAt));
    });
    result.skipped = activity.length - due.length;

    if (due.length > 0) {
      const ctx = await loadContext();

      for (const season of due) {
        try {
          const { processed, changed } = await syncLeague(season, LEAGUE_CONFIG[season.slug], ctx);
          await db.update(seasons)
            .set({ lastSyncedAt: new Date() })
            .where(eq(seasons.id, season.seasonId));

          result.synced.push(season.slug);
          result.processed += processed;
          result.changed   += changed;

          if (seasonIsOver(season, startedAt)) {
            const next = await rollSeasonIfAvailable(season, LEAGUE_CONFIG[season.slug]);
            if (next) result.rolled.push(`${season.slug} → ${next}`);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[sync:${season.slug}] Error:`, message);
          result.errors.push(`${season.slug}: ${message}`);
        }
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[sync] Error:', message);
    result.errors.push(message);
  }

  // Quiet runs leave no trace; only changes and errors are logged
  if (result.errors.length > 0) {
    await writeSyncLog({
      status: 'error', recordsUpserted: result.changed, errorMessage: result.errors.join('\n'),
    }).catch(() => {});
  } else if (result.changed > 0) {
    await writeSyncLog({ status: 'success', recordsUpserted: result.changed });
  }
  if (result.rolled.length > 0) {
    // error_message doubles as the message column here
    await writeSyncLog(
      { status: 'success', recordsUpserted: result.rolled.length, errorMessage: `Rolled over: ${result.rolled.join(', ')}` },
      'seasons',
    ).catch(() => {});
  }

  if (result.synced.length > 0) {
    console.log(
      `[sync] ${result.synced.join(', ')} — ${result.processed} events, ` +
      `${result.changed} changed in ${Date.now() - startedAt}ms`
    );
  }
  if (result.rolled.length > 0) console.log(`[sync] New season: ${result.rolled.join(', ')}`);

  return result;
}
