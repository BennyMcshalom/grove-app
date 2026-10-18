-- Two-step verification, enforced by the database (2026-10-18).
--
-- Signing in with a password (or Google) gives an "aal1" session; entering the
-- authenticator code upgrades it to "aal2". The app keeps aal1 sessions on
-- /two-step, but the access token works against Supabase directly too, so
-- someone with a stolen password could skip the app. These checks refuse an
-- aal1 token for any account that has two-step verification turned on.
-- Accounts without it are unaffected. The service role and cron (postgres)
-- are unaffected.

-- True when this request may touch the signed-in user's data: either they
-- don't use two-step verification, or they entered the code this session.
create or replace function private.two_step_satisfied()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or auth.uid() is null
      or not exists (
        select 1 from auth.mfa_factors f
        where f.user_id = auth.uid() and f.status = 'verified'
      );
$$;

revoke all on function private.two_step_satisfied() from public;
grant execute on function private.two_step_satisfied() to anon, authenticated;

-- 1. Every REST and RPC call (PostgREST runs this before each request). This
--    covers tables and all SECURITY DEFINER functions, which skip RLS.
create or replace function private.check_request()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'authenticated'
     and not private.two_step_satisfied() then
    raise exception 'Two-step verification required'
      using errcode = '42501', hint = 'Enter the code from your authenticator app to finish signing in.';
  end if;
end;
$$;

revoke all on function private.check_request() from public;
grant execute on function private.check_request() to anon, authenticated;

alter role authenticator set pgrst.db_pre_request = 'private.check_request';
notify pgrst, 'reload config';

-- 2. Realtime and Storage don't go through PostgREST; they apply RLS with the
--    user's token. A restrictive policy is ANDed with every other policy.
do $$
declare
  t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity
  loop
    execute format('drop policy if exists two_step on public.%I', t.relname);
    execute format(
      'create policy two_step on public.%I as restrictive for all to authenticated
         using ((select private.two_step_satisfied())) with check ((select private.two_step_satisfied()))',
      t.relname
    );
  end loop;
end;
$$;

drop policy if exists two_step on storage.objects;
create policy two_step on storage.objects as restrictive for all to authenticated
  using ((select private.two_step_satisfied())) with check ((select private.two_step_satisfied()));
