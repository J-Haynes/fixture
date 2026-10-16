-- Fix for Supabase advisor `rls_disabled_in_public`.
--
-- The app only talks to Postgres directly via DATABASE_URL (the `postgres`
-- role, which bypasses RLS) and never uses the Supabase Data API / anon key.
-- Enabling RLS with no policies therefore locks out the public `anon` and
-- `authenticated` roles without affecting the app or the cron sync.
--
-- `npm run db:push` applies the same change from the Drizzle schema
-- (`.enableRLS()`); this script is for running directly in the Supabase SQL editor.

alter table public.sports       enable row level security;
alter table public.leagues      enable row level security;
alter table public.seasons      enable row level security;
alter table public.teams        enable row level security;
alter table public.fixtures     enable row level security;
alter table public.external_ids enable row level security;
alter table public.sync_log     enable row level security;
