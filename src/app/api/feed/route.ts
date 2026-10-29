import type { NextRequest } from 'next/server';
import { getCachedFixtures } from '@/lib/fixtures';
import type { Fixture, Team } from '@/lib/types';

// A JSON feed for dashboards (e.g. Homepage's customapi widget). It reads the same cached
// ±14-day window as the page, so a request never queries the DB, and the CDN absorbs polling.
const CACHE         = 'public, max-age=60, s-maxage=120, stale-while-revalidate=600';
const CORS          = { 'Access-Control-Allow-Origin': '*' };
const DEFAULT_LIMIT = 10;
const MAX_LIMIT     = 50;
const DEFAULT_TZ    = 'Pacific/Auckland';

const UPCOMING_STATUSES  = new Set(['scheduled', 'live', 'postponed', 'cancelled']);
// Same rule as the feed: a scheduled game over 10 minutes past kickoff should already be live
const STALE_SCHEDULED_MS = 10 * 60 * 1000;

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function list(param: string | null) {
  return param ? new Set(param.split(',').map(s => s.trim()).filter(Boolean)) : undefined;
}

function badRequest(error: string) {
  return Response.json({ error }, { status: 400, headers: { ...CORS, 'Cache-Control': CACHE } });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const view = params.get('view') ?? 'upcoming';
  if (view !== 'upcoming' && view !== 'results') return badRequest('view must be "upcoming" or "results"');

  const limit = params.has('limit') ? Number(params.get('limit')) : DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) return badRequest(`limit must be 1–${MAX_LIMIT}`);

  const tz = params.get('tz') ?? DEFAULT_TZ;
  let when: Intl.DateTimeFormat;
  try {
    when = new Intl.DateTimeFormat('en-NZ', {
      timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return badRequest('tz must be an IANA time zone, e.g. Pacific/Auckland');
  }

  const leagues = list(params.get('leagues'));
  const teams   = list(params.get('teams'));

  // Same window (and so the same cache entry) as the page
  const now  = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 14);
  const to   = new Date(now);
  to.setDate(to.getDate() + 14);
  const { fixtures } = await getCachedFixtures({ from: isoDate(from), to: isoDate(to) });

  const cutoff = now.getTime() - STALE_SCHEDULED_MS;
  const items = fixtures
    .filter(f => view === 'results'
      ? f.status === 'finished'
      : UPCOMING_STATUSES.has(f.status) && (f.status !== 'scheduled' || Date.parse(f.scheduledAt) >= cutoff))
    .filter(f => !leagues || leagues.has(f.league.slug))
    .filter(f => !teams || [f.homeTeam, f.awayTeam].some(t => t && teams.has(t.slug)))
    .sort((a, b) => view === 'results'
      ? b.scheduledAt.localeCompare(a.scheduledAt)
      : a.scheduledAt.localeCompare(b.scheduledAt))
    .slice(0, limit)
    .map(f => toItem(f, when, request.nextUrl.origin));

  return Response.json(
    { view, updatedAt: now.toISOString(), items },
    { headers: { ...CORS, 'Cache-Control': CACHE } },
  );
}

// Logos are stored as site paths (e.g. /rugby/blues.png); the feed is read from other sites, so make them absolute
function absolute(url: string | undefined, origin: string) {
  return url ? new URL(url, origin).href : null;
}

function team(t: Team | undefined, origin: string) {
  return t ? { name: t.name, slug: t.slug, logo: absolute(t.logoUrl, origin) } : null;
}

function toItem(f: Fixture, when: Intl.DateTimeFormat, origin: string) {
  const hasScore = f.homeScore != null && f.awayScore != null;
  const score    = hasScore ? `${f.homeScore}–${f.awayScore}` : undefined;
  const title    = f.homeTeam && f.awayTeam
    ? `${f.homeTeam.name} v ${f.awayTeam.name}`
    : (f.sportMeta?.eventName as string | undefined) ?? f.league.name;
  const kickoff  = when.format(new Date(f.scheduledAt));

  // One ready-made line for widgets that show a single label per row
  const summary =
    f.status === 'finished'  ? (score ?? 'FT') :
    f.status === 'live'      ? (score ? `LIVE ${score}` : 'LIVE') :
    f.status === 'postponed' ? 'Postponed' :
    f.status === 'cancelled' ? 'Cancelled' :
    kickoff;

  return {
    id:          f.id,
    league:      f.league.shortName ?? f.league.name,
    leagueSlug:  f.league.slug,
    leagueLogo:  absolute(f.league.logoUrl, origin),
    round:       f.round ?? null,
    title,
    home:        team(f.homeTeam, origin),
    away:        team(f.awayTeam, origin),
    homeScore:   f.homeScore ?? null,
    awayScore:   f.awayScore ?? null,
    score:       score ?? null,
    podium:      (f.sportMeta?.podium as string[] | undefined) ?? null,
    status:      f.status,
    scheduledAt: f.scheduledAt,
    kickoff,
    summary,
  };
}
