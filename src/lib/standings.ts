// League tables, computed from each league's current-season results rather than taken from
// the provider: TheSportsDB only has tables for some football leagues (not the Champions
// League), and this keeps them in step with the scores on the cards. Football rules: 3 points
// for a win, 1 for a draw; ties broken per league (see TIEBREAKS). Points deductions and
// head-to-head tie-breakers aren't modelled.

import { unstable_cache } from 'next/cache';
import { FIXTURES_CACHE_TAG } from './fixtures';
import type { LeagueTable, TableRow, TableZone } from './types';

interface TableConfig {
  zones: TableZone[];
  /** How teams level on points are ordered (default: goal difference, then goals scored) */
  tiebreak?: 'standard' | 'uefa';
  /** Which fixtures count, by round label (e.g. the Champions League's league phase only) */
  counts?: (round: string | null) => boolean;
}

const TABLES: Record<string, TableConfig> = {
  'premier-league': {
    zones: [
      { from: 1,  to: 4,  label: 'Champions League', tone: 'good' },
      { from: 18, to: 20, label: 'Relegation',       tone: 'bad'  },
    ],
  },
  'a-league-men': {
    zones: [{ from: 1, to: 6, label: 'Finals', tone: 'good' }],
  },
  'champions-league': {
    zones: [
      { from: 1,  to: 8,  label: 'Round of 16',        tone: 'good' },
      { from: 9,  to: 24, label: 'Knockout play-offs', tone: 'mid'  },
      { from: 25, to: 36, label: 'Eliminated',         tone: 'bad'  },
    ],
    counts:   round => round?.startsWith('League phase') ?? false,
    tiebreak: 'uefa',
  },
};

/** Leagues with a table, for the Tables tab */
export const TABLE_LEAGUES = Object.keys(TABLES);

export const getCachedTables = unstable_cache(
  () => getTables(),
  ['tables'],
  { tags: [FIXTURES_CACHE_TAG], revalidate: 3600 },
);

export async function getTables(): Promise<LeagueTable[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    return await queryTables();
  } catch (err: unknown) {
    const code = (err as { cause?: { code?: string } })?.cause?.code;
    if (code === 'ENETUNREACH' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT') return [];
    throw err;
  }
}

async function queryTables(): Promise<LeagueTable[]> {
  const { db }                                 = await import('@/db');
  const { fixtures, leagues, seasons, teams }  = await import('@/db/schema');
  const { and, eq, inArray }                   = await import('drizzle-orm');

  // Every current-season fixture (not just results), so teams yet to play still get a row
  const rows = await db
    .select({
      leagueId:  leagues.id,
      slug:      leagues.slug,
      name:      leagues.name,
      shortName: leagues.shortName,
      logoUrl:   leagues.logoUrl,
      round:     fixtures.round,
      status:    fixtures.status,
      homeId:    fixtures.homeTeamId,
      awayId:    fixtures.awayTeamId,
      homeScore: fixtures.homeScore,
      awayScore: fixtures.awayScore,
    })
    .from(fixtures)
    .innerJoin(seasons, and(eq(seasons.id, fixtures.seasonId), eq(seasons.isCurrent, true)))
    .innerJoin(leagues, and(eq(leagues.id, seasons.leagueId), eq(leagues.isActive, true)))
    .where(inArray(leagues.slug, TABLE_LEAGUES));

  const teamIds = [...new Set(rows.flatMap(r => [r.homeId, r.awayId]).filter((id): id is number => id != null))];
  if (teamIds.length === 0) return [];
  const teamRows = await db
    .select({ id: teams.id, name: teams.name, shortName: teams.shortName, slug: teams.slug, logoUrl: teams.logoUrl })
    .from(teams)
    .where(inArray(teams.id, teamIds));
  const teamById = new Map(teamRows.map(t => [t.id, {
    ...t, shortName: t.shortName ?? undefined, logoUrl: t.logoUrl ?? undefined,
  }]));

  const byLeague = new Map<string, LeagueTally>();
  for (const r of rows) {
    const config = TABLES[r.slug];
    if (config.counts && !config.counts(r.round)) continue;
    if (r.homeId == null || r.awayId == null) continue;

    let entry = byLeague.get(r.slug);
    if (!entry) {
      entry = {
        table: {
          league: { id: r.leagueId, name: r.name, shortName: r.shortName ?? undefined, slug: r.slug, logoUrl: r.logoUrl ?? undefined },
          rows:   [],
          zones:  config.zones,
        },
        teams:    new Map(),
        complete: true,
      };
      byLeague.set(r.slug, entry);
    }

    const tally = (id: number) => {
      let t = entry!.teams.get(id);
      if (!t) {
        t = {
          row: { team: teamById.get(id)!, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
          awayGoals: 0, awayWins: 0, opponents: [],
        };
        entry!.teams.set(id, t);
      }
      return t;
    };
    const home = tally(r.homeId), away = tally(r.awayId);
    if (r.status !== 'finished' || r.homeScore == null || r.awayScore == null) {
      entry.complete = false;
      continue;
    }

    home.opponents.push(r.awayId);
    away.opponents.push(r.homeId);
    away.awayGoals += r.awayScore;
    if (r.awayScore > r.homeScore) away.awayWins++;
    for (const [{ row }, gf, ga] of [[home, r.homeScore, r.awayScore], [away, r.awayScore, r.homeScore]] as const) {
      row.played++;
      row.goalsFor     += gf;
      row.goalsAgainst += ga;
      if (gf > ga)        { row.won++;   row.points += 3; }
      else if (gf === ga) { row.drawn++; row.points += 1; }
      else                  row.lost++;
    }
  }

  return TABLE_LEAGUES.flatMap(slug => {
    const entry = byLeague.get(slug);
    if (!entry) return [];
    const order = TIEBREAKS[TABLES[slug].tiebreak ?? 'standard'];
    entry.table.rows = [...entry.teams.values()]
      .sort((a, b) => order(a, b, entry))
      .map(t => t.row);
    return [entry.table];
  });
}

// ── Ordering ──────────────────────────────────────────────────────────────────

interface TeamTally {
  row:       TableRow;
  awayGoals: number;
  awayWins:  number;
  /** One entry per finished game, so an opponent met twice counts twice */
  opponents: number[];
}

interface LeagueTally {
  table:    LeagueTable;
  teams:    Map<number, TeamTally>;
  /** Every counted fixture has finished */
  complete: boolean;
}

type Order = (a: TeamTally, b: TeamTally, league: LeagueTally) => number;

const gd = (t: TeamTally) => t.row.goalsFor - t.row.goalsAgainst;

/** Sum of a stat over the team's opponents (UEFA criteria 6–8) */
function opponentsTotal(t: TeamTally, league: LeagueTally, stat: (o: TeamTally) => number): number {
  return t.opponents.reduce((sum, id) => sum + stat(league.teams.get(id)!), 0);
}

const TIEBREAKS: Record<'standard' | 'uefa', Order> = {
  // Premier League / A-League: points, goal difference, goals scored (then head-to-head, not modelled)
  standard: (a, b) =>
    b.row.points - a.row.points
    || gd(b) - gd(a)
    || b.row.goalsFor - a.row.goalsFor
    || a.row.team.name.localeCompare(b.row.team.name),

  // UEFA league phase: goal difference, goals, away goals, wins, away wins; once the phase is
  // complete, opponents' collective points, goal difference and goals. Disciplinary points and
  // club coefficient (criteria 9–10) aren't in our data, so it falls back to the abbreviated name,
  // which is UEFA's rule before the final matchday anyway.
  uefa: (a, b, league) =>
    b.row.points - a.row.points
    || gd(b) - gd(a)
    || b.row.goalsFor - a.row.goalsFor
    || b.awayGoals - a.awayGoals
    || b.row.won - a.row.won
    || b.awayWins - a.awayWins
    || (league.complete
      ? opponentsTotal(b, league, o => o.row.points) - opponentsTotal(a, league, o => o.row.points)
        || opponentsTotal(b, league, gd) - opponentsTotal(a, league, gd)
        || opponentsTotal(b, league, o => o.row.goalsFor) - opponentsTotal(a, league, o => o.row.goalsFor)
      : 0)
    || (a.row.team.shortName ?? a.row.team.name).localeCompare(b.row.team.shortName ?? b.row.team.name),
};
