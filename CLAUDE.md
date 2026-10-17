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
The season that gets synced comes from the DB (`seasons.is_current` + `leagues.is_active`), and the sync rolls it
over to the next year by itself. All are `2026` as of Oct 2026; the World Cup is inactive (finished, next in 2030):

| Slug | League | TheSportsDB id | Kind |
|---|---|---|---|
| `super-rugby-pacific` | Super Rugby Pacific | 4551 | team vs team |
| `nrl` | NRL | 4416 | team vs team |
| `fifa-world-cup` | FIFA World Cup | 4429 | team vs team (national teams, `wc-<iso>` slugs) |
| `formula-1` | Formula 1 | 4370 | event (races, sprints, qualifying; practice filtered out) |
| `v8-supercars` | Supercars | 4489 | event |
| `afl` | AFL | 4456 | team vs team (`afl-*` slugs, season `2026` until 2027 is published) |
| `a-league-men` | A-League Men | 4356 | team vs team (`alm-*` slugs, season `2026-2027`) |
| `premier-league` | Premier League | 4328 | team vs team (`epl-*` slugs, season `2026-2027`) |
| `champions-league` | UEFA Champions League | 4480 | team vs team (league phase onward; July–Aug qualifiers filtered out). Reuses existing clubs (e.g. `epl-arsenal`); other clubs are `club-*` |

**Teams are shared across competitions.** TheSportsDB uses one `idTeam` per club, and the sync resolves teams by
that ID first, so Arsenal's Premier League and Champions League fixtures point at the same `teams` row. When
adding a competition, seed only the clubs we don't have yet; slugs keep their original prefix.

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
npm run db:seed      # seed sports/leagues/first seasons/teams (idempotent; never changes an existing current season)
npm run season       # list seasons; `-- roll <league> <year>`, `-- deactivate|activate <league>`
npm run db:studio    # drizzle studio
npm run sync         # hit /api/cron/sync on localhost with CRON_SECRET (needs dev server + jq); only due leagues
npm run sync:all     # same with ?force — sync every current season regardless of cadence
npm run icons        # regenerate favicon, apple-icon and PWA PNGs from src/app/icon.svg (sharp)
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
  clock, so cached HTML still hydrates cleanly. For the same reason it groups by **UTC** day during the server render
  and hydration (`isClient` false), then regroups by local day. Grouping by local day in the first render breaks
  hydration (React #418) whenever UTC and local dates differ. While any fixture is live (or past kickoff but still `scheduled`), it calls
  `router.refresh()` every 2 min. It also refreshes when the tab or PWA comes back after more than 5 min. Both
  re-request the ISR-cached route, never the DB; keep any future polling on cached data too.
- **[src/components/fixtures/FixtureCard.tsx](src/components/fixtures/FixtureCard.tsx)**: per-league banner colours
  come from `leagueBanner(slug)` in [src/lib/league-theme.ts](src/lib/league-theme.ts), shared with the menu. Uses `TeamMatchLayout` when both teams exist, otherwise `EventLayout`
  (motorsport: event name + podium from `sportMeta`).
- **[src/lib/fixtures.ts](src/lib/fixtures.ts)**: `getFixtures()`, the one read path (DB or mock), plus
  `getCachedFixtures` and `FIXTURES_CACHE_TAG`. It uses dynamic imports so the postgres client isn't loaded when
  there is no DB. If the DB is unreachable, the mock fallback can stay cached for up to an hour.
- **[src/components/layout/AppHeader.tsx](src/components/layout/AppHeader.tsx)**: a 3-column grid with `NavDrawer`
  (hamburger + left drawer, portalled to `<body>`; empty apart from a placeholder Settings button), the centred logo,
  and `HeaderClock` (today's date/time, rendered only on the client). The minute clock lives in
  [src/lib/clock.ts](src/lib/clock.ts) and is shared with `FixtureFeed`.
- **Filters (menu):** `LeagueFilterList` has a **My teams** section (followed teams, shown in every competition they
  play in; `MyTeamsList` caps it at four measured rows plus a half-visible fifth, with a Show all button) and the league list. Tapping a league row toggles it (a hidden league is greyed out). The chevron (team
  sports only) expands an **All games / My teams only** toggle and the league's teams with follow stars.
  `isFixtureVisible` in [src/lib/preferences.ts](src/lib/preferences.ts) is the single rule: a hidden league shows
  nothing; a "mine" league shows only fixtures with a followed team (motorsport is exempt). The Champions League
  defaults to "mine" (`MY_TEAMS_BY_DEFAULT`). Prefs are `v: 2` (`hiddenLeagues`, `followedTeams` as team slugs,
  `leagueModes`) and `v: 1` is migrated on read. The menu's team lists come from each league's current-season
  fixtures (`getCachedLeagues`).
  The leagues come from `getCachedLeagues` (active leagues, same cache tag). Choices live in `localStorage`
  (`fixture:prefs`, read by `usePreferences()` in [src/lib/preferences.ts](src/lib/preferences.ts)), and
  `FixtureFeed` filters on the client. Hidden leagues are stored rather than shown ones, so new leagues appear by
  default. The server render always shows everything, so a returning user with hidden leagues sees them for an
  instant before hydration.
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
3. For each due league: make one `eventsseason.php` call and apply `sessionFilter`. In the **live** tier, also call
   `eventsday.php` for today (and yesterday, for games that started before midnight UTC) and overlay its
   status/scores (`withLiveData`): `eventsseason.php` is served from a TheSportsDB cache up to about 15 min stale,
   while `eventsday.php` is fresh. Then load that **season's** existing fixtures keyed by provider event ID.
4. For each event: resolve teams (external ID first, then fuzzy `findTeamByName` limited to the league's sport,
   saving any new mapping). Rounds come from `roundLabel` (TheSportsDB codes: 0 = Opening Round, 500 = Pre-season,
   200 = Final, other 100+ values = Finals; a league can override this with `LeagueConfig.roundLabel`). Status codes
   follow API-Football: `FT`/`AET`/`PEN` are finished; `ET`/`BT`/`P` are extra time, the break before it and a
   shoot-out in progress. **Only
   columns that differ are UPDATEd**, so most runs write nothing. New events are INSERTed, along with an upserted
   `external_ids` row.
5. Podium (`fetchResults` leagues): for finished events without `sportMeta.podium`, call `eventresults.php`. Empty
   results set `sportMeta.podiumCheckedAt`; the call is retried every 30 min and abandoned 3 days after the event.
6. **Season rollover:** if a synced season's last fixture was more than 7 days ago, ask the provider for the next
   season (`nextSeasonYear`: `2026` → `2027`, `2025-2026` → `2026-2027`). If it has events, `setCurrentSeason`
   ([src/lib/sync/seasons.ts](src/lib/sync/seasons.ts)) makes it the league's only current season, and the next
   cron run imports it. That's one extra API call per finished league per day. Rollovers show in `rolled` and in a
   `sync_log` row with `entity_type = 'seasons'`.
7. `seasons.last_synced_at` is set for each league that syncs successfully. A failing league doesn't block the
   others; its error is returned in `errors` and the route responds 500.
8. `sync_log` gets a row only when something changed or errored. Rows older than 30 days are pruned.
9. The route calls `revalidateTag(FIXTURES_CACHE_TAG, { expire: 0 })` when `changed > 0`.

Because the sync only writes changed rows and revalidates only on change, **any new field shown in the UI must be
part of the change comparison in `syncLeague`**. Otherwise updates to it won't reach the cached page.

`mapStatus` maps TheSportsDB `strStatus` to `FixtureStatus`. When the API gives no status, a kickoff in the past means
`live` until `maxGameDurationHours` have elapsed, and `finished` after that.

**Adding a league:** add it to [src/db/seed.ts](src/db/seed.ts). For team sports, use `seedTeamLeague` with each
team's TheSportsDB `idTeam` (from `search_all_teams.php?l=<league name>`), so the sync maps teams by ID instead of
guessing by name. Run `db:seed`. Add an entry to `LEAGUE_CONFIG`, a banner in `league-theme.ts`, and logos under
`public/` (PNGs pre-sized to at most 144 px; see below). Seeding is safe ahead of a deploy: the sync skips leagues
that have no `LEAGUE_CONFIG`, and a new season (null `last_synced_at`) is imported on the first cron run after
deploy. Update the table above. **New season:** automatic (step 6). To force one, or to start a season before the old one
has finished, run `npm run season -- roll <league> <year>`. Nothing in the code changes. `db:seed` only creates a
league's *first* season and inserts no fixtures.

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
| `GET /api/cron/sync[?force]` | Runs the sync. Requires `Authorization: Bearer $CRON_SECRET`. Returns `{ ok, synced, skipped, processed, changed, rolled, errors }`. |
| `/icon.svg`, `/apple-icon.png`, `/favicon.ico` | File-based metadata icons in `src/app/` (don't also put `icon.svg` in `public/`; the paths would clash) |

## External integrations

- **TheSportsDB v1** (`https://www.thesportsdb.com/api/v1/json/{key}/…`). Endpoints used: `eventsseason.php?id&s`,
  `eventsday.php?d&l` (live tier only) and `eventresults.php?id`. Timestamps are UTC without a `Z`, so the code appends `'Z'`. Status/score fields are
  strings and are often empty.
- **Supabase Postgres**: use the pooler connection string; direct IPv6 connections fail from many networks.
- **Scheduling**: Supabase `pg_cron` + `pg_net` call `GET /api/cron/sync` every 2 minutes
  ([supabase/cron.sql](supabase/cron.sql)). The URL and secret are Vault secrets `fixture_sync_url` and
  `fixture_cron_secret`. This is cheap because quiet runs return after one DB query, and the real cadence lives in
  code (`CADENCE`), not in the cron schedule. The SQL file is applied by hand in the Supabase SQL editor; it is
  **not** part of `db:push`. Debug through `cron.job_run_details` and `net._http_response` (queries are in the file).
- **Vercel region**: functions are pinned to `syd1` in [vercel.json](vercel.json), next to the Supabase database
  (`ap-southeast-2`). In the default `iad1`, every query crossed the Pacific: a quiet sync run took about 1.6 s of
  wall time (billed as provisioned memory) for about 110 ms of CPU. Hobby allows a single region.
- **Vercel Cron**: daily backup run only (`0 4 * * *`). The Hobby plan rejects anything more frequent at deploy time,
  so don't add sub-daily Vercel crons. The route sets `maxDuration = 60`, which is the Hobby limit.
- **Database client** ([src/db/index.ts](src/db/index.ts)): `max: 1` connection per serverless instance with
  `idle_timeout: 20`. Queries run sequentially, so `Promise.all` over DB calls gains nothing.

## PWA

[public/manifest.json](public/manifest.json) and [public/sw.js](public/sw.js) (registered by
`ServiceWorkerRegistration`) provide the PWA. The service worker is **network-first** for pages, skips `/api/*` and
`/_next/*`, and pre-caches `/`, the manifest and `icon.svg`. The logo master is [src/app/icon.svg](src/app/icon.svg); the manifest
uses it plus `public/icon-{192,512}.png` and `icon-maskable-512.png`, made by `npm run icons`. Bump `CACHE` in `sw.js` when the shell changes.
`InstallPrompt` handles both Android's `beforeinstallprompt` and the iOS manual instructions.

## Conventions and gotchas

- Path alias `@/*` → `src/*`. Formatting: single quotes and semicolons, with column-aligned object literals in
  config-like code. Match the surrounding style.
- Store times in UTC and render them in local time. Never format dates on the server.
- Static assets: league logos in `public/logos/`, Super Rugby teams in `public/rugby/`, NRL teams in
  `public/rugbyleague/`, AFL in `public/afl/`, A-League Men in `public/aleague/`, Premier League in `public/epl/`,
  other clubs (Champions League) in `public/clubs/`, World Cup flags in `public/country/<iso>.svg`. Team avatars use `next/image` with
  `unoptimized`, and league logos use plain `<img>`. Neither goes through Vercel Image Optimization, so **resize
  PNG/JPG logos to at most 144 px before committing** (3× the largest 48 px display size).
- [next.config.ts](next.config.ts) sets a strict CSP (`img-src 'self' data: blob:`, `connect-src 'self'`). Remote
  images or API calls from the browser need CSP changes and `images.remotePatterns`.
- The repo has both `README.md` (create-next-app boilerplate) and `readme.md` (`#SportsApp`). Those names collide on
  case-insensitive filesystems.
