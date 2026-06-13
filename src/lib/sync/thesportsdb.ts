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
}

export interface TsdbResult {
  strPlayer:   string;
  intPosition: string;
  intPoints:   string;
  strDetail:   string;   // race time or gap, e.g. "1:33:15.607" / "+5.515s"
}

export async function fetchSeasonEvents(leagueId: string, season: string): Promise<TsdbEvent[]> {
  const key = process.env.THESPORTSDB_API_KEY;
  if (!key) throw new Error('THESPORTSDB_API_KEY is not set');

  const url = `${BASE_URL}/${key}/eventsseason.php?id=${leagueId}&s=${season}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`TheSportsDB request failed: ${res.status} ${res.statusText}`);

  const data = await res.json() as { events: TsdbEvent[] | null };
  return data.events ?? [];
}

export async function fetchEventResults(eventId: string): Promise<TsdbResult[]> {
  const key = process.env.THESPORTSDB_API_KEY;
  if (!key) throw new Error('THESPORTSDB_API_KEY is not set');

  const url = `${BASE_URL}/${key}/eventresults.php?id=${eventId}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`TheSportsDB request failed: ${res.status} ${res.statusText}`);

  const data = await res.json() as { results: TsdbResult[] | null };
  return data.results ?? [];
}
