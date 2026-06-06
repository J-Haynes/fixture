const BASE_URL = 'https://www.thesportsdb.com/api/v1/json';

export interface TsdbEvent {
  idEvent:         string;
  idHomeTeam:      string;
  idAwayTeam:      string;
  strHomeTeam:     string;
  strAwayTeam:     string;
  strTimestamp:    string;   // UTC ISO-8601, e.g. "2026-04-11T07:05:00"
  intRound:        string;
  strVenue:        string | null;
  strStatus:       string;   // "NS" | "FT" | ""
  strPostponed:    string;   // "yes" | "no"
  intHomeScore:    string | null;
  intAwayScore:    string | null;
  strHomeTeamBadge: string | null;
  strAwayTeamBadge: string | null;
}

export async function fetchSeasonEvents(leagueId: string, season: string): Promise<TsdbEvent[]> {
  const key = process.env.THESPORTSDB_API_KEY;
  if (!key) throw new Error('THESPORTSDB_API_KEY is not set');

  const url = `${BASE_URL}/${key}/eventsseason.php?id=${leagueId}&s=${season}`;
  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) {
    throw new Error(`TheSportsDB request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json() as { events: TsdbEvent[] | null };
  return data.events ?? [];
}
