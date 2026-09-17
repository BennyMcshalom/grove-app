-- Billing (RevenueCat), voice and video calls in bond chats (LiveKit), and
-- places: coarse home regions, event coordinates and distance-aware reads.

-- ---------------------------------------------------------------------------
-- Billing
-- ---------------------------------------------------------------------------

-- RevenueCat is the source of truth for paid plans (web today; the App Store
-- and Google Play later, under the same app user id = auth user id). These
-- columns are its latest answer, copied in by the webhook.
alter table public.subscriptions
  -- Where the plan was bought ('rc_billing', 'stripe', 'app_store',
  -- 'play_store', 'promotional'…). Null until they've had a RevenueCat plan.
  add column billing_store text,
  add column cancel_at_period_end boolean not null default false,
  add column management_url text,
  add column billing_synced_at timestamptz;

-- The in-app trial is for people who've never had a plan.
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

-- RevenueCat webhook (server only). The server re-reads the customer from
-- RevenueCat before calling this, so the values are always its current state.
-- A null status means RevenueCat has no plan for them: a plan they had ends,
-- and an in-app trial is left alone.
create or replace function public.sync_billing(
  p_user_id uuid,
  p_status text,
  p_store text,
  p_current_period_end timestamptz,
  p_trial_end timestamptz,
  p_cancel_at_period_end boolean,
  p_management_url text
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
      plan = 'full',
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

revoke execute on function public.sync_billing(uuid, text, text, timestamptz, timestamptz, boolean, text)
  from public, anon, authenticated;
grant execute on function public.sync_billing(uuid, text, text, timestamptz, timestamptz, boolean, text)
  to service_role;

-- In-app trials that ran out without a paid plan.
create or replace function private.expire_trials()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.subscriptions
  set status = 'expired'
  where status = 'trialing'
    and billing_store is null
    and trial_ends_at < now();
$$;

-- ---------------------------------------------------------------------------
-- Calls
-- ---------------------------------------------------------------------------

create type public.call_kind as enum ('audio', 'video');
create type public.call_status as enum ('ringing', 'active', 'ended', 'missed', 'declined');

-- One row per call in a direct conversation. The media itself goes through
-- LiveKit, in a room named "call-<id>"; this row is the ringing and history.
create table public.calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  caller_id uuid references public.profiles (id) on delete set null,
  kind public.call_kind not null,
  status public.call_status not null default 'ringing',
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz
);

create index calls_by_conversation on public.calls (conversation_id, created_at desc);
create index calls_by_caller on public.calls (caller_id, created_at desc);
create unique index calls_one_live_per_conversation
  on public.calls (conversation_id) where status in ('ringing', 'active');

alter table public.calls enable row level security;

create policy "Members can see calls in their conversations"
  on public.calls for select
  to authenticated
  using (private.is_conversation_member(conversation_id));

create trigger calls_rate_limit before insert on public.calls
  for each row execute function private.enforce_rate_limit('caller_id', '30', '1 hour');

-- Unanswered rings become missed after 45 seconds; a call nobody hung up on
-- ends after 6 hours.
create or replace function private.expire_calls(p_conversation_id uuid default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.calls
  set status = case when status = 'ringing' then 'missed' else 'ended' end::public.call_status,
      ended_at = now()
  where (p_conversation_id is null or conversation_id = p_conversation_id)
    and (
      (status = 'ringing' and created_at < now() - interval '45 seconds')
      or (status = 'active' and created_at < now() - interval '6 hours')
    );
$$;

-- The chat gets a line for every call once it's over.
create or replace function private.log_call()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  label text := case new.kind when 'video' then 'Video call' else 'Voice call' end;
  seconds integer;
begin
  if old.status not in ('ringing', 'active') or new.status in ('ringing', 'active') then
    return new;
  end if;

  seconds := greatest(0, extract(epoch from coalesce(new.ended_at, now()) - coalesce(new.answered_at, now()))::integer);

  insert into public.messages (conversation_id, sender_id, kind, body)
  values (
    new.conversation_id,
    null,
    'system',
    case new.status
      when 'missed' then 'Missed ' || lower(label)
      when 'declined' then label || ' declined'
      else label || ' · ' || case when seconds < 60 then seconds || ' sec' else round(seconds / 60.0) || ' min' end
    end
  );
  return new;
end;
$$;

create trigger calls_log
  after update of status on public.calls
  for each row execute function private.log_call();

-- Bond chat → phone / video icon. Joining a call that's already ringing from
-- the other side answers it instead of ringing back.
create or replace function public.start_call(p_conversation_id uuid, p_kind public.call_kind)
returns public.calls
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  live public.calls;
begin
  if uid is null or not exists (
    select 1 from public.conversations c
    join public.conversation_members m on m.conversation_id = c.id and m.user_id = uid
    where c.id = p_conversation_id and c.kind = 'direct'
  ) then
    raise exception 'Calls are only for your bond and circle chats' using errcode = 'insufficient_privilege';
  end if;

  perform private.expire_calls(p_conversation_id);

  select * into live from public.calls
  where conversation_id = p_conversation_id and status in ('ringing', 'active')
  for update;

  if found then
    if live.status = 'ringing' and live.caller_id <> uid then
      update public.calls set status = 'active', answered_at = now()
      where id = live.id
      returning * into live;
    end if;
    return live;
  end if;

  insert into public.calls (conversation_id, caller_id, kind)
  values (p_conversation_id, uid, p_kind)
  returning * into live;
  return live;
end;
$$;

create or replace function public.answer_call(p_call_id uuid)
returns public.calls
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  target public.calls;
begin
  select * into target from public.calls where id = p_call_id for update;
  if not found or not private.is_conversation_member(target.conversation_id) then
    raise exception 'Call not found' using errcode = 'insufficient_privilege';
  end if;

  if target.status = 'ringing' and target.caller_id is distinct from uid
     and target.created_at >= now() - interval '45 seconds' then
    update public.calls set status = 'active', answered_at = now()
    where id = p_call_id
    returning * into target;
  elsif target.status <> 'active' then
    raise exception 'This call has ended' using errcode = 'check_violation', hint = 'call_over';
  end if;

  return target;
end;
$$;

-- Hang up, cancel a ring, or decline one. Harmless on a call that's over.
create or replace function public.end_call(p_call_id uuid)
returns public.calls
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  target public.calls;
begin
  select * into target from public.calls where id = p_call_id for update;
  if not found or not private.is_conversation_member(target.conversation_id) then
    raise exception 'Call not found' using errcode = 'insufficient_privilege';
  end if;

  if target.status in ('ringing', 'active') then
    update public.calls
    set status = case
          when target.status = 'active' then 'ended'
          when target.caller_id = uid then 'missed'
          else 'declined'
        end::public.call_status,
        ended_at = now()
    where id = p_call_id
    returning * into target;
  end if;

  return target;
end;
$$;

-- LiveKit webhook (server only): the room emptied out.
create or replace function public.finish_call(p_call_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.calls
  set status = case when status = 'ringing' then 'missed' else 'ended' end::public.call_status,
      ended_at = now()
  where id = p_call_id and status in ('ringing', 'active');
$$;

revoke execute on function public.start_call(uuid, public.call_kind) from public, anon;
grant execute on function public.start_call(uuid, public.call_kind) to authenticated;
revoke execute on function public.answer_call(uuid) from public, anon;
grant execute on function public.answer_call(uuid) to authenticated;
revoke execute on function public.end_call(uuid) from public, anon;
grant execute on function public.end_call(uuid) to authenticated;
revoke execute on function public.finish_call(uuid) from public, anon, authenticated;
grant execute on function public.finish_call(uuid) to service_role;

alter publication supabase_realtime add table public.calls;

-- ---------------------------------------------------------------------------
-- Places
-- ---------------------------------------------------------------------------

-- Where someone roughly is, rounded to 0.1° (about 11 km), for "near you".
-- Private: other people only ever get a distance, never the coordinates.
create table private.user_regions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  updated_at timestamptz not null default now()
);

-- Edit Profile → Location. Null clears it.
create or replace function public.set_my_region(p_latitude double precision, p_longitude double precision)
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

  if p_latitude is null or p_longitude is null then
    delete from private.user_regions where user_id = uid;
    return;
  end if;

  insert into private.user_regions (user_id, latitude, longitude)
  values (uid, round(p_latitude::numeric, 1)::double precision, round(p_longitude::numeric, 1)::double precision)
  on conflict (user_id) do update
  set latitude = excluded.latitude, longitude = excluded.longitude, updated_at = now();
end;
$$;

create or replace function public.has_region()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.user_regions where user_id = (select auth.uid()));
$$;

revoke execute on function public.set_my_region(double precision, double precision) from public, anon;
grant execute on function public.set_my_region(double precision, double precision) to authenticated;
revoke execute on function public.has_region() from public, anon;
grant execute on function public.has_region() to authenticated;

-- Great-circle distance in km.
create or replace function private.distance_km(
  lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision
)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select 12742 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- From the viewer's region to a point; null when either is unknown.
create or replace function private.km_from_me_to(p_latitude double precision, p_longitude double precision)
returns double precision
language sql
stable
security definer
set search_path = ''
as $$
  select private.distance_km(r.latitude, r.longitude, p_latitude, p_longitude)
  from private.user_regions r
  where r.user_id = (select auth.uid()) and p_latitude is not null and p_longitude is not null;
$$;

-- From the viewer's region to someone else's; null when either is unknown.
create or replace function private.km_from_me(p_user_id uuid)
returns double precision
language sql
stable
security definer
set search_path = ''
as $$
  select private.distance_km(mine.latitude, mine.longitude, theirs.latitude, theirs.longitude)
  from private.user_regions mine
  join private.user_regions theirs on theirs.user_id = p_user_id
  where mine.user_id = (select auth.uid());
$$;

grant execute on function private.distance_km(double precision, double precision, double precision, double precision) to authenticated;
grant execute on function private.km_from_me_to(double precision, double precision) to authenticated;
grant execute on function private.km_from_me(uuid) to authenticated;

-- The space Open tab: `p_within_km` keeps it to people near the viewer; the
-- "Search across regions" button passes null. Otherwise as before.
drop function public.feed_posts(text, text, timestamptz, timestamptz, timestamptz, uuid, integer, uuid);

create function public.feed_posts(
  p_scope text default 'all',
  p_chapter_slug text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_before timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 20,
  -- Narrows to one post, for permalinks. Use with p_scope 'all'.
  p_post_id uuid default null,
  -- Scope 'open' only: authors whose region is within this many km.
  p_within_km double precision default null
)
returns table (
  id uuid,
  chapter_slug text,
  kind public.post_kind,
  title text,
  progress public.post_progress,
  body text,
  is_anonymous boolean,
  roots_count integer,
  comments_count integer,
  created_at timestamptz,
  author_id uuid,
  author_name text,
  author_avatar text,
  author_phase text,
  is_mine boolean,
  rooted boolean,
  media jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  with viewer as (
    select
      (select auth.uid()) as uid,
      (
        select uc.phase from public.user_chapters uc
        where uc.user_id = (select auth.uid())
          and uc.chapter_slug = p_chapter_slug
          and uc.status = 'open'
      ) as phase
  )
  select
    p.id,
    p.chapter_slug,
    p.kind,
    p.title,
    p.progress,
    p.body,
    p.is_anonymous,
    p.roots_count,
    p.comments_count,
    p.created_at,
    p.author_id,
    author.first_name,
    author.avatar_url,
    author_chapter.phase,
    private.owns('posts', p.id),
    exists (select 1 from public.post_roots r where r.post_id = p.id and r.user_id = v.uid),
    coalesce(
      (
        select jsonb_agg(jsonb_build_object('kind', m.kind, 'path', m.storage_path) order by m.position)
        from public.post_media m
        where m.post_id = p.id
      ),
      '[]'::jsonb
    )
  from public.posts p
  cross join viewer v
  left join public.profiles author on author.id = p.author_id
  left join public.user_chapters author_chapter
    on author_chapter.user_id = p.author_id
    and author_chapter.chapter_slug = p.chapter_slug
    and author_chapter.status = 'open'
  where (p_post_id is null or p.id = p_post_id)
    and (p_chapter_slug is null or p.chapter_slug = p_chapter_slug)
    and (p_from is null or p.created_at >= p_from)
    and (p_to is null or p.created_at <= p_to)
    and (
      p_before is null
      or (p.created_at, p.id) < (p_before, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))
    )
    and case p_scope
      when 'all' then true
      when 'mine' then private.owns('posts', p.id)
      when 'roots' then p.author_id is null or p.author_id = v.uid or private.in_circle(p.author_id)
      when 'open' then
        p.author_id is not null
        and p.author_id <> v.uid
        and not private.in_circle(p.author_id)
        and author_chapter.phase = v.phase
        and (p_within_km is null or private.km_from_me(p.author_id) <= p_within_km)
      else false
    end
  order by p.created_at desc, p.id desc
  limit least(greatest(p_limit, 1), 50);
$$;

revoke execute on function public.feed_posts(text, text, timestamptz, timestamptz, timestamptz, uuid, integer, uuid, double precision)
  from public, anon;
grant execute on function public.feed_posts(text, text, timestamptz, timestamptz, timestamptz, uuid, integer, uuid, double precision)
  to authenticated;

-- Events near the viewer come first (within 100 km), then events in their
-- spaces, then soonest. Coordinates come from geocoding the venue.
drop function public.event_cards(uuid, text, boolean, integer);

create function public.event_cards(
  p_event_id uuid default null,
  p_query text default null,
  p_mine boolean default false,
  p_limit integer default 50
)
returns table (
  id uuid,
  title text,
  icon text,
  description text,
  venue_name text,
  venue_short text,
  chapter_slug text,
  starts_at timestamptz,
  capacity integer,
  going_count integer,
  status public.event_status,
  conversation_id uuid,
  host_id uuid,
  host_name text,
  host_avatar text,
  i_am_going boolean,
  circle_going integer,
  circle_avatars text[],
  latitude double precision,
  longitude double precision,
  distance_km double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    e.id,
    e.title,
    e.icon,
    e.description,
    e.venue_name,
    e.venue_short,
    e.chapter_slug,
    e.starts_at,
    e.capacity,
    e.going_count,
    e.status,
    e.conversation_id,
    e.host_id,
    host.first_name,
    host.avatar_url,
    exists (
      select 1 from public.event_attendees a
      where a.event_id = e.id and a.user_id = (select auth.uid())
    ),
    (
      select count(*)::integer from public.event_attendees a
      where a.event_id = e.id and private.in_circle(a.user_id)
    ),
    coalesce(
      (
        select (array_agg(p.avatar_url order by a.created_at) filter (where p.avatar_url is not null))[1:5]
        from public.event_attendees a
        join public.profiles p on p.id = a.user_id
        where a.event_id = e.id and a.user_id <> (select auth.uid())
      ),
      '{}'
    ),
    e.latitude,
    e.longitude,
    d.km
  from public.events e
  cross join lateral (select private.km_from_me_to(e.latitude, e.longitude) as km) d
  left join public.profiles host on host.id = e.host_id
  where (
      p_event_id is not null and e.id = p_event_id
      or p_event_id is null and e.status = 'scheduled' and e.starts_at > now() - interval '6 hours'
    )
    and (p_query is null or strpos(lower(e.title || ' ' || e.venue_name), lower(trim(p_query))) > 0)
    and (
      not p_mine
      or exists (
        select 1 from public.event_attendees a
        where a.event_id = e.id and a.user_id = (select auth.uid())
      )
    )
  order by
    coalesce(d.km <= 100, false) desc,
    (e.chapter_slug in (
      select uc.chapter_slug from public.user_chapters uc
      where uc.user_id = (select auth.uid()) and uc.status = 'open'
    )) desc,
    e.starts_at
  limit least(greatest(p_limit, 1), 100);
$$;

revoke execute on function public.event_cards(uuid, text, boolean, integer) from public, anon;
grant execute on function public.event_cards(uuid, text, boolean, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Schedules
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $job$select cron.schedule('grouv-expire-calls', '* * * * *', 'select private.expire_calls()')$job$;
    execute $job$select cron.schedule('grouv-expire-trials', '15 * * * *', 'select private.expire_trials()')$job$;
  end if;
end;
$$;
