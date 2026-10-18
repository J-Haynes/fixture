// League tables, computed from each league's current-season results rather than taken from
// the provider: TheSportsDB only has tables for some football leagues (not the Champions
// League), and this keeps them in step with the scores on the cards. Football rules: 3 points
// for a win, 1 for a draw; ties broken on goal difference, then goals scored. Points deductions
// and head-to-head tie-breakers aren't modelled.

import { unstable_cache } from 'next/cache';
import { FIXTURES_CACHE_TAG } from './fixtures';
import type { LeagueTable, TableRow, TableZone } from './types';

interface TableConfig {
  zones: TableZone[];
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
    counts: round => round?.startsWith('League phase') ?? false,
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

  const byLeague = new Map<string, { table: LeagueTable; rows: Map<number, TableRow> }>();
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
        rows: new Map(),
      };
      byLeague.set(r.slug, entry);
    }

    const row = (id: number) => {
      let row = entry!.rows.get(id);
      if (!row) {
        row = { team: teamById.get(id)!, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
        entry!.rows.set(id, row);
      }
      return row;
    };
    const home = row(r.homeId), away = row(r.awayId);
    if (r.status !== 'finished' || r.homeScore == null || r.awayScore == null) continue;

    for (const [side, gf, ga] of [[home, r.homeScore, r.awayScore], [away, r.awayScore, r.homeScore]] as const) {
      side.played++;
      side.goalsFor     += gf;
      side.goalsAgainst += ga;
      if (gf > ga)        { side.won++;   side.points += 3; }
      else if (gf === ga) { side.drawn++; side.points += 1; }
      else                  side.lost++;
    }
  }

  return TABLE_LEAGUES.flatMap(slug => {
    const entry = byLeague.get(slug);
    if (!entry) return [];
    entry.table.rows = [...entry.rows.values()].sort((a, b) =>
      b.points - a.points
      || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)
      || b.goalsFor - a.goalsFor
      || a.team.name.localeCompare(b.team.name));
    return [entry.table];
  });
}
