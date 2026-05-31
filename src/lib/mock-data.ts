import type { Fixture, League, Sport, Team } from './types';

const SPORTS = {
  football:   { id: 1, name: 'Football',   slug: 'football'   } satisfies Sport,
  basketball: { id: 2, name: 'Basketball', slug: 'basketball' } satisfies Sport,
  formula1:   { id: 3, name: 'Formula 1',  slug: 'formula-1'  } satisfies Sport,
};

const LEAGUES: Record<string, League> = {
  premierLeague: {
    id: 1, sportId: 1, sport: SPORTS.football,
    name: 'Premier League', shortName: 'PL', slug: 'premier-league', country: 'England',
  },
  laLiga: {
    id: 2, sportId: 1, sport: SPORTS.football,
    name: 'La Liga', shortName: 'LaLiga', slug: 'la-liga', country: 'Spain',
  },
  championsLeague: {
    id: 3, sportId: 1, sport: SPORTS.football,
    name: 'UEFA Champions League', shortName: 'UCL', slug: 'champions-league', country: 'Europe',
  },
  nba: {
    id: 4, sportId: 2, sport: SPORTS.basketball,
    name: 'NBA', shortName: 'NBA', slug: 'nba', country: 'USA',
  },
  f1: {
    id: 5, sportId: 3, sport: SPORTS.formula1,
    name: 'Formula 1', shortName: 'F1', slug: 'formula-1', country: 'International',
  },
};

const TEAMS: Record<string, Team> = {
  arsenal:    { id: 1,  sportId: 1, name: 'Arsenal',                shortName: 'ARS', slug: 'arsenal',          country: 'England' },
  chelsea:    { id: 2,  sportId: 1, name: 'Chelsea',                shortName: 'CHE', slug: 'chelsea',          country: 'England' },
  manCity:    { id: 3,  sportId: 1, name: 'Man City',               shortName: 'MCI', slug: 'manchester-city',  country: 'England' },
  liverpool:  { id: 4,  sportId: 1, name: 'Liverpool',              shortName: 'LIV', slug: 'liverpool',        country: 'England' },
  tottenham:  { id: 5,  sportId: 1, name: 'Tottenham',              shortName: 'TOT', slug: 'tottenham',        country: 'England' },
  realMadrid: { id: 6,  sportId: 1, name: 'Real Madrid',            shortName: 'RMA', slug: 'real-madrid',      country: 'Spain'   },
  barcelona:  { id: 7,  sportId: 1, name: 'Barcelona',              shortName: 'BAR', slug: 'barcelona',        country: 'Spain'   },
  atletico:   { id: 8,  sportId: 1, name: 'Atlético Madrid',        shortName: 'ATM', slug: 'atletico-madrid',  country: 'Spain'   },
  psg:        { id: 9,  sportId: 1, name: 'PSG',                    shortName: 'PSG', slug: 'psg',              country: 'France'  },
  lakers:     { id: 10, sportId: 2, name: 'LA Lakers',              shortName: 'LAL', slug: 'la-lakers',        country: 'USA'     },
  warriors:   { id: 11, sportId: 2, name: 'Golden State Warriors',  shortName: 'GSW', slug: 'gsw',              country: 'USA'     },
  celtics:    { id: 12, sportId: 2, name: 'Boston Celtics',         shortName: 'BOS', slug: 'celtics',          country: 'USA'     },
};

// Dates relative to 2026-05-31 (today when this data was written).
// Replace with DB queries when the cron pipeline is wired up.
export const MOCK_FIXTURES: Fixture[] = [
  // ── 2 days ago (2026-05-29) ──────────────────────────────────────────
  {
    id: 1, seasonId: 1, league: LEAGUES.nba,
    homeTeam: TEAMS.lakers, awayTeam: TEAMS.warriors,
    scheduledAt: '2026-05-29T23:00:00Z', status: 'finished',
    round: 'Western Conference Finals · Game 5',
    homeScore: 112, awayScore: 98,
  },
  // ── Yesterday (2026-05-30) ───────────────────────────────────────────
  {
    id: 2, seasonId: 1, league: LEAGUES.premierLeague,
    homeTeam: TEAMS.arsenal, awayTeam: TEAMS.chelsea,
    scheduledAt: '2026-05-30T14:00:00Z', status: 'finished',
    round: 'Matchweek 38', homeScore: 2, awayScore: 1,
  },
  {
    id: 3, seasonId: 1, league: LEAGUES.laLiga,
    homeTeam: TEAMS.realMadrid, awayTeam: TEAMS.atletico,
    scheduledAt: '2026-05-30T19:00:00Z', status: 'finished',
    round: 'Matchweek 38', homeScore: 3, awayScore: 0,
  },
  // ── Today (2026-05-31) ───────────────────────────────────────────────
  {
    id: 4, seasonId: 1, league: LEAGUES.f1,
    scheduledAt: '2026-05-31T13:00:00Z', status: 'finished',
    round: 'Monaco Grand Prix',
    sportMeta: { podium: ['Max Verstappen', 'Lewis Hamilton', 'Charles Leclerc'] },
  },
  {
    id: 5, seasonId: 1, league: LEAGUES.premierLeague,
    homeTeam: TEAMS.manCity, awayTeam: TEAMS.liverpool,
    scheduledAt: '2026-05-31T14:00:00Z', status: 'live',
    round: 'Matchweek 38', homeScore: 1, awayScore: 1,
    sportMeta: { minute: 67 },
  },
  {
    id: 6, seasonId: 1, league: LEAGUES.laLiga,
    homeTeam: TEAMS.barcelona, awayTeam: TEAMS.atletico,
    scheduledAt: '2026-05-31T18:30:00Z', status: 'scheduled',
    round: 'Matchweek 38',
  },
  // ── Tomorrow (2026-06-01) ────────────────────────────────────────────
  {
    id: 7, seasonId: 1, league: LEAGUES.premierLeague,
    homeTeam: TEAMS.tottenham, awayTeam: TEAMS.arsenal,
    scheduledAt: '2026-06-01T15:00:00Z', status: 'scheduled',
    round: 'Matchweek 38',
  },
  {
    id: 8, seasonId: 1, league: LEAGUES.laLiga,
    homeTeam: TEAMS.realMadrid, awayTeam: TEAMS.barcelona,
    scheduledAt: '2026-06-01T19:00:00Z', status: 'postponed',
    round: 'Matchweek 38',
  },
  // ── 4 Jun — UCL Final ────────────────────────────────────────────────
  {
    id: 9, seasonId: 1, league: LEAGUES.championsLeague,
    homeTeam: TEAMS.manCity, awayTeam: TEAMS.psg,
    scheduledAt: '2026-06-04T19:00:00Z', status: 'scheduled',
    round: 'Final',
  },
  // ── 7 Jun — NBA Finals ───────────────────────────────────────────────
  {
    id: 10, seasonId: 1, league: LEAGUES.nba,
    homeTeam: TEAMS.celtics, awayTeam: TEAMS.lakers,
    scheduledAt: '2026-06-07T23:30:00Z', status: 'scheduled',
    round: 'NBA Finals · Game 1',
  },
  // ── 12 Jun ───────────────────────────────────────────────────────────
  {
    id: 11, seasonId: 1, league: LEAGUES.premierLeague,
    homeTeam: TEAMS.chelsea, awayTeam: TEAMS.manCity,
    scheduledAt: '2026-06-12T15:00:00Z', status: 'scheduled',
    round: 'Matchweek 39',
  },
];
