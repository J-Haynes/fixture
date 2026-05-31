import type { Fixture, FixturesQueryParams, FixturesResponse } from './types';
import { MOCK_FIXTURES } from './mock-data';

/**
 * Fetch fixtures for a given date range.
 * Currently returns mock data — swap the body for a Drizzle/Supabase query
 * when the DB pipeline is wired up.
 */
export async function getFixtures(params: FixturesQueryParams = {}): Promise<FixturesResponse> {
  const { from, to, leagueId, status } = params;

  let fixtures: Fixture[] = [...MOCK_FIXTURES];

  // Date filtering uses UTC date portion of the ISO timestamp.
  if (from) {
    fixtures = fixtures.filter(f => f.scheduledAt.slice(0, 10) >= from);
  }
  if (to) {
    fixtures = fixtures.filter(f => f.scheduledAt.slice(0, 10) <= to);
  }
  if (leagueId !== undefined) {
    fixtures = fixtures.filter(f => f.league.id === leagueId);
  }
  if (status) {
    fixtures = fixtures.filter(f => f.status === status);
  }

  fixtures.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  return {
    fixtures,
    from: from ?? '',
    to: to ?? '',
  };
}
