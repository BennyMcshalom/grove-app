-- A small sliding-window counter for the app's own rate limits (2026-10-18).
--
-- Sign-in, codes, password resets and similar run on the server, so Supabase
-- Auth sees every request coming from the app's one address and its per-IP
-- limits can't tell people apart. The app now limits per client address and
-- per account itself (src/lib/rate-limit.ts), counting here. Only the
-- service role can call it.

create table if not exists private.rate_hits (
  key text not null,
  at timestamptz not null default now()
);

create index if not exists rate_hits_key_at on private.rate_hits (key, at);

-- Records one hit for `p_key` and says whether it is still within `p_max`
-- hits per `p_window_seconds`. A refused hit isn't recorded.
create or replace function public.rate_limit_hit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  hits integer;
begin
  if p_key is null or length(p_key) > 300 or p_max < 1 or p_window_seconds < 1 then
    raise exception 'Bad rate limit request' using errcode = '22023';
  end if;

  -- One caller at a time per key, so two requests can't both take the last slot.
  perform pg_advisory_xact_lock(hashtext(p_key));

  select count(*) into hits
  from private.rate_hits
  where key = p_key and at > now() - make_interval(secs => p_window_seconds);

  if hits >= p_max then
    return false;
  end if;

  insert into private.rate_hits (key) values (p_key);
  return true;
end;
$$;

revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;

create or replace function private.cleanup_rate_hits()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from private.rate_hits where at < now() - interval '2 days';
$$;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    execute 'create extension if not exists pg_cron with schema pg_catalog';
    execute $job$select cron.schedule('grouv-rate-hits-cleanup', '23 * * * *', 'select private.cleanup_rate_hits()')$job$;
  end if;
end;
$$;
