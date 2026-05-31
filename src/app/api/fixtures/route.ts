import { NextRequest, NextResponse } from 'next/server';
import { getFixtures } from '@/lib/fixtures';
import type { FixturesQueryParams, FixtureStatus } from '@/lib/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const params: FixturesQueryParams = {
    from:     searchParams.get('from')     ?? undefined,
    to:       searchParams.get('to')       ?? undefined,
    leagueId: searchParams.has('leagueId') ? Number(searchParams.get('leagueId')) : undefined,
    status:   (searchParams.get('status') as FixtureStatus) ?? undefined,
  };

  const data = await getFixtures(params);
  return NextResponse.json(data);
}
