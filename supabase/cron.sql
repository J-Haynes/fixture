-- ─────────────────────────────────────────────────────────────────────────────
-- Fixture sync scheduler (Supabase pg_cron + pg_net)
--
-- Calls the app's /api/cron/sync every 2 minutes from inside Supabase, so the
-- app doesn't need Vercel Cron (Hobby plans only allow daily crons). The route
-- itself decides which leagues are due, so a frequent schedule is cheap.
--
-- Run this whole file in the Supabase SQL editor. It is idempotent: re-running
-- it updates the jobs in place. Secrets live in Vault, never in this file.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Extensions (also toggleable under Database → Extensions)
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- 2. Secrets — run ONCE, by hand, with real values (don't commit them):
--
--   select vault.create_secret('https://<your-production-domain>/api/cron/sync', 'fixture_sync_url');
--   select vault.create_secret('<same value as CRON_SECRET in Vercel>',          'fixture_cron_secret');
--
-- To change one later:
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'fixture_cron_secret'), '<new value>');

-- 3. The sync job. pg_net is async: the request is queued and pg_cron returns
--    immediately. The timeout only bounds how long pg_net waits for the response
--    (default 5s is too short for a full sync; the route's maxDuration is 60s).
select cron.schedule(
  'fixture-sync',
  '*/2 * * * *',
  $$
  select net.http_get(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'fixture_sync_url'),
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'fixture_cron_secret')
    ),
    timeout_milliseconds := 60000
  );
  $$
);

-- 4. Housekeeping: pg_cron keeps a row per run (~720/day for the job above).
--    Keep a week of history.
select cron.schedule(
  'fixture-cron-history-cleanup',
  '17 3 * * *',
  $$ delete from cron.job_run_details where end_time < now() - interval '7 days'; $$
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Checking it works
--
--   -- Did the job fire?
--   select jobname, status, return_message, start_time
--   from cron.job_run_details join cron.job using (jobid)
--   order by start_time desc limit 10;
--
--   -- What did the app answer? (pg_net keeps responses for ~6 hours)
--   select created, status_code, left(content, 200) as body, error_msg
--   from net._http_response order by created desc limit 10;
--
-- Expect 200 with {"ok":true,...}. 401 means fixture_cron_secret doesn't match
-- CRON_SECRET; a null status with error_msg usually means a wrong URL.
--
-- Pausing / removing
--
--   select cron.unschedule('fixture-sync');
-- ─────────────────────────────────────────────────────────────────────────────
