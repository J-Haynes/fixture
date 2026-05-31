export type FixtureStatus = 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';

export interface Sport {
  id: number;
  name: string;
  slug: string;
}

export interface League {
  id: number;
  sportId: number;
  sport?: Sport;
  name: string;
  shortName?: string;
  slug: string;
  country?: string;
  logoUrl?: string;
}

export interface Team {
  id: number;
  sportId: number;
  name: string;
  shortName?: string;
  slug: string;
  logoUrl?: string;
  country?: string;
}

export interface Fixture {
  id: number;
  seasonId: number;
  league: League;
  homeTeam?: Team;
  awayTeam?: Team;
  scheduledAt: string; // ISO UTC string — always stored as UTC, displayed in browser timezone
  status: FixtureStatus;
  round?: string;
  homeScore?: number;
  awayScore?: number;
  sportMeta?: Record<string, unknown>; // sport-specific overflow (F1 podium, cricket innings, etc.)
}

export interface FixturesQueryParams {
  from?: string; // YYYY-MM-DD (UTC)
  to?: string;   // YYYY-MM-DD (UTC)
  leagueId?: number;
  status?: FixtureStatus;
}

export interface FixturesResponse {
  fixtures: Fixture[];
  from: string;
  to: string;
}
