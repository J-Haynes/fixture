import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { fixtures, teams, seasons, externalIds, syncLog } from '@/db/schema';
import { fetchSeasonEvents, type TsdbEvent } from './thesportsdb';
import type { FixtureStatus } from '@/lib/types';

const LEAGUE_ID  = '4551';
const SEASON     = '2026';
const PROVIDER   = 'thesportsdb';

// ── Status mapping ────────────────────────────────────────────────────────────

function mapStatus(event: TsdbEvent): FixtureStatus {
  if (event.strPostponed === 'yes') return 'postponed';
  if (event.strStatus === 'FT')     return 'finished';
  // TheSportsDB occasionally returns "NS" for completed games — if scores are
  // present, trust the scores over the status field.
  if (event.intHomeScore != null && event.intAwayScore != null &&
      event.intHomeScore !== '' && event.intAwayScore !== '') return 'finished';
  return 'scheduled';
}

// ── Team name normalisation ───────────────────────────────────────────────────
// TheSportsDB appends " Super Rugby" to all team names. Strip it, then do a
// substring match against our teams (handles "Brumbies" ↔ "ACT Brumbies" etc.)

function normaliseName(name: string): string {
  return name
    .replace(/\s+Super Rugby\s*$/i, '')
    .trim()
    .toLowerCase();
}

function findTeamByName(
  tsdbName: string,
  allTeams: { id: number; name: string }[],
): number | undefined {
  const needle = normaliseName(tsdbName);
  return allTeams.find(t => {
    const hay = t.name.toLowerCase();
    return hay === needle || hay.includes(needle) || needle.includes(hay);
  })?.id;
}

// ── Main sync ─────────────────────────────────────────────────────────────────

export async function syncFixtures(): Promise<{ upserted: number }> {
  const startedAt = Date.now();
  let upserted = 0;

  try {
    // 1. Fetch from TheSportsDB
    const events = await fetchSeasonEvents(LEAGUE_ID, SEASON);

    // 2. Load current season
    const [season] = await db
      .select()
      .from(seasons)
      .where(eq(seasons.isCurrent, true))
      .limit(1);

    if (!season) throw new Error('No current season found in database');

    // 3. Load all teams + existing external_id mappings in one pass
    const allTeams = await db.select({ id: teams.id, name: teams.name }).from(teams);

    const teamMappings = await db
      .select({ externalId: externalIds.externalId, entityId: externalIds.entityId })
      .from(externalIds)
      .where(and(eq(externalIds.entityType, 'team'), eq(externalIds.provider, PROVIDER)));

    const fixtureMappings = await db
      .select({ externalId: externalIds.externalId, entityId: externalIds.entityId })
      .from(externalIds)
      .where(and(eq(externalIds.entityType, 'fixture'), eq(externalIds.provider, PROVIDER)));

    const teamExtMap   = new Map(teamMappings.map(m => [m.externalId, m.entityId]));
    const fixtureExtMap = new Map(fixtureMappings.map(m => [m.externalId, m.entityId]));

    // 4. Process each event
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

      const status     = mapStatus(event);
      const homeScore  = event.intHomeScore != null && event.intHomeScore !== ''
        ? parseInt(event.intHomeScore, 10) : null;
      const awayScore  = event.intAwayScore != null && event.intAwayScore !== ''
        ? parseInt(event.intAwayScore, 10) : null;
      const round      = event.intRound ? `Round ${event.intRound}` : null;

      const existingId = fixtureExtMap.get(event.idEvent);

      if (existingId != null) {
        // Update status and score if the fixture already exists
        await db
          .update(fixtures)
          .set({ status, homeScore, awayScore })
          .where(eq(fixtures.id, existingId));
      } else {
        // Insert new fixture and record its external ID mapping
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

    await db.insert(syncLog).values({
      provider: PROVIDER, entityType: 'fixtures',
      status: 'success', recordsUpserted: upserted,
    });

    console.log(`[sync] OK — ${upserted} fixtures processed in ${Date.now() - startedAt}ms`);
    return { upserted };

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[sync] Error:', message);

    await db.insert(syncLog).values({
      provider: PROVIDER, entityType: 'fixtures',
      status: 'error', errorMessage: message,
    }).catch(() => {}); // don't throw if logging fails

    throw err;
  }
}
