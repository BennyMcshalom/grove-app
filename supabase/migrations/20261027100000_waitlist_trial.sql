-- Waitlist members get 30 days of Season Pass, not 14 (2026-10-27).
--
-- private.waitlist holds the addresses from the pre-launch waitlist. The
-- addresses are personal data, so they're loaded straight into the database
-- and never committed here. Anyone who activates an account with one of
-- them starts a 30-day trial; everyone else keeps the 14-day one.

create table if not exists private.waitlist (
  email text primary key check (email = lower(btrim(email))),
  added_at timestamptz not null default now()
);

revoke all on private.waitlist from public, anon, authenticated;

-- Trial length for an address: 30 days from the waitlist, otherwise 14.
create or replace function private.trial_length(p_email text)
returns interval
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from private.waitlist w where w.email = lower(btrim(p_email))) then interval '30 days'
    else interval '14 days'
  end;
$$;

revoke execute on function private.trial_length(text) from public, anon, authenticated;

create or replace function private.start_activation_trial()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null and (tg_op = 'INSERT' or old.email_confirmed_at is null) then
    update public.subscriptions
    set status = 'trialing',
        plan = 'full',
        trial_started_at = now(),
        trial_ends_at = now() + private.trial_length(new.email)
    where user_id = new.id and trial_started_at is null and status = 'none';
  end if;
  return new;
end;
$$;

create or replace function public.start_trial()
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.subscriptions;
begin
  update public.subscriptions
  set status = 'trialing',
      plan = 'full',
      trial_started_at = now(),
      trial_ends_at = now() + private.trial_length((select u.email from auth.users u where u.id = (select auth.uid())))
  where user_id = (select auth.uid())
    and trial_started_at is null
    and status = 'none'
  returning * into result;

  if not found then
    raise exception 'Your free trial has already been used'
      using errcode = 'check_violation', hint = 'trial_used';
  end if;

  return result;
end;
$$;

-- Waitlist members already on the 14-day trial: 30 days from today, and the
-- "trial ends soon" email can go out again before the new end.
update public.subscriptions s
set trial_ends_at = now() + interval '30 days',
    trial_reminded_at = null
from auth.users u
join private.waitlist w on w.email = lower(btrim(u.email))
where s.user_id = u.id
  and s.status = 'trialing'
  and s.trial_ends_at < now() + interval '30 days';
