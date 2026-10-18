const BASE_URL = 'https://www.thesportsdb.com/api/v1/json';

export interface TsdbEvent {
  idEvent:          string;
  idHomeTeam:       string | null;
  idAwayTeam:       string | null;
  strHomeTeam:      string | null;
  strAwayTeam:      string | null;
  strTimestamp:     string;          // UTC ISO-8601, e.g. "2026-04-11T07:05:00"
  intRound:         string;
  strRound:         string | null;   // descriptive round name e.g. "Quarter-Final"; often empty
  strEvent:         string;          // full event name e.g. "Australian Grand Prix"
  strVenue:         string | null;
  strStatus:        string;          // "NS" | "FT" | "1H" | "HT" | "2H" | "ET" | "PEN" | ""
  strPostponed:     string;          // "yes" | "no"
  intHomeScore:     string | null;
  intAwayScore:     string | null;
  strHomeTeamBadge: string | null;
  strAwayTeamBadge: string | null;
  strVideo?:        string | null;   // highlights, usually a YouTube URL; filled in after the game
}

export interface TsdbResult {
  strPlayer:   string;
  intPosition: string;
  intPoints:   string;
  strDetail:   string;   // race time or gap, e.g. "1:33:15.607" / "+5.515s"
}

/** One entry of a football match timeline (lookuptimeline.php) */
export interface TsdbTimelineEntry {
  strTimeline:       string;          // "Goal" | "Card" | "subst" | "Var"
  strTimelineDetail: string;          // "Normal Goal" | "Penalty" | "Own Goal" | "Missed Penalty" | "Yellow Card" | "Red Card" | …
  intTime:           string;          // minute
  strPlayer:         string;
  strAssist:         string | null;
  strHome:           string;          // "Yes" | "No": the side credited (an own goal is listed under the team it counted for)
}

/** One row of a football match's stats (lookupeventstats.php), e.g. "Ball Possession" 49 / 51 */
export interface TsdbEventStat {
  strStat: string;
  intHome: string;
  intAway: string;
}

async function get<T>(path: string): Promise<T> {
  const key = process.env.THESPORTSDB_API_KEY;
  if (!key) throw new Error('THESPORTSDB_API_KEY is not set');

  const res = await fetch(`${BASE_URL}/${key}/${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`TheSportsDB request failed: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

/** Football only: other sports return an empty timeline */
export async function fetchTimeline(eventId: string): Promise<TsdbTimelineEntry[]> {
  const data = await get<{ timeline: TsdbTimelineEntry[] | null }>(`lookuptimeline.php?id=${eventId}`);
  return data.timeline ?? [];
}

/** Football only: other sports return no stats */
export async function fetchEventStats(eventId: string): Promise<TsdbEventStat[]> {
  const data = await get<{ eventstats: TsdbEventStat[] | null }>(`lookupeventstats.php?id=${eventId}`);
  return data.eventstats ?? [];
}

export async function fetchSeasonEvents(leagueId: string, season: string): Promise<TsdbEvent[]> {
  const data = await get<{ events: TsdbEvent[] | null }>(`eventsseason.php?id=${leagueId}&s=${season}`);
  return data.events ?? [];
}

/**
 * One day's events for a league. Unlike eventsseason.php (served from a cache that can
 * be ~15 min stale), this is fresh, so the sync uses it for in-play status and scores.
 */
export async function fetchDayEvents(leagueId: string, date: string): Promise<TsdbEvent[]> {
  const data = await get<{ events: TsdbEvent[] | null }>(`eventsday.php?d=${date}&l=${leagueId}`);
  return data.events ?? [];
}

export async function fetchEventResults(eventId: string): Promise<TsdbResult[]> {
  const data = await get<{ results: TsdbResult[] | null }>(`eventresults.php?id=${eventId}`);
  return data.results ?? [];
}
