@AGENTS.md

# Fixture — agent guide

> **Agents: USE this file, and UPDATE it.** Read it before you start work. When you change something it describes
> (a new league, a new env var, a new route, a changed sync cadence, a new integration) or find something in it that is
> wrong, fix this file in the same change. An out-of-date CLAUDE.md is worse than none: future agents will trust it.
> Keep it accurate and short. Facts belong here; one-off task notes do not.

## What this is

**Fixture** (package name `sportsapp`) is a mobile-first PWA at **https://www.fixture.nz** that shows upcoming
fixtures, live scores and recent results for a hand-picked set of leagues. It is a single page with three tabs:
**Upcoming** (scheduled / live / postponed / cancelled) and **Results** (finished, newest first), both grouped by day
in the viewer's local timezone, and **Tables** (football standings). The window shown is today ±14 days. A hamburger menu lets each viewer turn leagues on or
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
| `nba` | NBA | 4387 | `2026-2027` | team vs team (`nba-*`); pre-season (`intRound` 500) filtered out |
| `nations-championship` | Nations Championship | 5852 | `2026` (→ 2028, `seasonStep: 2`) | rugby nations (`rugby-*`); July + November windows |
| `rugby-championship` | The Rugby Championship | 4986 | `2027` (no fixtures yet) | not held in 2026; skips ahead by itself once an empty year has passed |
| `rugby-world-cup` | Rugby World Cup | 4574 | `2027` (→ 2031, `seasonStep: 4`) | rugby nations (`rugby-*`); pool rounds 1–5, then 125/150/160/200 knockouts |
| `all-blacks-tests` | All Blacks Tests | 5479 | `2026` | TheSportsDB "Rugby Union International Friendlies", **filtered to All Blacks games** (tours, Bledisloe outside a championship) |

The four rugby-union international competitions exist so that no All Blacks game is missed. The Rugby Championship
is seeded ahead of its return. Not covered: Māori All Blacks, All Blacks XV, and sevens.

**Teams are shared across competitions.** TheSportsDB uses one `idTeam` per club, and the sync resolves teams by
that ID first, so Arsenal's Premier League and Champions League fixtures point at the same `teams` row, and
following Arsenal covers both. When adding a competition, seed only the clubs we don't have yet; slugs keep their
original prefix. National teams are separate teams from clubs, and per sport: football nations are `wc-<iso>`, rugby
nations are `rugby-<name>` (shared by all four rugby international competitions).

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
revalidation. Seeding leagues/teams is invisible until fixtures exist (the menu lists only leagues whose current
season has fixtures), so seed ahead of a deploy, but don't import fixtures for a new league before the code (config,
logos, banner) is live. Running `npm run sync` against a local dev server with new `LEAGUE_CONFIG` entries counts as
importing. Locally, `unstable_cache` entries persist
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
  emerald star badge on the logo's corner (`TeamSide`, via `usePreferences`). Finished games get a `ResultFooter`:
  a **Highlights** link (`sportMeta.video`, when there is one) and, for football, a **Match details** toggle that
  opens `MatchDetailsPanel`, which fetches `/api/fixtures/[id]/details` on first open (see **Match details**).
- **[src/components/tables/LeagueTables.tsx](src/components/tables/LeagueTables.tsx)**: the Tables tab. One table per
  league from `getCachedTables` ([src/lib/standings.ts](src/lib/standings.ts)), skipping leagues the viewer has
  hidden, with zone bars (e.g. Champions League places, relegation) and followed teams highlighted.
- **[src/components/layout/AppHeader.tsx](src/components/layout/AppHeader.tsx)**: a 3-column grid. On the left,
  `NavDrawer` (hamburger + left drawer, portalled to `<body>` so the bottom nav can't cover it). In the middle, the
  centred logo. On the right, `HeaderClock` (today's date/time, client-only). The drawer holds `LeagueFilterList`
  and a placeholder **Settings** button that does nothing yet.
- **[src/lib/fixtures.ts](src/lib/fixtures.ts)**: the read path, with DB or mock data. `getFixtures`/`getCachedFixtures`
  return the fixtures in a window. `getLeagues`/`getCachedLeagues` return the active leagues whose current season has
  fixtures, each with its current-season teams, built from those fixtures. It
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
`champions-league`); everything else defaults to "All games". Leagues in `SINGLE_TEAM_LEAGUES` (`all-blacks-tests`)
are already one team's games, so `hasTeamFilter` hides their chevron and they are always "All games".
`isFixtureVisible` is the single rule:
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
     (otherwise "Melbourne City" could match a team in another sport). As a last resort, `createTeam` adds a bare
     team (slug `<name>-<idTeam>`, no logo, so the card shows initials) for an unseeded opponent such as the
     Barbarians; placeholders like "Winner Pool A" are skipped. It logs a warning, and you should seed the team
     properly to give it a logo. Any new mapping is saved.
   - **Rounds:** `roundLabel` maps TheSportsDB codes: 0 = Opening Round, 500 = Pre-season, 200 = Final, other 100+
     values = Finals. `LeagueConfig.roundLabel` overrides this per league: the Champions League uses "League phase ·
     MD n" / "Knockouts", the RWC "Pool round n" / Quarter-final…, and the NBA labels only Play-In (400), Playoffs and
     NBA Finals. Leagues whose `intRound` is always 0 (NBA before weeks are assigned, friendlies) need an override,
     or every game reads "Opening Round".
   - **Status:** codes follow API-Football. `FT`/`AET`/`PEN` (and basketball's `AOT`, after overtime) are
     finished; `ET`/`BT`/`P` are extra time, the break before it, and a shoot-out in progress. Basketball in play is
     `Q1`–`Q4`/`HT`/`OT`.
   - **Writes:** only columns that differ are UPDATEd, so most runs write nothing. New events are INSERTed, along
     with an upserted `external_ids` row.
5. Podium (`fetchResults` leagues): for finished events without `sportMeta.podium`, call `eventresults.php`. Empty
   results set `sportMeta.podiumCheckedAt`; the call is retried every 30 min and abandoned 3 days after the event.
6. **Season rollover:** if a synced season's last fixture was more than 7 days ago, ask the provider for the next
   season (`nextSeasonYear`: `2026` → `2027`, `2025-2026` → `2026-2027`; `LeagueConfig.seasonStep` skips years for
   competitions that aren't held every year). A season with no fixtures at all counts as over once its year has
   passed, so a competition that skipped a year moves on. If the next season has events, `setCurrentSeason`
   ([src/lib/sync/seasons.ts](src/lib/sync/seasons.ts)) makes it the league's only current season, and the next
   cron run imports it. That's one extra API call per finished league per day. Rollovers show in `rolled` and in a
   `sync_log` row with `entity_type = 'seasons'`.
7. `seasons.last_synced_at` is set for each league that syncs successfully. A failing league doesn't block the
   others; its error is returned in `errors` and the route responds 500.
8. `sync_log` gets a row only when something changed or errored. Rows older than 30 days are pruned.
9. The route calls `revalidateTag(FIXTURES_CACHE_TAG, { expire: 0 })` when `changed > 0`.

Because the sync only writes changed rows and revalidates only on change, **any new field shown in the UI must be
part of the change comparison in `syncLeague`**. Otherwise updates to it won't reach the cached page. The
highlights link is an example: `strVideo` (from the same `eventsseason.php` list, so no extra calls) is stored as
`sportMeta.video` only if `highlightsUrl` accepts it as a YouTube link, and compared on every run. Coverage is good
for NBA/AFL/NRL/A-League, partial for the EPL, and nil for the Champions League and rugby.

### Match details and tables

- **Match details** (football only: TheSportsDB has no timeline, stats or lineups for NRL, AFL, rugby or the NBA).
  [src/lib/match-details.ts](src/lib/match-details.ts) looks up the fixture's provider event ID, then calls
  `lookuptimeline.php` and `lookupeventstats.php`. It keeps goals (normal/penalty/own goal), missed penalties and
  red cards, and a curated list of stats, dropping 0–0 rows (the A-League has no xG). An own goal is listed under the
  team it counted for. TheSportsDB's goal entries add up to the final score (VAR-cancelled goals are not listed), so
  fewer goals than the score means "still filling in": the route serves that with a 5-minute cache and doesn't store
  it. Complete details are kept by `unstable_cache` for a week and CDN-cached for a day, so a game costs one DB query
  and two API calls on its first tap, and nothing after.
- **Tables** ([src/lib/standings.ts](src/lib/standings.ts)) are computed from our own current-season fixtures, not
  taken from `lookuptable.php`, which has no Champions League table. The rules are 3/1/0 points, then goal
  difference, then goals scored; points deductions and head-to-head tie-breakers aren't modelled. The Champions
  League counts only "League phase" rounds. `TABLES` holds each league's zones. They matched the provider exactly
  for the Premier League and A-League in Oct 2026. Tables are cached under the `fixtures` tag and passed to the page,
  adding about 17 KB of HTML. Adding another sport means different points rules: NRL byes and Super Rugby bonus
  points can't be derived from scores.

`mapStatus` maps TheSportsDB `strStatus` to `FixtureStatus`. When the API gives no usable status, a kickoff in the
past means `live` until `maxGameDurationHours` have elapsed, and `finished` after that.

**Adding a league:**
1. Add it to [src/db/seed.ts](src/db/seed.ts). For team sports, use `seedTeamLeague` with each team's TheSportsDB
   `idTeam`, so the sync maps teams by ID instead of guessing by name. Get the IDs from
   `search_all_teams.php?l=<league name>`, or from `lookupteam.php?id` for the team IDs in the season's events;
   `lookup_all_teams.php` 404s.
2. Run `db:seed`.
3. Add an entry to `LEAGUE_CONFIG`, a banner in `league-theme.ts`, and logos under `public/` (PNGs pre-sized to at
   most 144 px; see below). Check the season's `intRound` values (see **Rounds**) and set `seasonStep` if it isn't
   annual. Cups should go in `MY_TEAMS_BY_DEFAULT`. A league with hundreds of games in the ±14-day window (like the
   NBA) costs page-render CPU on every live revalidation; see **Costs**.
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
  (`eventName`, `podium: string[]`, `podiumCheckedAt`, `video`). Indexed on `(season_id, scheduled_at)` and `scheduled_at`.
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
| `GET /api/fixtures/[id]/details` | Goals, red cards and stats for a finished football fixture (our fixture ID). 404 for anything else. CDN-cached a day once complete, 5 min while TheSportsDB is still filling in. |
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
  `iad1`, a run took about 1.6 s; from `syd1` (measured 17 Oct 2026) quiet hours average 0.1–0.3 s and matchday
  hours 0.5–0.75 s, with about 54 ms of CPU. Hobby allows a single region.
  - **Hobby allowances** (per month): 4 h Active CPU, 360 GB-h provisioned memory, 1M invocations, 200K ISR write
    units and 1M ISR read units (8 KB each, compressed), 1M CDN requests, 100 GB Fast Data Transfer.
  - **Where the risk is:** not the sync (about 6 GB-h and 20 min of CPU a month before the NBA) but **page
    regeneration**. One render costs about 330 ms of CPU for 100 fixtures and grows with the fixture count. In a live
    window each sync run with changes expires the page, and any viewer's 2-minute `router.refresh()` regenerates it.
    The NBA is live about 9–10 h a day from October to June and roughly triples the fixtures in the window. With
    someone watching through every NBA window, that is about 2.5 h of CPU and 100K ISR write units a month. With
    occasional check-ins it is minor. The levers are fewer fixtures in the window (e.g. a shorter NBA window) and a
    slower revalidation cadence during live play.
  - Check usage with `npx vercel usage --since <date> --breakdown daily` and
    `npx vercel metrics vercel.function_invocation.function_cpu_time_ms -a sum --group-by route --since 24h`
    (`function_duration_ms` for wall time).
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
  - `eventresults.php?id`;
  - `lookuptimeline.php?id`, `lookupeventstats.php?id`: football match details, on tap.

  Timestamps are UTC without a `Z`, so the code appends `'Z'`. Status/score fields are strings and are often empty.
  Not used, but available: `lookuptable.php` (only the EPL and A-League), `lookuplineup.php` (football), and
  `lookuptv.php` (broadcasters for every sport, including NZ channels, a few days before kickoff).
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
- **Screenshots in PRs:** for any visible UI change, add a screenshot to the PR description. Take it at 375 px wide
  with headless Playwright (the screenshots used to verify the change are fine). Shrink it with
  `sharp().resize({ width: 750 }).png({ palette: true })` (≈30 KB). Commit it to the orphan branch
  **`pr-screenshots`** under `pr-<number>/`; it's never merged, so images stay out of `main` and the build. Its own
  `vercel.json` (`git.deploymentEnabled: false`) stops Vercel from trying (and failing) to build it; keep it. Embed it
  with `<img src="https://raw.githubusercontent.com/J-Haynes/fixture/pr-screenshots/pr-<n>/<name>.png" width="375">`
  (the repo is public). Use a separate `git worktree` for that branch. If `gh pr edit` fails with a "Projects
  (classic)" GraphQL error, update the body with `gh api -X PATCH repos/J-Haynes/fixture/pulls/<n> -F body=@file`.
- GitHub deletes head branches on merge (repo setting), so a stacked PR's base disappears. Still prefer branching from `main`.

## Conventions and gotchas

- Path alias `@/*` → `src/*`. Formatting: single quotes and semicolons, with column-aligned object literals in
  config-like code. Match the surrounding style.
- Store times in UTC and render them in local time. Never format dates on the server.
- **Static assets:**
  - League logos are in `public/logos/`.
  - Teams: Super Rugby in `public/rugby/`, NRL in `public/rugbyleague/`, AFL in `public/afl/`, A-League Men in
    `public/aleague/`, Premier League in `public/epl/`, other clubs (Champions League) in `public/clubs/`, NBA in
    `public/nba/`, rugby nations (and the South African franchises from the 2026 All Blacks tour) in
    `public/rugby-intl/`, and World Cup flags in `public/country/<iso>.svg`.
  - Team avatars use `next/image` with `unoptimized`, and league logos use plain `<img>`. Neither goes through Vercel
    Image Optimization, so **resize PNG/JPG logos to at most 144 px before committing** (3× the largest 48 px
    display size).
  - TheSportsDB badges (`strBadge`) are a good source: download them, then `sharp().trim().resize(144, 144, { fit: 'inside' })`.
- [next.config.ts](next.config.ts) sets a strict CSP (`img-src 'self' data: blob:`, `connect-src 'self'`). Remote
  images or API calls from the browser need CSP changes and `images.remotePatterns`.
- The repo has both `README.md` (create-next-app boilerplate) and `readme.md` (`#SportsApp`). Those names collide on
  case-insensitive filesystems.
