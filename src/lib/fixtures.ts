import { unstable_cache } from 'next/cache';
import type { FixtureStatus, Fixture, FixturesQueryParams, FixturesResponse } from './types';
import { MOCK_FIXTURES } from './mock-data';

// ── Public API ─────────────────────────────────────────────────────────────────

/** Expired by /api/cron/sync whenever the sync changes fixture data */
export const FIXTURES_CACHE_TAG = 'fixtures';

/**
 * getFixtures, cached across requests. Page views don't hit the DB until the sync
 * expires the tag; the hourly revalidate is a safety net.
 */
export const getCachedFixtures = unstable_cache(
  (params: FixturesQueryParams) => getFixtures(params),
  ['fixtures'],
  { tags: [FIXTURES_CACHE_TAG], revalidate: 3600 },
);

export async function getFixtures(params: FixturesQueryParams = {}): Promise<FixturesResponse> {
  const fixtures = process.env.DATABASE_URL
    ? await fromDatabase(params)
    : fromMock(params);

  return { fixtures, from: params.from ?? '', to: params.to ?? '' };
}

// ── Mock path (no DATABASE_URL set) ──────────────────────────────────────────

function fromMock({ from, to, leagueId, status }: FixturesQueryParams): Fixture[] {
  let data = [...MOCK_FIXTURES];
  if (from)               data = data.filter(f => f.scheduledAt.slice(0, 10) >= from);
  if (to)                 data = data.filter(f => f.scheduledAt.slice(0, 10) <= to);
  if (leagueId != null)   data = data.filter(f => f.league.id === leagueId);
  if (status)             data = data.filter(f => f.status === status);
  return data.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

// ── Database path ──────────────────────────────────────────────────────────────
// Dynamic imports keep the postgres client out of the module graph when
// DATABASE_URL is absent, so the app still works without a DB configured.

async function fromDatabase(params: FixturesQueryParams): Promise<Fixture[]> {
  try {
    return await queryDatabase(params);
  } catch (err: unknown) {
    const code = (err as { cause?: { code?: string } })?.cause?.code;
    if (code === 'ENETUNREACH' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT') {
      console.warn(
        '[fixtures] DB unreachable (network error: ' + code + '). Falling back to mock data.\n' +
        'Fix: use the Supabase Session Pooler URL → Supabase dashboard → Settings → Database → Connection Pooling'
      );
      return fromMock(params);
    }
    throw err;
  }
}

async function queryDatabase({ from, to, leagueId, status }: FixturesQueryParams): Promise<Fixture[]> {
  const { db }                                          = await import('@/db');
  const { fixtures, leagues, sports, seasons, teams }  = await import('@/db/schema');
  const { and, gte, lte, eq }                          = await import('drizzle-orm');
  const { alias }                                       = await import('drizzle-orm/pg-core');

  const home = alias(teams, 'home');
  const away = alias(teams, 'away');

  const where = [];
  if (from)     where.push(gte(fixtures.scheduledAt, new Date(from + 'T00:00:00Z')));
  if (to)       where.push(lte(fixtures.scheduledAt, new Date(to   + 'T23:59:59Z')));
  if (leagueId) where.push(eq(leagues.id, leagueId));
  if (status)   where.push(eq(fixtures.status, status));

  const rows = await db
    .select({
      id:          fixtures.id,
      seasonId:    fixtures.seasonId,
      scheduledAt: fixtures.scheduledAt,
      status:      fixtures.status,
      round:       fixtures.round,
      homeScore:   fixtures.homeScore,
      awayScore:   fixtures.awayScore,
      sportMeta:   fixtures.sportMeta,
      // League + Sport
      leagueId:    leagues.id,
      leagueSportId:   leagues.sportId,
      leagueName:      leagues.name,
      leagueShortName: leagues.shortName,
      leagueSlug:      leagues.slug,
      leagueCountry:   leagues.country,
      leagueLogoUrl:   leagues.logoUrl,
      sportId:   sports.id,
      sportName: sports.name,
      sportSlug: sports.slug,
      // Home team (nullable join)
      homeId:        home.id,
      homeSportId:   home.sportId,
      homeName:      home.name,
      homeShortName: home.shortName,
      homeSlug:      home.slug,
      homeLogoUrl:   home.logoUrl,
      homeCountry:   home.country,
      // Away team (nullable join)
      awayId:        away.id,
      awaySportId:   away.sportId,
      awayName:      away.name,
      awayShortName: away.shortName,
      awaySlug:      away.slug,
      awayLogoUrl:   away.logoUrl,
      awayCountry:   away.country,
    })
    .from(fixtures)
    .innerJoin(seasons, eq(fixtures.seasonId,     seasons.id))
    .innerJoin(leagues, eq(seasons.leagueId,      leagues.id))
    .innerJoin(sports,  eq(leagues.sportId,       sports.id))
    .leftJoin(home,     eq(fixtures.homeTeamId,   home.id))
    .leftJoin(away,     eq(fixtures.awayTeamId,   away.id))
    .where(where.length ? and(...where) : undefined)
    .orderBy(fixtures.scheduledAt);

  return rows.map(row => ({
    id:          row.id,
    seasonId:    row.seasonId,
    scheduledAt: (row.scheduledAt as Date).toISOString(),
    status:      row.status as FixtureStatus,
    round:       row.round      ?? undefined,
    homeScore:   row.homeScore  ?? undefined,
    awayScore:   row.awayScore  ?? undefined,
    sportMeta:   (row.sportMeta as Record<string, unknown> | null) ?? undefined,
    league: {
      id:        row.leagueId,
      sportId:   row.leagueSportId,
      name:      row.leagueName,
      shortName: row.leagueShortName ?? undefined,
      slug:      row.leagueSlug,
      country:   row.leagueCountry  ?? undefined,
      logoUrl:   row.leagueLogoUrl  ?? undefined,
      sport: {
        id:   row.sportId,
        name: row.sportName,
        slug: row.sportSlug,
      },
    },
    homeTeam: row.homeId && row.homeName ? {
      id:        row.homeId,
      sportId:   row.homeSportId!,
      name:      row.homeName,
      shortName: row.homeShortName ?? undefined,
      slug:      row.homeSlug!,
      logoUrl:   row.homeLogoUrl   ?? undefined,
      country:   row.homeCountry   ?? undefined,
    } : undefined,
    awayTeam: row.awayId && row.awayName ? {
      id:        row.awayId,
      sportId:   row.awaySportId!,
      name:      row.awayName,
      shortName: row.awayShortName ?? undefined,
      slug:      row.awaySlug!,
      logoUrl:   row.awayLogoUrl   ?? undefined,
      country:   row.awayCountry   ?? undefined,
    } : undefined,
  }));
}
