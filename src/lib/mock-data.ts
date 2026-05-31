import type { Fixture, League, Sport, Team } from './types';

const RUGBY: Sport = { id: 1, name: 'Rugby Union', slug: 'rugby' };

const SUPER_RUGBY: League = {
  id: 1,
  sportId: 1,
  sport: RUGBY,
  name: 'Super Rugby Pacific',
  shortName: 'SRP',
  slug: 'super-rugby-pacific',
  country: 'International',
};

// 11 teams — official Super Rugby Pacific 2026 roster
const T: Record<string, Team> = {
  blues:       { id: 1,  sportId: 1, name: 'Blues',             shortName: 'BLU', slug: 'blues',          logoUrl: '/blues.png',         country: 'New Zealand' },
  chiefs:      { id: 2,  sportId: 1, name: 'Chiefs',            shortName: 'CHI', slug: 'chiefs',         logoUrl: '/chiefs.svg',        country: 'New Zealand' },
  crusaders:   { id: 3,  sportId: 1, name: 'Crusaders',         shortName: 'CRU', slug: 'crusaders',      logoUrl: '/crusaders.png', country: 'New Zealand' },
  highlanders: { id: 4,  sportId: 1, name: 'Highlanders',       shortName: 'HIG', slug: 'highlanders',    logoUrl: '/highlanders.png', country: 'New Zealand' },
  hurricanes:  { id: 5,  sportId: 1, name: 'Hurricanes',        shortName: 'HUR', slug: 'hurricanes',     logoUrl: '/hurricanes.png',       country: 'New Zealand' },
  brumbies:    { id: 6,  sportId: 1, name: 'ACT Brumbies',      shortName: 'BRU', slug: 'brumbies',       logoUrl: '/brumbies.svg', country: 'Australia'   },
  reds:        { id: 7,  sportId: 1, name: 'Queensland Reds',   shortName: 'RED', slug: 'reds',           logoUrl: '/reds.png', country: 'Australia'   },
  waratahs:    { id: 8,  sportId: 1, name: 'NSW Waratahs',      shortName: 'WAR', slug: 'waratahs',       logoUrl: '/waratahs.svg', country: 'Australia'   },
  force:       { id: 9,  sportId: 1, name: 'Western Force',     shortName: 'FOR', slug: 'force',          logoUrl: '/westernforce.png', country: 'Australia'   },
  drua:        { id: 10, sportId: 1, name: 'Fijian Drua',       shortName: 'DRU', slug: 'fijian-drua',    logoUrl: '/drua.png', country: 'Fiji'        },
  moana:       { id: 11, sportId: 1, name: 'Moana Pasifika',    shortName: 'MOA', slug: 'moana-pasifika', logoUrl: '/moana.png', country: 'Pacific'     },
};

const srp = SUPER_RUGBY;

// Dates are UTC. NZ evening kickoffs are roughly 07:35–10:05 UTC.
// Australian evening kickoffs are roughly 09:05–11:05 UTC.
export const MOCK_FIXTURES: Fixture[] = [
  // ── Round 14 · Fri 22 – Sat 23 May 2026 (finished) ──────────────────
  {
    id: 1, seasonId: 1, league: srp,
    homeTeam: T.blues, awayTeam: T.crusaders,
    scheduledAt: '2026-05-22T08:05:00Z', status: 'finished',
    round: 'Round 14', homeScore: 28, awayScore: 21,
  },
  {
    id: 2, seasonId: 1, league: srp,
    homeTeam: T.hurricanes, awayTeam: T.chiefs,
    scheduledAt: '2026-05-22T10:05:00Z', status: 'finished',
    round: 'Round 14', homeScore: 15, awayScore: 24,
  },
  {
    id: 3, seasonId: 1, league: srp,
    homeTeam: T.brumbies, awayTeam: T.reds,
    scheduledAt: '2026-05-23T07:45:00Z', status: 'finished',
    round: 'Round 14', homeScore: 31, awayScore: 15,
  },
  {
    id: 4, seasonId: 1, league: srp,
    homeTeam: T.waratahs, awayTeam: T.drua,
    scheduledAt: '2026-05-23T09:05:00Z', status: 'finished',
    round: 'Round 14', homeScore: 22, awayScore: 19,
  },
  {
    id: 5, seasonId: 1, league: srp,
    homeTeam: T.force, awayTeam: T.highlanders,
    scheduledAt: '2026-05-23T11:05:00Z', status: 'finished',
    round: 'Round 14', homeScore: 14, awayScore: 27,
  },
  // ── Round 15 · Fri 29 – Sat 30 May 2026 (finished) ──────────────────
  {
    id: 6, seasonId: 1, league: srp,
    homeTeam: T.crusaders, awayTeam: T.chiefs,
    scheduledAt: '2026-05-29T08:05:00Z', status: 'finished',
    round: 'Round 15', homeScore: 17, awayScore: 25,
  },
  {
    id: 7, seasonId: 1, league: srp,
    homeTeam: T.blues, awayTeam: T.hurricanes,
    scheduledAt: '2026-05-29T10:05:00Z', status: 'finished',
    round: 'Round 15', homeScore: 34, awayScore: 17,
  },
  {
    id: 8, seasonId: 1, league: srp,
    homeTeam: T.highlanders, awayTeam: T.reds,
    scheduledAt: '2026-05-30T07:45:00Z', status: 'finished',
    round: 'Round 15', homeScore: 22, awayScore: 15,
  },
  {
    id: 9, seasonId: 1, league: srp,
    homeTeam: T.moana, awayTeam: T.waratahs,
    scheduledAt: '2026-05-30T07:45:00Z', status: 'finished',
    round: 'Round 15', homeScore: 28, awayScore: 21,
  },
  {
    id: 10, seasonId: 1, league: srp,
    homeTeam: T.drua, awayTeam: T.brumbies,
    scheduledAt: '2026-05-30T09:05:00Z', status: 'finished',
    round: 'Round 15', homeScore: 13, awayScore: 29,
  },
  // ── Round 16 · Fri 5 – Sat 6 Jun 2026 (upcoming) ────────────────────
  {
    id: 11, seasonId: 1, league: srp,
    homeTeam: T.chiefs, awayTeam: T.blues,
    scheduledAt: '2026-06-05T08:05:00Z', status: 'scheduled',
    round: 'Round 16',
  },
  {
    id: 12, seasonId: 1, league: srp,
    homeTeam: T.crusaders, awayTeam: T.hurricanes,
    scheduledAt: '2026-06-05T10:05:00Z', status: 'scheduled',
    round: 'Round 16',
  },
  {
    id: 13, seasonId: 1, league: srp,
    homeTeam: T.brumbies, awayTeam: T.highlanders,
    scheduledAt: '2026-06-06T07:45:00Z', status: 'scheduled',
    round: 'Round 16',
  },
  {
    id: 14, seasonId: 1, league: srp,
    homeTeam: T.reds, awayTeam: T.force,
    scheduledAt: '2026-06-06T09:05:00Z', status: 'scheduled',
    round: 'Round 16',
  },
  {
    id: 15, seasonId: 1, league: srp,
    homeTeam: T.waratahs, awayTeam: T.moana,
    scheduledAt: '2026-06-06T09:05:00Z', status: 'scheduled',
    round: 'Round 16',
  },
  // ── Round 17 · Sat 13 Jun 2026 (upcoming) ────────────────────────────
  {
    id: 16, seasonId: 1, league: srp,
    homeTeam: T.blues, awayTeam: T.brumbies,
    scheduledAt: '2026-06-13T07:35:00Z', status: 'scheduled',
    round: 'Round 17',
  },
  {
    id: 17, seasonId: 1, league: srp,
    homeTeam: T.hurricanes, awayTeam: T.highlanders,
    scheduledAt: '2026-06-13T08:05:00Z', status: 'scheduled',
    round: 'Round 17',
  },
  {
    id: 18, seasonId: 1, league: srp,
    homeTeam: T.chiefs, awayTeam: T.drua,
    scheduledAt: '2026-06-13T10:05:00Z', status: 'scheduled',
    round: 'Round 17',
  },
  {
    id: 19, seasonId: 1, league: srp,
    homeTeam: T.reds, awayTeam: T.waratahs,
    scheduledAt: '2026-06-13T09:05:00Z', status: 'scheduled',
    round: 'Round 17',
  },
];
