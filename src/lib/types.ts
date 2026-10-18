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
  /** Current-season teams; only filled in for the menu's league list */
  teams?: Team[];
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

/** A football result's timeline and stats, loaded on tap from /api/fixtures/[id]/details */
export interface MatchDetails {
  /** Goals, missed penalties and red cards, in match order */
  events: MatchEvent[];
  /** A curated subset of the match stats, in display order */
  stats:  MatchStat[];
}

export interface MatchEvent {
  minute: number;
  kind:   'goal' | 'penalty' | 'own-goal' | 'missed-penalty' | 'red-card';
  /** The side the event counts for (an own goal is listed under the team it was scored for) */
  side:   'home' | 'away';
  player: string;
  assist?: string;
}

export interface MatchStat {
  label: string;
  home:  number;
  away:  number;
  /** Shown with a % sign */
  percent?: boolean;
}

/** Standings for one league, computed from its current season's results */
export interface LeagueTable {
  league: Pick<League, 'id' | 'name' | 'shortName' | 'slug' | 'logoUrl'>;
  rows:   TableRow[];
  /** Qualification/relegation bands, as 1-based position ranges */
  zones:  TableZone[];
}

export interface TableRow {
  team:   Pick<Team, 'id' | 'name' | 'shortName' | 'slug' | 'logoUrl'>;
  played: number;
  won:    number;
  drawn:  number;
  lost:   number;
  goalsFor:     number;
  goalsAgainst: number;
  points: number;
}

export interface TableZone {
  from:  number;
  to:    number;
  label: string;
  tone:  'good' | 'mid' | 'bad';
}
