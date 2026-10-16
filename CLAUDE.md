@AGENTS.md

# Fixture — agent guide

> **Agents: USE this file, and UPDATE it.** Read it before you start work. When you change something it describes
> (a new league, a new env var, a new route, a changed sync cadence, a new integration) or find something in it that is
> wrong, fix this file in the same change. An out-of-date CLAUDE.md is worse than none: future agents will trust it.
> Keep it accurate and short. Facts belong here; one-off task notes do not.

## What this is

**Fixture** (package name `sportsapp`) is a mobile-first PWA that shows upcoming fixtures, live scores and recent
results for a hand-picked set of leagues. It is a single page: an **Upcoming** tab (scheduled / live / postponed /
cancelled) and a **Results** tab (finished, newest first), grouped by day in the viewer's local timezone. The window
shown is today ±14 days.

Leagues with provider config in `LEAGUE_CONFIG` ([src/lib/sync/sync-fixtures.ts](src/lib/sync/sync-fixtures.ts)).
The season that gets synced comes from the DB (`seasons.is_current` + `leagues.is_active`); all are `2026` today:

| Slug | League | TheSportsDB id | Kind |
|---|---|---|---|
| `super-rugby-pacific` | Super Rugby Pacific | 4551 | team vs team |
| `nrl` | NRL | 4416 | team vs team |
| `fifa-world-cup` | FIFA World Cup | 4429 | team vs team (national teams, `wc-<iso>` slugs) |
| `formula-1` | Formula 1 | 4370 | event (races, sprints, qualifying; practice filtered out) |
| `v8-supercars` | Supercars | 4489 | event |

## Tech stack

- **Next.js 16.3 (App Router)**, React 19.2, TypeScript (strict). Next 16 differs from older versions; see AGENTS.md.
  The bundled docs at `node_modules/next/dist/docs/` only exist after `npm install`.
- **Tailwind CSS v4** via `@tailwindcss/postcss` (no `tailwind.config`; styles in [src/app/globals.css](src/app/globals.css)).
  Dark zinc palette, emerald accent.
- **Drizzle ORM** + **postgres.js** against **Supabase Postgres** (pooler, so `prepare: false` in [src/db/index.ts](src/db/index.ts)).
- **Vercel** hosting, targeting the **Hobby** plan. The sync is scheduled by **Supabase pg_cron**
  ([supabase/cron.sql](supabase/cron.sql)); [vercel.json](vercel.json) keeps only a daily backup cron.
- Font: Geist via `next/font/google` (self-hosted at build).
- No test framework is set up.

## Commands

```bash
npm install
npm run dev          # next dev on :3000
npm run build        # production build
npm run start        # serve the build
npm run lint         # eslint (next core-web-vitals + typescript)
npm run typecheck    # tsc --noEmit
npm run db:push      # drizzle-kit push schema to DATABASE_URL (no migration files are kept)
npm run db:seed      # seed sports/leagues/seasons/teams (idempotent)
npm run db:studio    # drizzle studio
npm run sync         # hit /api/cron/sync on localhost with CRON_SECRET (needs dev server + jq); only due leagues
npm run sync:all     # same with ?force — sync every current season regardless of cadence
```

All `db:*` and `sync` scripts load `.env.local` via `dotenv-cli`. Run `lint` and `typecheck` before finishing a change.
`lint` has one known error in `InstallPrompt.tsx` (`react-hooks/set-state-in-effect`), which predates the efficiency
work. `next build` needs `DATABASE_URL` set, because `/api/cron/sync` imports `@/db`, which throws when it's missing.
With an unreachable URL, the page prerenders from mock data.

## Environment variables (`.env.local`, git-ignored)

| Var | Used by | Notes |
|---|---|---|
| `DATABASE_URL` | [src/db/index.ts](src/db/index.ts), drizzle config | Supabase **Session Pooler** URL. If unset, the app serves **mock data** from [src/lib/mock-data.ts](src/lib/mock-data.ts). If the DB is unreachable (`ENETUNREACH`/`ECONNREFUSED`/`ETIMEDOUT`), it falls back to mock data. |
| `THESPORTSDB_API_KEY` | [src/lib/sync/thesportsdb.ts](src/lib/sync/thesportsdb.ts) | Goes in the URL path (v1 API). |
| `CRON_SECRET` | [src/app/api/cron/sync/route.ts](src/app/api/cron/sync/route.ts) | Sent as `Authorization: Bearer …` by Supabase pg_cron (from the Vault secret `fixture_cron_secret`, which must match) and by Vercel Cron. |

There is no `.env.example` in the repo (the `.env*` ignore rule would exclude it), although an error message in
`src/db/index.ts` refers to one.

## Architecture and data flow

```
TheSportsDB v1 ──(Supabase pg_cron every 2 min; only due leagues fetched)──▶ /api/cron/sync ──▶ syncFixtures() ──▶ Postgres
                                                                              │ changed > 0
                                                       revalidateTag('fixtures', { expire: 0 })
                                                                              ▼
Browser ◀── page.tsx (ISR, revalidate 3600) ◀── getCachedFixtures (unstable_cache, tag 'fixtures') ◀── Postgres
```

- **[src/app/page.tsx](src/app/page.tsx)**: statically rendered and cached (ISR, `revalidate = 3600`). It reads through
  `getCachedFixtures`, so page views don't hit the DB. The sync route expires the `fixtures` tag whenever it changes
  data, and the hourly revalidate rolls the ±14-day window forward. **Don't make this page dynamic again**, and don't
  read `cookies()`/`headers()` here: either one would put a DB query back on every request. The app deliberately
  does **not** enable `cacheComponents`.
- **[src/components/fixtures/FixtureFeed.tsx](src/components/fixtures/FixtureFeed.tsx)**: the only stateful client
  component (tab switch, local-date grouping). It hides `scheduled` fixtures more than 10 minutes past kickoff. "Now"
  comes from `useSyncExternalStore`, which uses the server's `renderedAt` during hydration and then a once-a-minute
  clock, so cached HTML still hydrates cleanly. There is no client polling: data refreshes only on reload. Any polling
  added later must hit cached data.
- **[src/components/fixtures/FixtureCard.tsx](src/components/fixtures/FixtureCard.tsx)**: per-league banner colours
  (`LEAGUE_BANNER`, keyed by league slug). Uses `TeamMatchLayout` when both teams exist, otherwise `EventLayout`
  (motorsport: event name + podium from `sportMeta`).
- **[src/lib/fixtures.ts](src/lib/fixtures.ts)**: `getFixtures()`, the one read path (DB or mock), plus
  `getCachedFixtures` and `FIXTURES_CACHE_TAG`. It uses dynamic imports so the postgres client isn't loaded when
  there is no DB. If the DB is unreachable, the mock fallback can stay cached for up to an hour.
- **[src/lib/dates.ts](src/lib/dates.ts)**: all date display is in browser-local time. Elements that render dates
  use `suppressHydrationWarning`.

### Sync ([src/lib/sync/sync-fixtures.ts](src/lib/sync/sync-fixtures.ts))

The sync is built to make as few API calls and DB writes as possible. Each run:
1. **Activity check:** one grouped query over current seasons (`loadSeasonActivity`). It decides which leagues are
   due, using `seasons.last_synced_at` and `CADENCE`:

   | Tier | When | Interval |
   |---|---|---|
   | live | an open fixture is in play, or kicks off within 15 min (window = `maxGameDurationHours` + 30 min grace) | every run (2 min) |
   | matchday | a fixture kicked off in the last 12h or kicks off within 3h | 15 min |
   | inSeason | fixtures still to play, or the season has no fixtures yet | 6h |
   | offSeason | every fixture finished | 24h |

   If nothing is due, the run ends there: no API calls and no writes. `?force` skips this check.
2. Teams and team mappings are loaded **once** per run (`loadContext`).
3. For each due league: make one `eventsseason.php` call, apply `sessionFilter`, then load that **season's** existing
   fixtures keyed by provider event ID.
4. For each event: resolve teams (external ID first, then fuzzy `findTeamByName`, saving any new mapping). **Only
   columns that differ are UPDATEd**, so most runs write nothing. New events are INSERTed, along with an upserted
   `external_ids` row.
5. Podium (`fetchResults` leagues): for finished events without `sportMeta.podium`, call `eventresults.php`. Empty
   results set `sportMeta.podiumCheckedAt`; the call is retried every 30 min and abandoned 3 days after the event.
6. `seasons.last_synced_at` is set for each league that syncs successfully. A failing league doesn't block the
   others; its error is returned in `errors` and the route responds 500.
7. `sync_log` gets a row only when something changed or errored. Rows older than 30 days are pruned.
8. The route calls `revalidateTag(FIXTURES_CACHE_TAG, { expire: 0 })` when `changed > 0`.

Because the sync only writes changed rows and revalidates only on change, **any new field shown in the UI must be
part of the change comparison in `syncLeague`**. Otherwise updates to it won't reach the cached page.

`mapStatus` maps TheSportsDB `strStatus` to `FixtureStatus`. When the API gives no status, a kickoff in the past means
`live` until `maxGameDurationHours` have elapsed, and `finished` after that.

**Adding a league:** add the sport/league/season (and teams for team sports) to [src/db/seed.ts](src/db/seed.ts) and
run `db:seed`. Add an entry to `LEAGUE_CONFIG`, a banner in `LEAGUE_BANNER`, and logos under `public/` (PNGs pre-sized
to at most 144 px; see below). Update the table above. **New season:** seed a season row with `is_current = true`
and set the old one to `false`. No code change is needed.

## Database schema ([src/db/schema/](src/db/schema/))

- `sports` (name, slug) → `leagues` (slug unique, logoUrl, isActive) → `seasons` (leagueId+year unique, isCurrent,
  `last_synced_at`, which the sync cadence uses)
- `teams` (sportId, slug unique, logoUrl, shortName)
- `fixtures`: seasonId, nullable home/away team ids (null for motorsport), `scheduled_at` timestamptz (UTC),
  `status` text (`scheduled|live|finished|postponed|cancelled`), round, scores, and `sport_meta` jsonb
  (`eventName`, `podium: string[]`, `podiumCheckedAt`). Indexed on `(season_id, scheduled_at)` and `scheduled_at`.
- `external_ids`: maps internal IDs to provider IDs (`entity_type`, `entity_id`, `provider`, `external_id`). It has
  two unique keys, `(entity_type, entity_id, provider)` and `(provider, entity_type, external_id)`; the sync's upsert
  targets the second.
- `sync_log`: rows only for runs that changed data or errored, kept for 30 days

**Row-level security is on for every table, with no policies.** The app connects as `postgres`, which has
`BYPASSRLS`, so it is unaffected; the Supabase Data API (`anon`/`authenticated` roles) is locked out. Every new
table must end in `.enableRLS()`. Never use the anon key or the Data API from the app without adding policies first.
[supabase/enable-rls.sql](supabase/enable-rls.sql) applies the same thing from the SQL editor.

Schema changes go through `npm run db:push`. There is no `drizzle/` migrations folder in git. **Push the schema before
deploying code that depends on it.** The sync queries `seasons.last_synced_at`, for example.

## HTTP routes

| Route | Purpose |
|---|---|
| `GET /` | The app |
| `GET /api/cron/sync[?force]` | Runs the sync. Requires `Authorization: Bearer $CRON_SECRET`. Returns `{ ok, synced, skipped, processed, changed, errors }`. |
| `/icon`, `/apple-icon` | Generated by `ImageResponse` ([src/app/icon.tsx](src/app/icon.tsx), [apple-icon.tsx](src/app/apple-icon.tsx)) |

## External integrations

- **TheSportsDB v1** (`https://www.thesportsdb.com/api/v1/json/{key}/…`). Endpoints used: `eventsseason.php?id&s`
  and `eventresults.php?id`. Timestamps are UTC without a `Z`, so the code appends `'Z'`. Status/score fields are
  strings and are often empty.
- **Supabase Postgres**: use the pooler connection string; direct IPv6 connections fail from many networks.
- **Scheduling**: Supabase `pg_cron` + `pg_net` call `GET /api/cron/sync` every 2 minutes
  ([supabase/cron.sql](supabase/cron.sql)). The URL and secret are Vault secrets `fixture_sync_url` and
  `fixture_cron_secret`. This is cheap because quiet runs return after one DB query, and the real cadence lives in
  code (`CADENCE`), not in the cron schedule. The SQL file is applied by hand in the Supabase SQL editor; it is
  **not** part of `db:push`. Debug through `cron.job_run_details` and `net._http_response` (queries are in the file).
- **Vercel Cron**: daily backup run only (`0 4 * * *`). The Hobby plan rejects anything more frequent at deploy time,
  so don't add sub-daily Vercel crons. The route sets `maxDuration = 60`, which is the Hobby limit.
- **Database client** ([src/db/index.ts](src/db/index.ts)): `max: 1` connection per serverless instance with
  `idle_timeout: 20`. Queries run sequentially, so `Promise.all` over DB calls gains nothing.

## PWA

[public/manifest.json](public/manifest.json) and [public/sw.js](public/sw.js) (registered by
`ServiceWorkerRegistration`) provide the PWA. The service worker is **network-first** for pages, skips `/api/*` and
`/_next/*`, and pre-caches `/`, the manifest and `icon.svg`. Bump `CACHE` in `sw.js` when the shell changes.
`InstallPrompt` handles both Android's `beforeinstallprompt` and the iOS manual instructions.

## Conventions and gotchas

- Path alias `@/*` → `src/*`. Formatting: single quotes and semicolons, with column-aligned object literals in
  config-like code. Match the surrounding style.
- Store times in UTC and render them in local time. Never format dates on the server.
- Static assets: league logos in `public/logos/`, Super Rugby teams in `public/rugby/`, NRL teams in
  `public/rugbyleague/`, World Cup flags in `public/country/<iso>.svg`. Team avatars use `next/image` with
  `unoptimized`, and league logos use plain `<img>`. Neither goes through Vercel Image Optimization, so **resize
  PNG/JPG logos to at most 144 px before committing** (3× the largest 48 px display size).
- [next.config.ts](next.config.ts) sets a strict CSP (`img-src 'self' data: blob:`, `connect-src 'self'`). Remote
  images or API calls from the browser need CSP changes and `images.remotePatterns`.
- The repo has both `README.md` (create-next-app boilerplate) and `readme.md` (`#SportsApp`). Those names collide on
  case-insensitive filesystems.
- `manifest.json` refers to `/icon.png` and `/apple-icon.png`, but Next serves the generated icons at `/icon` and
  `/apple-icon`.
