-- The two jobs the Railway `cron` service used to run every 10 minutes
-- (scripts/cron/notification-emails.mjs) now run from the database, so the
-- app needs only its `web` service on Railway.
--
-- pg_cron calls the app's endpoints with pg_net, sending the same
-- `Authorization: Bearer <CRON_SECRET>` the endpoints already check. The
-- address and secret live in Supabase Vault:
--
--   select vault.create_secret('https://grouv.app', 'app_site_url');
--   select vault.create_secret('<CRON_SECRET>', 'app_cron_secret');
--
-- Until both exist the jobs do nothing. That keeps a copied or staging
-- database from emailing real people.

create or replace function private.call_app_cron(job text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  site text;
  secret text;
begin
  select decrypted_secret into site from vault.decrypted_secrets where name = 'app_site_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'app_cron_secret';
  if site is null or secret is null then
    return;
  end if;
  perform net.http_post(
    url := rtrim(site, '/') || '/api/cron/' || job,
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret, 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end;
$$;

revoke execute on function private.call_app_cron(text) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net')
     and exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute 'create extension if not exists pg_net with schema extensions';
    execute $job$select cron.schedule('grouv-notification-emails', '*/10 * * * *', $cmd$select private.call_app_cron('notification-emails')$cmd$)$job$;
    execute $job$select cron.schedule('grouv-account-deletions', '*/10 * * * *', $cmd$select private.call_app_cron('account-deletions')$cmd$)$job$;
  end if;
end;
$$;
