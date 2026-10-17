@AGENTS.md

# Fixture — agent guide

> **Agents: USE this file, and UPDATE it.** Read it before you start work. When you change something it describes
> (a new league, a new env var, a new route, a changed sync cadence, a new integration) or find something in it that is
> wrong, fix this file in the same change. An out-of-date CLAUDE.md is worse than none: future agents will trust it.
> Keep it accurate and short. Facts belong here; one-off task notes do not.

## What this is

**Fixture** (package name `sportsapp`) is a mobile-first PWA at **https://www.fixture.nz** that shows upcoming
fixtures, live scores and recent results for a hand-picked set of leagues. It is a single page: an **Upcoming** tab
(scheduled / live / postponed / cancelled) and a **Results** tab (finished, newest first), grouped by day in the
viewer's local timezone. The window shown is today ±14 days. A hamburger menu lets each viewer turn leagues on or
off and follow teams (see **Filters** below); these choices are stored on the device, with no accounts.

**Backlog:** GitHub issues on `J-Haynes/fixture`. Issue **#9** is the tracker, with phases and done/not-done ticks.
Issues carry `size: S/M/L` labels. Keep #9 in step when you finish or add work.

Leagues with provider config in `LEAGUE_CONFIG` ([src/lib/sync/sync-fixtures.ts](src/lib/sync/sync-fixtures.ts)).
The season that gets synced comes from the DB (`seasons.is_current` + `leagues.is_active`), and the sync rolls it
over to the next season by itself. Status as of Oct 2026:

| Slug | League | TheSportsDB id | Season | Kind |
|---|---|---|---|---|
| `super-rugby-pacific` | Super Rugby Pacific | 4551 | `2026` | team vs team |
| `nrl` | NRL | 4416 | `2026` | team vs team |
| `afl` | AFL | 4456 | `2026` (→ 2027 when published) | team vs team (`afl-*` slugs) |
| `a-league-men` | A-League Men | 4356 | `2026-2027` | team vs team (`alm-*`) |
| `premier-league` | Premier League | 4328 | `2026-2027` | team vs team (`epl-*`) |
| `champions-league` | UEFA Champions League | 4480 | `2026-2027` | team vs team; league phase onward (July–Aug qualifiers filtered out); non-EPL clubs are `club-*` |
| `formula-1` | Formula 1 | 4370 | `2026` | event (races, sprints, qualifying; practice filtered out) |
| `v8-supercars` | Supercars | 4489 | `2026` | event |
| `fifa-world-cup` | FIFA World Cup | 4429 | `2026` | **inactive** (finished; next in 2030). National teams, `wc-<iso>` slugs |

**Teams are shared across competitions.** TheSportsDB uses one `idTeam` per club, and the sync resolves teams by
that ID first, so Arsenal's Premier League and Champions League fixtures point at the same `teams` row, and
following Arsenal covers both. When adding a competition, seed only the clubs we don't have yet; slugs keep their
original prefix. National teams are separate teams from clubs.

## Tech stack

- **Next.js 16.3 (App Router)**, React 19.2, TypeScript (strict). Next 16 differs from older versions; see AGENTS.md.
  The bundled docs at `node_modules/next/dist/docs/` only exist after `npm install`.
- **Tailwind CSS v4** via `@tailwindcss/postcss` (no `tailwind.config`; styles in [src/app/globals.css](src/app/globals.css)).
  Dark zinc palette, emerald accent.
- **Drizzle ORM** + **postgres.js** against **Supabase Postgres** (pooler, so `prepare: false` in [src/db/index.ts](src/db/index.ts)).
- **Vercel** hosting (team `jhaynes-projects`, project `fixture`). The account is on Pro, but the app is built to fit
  the **Hobby** plan (see **Hosting costs**). The sync is scheduled by **Supabase pg_cron**
  ([supabase/cron.sql](supabase/cron.sql)); [vercel.json](vercel.json) keeps only a daily backup cron.
- Font: Geist via `next/font/google` (self-hosted at build).
- No test framework is set up. Changes have been verified with `typecheck`/`lint`, a production build, and headless
  Playwright scripts against `next start` (kept outside the repo).

## Commands

```bash
npm install
npm run dev          # next dev on :3000
npm run build        # production build
npm run start        # serve the build
npm run lint         # eslint (next core-web-vitals + typescript)
npm run typecheck    # tsc --noEmit
npm run db:push      # drizzle-kit push schema to DATABASE_URL (no migration files are kept)
npm run db:seed      # seed sports/leagues/first seasons/teams + TheSportsDB team IDs (idempotent; never changes an existing current season)
npm run season       # list seasons; `-- roll <league> <year>`, `-- deactivate|activate <league>`
npm run db:studio    # drizzle studio
npm run sync         # hit /api/cron/sync on localhost with CRON_SECRET (needs dev server + jq); only due leagues
npm run sync:all     # same with ?force — sync every current season regardless of cadence
npm run icons        # regenerate favicon, apple-icon and PWA PNGs from src/app/icon.svg (sharp)
```

All `db:*`, `season` and `sync` scripts load `.env.local` via `dotenv-cli`. Run `lint` and `typecheck` before
finishing a change. `lint` has one known error in `InstallPrompt.tsx` (`react-hooks/set-state-in-effect`), which
predates this work. `next build` needs `DATABASE_URL` set, because `/api/cron/sync` imports `@/db`, which throws when
it's missing. With an unreachable URL, the page prerenders from mock data.

**There is only one database, and it is production's.** `.env.local` points at the live Supabase DB, so `db:seed`,
`season`, and `sync` run from a dev server all write production data, and fixture.nz shows the results on its next
revalidation. Seeding leagues/teams is invisible until fixtures exist, so seed ahead of a deploy, but don't import
fixtures for a new league before the code (config, logos, banner) is live. Locally, `unstable_cache` entries persist
in `.next/cache/fetch-cache` across builds; delete it if a local build shows stale data.

## Environment variables (`.env.local`, git-ignored)

| Var | Used by | Notes |
|---|---|---|
| `DATABASE_URL` | [src/db/index.ts](src/db/index.ts), drizzle config | Supabase **Session Pooler** URL. If unset, the app serves **mock data** from [src/lib/mock-data.ts](src/lib/mock-data.ts). If the DB is unreachable (`ENETUNREACH`/`ECONNREFUSED`/`ETIMEDOUT`), it falls back to mock data. |
| `THESPORTSDB_API_KEY` | [src/lib/sync/thesportsdb.ts](src/lib/sync/thesportsdb.ts) | Goes in the URL path (v1 API). It's a personal key, not the public free `123` key; it returns full season lists. |
| `CRON_SECRET` | [src/app/api/cron/sync/route.ts](src/app/api/cron/sync/route.ts) | Sent as `Authorization: Bearer …` by Supabase pg_cron (from the Vault secret `fixture_cron_secret`, which must match) and by Vercel Cron. |

There is no `.env.example` in the repo (the `.env*` ignore rule would exclude it), although an error message in
`src/db/index.ts` refers to one.

## Architecture and data flow

```
TheSportsDB v1 ──(Supabase pg_cron every 2 min; only due leagues fetched)──▶ /api/cron/sync ──▶ syncFixtures() ──▶ Postgres
  eventsseason.php (+ eventsday.php while live)                               │ changed > 0
                                                       revalidateTag('fixtures', { expire: 0 })
                                                                              ▼
Browser ◀── page.tsx (ISR, revalidate 3600) ◀── getCachedFixtures / getCachedLeagues (unstable_cache, tag 'fixtures') ◀── Postgres
   └─ router.refresh() every 2 min while a game is live (served from the ISR cache, never the DB)
```

**Key rule: the page HTML is cached and shared by everyone.** Anything that depends on the viewer (timezone, clock,
saved preferences) renders a fixed default on the server and during hydration, then switches to the real value
right after, via `useSyncExternalStore` with a server snapshot. Rendering viewer-specific output in the first pass
breaks hydration (React #418).

- **[src/app/page.tsx](src/app/page.tsx)**: statically rendered and cached (ISR, `revalidate = 3600`). It reads
  `getCachedFixtures` and `getCachedLeagues`, so page views don't hit the DB. The sync route expires the `fixtures`
  tag whenever it changes data, and the hourly revalidate rolls the ±14-day window forward. **Don't make this page
  dynamic again**, and don't read `cookies()`/`headers()`/`searchParams` here: any of them would put a DB query back on
  every request. The app deliberately does **not** enable `cacheComponents`.
- **[src/components/fixtures/FixtureFeed.tsx](src/components/fixtures/FixtureFeed.tsx)**: tabs, filtering and
  local-date grouping.
  - **Stale games:** it hides `scheduled` fixtures more than 10 minutes past kickoff.
  - **Now:** comes from the shared minute clock ([src/lib/clock.ts](src/lib/clock.ts)), using the server's
    `renderedAt` during hydration.
  - **Grouping:** by **UTC** day during the server render and hydration (`isClient` false), then by local day.
  - **Refresh:** while any fixture is live (or past kickoff but still `scheduled`), it calls `router.refresh()` every
    2 min while the tab is visible. It also refreshes when the tab or PWA comes back after more than 5 min. Both
    re-request the ISR-cached route; keep any future polling on cached data too.
- **[src/components/fixtures/FixtureCard.tsx](src/components/fixtures/FixtureCard.tsx)**: banner colours come from
  `leagueBanner(slug)` in [src/lib/league-theme.ts](src/lib/league-theme.ts) (shared with the menu). It uses
  `TeamMatchLayout` when both teams exist and `EventLayout` otherwise (motorsport: event name + podium from
  `sportMeta`). In results, the loser's name and score are grey (a draw keeps both white). Followed teams get an
  emerald star badge on the logo's corner (`TeamSide`, via `usePreferences`).
- **[src/components/layout/AppHeader.tsx](src/components/layout/AppHeader.tsx)**: a 3-column grid. On the left,
  `NavDrawer` (hamburger + left drawer, portalled to `<body>` so the bottom nav can't cover it). In the middle, the
  centred logo. On the right, `HeaderClock` (today's date/time, client-only). The drawer holds `LeagueFilterList`
  and a placeholder **Settings** button that does nothing yet.
- **[src/lib/fixtures.ts](src/lib/fixtures.ts)**: the read path, with DB or mock data. `getFixtures`/`getCachedFixtures`
  return the fixtures in a window. `getLeagues`/`getCachedLeagues` return the active leagues, each with its
  current-season teams, built from its fixtures (so a league shows no teams until its fixtures are imported). It
  uses dynamic imports so the postgres client isn't loaded when there is no DB. If the DB is unreachable, the mock
  fallback can stay cached for up to an hour.
- **[src/lib/dates.ts](src/lib/dates.ts)**: all date display is in browser-local time. Elements that render dates
  use `suppressHydrationWarning`.

### Filters (menu) and preferences

Decided design (#16): **follow teams, not teams-per-league.** There are two independent controls:
1. **Competitions.** Tap a league row to turn it on or off (a hidden league is greyed out). The chevron (team sports
   only) expands an **All games / My teams only** toggle and the league's teams with ☆/★ follow buttons.
2. **My teams.** One global list, shown at the top of the drawer as chips (tap to unfollow). `MyTeamsList` caps it at
   four measured rows plus a half-visible fifth, with a "Show all N teams" button.

[src/lib/preferences.ts](src/lib/preferences.ts) owns the state. Preferences live in `localStorage` under
`fixture:prefs` as `v: 2` (`hiddenLeagues`, `followedTeams` as team slugs, `leagueModes`); `v: 1` (hidden leagues
only) is migrated on read. Hidden leagues are stored rather than shown ones, so new leagues appear by default.
Cups/continental competitions default to "My teams only" (`MY_TEAMS_BY_DEFAULT`, currently just
`champions-league`); everything else defaults to "All games". `isFixtureVisible` is the single rule:
- a hidden league shows nothing;
- a "mine" league shows only fixtures with a followed team;
- motorsport (no teams) is exempt from "mine".

The server render always shows everything, so a returning viewer's filters apply an instant after hydration. Still
open in #16: an empty first-load call to action for new visitors.

### Sync ([src/lib/sync/sync-fixtures.ts](src/lib/sync/sync-fixtures.ts))

The sync is built to make as few API calls and DB writes as possible. Each run:
1. **Activity check:** one grouped query over current seasons of active leagues (`loadSeasonActivity`). It decides
   which leagues are due, using `seasons.last_synced_at` and `CADENCE`:

   | Tier | When | Interval |
   |---|---|---|
   | live | an open fixture is in play, or kicks off within 15 min (window = `maxGameDurationHours` + 30 min grace) | every run (2 min) |
   | matchday | a fixture kicked off in the last 12h or kicks off within 3h | 15 min |
   | inSeason | fixtures still to play, or the season has no fixtures yet | 6h |
   | offSeason | every fixture finished | 24h |

   If nothing is due, the run ends there: no API calls and no writes. `?force` skips this check. Leagues without a
   `LEAGUE_CONFIG` entry are skipped.
2. Teams and team mappings are loaded **once** per run (`loadContext`).
3. For each due league: make one `eventsseason.php` call and apply `sessionFilter`. In the **live** tier, also call
   `eventsday.php` for today (and yesterday, for games that started before midnight UTC) and overlay its
   status/scores (`withLiveData`). `eventsseason.php` is served from a TheSportsDB cache up to about 15 min stale, so
   without the overlay live games show no score. Then load that **season's** existing fixtures keyed by provider
   event ID.
4. For each event:
   - **Teams:** resolve by external ID first, then fuzzy `findTeamByName`, which is limited to the league's sport
     (otherwise "Melbourne City" could match a team in another sport). Any new mapping is saved.
   - **Rounds:** `roundLabel` maps TheSportsDB codes: 0 = Opening Round, 500 = Pre-season, 200 = Final, other 100+
     values = Finals. `LeagueConfig.roundLabel` overrides this per league; the Champions League uses "League phase ·
     MD n" / "Knockouts".
   - **Status:** codes follow API-Football. `FT`/`AET`/`PEN` are finished; `ET`/`BT`/`P` are extra time, the break
     before it, and a shoot-out in progress.
   - **Writes:** only columns that differ are UPDATEd, so most runs write nothing. New events are INSERTed, along
     with an upserted `external_ids` row.
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

`mapStatus` maps TheSportsDB `strStatus` to `FixtureStatus`. When the API gives no usable status, a kickoff in the
past means `live` until `maxGameDurationHours` have elapsed, and `finished` after that.

**Adding a league:**
1. Add it to [src/db/seed.ts](src/db/seed.ts). For team sports, use `seedTeamLeague` with each team's TheSportsDB
   `idTeam`, so the sync maps teams by ID instead of guessing by name. Get the IDs from
   `search_all_teams.php?l=<league name>`, or from `lookupteam.php?id` for the team IDs in the season's events;
   `lookup_all_teams.php` 404s.
2. Run `db:seed`.
3. Add an entry to `LEAGUE_CONFIG`, a banner in `league-theme.ts`, and logos under `public/` (PNGs pre-sized to at
   most 144 px; see below). Cups should go in `MY_TEAMS_BY_DEFAULT`.
4. Update the table above.

The new season (null `last_synced_at`) is imported on the first cron run after deploy. A first import of a few
hundred events takes seconds from `syd1`.

**New season:** automatic (step 6). To force one, or to start a season before the old one has finished, run
`npm run season -- roll <league> <year>`. Nothing in the code changes. `db:seed` only creates a league's *first*
season and inserts no fixtures.

## Database schema ([src/db/schema/](src/db/schema/))

- `sports` (name, slug) → `leagues` (slug unique, logoUrl, isActive) → `seasons` (leagueId+year unique, isCurrent,
  `last_synced_at`, which the sync cadence uses). Nothing enforces one current season per league in the DB;
  always go through `setCurrentSeason`.
- `teams` (sportId, slug unique, logoUrl, shortName). There's no team↔league link table; membership comes from fixtures.
- `fixtures`: seasonId, nullable home/away team ids (null for motorsport), `scheduled_at` timestamptz (UTC),
  `status` text (`scheduled|live|finished|postponed|cancelled`), round, scores, and `sport_meta` jsonb
  (`eventName`, `podium: string[]`, `podiumCheckedAt`). Indexed on `(season_id, scheduled_at)` and `scheduled_at`.
- `external_ids`: maps internal IDs to provider IDs (`entity_type`, `entity_id`, `provider`, `external_id`). It has
  two unique keys, `(entity_type, entity_id, provider)` and `(provider, entity_type, external_id)`; the sync's upsert
  targets the second. The design allows a second provider (e.g. for standings, #25).
- `sync_log`: rows only for runs that changed data or errored, kept for 30 days. `error_message` doubles as the message
  column for season rollovers.

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
| `GET /api/cron/sync[?force]` | Runs the sync. Requires `Authorization: Bearer $CRON_SECRET`. Returns `{ ok, synced, skipped, processed, changed, rolled, errors }`. `maxDuration = 60`. |
| `/icon.svg`, `/apple-icon.png`, `/favicon.ico` | File-based metadata icons in `src/app/` (don't also put `icon.svg` in `public/`; the paths would clash) |

## Hosting, domain and costs

- **Domain:** `www.fixture.nz` is the primary host; `fixture.nz` 308-redirects to it. DNS is on Cloudflare with the
  records set to **DNS only (grey cloud)**: proxying broke TLS and doubles up with Vercel. `sportsapp-five.vercel.app`
  still serves the app.
- **Sync URL:** the Supabase Vault secret `fixture_sync_url` is `https://www.fixture.nz/api/cron/sync`. pg_net does
  **not** follow redirects, so if the primary host ever changes, update the secret or the 2-minute sync silently
  stops:

  ```sql
  select vault.update_secret((select id from vault.secrets where name = 'fixture_sync_url'), '<url>');
  ```

  Then check `net._http_response` for 200s.
- **Costs:** keep the app inside Hobby limits. In Sept 2026 the old every-2-minutes full sync used about 15
  CPU-hours and 1,900 GB-hours of memory a month, far over Hobby, and a downgrade instantly suspended the account.
  Now:
  - quiet runs do one DB query;
  - the page is ISR-cached;
  - functions are pinned to **`syd1`** in [vercel.json](vercel.json), next to the Supabase DB (`ap-southeast-2`).

  Provisioned memory is billed on **wall time** (2 GB × duration), so network round trips are the cost. From
  `iad1`, a quiet run took about 1.6 s for about 110 ms of CPU; from `syd1` it takes about 0.4 s. Hobby allows a
  single region. Check usage with `npx vercel usage --since <date> --breakdown daily` and
  `npx vercel metrics vercel.function_invocation.function_duration_ms -a avg -f "route eq '/api/cron/sync'" --since 24h`.
- **Vercel Cron:** daily backup run only (`0 4 * * *`). Hobby rejects anything more frequent at deploy time, so
  don't add sub-daily Vercel crons.
- **Supabase scheduling:** `pg_cron` + `pg_net` call `GET /api/cron/sync` every 2 minutes
  ([supabase/cron.sql](supabase/cron.sql)) with the Vault secrets `fixture_sync_url` and `fixture_cron_secret`. This
  is cheap because the real cadence lives in code (`CADENCE`). The SQL file is applied by hand in the Supabase SQL
  editor; it is **not** part of `db:push`. Debug through `cron.job_run_details` and `net._http_response` (queries are
  in the file).

## External integrations

- **TheSportsDB v1** (`https://www.thesportsdb.com/api/v1/json/{key}/…`). Endpoints used:
  - `eventsseason.php?id&s`: cached by TheSportsDB for up to about 15 min (`x-tsdb-cache: HIT`);
  - `eventsday.php?d&l`: fresh, used in the live tier only;
  - `eventresults.php?id`.

  Timestamps are UTC without a `Z`, so the code appends `'Z'`. Status/score fields are strings and are often empty.
  `lookuptable.php` (standings) only works for the football leagues; see #25 for standings and other sources.
- **Supabase Postgres**: use the pooler connection string; direct IPv6 connections fail from many networks.
- **Database client** ([src/db/index.ts](src/db/index.ts)): `max: 1` connection per serverless instance with
  `idle_timeout: 20`. Queries run sequentially, so `Promise.all` over DB calls gains nothing.

## PWA

[public/manifest.json](public/manifest.json) and [public/sw.js](public/sw.js) (registered by
`ServiceWorkerRegistration`) provide the PWA. The service worker is **network-first** for pages, skips `/api/*` and
`/_next/*`, and pre-caches `/`, the manifest and `icon.svg`. Bump `CACHE` in `sw.js` when the shell changes.

The logo master is [src/app/icon.svg](src/app/icon.svg). The manifest uses it plus `public/icon-{192,512}.png` and
`icon-maskable-512.png`, all made by `npm run icons`. The header and `InstallPrompt` show `/icon.svg`.
`InstallPrompt` handles both Android's `beforeinstallprompt` and the iOS manual instructions.

## Workflow

- Work on a branch and open a PR. The owner merges PRs. **Avoid stacked PRs**: when a PR's base is another feature
  branch, GitHub only retargets it to `main` if that branch is deleted on merge. #28 was merged into its parent branch
  instead of `main` this way. Branch from `main`, or retarget before merging.
- Commit messages end with the `Co-Authored-By` trailer the harness specifies; PR bodies end with the Claude Code line.

## Conventions and gotchas

- Path alias `@/*` → `src/*`. Formatting: single quotes and semicolons, with column-aligned object literals in
  config-like code. Match the surrounding style.
- Store times in UTC and render them in local time. Never format dates on the server.
- **Static assets:**
  - League logos are in `public/logos/`.
  - Teams: Super Rugby in `public/rugby/`, NRL in `public/rugbyleague/`, AFL in `public/afl/`, A-League Men in
    `public/aleague/`, Premier League in `public/epl/`, other clubs (Champions League) in `public/clubs/`, and World
    Cup flags in `public/country/<iso>.svg`.
  - Team avatars use `next/image` with `unoptimized`, and league logos use plain `<img>`. Neither goes through Vercel
    Image Optimization, so **resize PNG/JPG logos to at most 144 px before committing** (3× the largest 48 px
    display size).
  - TheSportsDB badges (`strBadge`) are a good source: download them, then `sharp().trim().resize(144, 144, { fit: 'inside' })`.
- [next.config.ts](next.config.ts) sets a strict CSP (`img-src 'self' data: blob:`, `connect-src 'self'`). Remote
  images or API calls from the browser need CSP changes and `images.remotePatterns`.
- The repo has both `README.md` (create-next-app boilerplate) and `readme.md` (`#SportsApp`). Those names collide on
  case-insensitive filesystems.
