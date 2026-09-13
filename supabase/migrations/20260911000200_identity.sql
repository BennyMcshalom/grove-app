-- Identity: profiles, held chapters, preferences, subscription and Deep Focus.
--
-- Every user-owned table references public.profiles (not auth.users) so the
-- Data API can embed profiles, and so deleting the auth user cascades through
-- profiles to everything they own.

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 50),
  avatar_url text,
  -- Coarse "City, Country" only. Precise location never lives on the profile;
  -- see proximity_sessions.
  location_label text check (char_length(location_label) <= 120),
  aura public.aura not null default 'in_transition',
  theme public.theme_preference not null default 'light',
  log_visibility public.log_visibility not null default 'circle',
  terms_accepted_at timestamptz,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;

create policy "Signed-in users can read profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- The three onboarding answers ("What's taking up space in your mind?",
-- "What are you working through?", "I'm looking for"). Edit Profile shows the
-- same three as Sitting with / Honest tension / Open to, "visible only to your
-- bonds", so they live apart from the public profile row. The bonded-reader
-- policy is added with the social graph.
create table public.profile_prompts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  sitting_with text check (char_length(sitting_with) <= 1000),
  honest_tension text check (char_length(honest_tension) <= 1000),
  open_to text check (char_length(open_to) <= 1000),
  updated_at timestamptz not null default now()
);

create trigger profile_prompts_set_updated_at
  before update on public.profile_prompts
  for each row execute function private.set_updated_at();

alter table public.profile_prompts enable row level security;

create policy "Users read their own prompts"
  on public.profile_prompts for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users write their own prompts"
  on public.profile_prompts for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users update their own prompts"
  on public.profile_prompts for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Held chapters ("spaces")
-- ---------------------------------------------------------------------------

create table public.user_chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  chapter_slug text not null references public.chapters (slug) on update cascade,
  phase text not null,
  status public.chapter_status not null default 'open',
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (chapter_slug, phase)
    references public.chapter_phases (chapter_slug, label) on update cascade,
  check ((status = 'closed') = (closed_at is not null))
);

-- One open row per chapter per user; closed ones pile up in the archive.
create unique index user_chapters_one_open_per_chapter
  on public.user_chapters (user_id, chapter_slug)
  where status = 'open';

create index user_chapters_open_by_chapter
  on public.user_chapters (chapter_slug)
  where status = 'open';

create trigger user_chapters_set_updated_at
  before update on public.user_chapters
  for each row execute function private.set_updated_at();

-- "You can only hold 4 chapters at once." Locks the profile row so two
-- concurrent inserts can't both see three open chapters.
create or replace function private.enforce_open_chapter_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  open_count integer;
begin
  if new.status <> 'open' or (tg_op = 'UPDATE' and old.status = 'open') then
    return new;
  end if;

  perform 1 from public.profiles where id = new.user_id for update;

  select count(*) into open_count
  from public.user_chapters
  where user_id = new.user_id and status = 'open';

  if open_count >= 4 then
    raise exception 'You can only hold 4 chapters at once'
      using errcode = 'check_violation', hint = 'chapter_limit';
  end if;

  return new;
end;
$$;

create trigger user_chapters_enforce_limit
  before insert or update of status on public.user_chapters
  for each row execute function private.enforce_open_chapter_limit();

alter table public.user_chapters enable row level security;

-- Open chapters and their phase are what the UI shows on people ("Building a
-- habit", "In this space"). Closed chapters are the owner's private archive.
create policy "Open chapters are visible; closed ones only to their owner"
  on public.user_chapters for select
  to authenticated
  using (status = 'open' or user_id = (select auth.uid()));

create policy "Users open chapters for themselves"
  on public.user_chapters for insert
  to authenticated
  with check (user_id = (select auth.uid()) and status = 'open');

-- Phase changes only. Closing goes through close_chapter(), which also records
-- the reflection.
create policy "Users update their own open chapters"
  on public.user_chapters for update
  to authenticated
  using (user_id = (select auth.uid()) and status = 'open')
  with check (user_id = (select auth.uid()) and status = 'open');

-- Phase history, for the archive's "phases" chips.
create table public.user_chapter_phases (
  id uuid primary key default gen_random_uuid(),
  user_chapter_id uuid not null references public.user_chapters (id) on delete cascade,
  phase text not null,
  started_at timestamptz not null default now()
);

create index user_chapter_phases_by_chapter
  on public.user_chapter_phases (user_chapter_id, started_at);

create or replace function private.record_chapter_phase()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.phase is distinct from old.phase then
    insert into public.user_chapter_phases (user_chapter_id, phase)
    values (new.id, new.phase);
  end if;
  return new;
end;
$$;

create trigger user_chapters_record_phase
  after insert or update of phase on public.user_chapters
  for each row execute function private.record_chapter_phase();

alter table public.user_chapter_phases enable row level security;

create policy "Users read their own phase history"
  on public.user_chapter_phases for select
  to authenticated
  using (
    exists (
      select 1 from public.user_chapters uc
      where uc.id = user_chapter_id and uc.user_id = (select auth.uid())
    )
  );

-- The Close Chapter wizard's three answers plus free-form reflections.
create table public.chapter_closures (
  user_chapter_id uuid primary key references public.user_chapters (id) on delete cascade,
  taught text check (char_length(taught) <= 4000),
  advice text check (char_length(advice) <= 4000),
  carrying_forward text check (char_length(carrying_forward) <= 4000),
  reflections text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.chapter_closures enable row level security;

create policy "Users read their own closures"
  on public.chapter_closures for select
  to authenticated
  using (
    exists (
      select 1 from public.user_chapters uc
      where uc.id = user_chapter_id and uc.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Preferences, subscription, Deep Focus
-- ---------------------------------------------------------------------------

create table public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  chapter_prompt boolean not null default true,
  wave_received boolean not null default true,
  -- "Always on, required for safety".
  bond_invitation boolean not null default true check (bond_invitation),
  updated_at timestamptz not null default now()
);

create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function private.set_updated_at();

alter table public.notification_preferences enable row level security;

create policy "Users read their own notification preferences"
  on public.notification_preferences for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users update their own notification preferences"
  on public.notification_preferences for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Written by the server (billing) only; users can read their own.
create table public.subscriptions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  status public.subscription_status not null default 'none',
  plan text,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function private.set_updated_at();

alter table public.subscriptions enable row level security;

create policy "Users read their own subscription"
  on public.subscriptions for select
  to authenticated
  using (user_id = (select auth.uid()));

-- "Start 14-day trial" — once per account.
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
      trial_ends_at = now() + interval '14 days'
  where user_id = (select auth.uid()) and trial_started_at is null
  returning * into result;

  if not found then
    raise exception 'Your free trial has already been used'
      using errcode = 'check_violation', hint = 'trial_used';
  end if;

  return result;
end;
$$;

revoke execute on function public.start_trial() from public, anon;
grant execute on function public.start_trial() to authenticated;

create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  duration public.focus_duration not null,
  started_at timestamptz not null default now(),
  -- Computed by the server in the user's timezone ("Until this evening").
  ends_at timestamptz not null,
  ended_early_at timestamptz,
  check (ends_at > started_at)
);

create index focus_sessions_by_user on public.focus_sessions (user_id, ends_at desc);

alter table public.focus_sessions enable row level security;

create policy "Users manage their own focus sessions"
  on public.focus_sessions for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- New users
-- ---------------------------------------------------------------------------

-- Creates the profile and its companion rows when Supabase Auth creates a user.
-- Email sign-up passes first_name and terms_accepted in user metadata; Google
-- supplies given_name / full_name and picture.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  name text := nullif(trim(coalesce(
    meta ->> 'first_name',
    meta ->> 'given_name',
    split_part(coalesce(meta ->> 'full_name', meta ->> 'name', ''), ' ', 1)
  )), '');
begin
  insert into public.profiles (id, first_name, avatar_url, terms_accepted_at)
  values (
    new.id,
    left(coalesce(name, nullif(split_part(new.email, '@', 1), ''), 'Friend'), 50),
    coalesce(meta ->> 'avatar_url', meta ->> 'picture'),
    case when meta ->> 'terms_accepted' = 'true' then now() end
  );

  insert into public.notification_preferences (user_id) values (new.id);
  insert into public.subscriptions (user_id) values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Onboarding
-- ---------------------------------------------------------------------------

-- Saves the whole onboarding flow in one transaction: the chosen chapters with
-- their phase, the three profile prompts, and the onboarded timestamp.
-- p_chapters: [{"slug": "career", "phase": "Growing a team"}, ...]
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
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  if jsonb_typeof(p_chapters) is distinct from 'array'
     or jsonb_array_length(p_chapters) not between 1 and 4 then
    raise exception 'Choose between 1 and 4 chapters'
      using errcode = 'check_violation', hint = 'chapter_count';
  end if;

  -- Retrying a finished onboarding is a no-op rather than an error.
  if exists (select 1 from public.profiles where id = uid and onboarded_at is not null) then
    return;
  end if;

  for item in select value from jsonb_array_elements(p_chapters) loop
    insert into public.user_chapters (user_id, chapter_slug, phase)
    values (uid, item ->> 'slug', item ->> 'phase')
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

revoke execute on function public.complete_onboarding(jsonb, text, text, text) from public, anon;
grant execute on function public.complete_onboarding(jsonb, text, text, text) to authenticated;
