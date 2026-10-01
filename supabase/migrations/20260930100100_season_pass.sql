-- Season Pass (PRD v1.1 §13): the 14-day trial at account activation, Free's
-- four active Spaces with paused Spaces on downgrade, and referrals whose
-- reward is a month of Season Pass.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------

alter table public.subscriptions
  -- Season Pass granted outside billing (a referral reward). Access holds
  -- until then whatever the plan status says.
  add column bonus_until timestamptz,
  -- A downgrade paused Spaces and the member hasn't chosen their four yet.
  add column spaces_review_due boolean not null default false,
  -- "Your trial ends soon" went out; once per trial.
  add column trial_reminded_at timestamptz;

-- A paused Space is still held — visible, with its posts, logs and archive —
-- but takes no new posts or entries until it's reactivated.
alter table public.user_chapters
  add column paused_at timestamptz;

-- ---------------------------------------------------------------------------
-- has_pass: same semantics as 20260930090000, plus bonus months
-- ---------------------------------------------------------------------------

create or replace function private.has_pass(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select coalesce(s.bonus_until, '-infinity'::timestamptz) > now() or case
      when s.status = 'trialing' then coalesce(s.trial_ends_at, s.current_period_end, now()) > now()
      when s.status in ('active', 'past_due') then true
      when s.status = 'canceled' then coalesce(s.current_period_end, '-infinity'::timestamptz) > now()
      else false
    end
    from public.subscriptions s
    where s.user_id = p_user_id
  ), false);
$$;

-- ---------------------------------------------------------------------------
-- Space limit: 8 with Season Pass, 4 on Free; paused Spaces don't count
-- ---------------------------------------------------------------------------

create or replace function private.space_limit(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when private.has_pass(p_user_id) then 8 else 4 end;
$$;

-- Runs whenever a row becomes an active Space: opened, or un-paused. Locks the
-- profile row so two concurrent inserts can't both see room for one more.
create or replace function private.enforce_open_chapter_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_count integer;
  cap integer;
begin
  if new.status <> 'open' or new.paused_at is not null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'open' and old.paused_at is null then
    return new;
  end if;

  perform 1 from public.profiles where id = new.user_id for update;

  select count(*) into active_count
  from public.user_chapters
  where user_id = new.user_id and status = 'open' and paused_at is null and id <> new.id;

  cap := private.space_limit(new.user_id);
  if active_count >= cap then
    raise exception '%', case
        when cap = 8 then 'You can hold all eight Spaces at once, and no more'
        else 'You can only hold 4 chapters at once on Free. Season Pass keeps all eight active.'
      end
      using errcode = 'check_violation', hint = 'chapter_limit';
  end if;

  return new;
end;
$$;

drop trigger user_chapters_enforce_limit on public.user_chapters;
create trigger user_chapters_enforce_limit
  before insert or update of status, paused_at on public.user_chapters
  for each row execute function private.enforce_open_chapter_limit();

-- Brings one member's Spaces in line with their plan. With Season Pass every
-- paused Space comes back. On Free with more than four active, the four used
-- most recently stay active — a reversible default until they choose — and
-- the rest pause.
create or replace function private.apply_space_limit(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  paused integer;
begin
  if private.has_pass(p_user_id) then
    update public.user_chapters
    set paused_at = null
    where user_id = p_user_id and status = 'open' and paused_at is not null;

    update public.subscriptions
    set spaces_review_due = false
    where user_id = p_user_id and spaces_review_due;
    return;
  end if;

  with ranked as (
    select
      uc.id,
      row_number() over (
        order by greatest(
          uc.opened_at,
          coalesce((
            select max(p.created_at) from public.posts p
            where p.author_id = p_user_id and p.chapter_slug = uc.chapter_slug
          ), '-infinity'::timestamptz),
          coalesce((
            select max(l.created_at) from public.log_entries l
            where l.user_chapter_id = uc.id
          ), '-infinity'::timestamptz)
        ) desc,
        uc.is_primary desc,
        uc.opened_at desc
      ) as place
    from public.user_chapters uc
    where uc.user_id = p_user_id and uc.status = 'open' and uc.paused_at is null
  )
  update public.user_chapters uc
  set paused_at = now()
  from ranked
  where ranked.id = uc.id and ranked.place > 4;

  get diagnostics paused = row_count;
  if paused > 0 then
    update public.subscriptions set spaces_review_due = true where user_id = p_user_id;
    perform private.notify(p_user_id, 'spaces_paused', null, null, jsonb_build_object('paused', paused));
  end if;
end;
$$;

-- Any change to the plan re-checks the Spaces: a trial or plan ending pauses,
-- subscribing or a bonus month restores.
create or replace function private.subscriptions_apply_space_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.apply_space_limit(new.user_id);
  return new;
end;
$$;

create trigger subscriptions_apply_space_limit
  after update of status, trial_ends_at, current_period_end, bonus_until on public.subscriptions
  for each row execute function private.subscriptions_apply_space_limit();

-- Access that ends on a date (a canceled plan's last day, a bonus month)
-- changes no row, so a sweep catches it; see expire_trials().
create or replace function private.sweep_space_limits()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  member uuid;
begin
  for member in
    select uc.user_id
    from public.user_chapters uc
    where uc.status = 'open'
    group by uc.user_id
    having count(*) filter (where uc.paused_at is null) > 4
        or count(*) filter (where uc.paused_at is not null) > 0
  loop
    perform private.apply_space_limit(member);
  end loop;
end;
$$;

-- The app calls this when the shell sees Spaces out of step with the plan, so
-- a downgrade shows on the next page load rather than the next sweep.
create or replace function public.sync_my_spaces()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;
  perform private.apply_space_limit((select auth.uid()));
end;
$$;

-- "Choose which 4 Spaces stay active". Pauses the others first so the limit
-- never sees five active at once.
create or replace function public.choose_active_spaces(p_user_chapter_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  chosen uuid[] := array(select distinct unnest(coalesce(p_user_chapter_ids, '{}')));
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  if private.has_pass(uid) then
    perform private.apply_space_limit(uid);
    return;
  end if;

  if cardinality(chosen) not between 1 and 4 then
    raise exception 'Choose up to four Spaces to keep active'
      using errcode = 'check_violation', hint = 'chapter_limit';
  end if;

  if exists (
    select 1 from unnest(chosen) as c(id)
    where not exists (
      select 1 from public.user_chapters uc
      where uc.id = c.id and uc.user_id = uid and uc.status = 'open'
    )
  ) then
    raise exception 'One of those Spaces is no longer open' using errcode = 'no_data_found';
  end if;

  update public.user_chapters
  set paused_at = now()
  where user_id = uid and status = 'open' and paused_at is null and id <> all (chosen);

  update public.user_chapters
  set paused_at = null
  where user_id = uid and status = 'open' and paused_at is not null and id = any (chosen);

  update public.subscriptions set spaces_review_due = false where user_id = uid;
end;
$$;

-- A paused Space's "Reactivate" when there's room (the limit trigger says no
-- otherwise, and the app offers the chooser).
create or replace function public.resume_space(p_user_chapter_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.user_chapters
  set paused_at = null
  where id = p_user_chapter_id and user_id = (select auth.uid()) and status = 'open' and paused_at is not null;

  if not found then
    raise exception 'That Space is not paused' using errcode = 'no_data_found';
  end if;
end;
$$;

revoke execute on function public.sync_my_spaces() from public, anon;
grant execute on function public.sync_my_spaces() to authenticated;
revoke execute on function public.choose_active_spaces(uuid[]) from public, anon;
grant execute on function public.choose_active_spaces(uuid[]) to authenticated;
revoke execute on function public.resume_space(uuid) from public, anon;
grant execute on function public.resume_space(uuid) to authenticated;
revoke execute on function private.apply_space_limit(uuid) from public, anon, authenticated;
revoke execute on function private.sweep_space_limits() from public, anon, authenticated;

-- Paused Spaces take no new posts, anonymous questions or log entries. A
-- trigger rather than a policy change, so the existing insert policies keep
-- their shape.
create or replace function private.guard_paused_space()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  paused boolean;
begin
  if uid is null then
    return new;
  end if;

  if tg_table_name = 'log_entries' then
    select exists (
      select 1 from public.user_chapters uc
      where uc.id = new.user_chapter_id and uc.status = 'open' and uc.paused_at is not null
    ) into paused;
  else
    select exists (
      select 1 from public.user_chapters uc
      where uc.user_id = uid and uc.chapter_slug = new.chapter_slug
        and uc.status = 'open' and uc.paused_at is not null
    ) into paused;
  end if;

  if paused then
    raise exception 'This Space is paused. Reactivate it to add something new.'
      using errcode = 'check_violation', hint = 'space_paused';
  end if;
  return new;
end;
$$;

create trigger posts_guard_paused_space
  before insert on public.posts
  for each row execute function private.guard_paused_space();

create trigger log_entries_guard_paused_space
  before insert on public.log_entries
  for each row execute function private.guard_paused_space();

create trigger space_questions_guard_paused_space
  before insert on public.space_questions
  for each row execute function private.guard_paused_space();

-- ---------------------------------------------------------------------------
-- Trial at activation
-- ---------------------------------------------------------------------------

-- "On account activation, give every new member 14 consecutive days of full
-- Season Pass access": a verified email or a Google sign-in (which arrives
-- verified). One trial per account; nothing is charged. Fires after
-- on_auth_user_created (triggers run in name order), which made the row.
-- Existing members who never started one still use start_trial().
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
        trial_ends_at = now() + interval '14 days'
    where user_id = new.id and trial_started_at is null and status = 'none';
  end if;
  return new;
end;
$$;

create trigger on_auth_user_verified
  after insert or update of email_confirmed_at on auth.users
  for each row execute function private.start_activation_trial();

-- ---------------------------------------------------------------------------
-- Onboarding: any of the eight
-- ---------------------------------------------------------------------------

-- Same as before, but up to eight chapters. Anyone without Season Pass at
-- this point (rare: the trial starts at activation) gets the extras paused
-- rather than an error.
create or replace function public.complete_onboarding(
  p_chapters jsonb,
  p_sitting_with text default null,
  p_honest_tension text default null,
  p_open_to text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  item jsonb;
  active_count integer;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  if jsonb_typeof(p_chapters) is distinct from 'array'
     or jsonb_array_length(p_chapters) not between 1 and 8 then
    raise exception 'Choose between 1 and 8 chapters'
      using errcode = 'check_violation', hint = 'chapter_count';
  end if;

  -- Retrying a finished onboarding is a no-op rather than an error.
  if exists (select 1 from public.profiles where id = uid and onboarded_at is not null) then
    return;
  end if;

  for item in select value from jsonb_array_elements(p_chapters) loop
    select count(*) into active_count
    from public.user_chapters
    where user_id = uid and status = 'open' and paused_at is null and chapter_slug <> item ->> 'slug';

    insert into public.user_chapters (user_id, chapter_slug, phase, paused_at)
    values (
      uid,
      item ->> 'slug',
      item ->> 'phase',
      case when active_count >= private.space_limit(uid) then now() end
    )
    on conflict (user_id, chapter_slug) where status = 'open'
    do update set phase = excluded.phase;
  end loop;

  insert into public.profile_prompts (user_id, sitting_with, honest_tension, open_to)
  values (
    uid,
    nullif(trim(p_sitting_with), ''),
    nullif(trim(p_honest_tension), ''),
    nullif(trim(p_open_to), '')
  )
  on conflict (user_id) do update
  set sitting_with = excluded.sitting_with,
      honest_tension = excluded.honest_tension,
      open_to = excluded.open_to;

  update public.profiles set onboarded_at = now() where id = uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Billing
-- ---------------------------------------------------------------------------

-- As before, plus the RevenueCat product id in `plan`, so Subscription can say
-- which Season Pass (Founding / Monthly / Weekly) is running.
drop function public.sync_billing(uuid, text, text, timestamptz, timestamptz, boolean, text);

create function public.sync_billing(
  p_user_id uuid,
  p_status text,
  p_store text,
  p_current_period_end timestamptz,
  p_trial_end timestamptz,
  p_cancel_at_period_end boolean,
  p_management_url text,
  p_plan text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status is not null and p_status not in ('trialing', 'active', 'past_due', 'canceled', 'expired') then
    raise exception 'Unknown billing status %', p_status using errcode = 'check_violation';
  end if;

  if p_status is null then
    update public.subscriptions
    set status = case
          when billing_store is not null and status in ('trialing', 'active', 'past_due') then 'canceled'
          else status
        end::public.subscription_status,
        cancel_at_period_end = case when billing_store is not null then false else cancel_at_period_end end,
        management_url = case when billing_store is not null then null else management_url end,
        billing_synced_at = now()
    where user_id = p_user_id;
    return;
  end if;

  update public.subscriptions
  set status = p_status::public.subscription_status,
      plan = coalesce(nullif(p_plan, ''), 'full'),
      billing_store = coalesce(p_store, billing_store, 'unknown'),
      current_period_end = p_current_period_end,
      trial_started_at = case when p_status = 'trialing' then coalesce(trial_started_at, now()) else trial_started_at end,
      trial_ends_at = case when p_status = 'trialing' then coalesce(p_trial_end, trial_ends_at) else trial_ends_at end,
      cancel_at_period_end = coalesce(p_cancel_at_period_end, false),
      management_url = p_management_url,
      billing_synced_at = now()
  where user_id = p_user_id;
end;
$$;

revoke execute on function public.sync_billing(uuid, text, text, timestamptz, timestamptz, boolean, text, text)
  from public, anon, authenticated;
grant execute on function public.sync_billing(uuid, text, text, timestamptz, timestamptz, boolean, text, text)
  to service_role;

-- Hourly (cron 'grouv-expire-trials'): in-app trials that ran out, a
-- reminder three days before any trial ends, and Spaces whose access ended
-- on a date.
create or replace function private.expire_trials()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  due record;
begin
  update public.subscriptions
  set status = 'expired'
  where status = 'trialing'
    and billing_store is null
    and trial_ends_at < now();

  for due in
    update public.subscriptions
    set trial_reminded_at = now()
    where status = 'trialing'
      and trial_reminded_at is null
      and trial_ends_at > now()
      and trial_ends_at <= now() + interval '3 days'
    returning user_id, trial_ends_at, billing_store
  loop
    perform private.notify(
      due.user_id,
      'trial_ending',
      null,
      null,
      jsonb_build_object('ends_at', due.trial_ends_at, 'renews', due.billing_store is not null)
    );
  end loop;

  perform private.sweep_space_limits();
end;
$$;

-- ---------------------------------------------------------------------------
-- Referrals
-- ---------------------------------------------------------------------------

-- grouv.app/r/amara92 — one code per member, made the first time they open
-- Invite a friend.
create table public.referral_codes (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  code text not null unique check (code ~ '^[a-z0-9]{3,24}$'),
  created_at timestamptz not null default now()
);

alter table public.referral_codes enable row level security;

create policy "Users read their own referral code"
  on public.referral_codes for select
  to authenticated
  using (user_id = (select auth.uid()));

-- joined → qualified (reward earned) → applied (reward claimed).
create type public.referral_status as enum ('joined', 'qualified', 'applied');

-- One row per person who signed up with someone's link. Only the referrer
-- sees it.
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  invitee_id uuid not null unique references public.profiles (id) on delete cascade,
  status public.referral_status not null default 'joined',
  joined_at timestamptz not null default now(),
  qualified_at timestamptz,
  applied_at timestamptz,
  nudged_at timestamptz,
  check (referrer_id <> invitee_id)
);

create index referrals_by_referrer on public.referrals (referrer_id, joined_at desc);

alter table public.referrals enable row level security;

create policy "Referrers read their referrals"
  on public.referrals for select
  to authenticated
  using (referrer_id = (select auth.uid()));

-- "Invites sent": the channel only — never who it went to.
create table public.referral_invites (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  channel text not null check (channel in ('email', 'message', 'share')),
  created_at timestamptz not null default now()
);

create index referral_invites_by_referrer on public.referral_invites (referrer_id, created_at desc);

alter table public.referral_invites enable row level security;

create policy "Users read their own invites"
  on public.referral_invites for select
  to authenticated
  using (referrer_id = (select auth.uid()));

-- The viewer's code (made on first ask from their first name) and the three
-- counters on the Invite a friend page.
create or replace function public.my_referral()
returns table (code text, invites_sent integer, friends_joined integer, rewards_earned integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  mine text;
  base text;
  attempt integer := 0;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  select rc.code into mine from public.referral_codes rc where rc.user_id = uid;

  if mine is null then
    select coalesce(nullif(left(lower(regexp_replace(p.first_name, '[^a-zA-Z0-9]', '', 'g')), 12), ''), 'friend')
    into base
    from public.profiles p where p.id = uid;
    if char_length(base) < 3 then base := base || 'grv'; end if;

    loop
      attempt := attempt + 1;
      begin
        insert into public.referral_codes (user_id, code)
        values (uid, base || (floor(random() * (case when attempt < 5 then 90 else 9000 end)) + 10)::integer::text)
        returning referral_codes.code into mine;
        exit;
      exception when unique_violation then
        -- Someone else won that code (or this user, concurrently).
        select rc.code into mine from public.referral_codes rc where rc.user_id = uid;
        exit when mine is not null or attempt >= 20;
      end;
    end loop;
  end if;

  return query
  select
    mine,
    (select count(*)::integer from public.referral_invites i where i.referrer_id = uid),
    (select count(*)::integer from public.referrals r where r.referrer_id = uid),
    (select count(*)::integer from public.referrals r where r.referrer_id = uid and r.status <> 'joined');
end;
$$;

-- The friends who joined, newest first, for the page's list and modals.
create or replace function public.my_referrals()
returns table (
  id uuid,
  invitee_id uuid,
  first_name text,
  avatar_url text,
  status public.referral_status,
  joined_at timestamptz,
  qualified_at timestamptz,
  applied_at timestamptz,
  nudged_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select r.id, r.invitee_id, p.first_name, p.avatar_url, r.status, r.joined_at, r.qualified_at, r.applied_at, r.nudged_at
  from public.referrals r
  join public.profiles p on p.id = r.invitee_id
  where r.referrer_id = (select auth.uid())
  order by r.joined_at desc
  limit 100;
$$;

-- The /r/[code] landing, before sign-in: whose invite this is. First name and
-- photo only.
create or replace function public.referral_inviter(p_code text)
returns table (first_name text, avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.first_name, p.avatar_url
  from public.referral_codes rc
  join public.profiles p on p.id = rc.user_id
  where rc.code = lower(trim(p_code));
$$;

-- Attaches a new account to the link it came in on. Only before onboarding
-- finishes, so an existing member can't retro-claim one.
create or replace function public.claim_referral(p_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  referrer uuid;
  made uuid;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from public.profiles where id = uid and onboarded_at is null) then
    return false;
  end if;

  select rc.user_id into referrer from public.referral_codes rc where rc.code = lower(trim(p_code));
  if referrer is null or referrer = uid then
    return false;
  end if;

  insert into public.referrals (referrer_id, invitee_id)
  values (referrer, uid)
  on conflict (invitee_id) do nothing
  returning id into made;

  if made is not null then
    perform private.notify(referrer, 'referral_joined', uid, made);
  end if;
  return made is not null;
end;
$$;

-- Message / Email / More ways to share. 50 a day is plenty for a person.
create or replace function public.record_referral_invite(p_channel text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;
  if (
    select count(*) from public.referral_invites
    where referrer_id = uid and created_at > now() - interval '1 day'
  ) >= 50 then
    raise exception 'You''re doing that a lot. Take a breather and try again soon.'
      using errcode = 'check_violation', hint = 'rate_limited';
  end if;

  insert into public.referral_invites (referrer_id, channel) values (uid, p_channel);
end;
$$;

-- "Send a nudge": one notification to the friend, at most every three days.
create or replace function public.nudge_referral(p_referral_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  friend uuid;
begin
  update public.referrals
  set nudged_at = now()
  where id = p_referral_id
    and referrer_id = uid
    and status = 'joined'
    and (nudged_at is null or nudged_at < now() - interval '3 days')
  returning invitee_id into friend;

  if friend is null then
    raise exception 'You nudged them recently. Give it a few days.'
      using errcode = 'check_violation', hint = 'rate_limited';
  end if;

  perform private.notify(friend, 'referral_nudge', uid, p_referral_id);
end;
$$;

-- "Claim reward": a month of Season Pass, added after whatever access is
-- already running so no day is lost. Returns the new end of access.
create or replace function public.claim_referral_reward(p_referral_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  s public.subscriptions;
  base timestamptz;
  until timestamptz;
begin
  update public.referrals
  set status = 'applied', applied_at = now()
  where id = p_referral_id and referrer_id = uid and status = 'qualified';

  if not found then
    raise exception 'That reward isn''t ready to claim' using errcode = 'no_data_found';
  end if;

  select * into s from public.subscriptions where user_id = uid for update;

  base := greatest(now(), coalesce(s.bonus_until, now()));
  if s.status = 'trialing' then
    base := greatest(base, coalesce(s.trial_ends_at, now()));
  elsif s.status in ('active', 'past_due', 'canceled') then
    base := greatest(base, coalesce(s.current_period_end, now()));
  end if;
  until := base + interval '1 month';

  update public.subscriptions set bonus_until = until where user_id = uid;
  return until;
end;
$$;

-- Qualification (PRD decision D7, still open): the reward unlocks when the
-- invitee completes their first chapter — closes one through the Chapter
-- Closing Ritual (close_chapter).
create or replace function private.qualify_referral()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  qualified record;
begin
  if new.status = 'closed' and old.status = 'open' then
    for qualified in
      update public.referrals
      set status = 'qualified', qualified_at = now()
      where invitee_id = new.user_id and status = 'joined'
      returning id, referrer_id
    loop
      perform private.notify(qualified.referrer_id, 'referral_reward_earned', new.user_id, qualified.id);
    end loop;
  end if;
  return new;
end;
$$;

create trigger user_chapters_qualify_referral
  after update of status on public.user_chapters
  for each row execute function private.qualify_referral();

revoke execute on function public.my_referral() from public, anon;
grant execute on function public.my_referral() to authenticated;
revoke execute on function public.my_referrals() from public, anon;
grant execute on function public.my_referrals() to authenticated;
revoke execute on function public.referral_inviter(text) from public;
grant execute on function public.referral_inviter(text) to anon, authenticated;
revoke execute on function public.claim_referral(text) from public, anon;
grant execute on function public.claim_referral(text) to authenticated;
revoke execute on function public.record_referral_invite(text) from public, anon;
grant execute on function public.record_referral_invite(text) to authenticated;
revoke execute on function public.nudge_referral(uuid) from public, anon;
grant execute on function public.nudge_referral(uuid) to authenticated;
revoke execute on function public.claim_referral_reward(uuid) from public, anon;
grant execute on function public.claim_referral_reward(uuid) to authenticated;
