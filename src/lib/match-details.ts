// Football match details (goals, red cards, stats) for the results card. Fetched from
// TheSportsDB on the first tap and then cached, so the page payload doesn't grow.

import { unstable_cache } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { externalIds, fixtures, leagues, seasons, sports } from '@/db/schema';
import { fetchEventStats, fetchTimeline, type TsdbEventStat, type TsdbTimelineEntry } from '@/lib/sync/thesportsdb';
import type { MatchDetails, MatchEvent, MatchStat } from '@/lib/types';

/** Not a finished football fixture we know (nothing to show, don't retry soon) */
export class NoDetails extends Error {}

/** TheSportsDB hasn't caught up yet; the partial details are served but not cached */
export class IncompleteDetails extends Error {
  constructor(readonly details: MatchDetails) { super('Match details incomplete'); }
}

const EVENT_KINDS: Record<string, MatchEvent['kind']> = {
  'Normal Goal':    'goal',
  'Penalty':        'penalty',
  'Own Goal':       'own-goal',
  'Missed Penalty': 'missed-penalty',
  'Red Card':       'red-card',
};

// Provider stat name → label, in display order
const STATS: [string, string, boolean?][] = [
  ['Ball Possession', 'Possession', true],
  ['expected_goals',  'Expected goals (xG)'],
  ['Total Shots',     'Shots'],
  ['Shots on Goal',   'Shots on target'],
  ['Corner Kicks',    'Corners'],
  ['Fouls',           'Fouls'],
  ['Yellow Cards',    'Yellow cards'],
  ['Red Cards',       'Red cards'],
  ['Offsides',        'Offsides'],
  ['Goalkeeper Saves','Saves'],
];

function toEvents(timeline: TsdbTimelineEntry[]): MatchEvent[] {
  return timeline
    .filter(e => EVENT_KINDS[e.strTimelineDetail])
    .map(e => ({
      minute: Number(e.intTime) || 0,
      kind:   EVENT_KINDS[e.strTimelineDetail],
      side:   e.strHome === 'Yes' ? 'home' as const : 'away' as const,
      player: e.strPlayer,
      ...(e.strAssist && e.strTimelineDetail === 'Normal Goal' && { assist: e.strAssist }),
    }))
    .sort((a, b) => a.minute - b.minute);
}

function toStats(stats: TsdbEventStat[]): MatchStat[] {
  const byName = new Map(stats.map(s => [s.strStat, s]));
  return STATS.flatMap(([name, label, percent]) => {
    const s = byName.get(name);
    const home = Number(s?.intHome), away = Number(s?.intAway);
    // 0–0 is noise (no red cards) or missing data (the A-League has no xG), so it's left out
    if (!s || Number.isNaN(home) || Number.isNaN(away) || home + away === 0) return [];
    return [{ label, home, away, ...(percent && { percent }) }];
  });
}

async function loadMatchDetails(fixtureId: number): Promise<MatchDetails> {
  const [row] = await db
    .select({
      eventId:   externalIds.externalId,
      status:    fixtures.status,
      homeScore: fixtures.homeScore,
      awayScore: fixtures.awayScore,
      sport:     sports.slug,
    })
    .from(fixtures)
    .innerJoin(seasons, eq(seasons.id, fixtures.seasonId))
    .innerJoin(leagues, eq(leagues.id, seasons.leagueId))
    .innerJoin(sports,  eq(sports.id, leagues.sportId))
    .innerJoin(externalIds, and(
      eq(externalIds.entityId, fixtures.id),
      eq(externalIds.entityType, 'fixture'),
      eq(externalIds.provider, 'thesportsdb'),
    ))
    .where(eq(fixtures.id, fixtureId));
  if (!row || row.sport !== 'football' || row.status !== 'finished') throw new NoDetails();

  const timeline = await fetchTimeline(row.eventId);
  const stats    = await fetchEventStats(row.eventId);
  const details  = { events: toEvents(timeline), stats: toStats(stats) };

  // The timeline lists every goal (VAR-cancelled ones excluded), so a short count means it's still filling in
  const goals = details.events.filter(e => e.kind !== 'missed-penalty' && e.kind !== 'red-card');
  const expected = (row.homeScore ?? 0) + (row.awayScore ?? 0);
  if (goals.length < expected || details.stats.length === 0) throw new IncompleteDetails(details);
  return details;
}

/**
 * Cached per fixture for a week (a finished match doesn't change). Errors aren't cached, so
 * incomplete details are fetched again on a later tap.
 */
export function getMatchDetails(fixtureId: number): Promise<MatchDetails> {
  return unstable_cache(
    () => loadMatchDetails(fixtureId),
    ['match-details', String(fixtureId)],
    { revalidate: 7 * 24 * 3600 },
  )();
}
