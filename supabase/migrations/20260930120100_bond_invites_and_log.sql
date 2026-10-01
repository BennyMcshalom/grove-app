-- Bonds, the hybrid (PRD v1.1 §10): the engine still forms Bonds on its own
-- from how two people show up for each other, and a Season Pass member can
-- also "make it official" — invite someone in their circle into a Bond with a
-- shared goal. Invited Bonds hold their slots first and the engine never
-- moves them; the cap of five holds across both.
--
-- Also here: check-ins, the End Bond (Release) ritual, and the Bond Log — a
-- standing weekly prompt, a 5-day gratitude challenge and "try something new
-- together", each answered as a private draft until you choose to share it.

-- ===========================================================================
-- Bonds: where they came from, what they're for, who ended them
-- ===========================================================================

create type public.bond_origin as enum ('engine', 'invite');

alter table public.bonds
  add column origin public.bond_origin not null default 'engine',
  -- "Checking in on our first year in a new city"
  add column shared_goal text check (char_length(shared_goal) between 1 and 200),
  -- "7 months": how long they gave the goal. Optional.
  add column goal_horizon_months smallint check (goal_horizon_months between 1 and 36),
  -- Set when a member ends the Bond (Release). The engine leaves that pair
  -- alone for a while afterwards instead of re-forming it the next week.
  add column ended_by uuid references public.profiles (id) on delete set null,
  add column responded_at timestamptz;

alter table private.engine_rules
  add column release_cooldown interval not null default '90 days';

-- ===========================================================================
-- C-03 · Bond assignment, now around invited Bonds
-- ===========================================================================

-- Invited Bonds take their slots first. Then every engine Bond and every pair
-- past the threshold is taken strongest first, as before, while both people
-- still have a free slot. A pair with a pending invite, an invited Bond, or a
-- recent member-ended Bond is left alone.
create or replace function private.assign_bonds(p_now timestamptz default now())
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  rules private.engine_rules;
  pair record;
  slots jsonb := '{}';
  kept text[] := '{}';
  low_used integer;
  high_used integer;
  released public.bonds;
  formed uuid;
begin
  select * into rules from private.engine_rules;

  for pair in
    select b.user_low, b.user_high from public.bonds b
    where b.status = 'active' and b.origin = 'invite'
  loop
    low_used := coalesce((slots ->> pair.user_low::text)::integer, 0);
    high_used := coalesce((slots ->> pair.user_high::text)::integer, 0);
    slots := slots
      || jsonb_build_object(pair.user_low::text, low_used + 1)
      || jsonb_build_object(pair.user_high::text, high_used + 1);
    kept := kept || (pair.user_low::text || ':' || pair.user_high::text);
  end loop;

  for pair in
    select x.user_low, x.user_high, coalesce(d.weighted_score, 0) as score, (b.id is not null) as current
    from (
      select b.user_low, b.user_high from public.bonds b where b.status = 'active' and b.origin = 'engine'
      union
      select d.user_low, d.user_high
      from private.bond_depth d
      join public.connections c
        on c.user_low = d.user_low and c.user_high = d.user_high and c.status = 'accepted'
      where d.threshold_met
    ) x
    left join private.bond_depth d on d.user_low = x.user_low and d.user_high = x.user_high
    left join public.bonds b
      on b.user_low = x.user_low and b.user_high = x.user_high and b.status = 'active' and b.origin = 'engine'
    where not exists (
        select 1 from public.bonds o
        where o.user_low = x.user_low and o.user_high = x.user_high
          and (o.status = 'pending' or (o.status = 'active' and o.origin = 'invite'))
      )
      and not exists (
        select 1 from public.bonds r
        where r.user_low = x.user_low and r.user_high = x.user_high
          and r.ended_by is not null
          and r.released_at > p_now - rules.release_cooldown
      )
    order by score desc, current desc, x.user_low, x.user_high
  loop
    low_used := coalesce((slots ->> pair.user_low::text)::integer, 0);
    high_used := coalesce((slots ->> pair.user_high::text)::integer, 0);
    if low_used < 5 and high_used < 5 then
      slots := slots
        || jsonb_build_object(pair.user_low::text, low_used + 1)
        || jsonb_build_object(pair.user_high::text, high_used + 1);
      kept := kept || (pair.user_low::text || ':' || pair.user_high::text);
    end if;
  end loop;

  -- Out first, so the cap never trips mid-reshuffle. Only engine Bonds move.
  for released in
    update public.bonds b
    set status = 'released', released_at = p_now
    where b.status = 'active'
      and b.origin = 'engine'
      and not ((b.user_low::text || ':' || b.user_high::text) = any (kept))
    returning b.*
  loop
    perform private.notify(released.user_low, 'bond_shifted', released.user_high, released.id);
    perform private.notify(released.user_high, 'bond_shifted', released.user_low, released.id);
  end loop;

  for pair in
    select split_part(k, ':', 1)::uuid as user_low, split_part(k, ':', 2)::uuid as user_high
    from unnest(kept) as k
  loop
    if not exists (
      select 1 from public.bonds b
      where b.user_low = pair.user_low and b.user_high = pair.user_high and b.status = 'active'
    ) then
      insert into public.bonds (inviter_id, invitee_id, status, accepted_at, origin)
      values (pair.user_low, pair.user_high, 'active', p_now, 'engine')
      returning id into formed;
      perform private.notify(pair.user_low, 'bond_formed', pair.user_high, formed);
      perform private.notify(pair.user_high, 'bond_formed', pair.user_low, formed);
    end if;
  end loop;

  delete from public.bond_ranks;
  insert into public.bond_ranks (user_id, bond_id, rank)
  select held.user_id, held.bond_id,
    row_number() over (partition by held.user_id order by held.score desc, held.since, held.bond_id)
  from (
    select b.id as bond_id, side.user_id, coalesce(d.weighted_score, 0) as score, coalesce(b.accepted_at, b.created_at) as since
    from public.bonds b
    cross join lateral (values (b.inviter_id), (b.invitee_id)) as side (user_id)
    left join private.bond_depth d on d.user_low = b.user_low and d.user_high = b.user_high
    where b.status = 'active'
  ) held;
end;
$$;

-- A new Bond takes the lowest free rank on each side until the weekly run
-- re-ranks everyone.
create or replace function private.rank_new_bond(p_bond_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.bonds;
  side uuid;
  free_rank integer;
begin
  select * into b from public.bonds where id = p_bond_id;
  foreach side in array array[b.inviter_id, b.invitee_id] loop
    delete from public.bond_ranks r
    using public.bonds x
    where x.id = r.bond_id and r.user_id = side and x.status <> 'active';

    select min(n) into free_rank
    from generate_series(1, 5) n
    where not exists (select 1 from public.bond_ranks r where r.user_id = side and r.rank = n);

    if free_rank is not null then
      insert into public.bond_ranks (user_id, bond_id, rank)
      values (side, b.id, free_rank)
      on conflict do nothing;
    end if;
  end loop;
end;
$$;

-- Leaving someone's circle withdraws a Bond invite between you as well.
create or replace function private.decline_bond_invites_with_connection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.bonds
  set status = 'declined', responded_at = now()
  where user_low = old.user_low and user_high = old.user_high and status = 'pending';
  return null;
end;
$$;

create trigger connections_decline_bond_invites
  after delete on public.connections
  for each row execute function private.decline_bond_invites_with_connection();

-- ===========================================================================
-- Invite, respond, withdraw, end, edit the goal
-- ===========================================================================

-- "Make it official → Invite to Bond" (Figma 1102:24491). Season Pass only,
-- someone already in your circle, and a goal you're both working toward.
create or replace function public.invite_to_bond(p_other uuid, p_goal text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  goal text := nullif(trim(p_goal), '');
  made uuid;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;
  if not private.has_pass(uid) then
    raise exception 'Inviting someone into a Bond is part of the Season Pass'
      using errcode = 'insufficient_privilege', hint = 'pass_required';
  end if;
  if goal is null or char_length(goal) > 200 then
    raise exception 'Say what you''re both working toward' using errcode = '22023', hint = 'goal';
  end if;
  if p_other is null or p_other = uid then
    raise exception 'Choose someone else' using errcode = 'check_violation';
  end if;
  if not private.in_circle(p_other) or private.blocked_between(uid, p_other) then
    raise exception 'You can only invite people in your circle' using errcode = 'check_violation', hint = 'not_in_circle';
  end if;

  perform 1 from public.profiles where id in (uid, p_other) order by id for update;

  if exists (
    select 1 from public.bonds b
    where b.user_low = least(uid, p_other) and b.user_high = greatest(uid, p_other) and b.status = 'active'
  ) then
    raise exception 'You''re already Bonded' using errcode = 'check_violation', hint = 'already_bonded';
  end if;
  if exists (
    select 1 from public.bonds b
    where b.user_low = least(uid, p_other) and b.user_high = greatest(uid, p_other) and b.status = 'pending'
  ) then
    raise exception 'There''s already a Bond invite between you' using errcode = 'check_violation', hint = 'already_invited';
  end if;
  if (select count(*) from public.bonds b where b.status = 'active' and uid in (b.inviter_id, b.invitee_id)) >= 5 then
    raise exception 'Nobody can hold more than 5 bonds' using errcode = 'check_violation', hint = 'bond_cap';
  end if;

  insert into public.bonds (inviter_id, invitee_id, status, origin, shared_goal)
  values (uid, p_other, 'pending', 'invite', goal)
  returning id into made;

  perform private.notify(p_other, 'bond_invitation', uid, made, jsonb_build_object('goal', goal));
  return made;
end;
$$;

-- Accept / Decline (Figma 1228:29152). Accepting needs the Season Pass on
-- both accounts at that moment (PRD D3); declining never does.
create or replace function public.respond_to_bond_invite(p_bond_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  b public.bonds;
begin
  select * into b from public.bonds
  where id = p_bond_id and invitee_id = uid and status = 'pending'
  for update;

  if not found then
    raise exception 'That invitation is no longer waiting on you' using errcode = 'no_data_found';
  end if;

  if not p_accept then
    update public.bonds set status = 'declined', responded_at = now() where id = b.id;
    perform private.notify(b.inviter_id, 'bond_declined', uid, b.id);
    return;
  end if;

  if not private.has_pass(uid) then
    raise exception 'Accepting a Bond is part of the Season Pass'
      using errcode = 'insufficient_privilege', hint = 'pass_required';
  end if;
  if not private.has_pass(b.inviter_id) then
    raise exception 'This invite can''t be accepted while their Season Pass is paused'
      using errcode = 'insufficient_privilege', hint = 'inviter_pass';
  end if;
  if not private.in_circle(b.inviter_id) then
    raise exception 'You''re no longer connected' using errcode = 'check_violation', hint = 'not_in_circle';
  end if;

  -- An engine Bond may have formed between you since the invite was sent;
  -- the invite simply makes it official.
  update public.bonds
  set origin = 'invite', shared_goal = b.shared_goal, responded_at = now()
  where user_low = b.user_low and user_high = b.user_high and status = 'active';
  if found then
    update public.bonds set status = 'declined', responded_at = now() where id = b.id;
  else
    -- The cap trigger refuses a sixth Bond on either side (hint bond_cap).
    update public.bonds
    set status = 'active', accepted_at = now(), responded_at = now()
    where id = b.id;
    perform private.rank_new_bond(b.id);
  end if;

  perform private.notify(b.inviter_id, 'bond_accepted', uid, b.id);
end;
$$;

-- The inviter takes an unanswered invite back.
create or replace function public.withdraw_bond_invite(p_bond_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  update public.bonds
  set status = 'declined', responded_at = now()
  where id = p_bond_id and inviter_id = uid and status = 'pending';
  if not found then
    raise exception 'That invite was already answered' using errcode = 'no_data_found';
  end if;
  delete from public.notifications where kind = 'bond_invitation' and entity_id = p_bond_id;
end;
$$;

-- "End this Bond?" → End Bond (Figma 1160:21879): the Release ritual. Either
-- person, any origin, no Season Pass needed. What you shared stays as a
-- read-only record; the chat carries on as an ordinary connection.
create or replace function public.end_bond(p_bond_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  b public.bonds;
begin
  update public.bonds
  set status = 'released', released_at = now(), ended_by = uid
  where id = p_bond_id and uid in (inviter_id, invitee_id) and status = 'active'
  returning * into b;

  if not found then
    raise exception 'That Bond is not active' using errcode = 'no_data_found';
  end if;

  delete from public.bond_ranks where bond_id = b.id;
  update public.bond_activities set ended_at = now(), ended_by = uid where bond_id = b.id and ended_at is null;
  perform private.notify(
    case when b.inviter_id = uid then b.invitee_id else b.inviter_id end,
    'bond_released', uid, b.id
  );
end;
$$;

-- "Edit goal" on Bond Details. Any active Bond, either person, Season Pass.
create or replace function public.set_bond_goal(p_bond_id uuid, p_goal text, p_horizon_months smallint default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  goal text := nullif(trim(p_goal), '');
begin
  if not private.has_pass(uid) then
    raise exception 'Shared goals are part of the Season Pass'
      using errcode = 'insufficient_privilege', hint = 'pass_required';
  end if;
  if goal is null or char_length(goal) > 200 then
    raise exception 'Say what you''re both working toward' using errcode = '22023', hint = 'goal';
  end if;
  if p_horizon_months is not null and p_horizon_months not between 1 and 36 then
    raise exception 'Choose between 1 and 36 months' using errcode = '22023', hint = 'horizon';
  end if;

  update public.bonds
  set shared_goal = goal, goal_horizon_months = p_horizon_months
  where id = p_bond_id and uid in (inviter_id, invitee_id) and status = 'active';
  if not found then
    raise exception 'That Bond is not active' using errcode = 'no_data_found';
  end if;
end;
$$;

-- ===========================================================================
-- Check-ins (Figma 1236:22458): "a quick note about a moment with Jalen"
-- ===========================================================================

create type public.checkin_mode as enum ('in_app', 'in_person');

create table public.bond_checkins (
  id uuid primary key default gen_random_uuid(),
  bond_id uuid not null references public.bonds (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  mode public.checkin_mode not null,
  body text not null check (char_length(body) between 1 and 500),
  happened_on date not null default current_date,
  created_at timestamptz not null default now()
);

create index bond_checkins_by_bond on public.bond_checkins (bond_id, happened_on desc, created_at desc);
create index bond_checkins_by_author on public.bond_checkins (author_id, created_at desc);

alter table public.bond_checkins enable row level security;

create policy "Both people read their Bond's check-ins"
  on public.bond_checkins for select
  to authenticated
  using (
    exists (
      select 1 from public.bonds b
      where b.id = bond_id and (select auth.uid()) in (b.inviter_id, b.invitee_id)
    )
  );

create policy "Authors remove their own check-ins"
  on public.bond_checkins for delete
  to authenticated
  using (author_id = (select auth.uid()));

create trigger bond_checkins_rate_limit before insert on public.bond_checkins
  for each row execute function private.enforce_rate_limit('author_id', '30', '1 day');

create or replace function public.log_bond_checkin(
  p_bond_id uuid,
  p_mode public.checkin_mode,
  p_body text,
  p_happened_on date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  b public.bonds;
  made uuid;
begin
  if not private.has_pass(uid) then
    raise exception 'Check-ins are part of the Season Pass'
      using errcode = 'insufficient_privilege', hint = 'pass_required';
  end if;
  select * into b from public.bonds where id = p_bond_id and uid in (inviter_id, invitee_id) and status = 'active';
  if not found then
    raise exception 'That Bond is not active' using errcode = 'no_data_found';
  end if;
  if nullif(trim(p_body), '') is null then
    raise exception 'Say what happened' using errcode = '22023', hint = 'empty';
  end if;
  -- The app sends the member's local day, which can be a day ahead of ours.
  if p_happened_on > current_date + 1 or p_happened_on < current_date - 366 then
    raise exception 'Choose a day in the past year' using errcode = '22023', hint = 'date';
  end if;

  insert into public.bond_checkins (bond_id, author_id, mode, body, happened_on)
  values (b.id, uid, p_mode, trim(p_body), coalesce(p_happened_on, current_date))
  returning id into made;

  -- Check-ins speed a Bond's depth up, like logging together.
  perform private.log_interaction(
    uid, case when b.inviter_id = uid then b.invitee_id else b.inviter_id end,
    'logged_together', b.chapter_slug, made, true
  );
  return made;
end;
$$;

-- ===========================================================================
-- Depth, coarse (PRD D8): a 10–100 bar with no number, never the raw score.
-- Only answers for the caller's own Bonds.
-- ===========================================================================

create or replace function private.bond_depth_level(p_bond_id uuid)
returns smallint
language sql
stable
security definer
set search_path = ''
as $$
  select (
    least(100, greatest(10, round(coalesce(d.weighted_score, 0) / (r.bond_threshold * 2) * 10) * 10))
  )::smallint
  from public.bonds b
  cross join private.engine_rules r
  left join private.bond_depth d on d.user_low = b.user_low and d.user_high = b.user_high
  where b.id = p_bond_id and (select auth.uid()) in (b.inviter_id, b.invitee_id);
$$;

revoke execute on function private.bond_depth_level(uuid) from public, anon;
grant execute on function private.bond_depth_level(uuid) to authenticated;

-- ===========================================================================
-- Bond Log: activities, prompts and responses
-- ===========================================================================

-- Weekly check-in (the standing prompt), the 5-day gratitude challenge, and
-- "try something new together" (Figma 1189:21296).
create type public.bond_activity_kind as enum ('weekly', 'gratitude', 'something_new');

create table public.bond_prompts (
  id uuid primary key default gen_random_uuid(),
  kind public.bond_activity_kind not null,
  title text not null check (char_length(title) between 1 and 200),
  subtitle text check (char_length(subtitle) <= 200),
  sort_order smallint not null,
  unique (kind, sort_order)
);

alter table public.bond_prompts enable row level security;

create policy "Signed-in users read Bond prompts"
  on public.bond_prompts for select
  to authenticated
  using (true);

insert into public.bond_prompts (kind, title, subtitle, sort_order) values
  ('weekly', 'What did you build today, even a little?', 'This week’s prompt: something small you made progress on.', 1),
  ('weekly', 'What’s something you’re looking forward to?', 'This week’s prompt: name one thing on the horizon.', 2),
  ('weekly', 'What surprised you this week?', 'This week’s prompt: something unexpected, good or hard.', 3),
  ('weekly', 'What felt heavy this week, and what helped?', 'This week’s prompt: one weight, one lift.', 4),
  ('weekly', 'Who made this week a little better?', 'This week’s prompt: someone worth thanking.', 5),
  ('weekly', 'What are you learning about yourself right now?', 'This week’s prompt: one honest line.', 6),
  ('gratitude', 'What are you grateful for today?', 'Share one thing you’re grateful for today.', 1),
  ('something_new', 'What will you try together?', 'Pick an activity neither of you has done before.', 1),
  ('something_new', 'How did it go?', 'Once you’ve tried it, look back on it together.', 2);

create table public.bond_activities (
  id uuid primary key default gen_random_uuid(),
  bond_id uuid not null references public.bonds (id) on delete cascade,
  kind public.bond_activity_kind not null,
  -- Null when the Bond started it (every Bond opens with the weekly prompt).
  started_by uuid references public.profiles (id) on delete set null,
  started_on date not null default current_date,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  ended_by uuid references public.profiles (id) on delete set null
);

-- One running activity of each kind per Bond.
create unique index bond_activities_one_live_per_kind
  on public.bond_activities (bond_id, kind)
  where ended_at is null;

alter table public.bond_activities enable row level security;

create policy "Both people read their Bond's activities"
  on public.bond_activities for select
  to authenticated
  using (
    exists (
      select 1 from public.bonds b
      where b.id = bond_id and (select auth.uid()) in (b.inviter_id, b.invitee_id)
    )
  );

-- How many rounds of an activity are open by today: one a week for the
-- weekly prompt, Day 1–5 for gratitude, both questions at once for "try
-- something new". Nothing opens after it ended.
create or replace function private.bond_activity_rounds(
  p_kind public.bond_activity_kind,
  p_started_on date,
  p_ended_at timestamptz
)
returns integer
language sql
stable
set search_path = ''
as $$
  select case p_kind
    when 'weekly' then greatest(0, (last_day - p_started_on) / 7 + 1)
    when 'gratitude' then least(5, greatest(0, last_day - p_started_on + 1))
    else 2
  end
  from (select least(current_date, coalesce(p_ended_at::date, current_date)) as last_day) d;
$$;

create table public.bond_log_responses (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.bond_activities (id) on delete cascade,
  bond_id uuid not null references public.bonds (id) on delete cascade,
  round smallint not null check (round between 1 and 520),
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  -- Null while it's a private draft ("Only you can see this until you choose
  -- to share it").
  shared_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activity_id, round, author_id)
);

create index bond_log_responses_by_bond on public.bond_log_responses (bond_id, shared_at);

create trigger bond_log_responses_set_updated_at
  before update on public.bond_log_responses
  for each row execute function private.set_updated_at();

alter table public.bond_log_responses enable row level security;

-- Drafts are the author's alone; a shared answer is for the pair.
create policy "Authors read their drafts; the pair reads what's shared"
  on public.bond_log_responses for select
  to authenticated
  using (
    author_id = (select auth.uid())
    or (
      shared_at is not null
      and exists (
        select 1 from public.bonds b
        where b.id = bond_id and (select auth.uid()) in (b.inviter_id, b.invitee_id)
      )
    )
  );

-- Every active Bond opens with the weekly prompt.
create or replace function private.start_bond_weekly_prompt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status <> 'active') then
    insert into public.bond_activities (bond_id, kind) values (new.id, 'weekly') on conflict do nothing;
  end if;
  return null;
end;
$$;

create trigger bonds_start_weekly_prompt
  after insert or update of status on public.bonds
  for each row execute function private.start_bond_weekly_prompt();

insert into public.bond_activities (bond_id, kind)
select b.id, 'weekly' from public.bonds b where b.status = 'active'
on conflict do nothing;

-- "Start a challenge or activity" → Start challenge.
create or replace function public.start_bond_activity(p_bond_id uuid, p_kind public.bond_activity_kind)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  made uuid;
begin
  if not private.has_pass(uid) then
    raise exception 'The Bond Log is part of the Season Pass'
      using errcode = 'insufficient_privilege', hint = 'pass_required';
  end if;
  if not exists (
    select 1 from public.bonds b where b.id = p_bond_id and uid in (b.inviter_id, b.invitee_id) and b.status = 'active'
  ) then
    raise exception 'That Bond is not active' using errcode = 'no_data_found';
  end if;

  -- A finished gratitude week makes way for a new one.
  update public.bond_activities
  set ended_at = now()
  where bond_id = p_bond_id and kind = 'gratitude' and ended_at is null and started_on + 5 <= current_date;

  if exists (select 1 from public.bond_activities a where a.bond_id = p_bond_id and a.kind = p_kind and a.ended_at is null) then
    raise exception 'That''s already running' using errcode = 'check_violation', hint = 'already_running';
  end if;

  insert into public.bond_activities (bond_id, kind, started_by)
  values (p_bond_id, p_kind, uid)
  returning id into made;
  return made;
end;
$$;

-- "End Challenge" → "Are you sure…?" (Figma 1303:22514). Nothing shared is
-- deleted; no new rounds open.
create or replace function public.end_bond_activity(p_activity_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  update public.bond_activities a
  set ended_at = now(), ended_by = uid
  from public.bonds b
  where a.id = p_activity_id and b.id = a.bond_id
    and uid in (b.inviter_id, b.invitee_id)
    and a.ended_at is null;
  if not found then
    raise exception 'That has already ended' using errcode = 'no_data_found';
  end if;
end;
$$;

-- Save as draft / Update draft / Share response. Once shared, it's final.
create or replace function public.save_bond_response(
  p_activity_id uuid,
  p_round integer,
  p_body text,
  p_share boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  a public.bond_activities;
  b public.bonds;
  body text := nullif(trim(p_body), '');
  saved public.bond_log_responses;
begin
  if not private.has_pass(uid) then
    raise exception 'The Bond Log is part of the Season Pass'
      using errcode = 'insufficient_privilege', hint = 'pass_required';
  end if;
  select * into a from public.bond_activities where id = p_activity_id;
  select * into b from public.bonds where id = a.bond_id and uid in (inviter_id, invitee_id);
  if a.id is null or b.id is null or b.status <> 'active' or a.ended_at is not null then
    raise exception 'This log is read-only now' using errcode = 'no_data_found', hint = 'read_only';
  end if;
  if p_round < 1 or p_round > private.bond_activity_rounds(a.kind, a.started_on, a.ended_at) then
    raise exception 'That prompt isn''t open yet' using errcode = '22023', hint = 'not_open';
  end if;
  if body is null or char_length(body) > 2000 then
    raise exception 'Write something first' using errcode = '22023', hint = 'empty';
  end if;
  if exists (
    select 1 from public.bond_log_responses r
    where r.activity_id = a.id and r.round = p_round and r.author_id = uid and r.shared_at is not null
  ) then
    raise exception 'You''ve already shared this one' using errcode = 'check_violation', hint = 'already_shared';
  end if;

  insert into public.bond_log_responses (activity_id, bond_id, round, author_id, body, shared_at)
  values (a.id, b.id, p_round, uid, body, case when p_share then now() end)
  on conflict (activity_id, round, author_id)
  do update set body = excluded.body, shared_at = excluded.shared_at
  returning * into saved;

  if p_share then
    perform private.notify(
      case when b.inviter_id = uid then b.invitee_id else b.inviter_id end,
      'bond_log_shared', uid, b.id,
      jsonb_build_object('activity', a.kind, 'round', p_round)
    );
    perform private.log_interaction(
      uid, case when b.inviter_id = uid then b.invitee_id else b.inviter_id end,
      'weekly_prompt_shared', b.chapter_slug, saved.id, true
    );
  end if;
end;
$$;

-- One Bond's log, round by round. Your own draft or answer, and theirs once
-- they've shared it. A released Bond's log reads the same, but nothing opens.
create or replace function public.bond_log(p_bond_id uuid)
returns table (
  activity_id uuid,
  kind public.bond_activity_kind,
  activity_started_at timestamptz,
  activity_ended boolean,
  round integer,
  opens_on date,
  title text,
  subtitle text,
  my_body text,
  my_shared boolean,
  their_body text,
  their_shared boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select (select auth.uid()) as uid
  ),
  bond as (
    select b.* from public.bonds b cross join me
    where b.id = p_bond_id and me.uid in (b.inviter_id, b.invitee_id)
  ),
  acts as (
    select a.*, coalesce(a.ended_at, bond.released_at) as closed_at
    from public.bond_activities a
    join bond on bond.id = a.bond_id
  ),
  rounds as (
    select acts.*, g.n
    from acts
    cross join lateral generate_series(1, private.bond_activity_rounds(acts.kind, acts.started_on, acts.closed_at)) as g (n)
  )
  select
    r.id,
    r.kind,
    r.started_at,
    r.closed_at is not null,
    r.n,
    case r.kind
      when 'weekly' then r.started_on + 7 * (r.n - 1)
      when 'gratitude' then r.started_on + (r.n - 1)
      else r.started_on
    end,
    p.title,
    p.subtitle,
    mine.body,
    mine.shared_at is not null,
    case when theirs.shared_at is not null then theirs.body end,
    theirs.shared_at is not null
  from rounds r
  cross join me
  left join lateral (
    select bp.title, bp.subtitle from public.bond_prompts bp
    where bp.kind = r.kind
    order by bp.sort_order
    offset ((r.n - 1) % greatest((select count(*) from public.bond_prompts c where c.kind = r.kind), 1))
    limit 1
  ) p on true
  left join public.bond_log_responses mine
    on mine.activity_id = r.id and mine.round = r.n and mine.author_id = me.uid
  left join public.bond_log_responses theirs
    on theirs.activity_id = r.id and theirs.round = r.n and theirs.author_id <> me.uid
  order by r.started_at desc, r.n desc;
$$;

-- The Grouv Log's Bond Log tab (Figma 1232:23130): every Bond keeping a log
-- with you, with "New response from Jalen" when they've shared something you
-- haven't answered yet.
create or replace function public.my_bond_logs()
returns table (
  bond_id uuid,
  user_id uuid,
  first_name text,
  avatar_url text,
  chapter_slug text,
  phase text,
  status public.bond_status,
  since timestamptz,
  released_at timestamptz,
  shared_count integer,
  waiting_on_me boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select (select auth.uid()) as uid
  ),
  mine as (
    select b.*, case when b.inviter_id = me.uid then b.invitee_id else b.inviter_id end as other
    from public.bonds b cross join me
    where me.uid in (b.inviter_id, b.invitee_id) and b.status in ('active', 'released')
  ),
  -- A pair can have bonded more than once; show the latest.
  latest as (
    select distinct on (other) * from mine order by other, (status = 'active') desc, coalesce(accepted_at, created_at) desc
  )
  select
    l.id,
    p.id,
    p.first_name,
    p.avatar_url,
    held.chapter_slug,
    held.phase,
    l.status,
    coalesce(l.accepted_at, l.created_at),
    l.released_at,
    (select count(*)::integer from public.bond_log_responses r where r.bond_id = l.id and r.shared_at is not null),
    exists (
      select 1 from public.bond_log_responses t
      cross join me
      where t.bond_id = l.id and t.author_id <> me.uid and t.shared_at is not null
        and not exists (
          select 1 from public.bond_log_responses m
          where m.activity_id = t.activity_id and m.round = t.round and m.author_id = me.uid and m.shared_at is not null
        )
    )
  from latest l
  join public.profiles p on p.id = l.other
  left join lateral (
    select uc.chapter_slug, uc.phase from public.user_chapters uc
    where uc.user_id = p.id and uc.status = 'open'
    order by uc.opened_at
    limit 1
  ) held on true
  order by (l.status = 'active') desc, coalesce(l.accepted_at, l.created_at) desc;
$$;

-- ===========================================================================
-- Reads for the Bonds screen and Bond Details
-- ===========================================================================

-- The Bonds screen: each row now carries its goal, check-ins and a coarse
-- depth; circle rows carry any Bond invite in flight between you.
drop function public.bonds_overview();

create function public.bonds_overview()
returns table (
  user_id uuid,
  first_name text,
  avatar_url text,
  aura public.aura,
  chapter_slug text,
  phase text,
  relationship text,
  bond_id uuid,
  together_since timestamptz,
  bond_rank smallint,
  bond_origin public.bond_origin,
  shared_goal text,
  goal_horizon_months smallint,
  checkin_count integer,
  depth_level smallint,
  invite_id uuid,
  invite_from_me boolean,
  invite_goal text,
  conversation_id uuid,
  last_message_body text,
  last_message_kind public.message_kind,
  last_message_at timestamptz,
  last_message_from_me boolean,
  unread_count integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with me as (
    select (select auth.uid()) as uid
  ),
  people as (
    select
      case when b.inviter_id = me.uid then b.invitee_id else b.inviter_id end as other,
      'bond'::text as relationship,
      b.id as bond_id,
      coalesce(b.accepted_at, b.created_at) as since
    from public.bonds b
    cross join me
    where b.status = 'active' and me.uid in (b.inviter_id, b.invitee_id)
    union all
    select
      case when c.requester_id = me.uid then c.addressee_id else c.requester_id end,
      'circle',
      null,
      coalesce(c.responded_at, c.created_at)
    from public.connections c
    cross join me
    where c.status = 'accepted' and me.uid in (c.requester_id, c.addressee_id)
  ),
  ranked as (
    select distinct on (other) other, relationship, bond_id, since
    from people
    order by other, (relationship = 'bond') desc
  )
  select
    p.id,
    p.first_name,
    p.avatar_url,
    p.aura,
    held.chapter_slug,
    held.phase,
    r.relationship,
    r.bond_id,
    r.since,
    br.rank,
    bond.origin,
    bond.shared_goal,
    bond.goal_horizon_months,
    (select count(*)::integer from public.bond_checkins ci where ci.bond_id = r.bond_id),
    case when r.bond_id is not null then private.bond_depth_level(r.bond_id) end,
    invite.id,
    invite.inviter_id = me.uid,
    invite.shared_goal,
    conv.id,
    last_message.body,
    last_message.kind,
    last_message.created_at,
    last_message.sender_id = me.uid,
    coalesce(stats.unread, 0)
  from ranked r
  cross join me
  join public.profiles p on p.id = r.other
  left join public.bonds bond on bond.id = r.bond_id
  left join public.bond_ranks br on br.user_id = me.uid and br.bond_id = r.bond_id
  left join public.bonds invite
    on invite.status = 'pending'
    and invite.user_low = least(me.uid, r.other)
    and invite.user_high = greatest(me.uid, r.other)
  left join lateral (
    select uc.chapter_slug, uc.phase from public.user_chapters uc
    where uc.user_id = p.id and uc.status = 'open'
    order by uc.opened_at
    limit 1
  ) held on true
  left join public.conversations conv
    on conv.direct_key = least(me.uid, r.other)::text || ':' || greatest(me.uid, r.other)::text
  left join lateral (
    select m.body, m.kind, m.created_at, m.sender_id
    from public.messages m
    where m.conversation_id = conv.id and m.deleted_at is null
    order by m.created_at desc
    limit 1
  ) last_message on true
  left join lateral (
    select
      (count(*) filter (
        where m.sender_id <> me.uid
          and m.created_at > coalesce(cm.last_read_at, '-infinity'::timestamptz)
      ))::integer as unread
    from public.messages m
    left join public.conversation_members cm
      on cm.conversation_id = m.conversation_id and cm.user_id = me.uid
    where m.conversation_id = conv.id
  ) stats on true
  order by (r.relationship = 'bond') desc, br.rank nulls last, last_message.created_at desc nulls last, p.first_name;
$$;

-- YOUR BOND INVITES: invites waiting on the viewer.
create or replace function public.bond_invites()
returns table (
  bond_id uuid,
  user_id uuid,
  first_name text,
  avatar_url text,
  chapter_slug text,
  phase text,
  shared_goal text,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select b.id, p.id, p.first_name, p.avatar_url, held.chapter_slug, held.phase, b.shared_goal, b.created_at
  from public.bonds b
  join public.profiles p on p.id = b.inviter_id
  left join lateral (
    select uc.chapter_slug, uc.phase from public.user_chapters uc
    where uc.user_id = p.id and uc.status = 'open'
    order by uc.opened_at
    limit 1
  ) held on true
  where b.invitee_id = (select auth.uid()) and b.status = 'pending'
  order by b.created_at desc
  limit 20;
$$;

-- Bond Details (Figma 1228:29301 / 1238:30546) — one Bond of the viewer's,
-- active or released.
create or replace function public.bond_details(p_bond_id uuid)
returns table (
  bond_id uuid,
  user_id uuid,
  first_name text,
  avatar_url text,
  aura public.aura,
  chapter_slug text,
  phase text,
  origin public.bond_origin,
  status public.bond_status,
  shared_goal text,
  goal_horizon_months smallint,
  since timestamptz,
  released_at timestamptz,
  ended_by_me boolean,
  depth_level smallint,
  checkin_count integer,
  first_checkin_on date,
  log_count integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    b.id,
    p.id,
    p.first_name,
    p.avatar_url,
    p.aura,
    held.chapter_slug,
    held.phase,
    b.origin,
    b.status,
    b.shared_goal,
    b.goal_horizon_months,
    coalesce(b.accepted_at, b.created_at),
    b.released_at,
    b.ended_by = (select auth.uid()),
    private.bond_depth_level(b.id),
    (select count(*)::integer from public.bond_checkins ci where ci.bond_id = b.id),
    (select min(ci.happened_on) from public.bond_checkins ci where ci.bond_id = b.id),
    (select count(*)::integer from public.bond_log_responses r where r.bond_id = b.id and r.shared_at is not null)
      + (select count(*)::integer from public.log_entries le where le.bond_id = b.id)
  from public.bonds b
  join public.profiles p
    on p.id = case when b.inviter_id = (select auth.uid()) then b.invitee_id else b.inviter_id end
  left join lateral (
    select uc.chapter_slug, uc.phase from public.user_chapters uc
    where uc.user_id = p.id and uc.status = 'open'
    order by uc.opened_at
    limit 1
  ) held on true
  where b.id = p_bond_id
    and (select auth.uid()) in (b.inviter_id, b.invitee_id)
    and b.status in ('active', 'released');
$$;

-- ===========================================================================
-- Log entries: a per-moment audience, and "Everyone"
-- ===========================================================================

-- "Visible to" on an edited moment (Figma 1424:23772). Null follows the
-- member's WHO CAN SEE YOUR LOG setting.
alter table public.log_entries add column visibility public.log_visibility;
grant update (visibility) on public.log_entries to authenticated;

drop policy "Log entries follow the author's visibility" on public.log_entries;

-- Solo moments follow their own audience, else the author's log setting:
-- everyone in a space they share (plus their circle), their circle (which
-- includes bonds), bonds only, or only them. Bond Log moments are the pair's.
create policy "Log entries follow the author's visibility"
  on public.log_entries for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (
      scope = 'bond'
      and exists (
        select 1 from public.bonds b
        where b.id = bond_id and (select auth.uid()) in (b.inviter_id, b.invitee_id)
      )
    )
    or (
      scope = 'solo'
      and not private.blocked_between((select auth.uid()), user_id)
      and exists (
        select 1 from public.profiles p
        where p.id = user_id
          and case coalesce(visibility, p.log_visibility)
            when 'everyone' then
              private.in_circle(user_id)
              or private.is_bonded(user_id)
              or exists (
                select 1 from public.user_chapters uc
                where uc.id = user_chapter_id and private.holds_chapter(uc.chapter_slug)
              )
            when 'circle' then private.in_circle(user_id) or private.is_bonded(user_id)
            when 'bonds' then private.is_bonded(user_id)
            else false
          end
      )
    )
  );

-- ===========================================================================
-- Grants
-- ===========================================================================

revoke execute on function public.invite_to_bond(uuid, text) from public, anon;
revoke execute on function public.respond_to_bond_invite(uuid, boolean) from public, anon;
revoke execute on function public.withdraw_bond_invite(uuid) from public, anon;
revoke execute on function public.end_bond(uuid) from public, anon;
revoke execute on function public.set_bond_goal(uuid, text, smallint) from public, anon;
revoke execute on function public.log_bond_checkin(uuid, public.checkin_mode, text, date) from public, anon;
revoke execute on function public.start_bond_activity(uuid, public.bond_activity_kind) from public, anon;
revoke execute on function public.end_bond_activity(uuid) from public, anon;
revoke execute on function public.save_bond_response(uuid, integer, text, boolean) from public, anon;
revoke execute on function public.bond_log(uuid) from public, anon;
revoke execute on function public.my_bond_logs() from public, anon;
revoke execute on function public.bonds_overview() from public, anon;
revoke execute on function public.bond_invites() from public, anon;
revoke execute on function public.bond_details(uuid) from public, anon;
revoke execute on function private.rank_new_bond(uuid) from public, anon, authenticated;

grant execute on function public.invite_to_bond(uuid, text) to authenticated;
grant execute on function public.respond_to_bond_invite(uuid, boolean) to authenticated;
grant execute on function public.withdraw_bond_invite(uuid) to authenticated;
grant execute on function public.end_bond(uuid) to authenticated;
grant execute on function public.set_bond_goal(uuid, text, smallint) to authenticated;
grant execute on function public.log_bond_checkin(uuid, public.checkin_mode, text, date) to authenticated;
grant execute on function public.start_bond_activity(uuid, public.bond_activity_kind) to authenticated;
grant execute on function public.end_bond_activity(uuid) to authenticated;
grant execute on function public.save_bond_response(uuid, integer, text, boolean) to authenticated;
grant execute on function public.bond_log(uuid) to authenticated;
grant execute on function public.my_bond_logs() to authenticated;
grant execute on function public.bonds_overview() to authenticated;
grant execute on function public.bond_invites() to authenticated;
grant execute on function public.bond_details(uuid) to authenticated;

-- Writes go through the functions above.
revoke insert, update on public.bond_checkins from authenticated;
revoke insert, update, delete on public.bond_activities from authenticated;
revoke insert, update, delete on public.bond_log_responses from authenticated;
revoke insert, update, delete on public.bond_prompts from authenticated;
