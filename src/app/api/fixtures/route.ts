import { NextRequest, NextResponse } from 'next/server';
import { getFixtures } from '@/lib/fixtures';
import type { FixturesQueryParams, FixtureStatus } from '@/lib/types';

const STATUSES = new Set<FixtureStatus>(['scheduled', 'live', 'finished', 'postponed', 'cancelled']);
const DATE_RE  = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: string): boolean {
  return DATE_RE.test(value) && !Number.isNaN(new Date(value + 'T00:00:00Z').getTime());
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const from     = searchParams.get('from')     ?? undefined;
  const to       = searchParams.get('to')       ?? undefined;
  const leagueId = searchParams.get('leagueId') ?? undefined;
  const status   = searchParams.get('status')   ?? undefined;

  if (from     && !isValidDate(from))                     return badRequest('Invalid "from" date, expected YYYY-MM-DD');
  if (to       && !isValidDate(to))                       return badRequest('Invalid "to" date, expected YYYY-MM-DD');
  if (leagueId && !/^[1-9]\d{0,9}$/.test(leagueId))       return badRequest('Invalid "leagueId"');
  if (status   && !STATUSES.has(status as FixtureStatus)) return badRequest('Invalid "status"');

  const params: FixturesQueryParams = {
    from,
    to,
    leagueId: leagueId ? Number(leagueId) : undefined,
    status:   status as FixtureStatus | undefined,
  };

  const data = await getFixtures(params);
  return NextResponse.json(data);
}
