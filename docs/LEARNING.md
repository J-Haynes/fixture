# Learning log

What the owner can explain about Fixture without opening the code. The `learn` skill
(`.claude/skills/learn/SKILL.md`) reads this before feature work and study sessions, and updates it afterwards.
One dated line per concept, in the owner's words where possible. Move lines between sections as things change.

## Can explain

- (2026-10-28) What the app is: a mobile-first Next.js PWA showing fixtures, results and tables from TheSportsDB API,
  stored in Postgres on Supabase.

## Shaky

- (2026-10-28) The schema: knew teams, leagues and fixtures; not yet sports, seasons, `external_ids` (maps
  TheSportsDB's IDs to ours) or `sync_log`.

## Not yet

- (2026-10-28) How the sync is scheduled: **one** Supabase `pg_cron` job calls `/api/cron/sync` every 2 minutes, and
  the route decides which leagues are due (every run while a game is live, every 15 minutes on match days, every
  6 hours in season, daily off season). Described it on 28 Oct as "hourly cron tasks, plus a separate cron for live
  scores". `vercel.json` also keeps a daily Vercel cron.
- (2026-10-28) Writing only what changed, and why that matters for the cache.
- (2026-10-28) Caching: the page is statically rendered, `revalidateTag` rebuilds it when data changes, and an open
  page calls `router.refresh()` every 2 minutes during live games, so viewers never hit the database directly.
- (2026-10-28) Row-level security on the Supabase tables: what it protects and why it's on.
