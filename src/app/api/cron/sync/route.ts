import { revalidateTag } from 'next/cache';
import { syncFixtures } from '@/lib/sync/sync-fixtures';
import { FIXTURES_CACHE_TAG } from '@/lib/fixtures';

export const dynamic = 'force-dynamic';
// Upper bound for a forced full sync; also the Vercel Hobby limit
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');

  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ?force syncs every current season, ignoring the cadence
  const force = new URL(request.url).searchParams.has('force');
  const result = await syncFixtures({ force });

  // Expire immediately rather than stale-while-revalidate, so the next visitor sees new scores
  if (result.changed > 0) revalidateTag(FIXTURES_CACHE_TAG, { expire: 0 });

  const ok = result.errors.length === 0;
  return Response.json({ ok, ...result }, { status: ok ? 200 : 500 });
}
