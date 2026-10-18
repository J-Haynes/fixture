import { getMatchDetails, IncompleteDetails, NoDetails } from '@/lib/match-details';

// Served from the CDN after the first request; a finished match's details don't change
const COMPLETE   = 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800';
// Still filling in after full time: let a later tap try again
const INCOMPLETE = 'public, max-age=0, s-maxage=300';

export async function GET(_request: Request, ctx: RouteContext<'/api/fixtures/[id]/details'>) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': INCOMPLETE } });
  }

  try {
    return Response.json(await getMatchDetails(id), { headers: { 'Cache-Control': COMPLETE } });
  } catch (err) {
    if (err instanceof IncompleteDetails) {
      return Response.json(err.details, { headers: { 'Cache-Control': INCOMPLETE } });
    }
    if (err instanceof NoDetails) {
      return Response.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': INCOMPLETE } });
    }
    console.error(`[details:${id}]`, err);
    return Response.json({ error: 'Unavailable' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
