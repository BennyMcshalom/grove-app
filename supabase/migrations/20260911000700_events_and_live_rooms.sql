-- Gatherings (events with RSVPs and a chat) and Meet & Greet live rooms.
--
-- Coordinates are plain latitude/longitude with a haversine helper — enough
-- for "1.4km away" at this scale. Move to PostGIS if nearby queries get hot.

create type public.event_status as enum ('scheduled', 'cancelled');

create or replace function private.distance_km(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
returns double precision
language sql
immutable
set search_path = ''
as $$
  select 6371.0 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

grant execute on function private.distance_km(double precision, double precision, double precision, double precision)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------

create table public.events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid references public.profiles (id) on delete cascade,
  -- "Select space it belongs to".
  chapter_slug text not null references public.chapters (slug) on update cascade,
  title text not null check (char_length(title) between 1 and 120),
  icon public.picker_icon not null default 'fire',
  -- "What is the event about, who is it for?"
  description text check (char_length(description) <= 2000),
  -- "Where": "Tafawa Balewa Square", shortened to "TBS" on rail cards.
  venue_name text not null check (char_length(venue_name) between 1 and 200),
  venue_short text check (char_length(venue_short) <= 60),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  starts_at timestamptz not null,
  capacity integer not null check (capacity between 1 and 10000),
  going_count integer not null default 0,
  status public.event_status not null default 'scheduled',
  conversation_id uuid not null unique references public.conversations (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null))
);

create index events_upcoming on public.events (starts_at) where status = 'scheduled';
create index events_by_chapter on public.events (chapter_slug, starts_at);

create table public.event_attendees (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index event_attendees_by_user on public.event_attendees (user_id);

create or replace function private.prepare_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.host_id := (select auth.uid());
  new.going_count := 0;

  insert into public.conversations (kind) values ('event')
  returning id into new.conversation_id;

  return new;
end;
$$;

create trigger events_prepare
  before insert on public.events
  for each row execute function private.prepare_event();

create trigger events_set_updated_at
  before update on public.events
  for each row execute function private.set_updated_at();

-- The host is going, and the chat opens with Figma's system notice.
create or replace function private.open_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.host_id is not null then
    insert into public.event_attendees (event_id, user_id) values (new.id, new.host_id);
  end if;

  insert into public.messages (conversation_id, kind, body)
  values (new.conversation_id, 'system', 'Group created for ' || new.title || '.');

  return new;
end;
$$;

create trigger events_open
  after insert on public.events
  for each row execute function private.open_event();

create or replace function private.drop_event_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.conversations where id = old.conversation_id;
  return old;
end;
$$;

create trigger events_drop_conversation
  after delete on public.events
  for each row execute function private.drop_event_conversation();

-- Capacity is checked under a row lock so the last seat can't be taken twice.
create or replace function private.check_event_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.events;
begin
  select * into target from public.events where id = new.event_id for update;

  if target.status <> 'scheduled' then
    raise exception 'This event is not taking RSVPs' using errcode = 'check_violation', hint = 'event_closed';
  end if;
  if target.going_count >= target.capacity then
    raise exception 'This event is full' using errcode = 'check_violation', hint = 'event_full';
  end if;

  return new;
end;
$$;

create trigger event_attendees_check_capacity
  before insert on public.event_attendees
  for each row execute function private.check_event_capacity();

create or replace function private.sync_event_attendance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation uuid;
begin
  if tg_op = 'INSERT' then
    select conversation_id into conversation from public.events where id = new.event_id;
    insert into public.conversation_members (conversation_id, user_id)
    values (conversation, new.user_id)
    on conflict do nothing;
    update public.events set going_count = going_count + 1 where id = new.event_id;
    return new;
  end if;

  select conversation_id into conversation from public.events where id = old.event_id;
  delete from public.conversation_members
  where conversation_id = conversation and user_id = old.user_id;
  update public.events set going_count = greatest(going_count - 1, 0) where id = old.event_id;
  return old;
end;
$$;

create trigger event_attendees_sync
  after insert or delete on public.event_attendees
  for each row execute function private.sync_event_attendance();

alter table public.events enable row level security;
alter table public.event_attendees enable row level security;

create policy "Signed-in users can browse events"
  on public.events for select
  to authenticated
  using (true);

create policy "Signed-in users can host events"
  on public.events for insert
  to authenticated
  with check (host_id = (select auth.uid()));

revoke update on public.events from authenticated;
grant update (
  title, icon, description, venue_name, venue_short, latitude, longitude,
  starts_at, capacity, status, chapter_slug
) on public.events to authenticated;

create policy "Hosts edit their events"
  on public.events for update
  to authenticated
  using (host_id = (select auth.uid()))
  with check (host_id = (select auth.uid()));

create policy "Hosts delete their events"
  on public.events for delete
  to authenticated
  using (host_id = (select auth.uid()));

-- "Only people in your Circle are visible here." The total is going_count.
create policy "Attendees are visible to themselves, the host and their circle"
  on public.event_attendees for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or private.in_circle(user_id)
    or exists (
      select 1 from public.events e
      where e.id = event_id and e.host_id = (select auth.uid())
    )
  );

create policy "Users RSVP for themselves"
  on public.event_attendees for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users withdraw their own RSVP"
  on public.event_attendees for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Meet & Greet live rooms
-- ---------------------------------------------------------------------------

create table public.live_rooms (
  id uuid primary key default gen_random_uuid(),
  -- "Name the place or event".
  title text not null check (char_length(title) between 1 and 120),
  community_label text check (char_length(community_label) <= 80),
  venue_name text check (char_length(venue_name) <= 200),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  started_by uuid references public.profiles (id) on delete set null,
  here_count integer not null default 0,
  started_at timestamptz not null default now(),
  -- Set when the last person leaves.
  ended_at timestamptz,
  check ((latitude is null) = (longitude is null))
);

create index live_rooms_live on public.live_rooms (started_at desc) where ended_at is null;

-- One row per person currently in a room; leaving deletes it.
create table public.live_room_presence (
  room_id uuid not null references public.live_rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

-- "Your live meet" is singular: one room at a time.
create unique index live_room_presence_one_room on public.live_room_presence (user_id);

create table public.waves (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.live_rooms (id) on delete cascade,
  from_user uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  to_user uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (room_id, from_user, to_user),
  check (from_user <> to_user)
);

create or replace function private.in_live_room(p_room uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.live_room_presence p
    where p.room_id = p_room and p.user_id = (select auth.uid())
  );
$$;

create or replace function private.user_in_live_room(p_room uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.live_room_presence p
    where p.room_id = p_room and p.user_id = p_user
  );
$$;

grant execute on function private.in_live_room(uuid) to authenticated;
grant execute on function private.user_in_live_room(uuid, uuid) to authenticated;

create or replace function private.prepare_live_room()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.started_by := (select auth.uid());
  new.here_count := 0;
  new.ended_at := null;
  return new;
end;
$$;

create trigger live_rooms_prepare
  before insert on public.live_rooms
  for each row execute function private.prepare_live_room();

create or replace function private.sync_live_room_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.live_rooms set here_count = here_count + 1 where id = new.room_id;
    return new;
  end if;

  update public.live_rooms
  set here_count = greatest(here_count - 1, 0),
      ended_at = case when here_count <= 1 then now() else ended_at end
  where id = old.room_id;
  return old;
end;
$$;

create trigger live_room_presence_sync
  after insert or delete on public.live_room_presence
  for each row execute function private.sync_live_room_count();

alter table public.live_rooms enable row level security;
alter table public.live_room_presence enable row level security;
alter table public.waves enable row level security;

create policy "Live rooms are visible while they are live"
  on public.live_rooms for select
  to authenticated
  using (ended_at is null or started_by = (select auth.uid()));

create policy "Signed-in users start live rooms"
  on public.live_rooms for insert
  to authenticated
  with check (started_by = (select auth.uid()));

-- "You're here and visible in this room" — visible to the room, not the world.
create policy "People in a room see who else is here"
  on public.live_room_presence for select
  to authenticated
  using (user_id = (select auth.uid()) or private.in_live_room(room_id));

create policy "Users leave rooms"
  on public.live_room_presence for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Waves are visible to sender and recipient"
  on public.waves for select
  to authenticated
  using ((select auth.uid()) in (from_user, to_user));

create policy "People in a room wave at each other"
  on public.waves for insert
  to authenticated
  with check (
    from_user = (select auth.uid())
    and private.in_live_room(room_id)
    and private.user_in_live_room(room_id, to_user)
  );

create policy "Senders take back a wave"
  on public.waves for delete
  to authenticated
  using (from_user = (select auth.uid()));

-- Tap a room to join it. Leaves whichever room you were in first.
create or replace function public.join_live_room(p_room_id uuid)
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

  perform 1 from public.live_rooms where id = p_room_id and ended_at is null for update;
  if not found then
    raise exception 'That room has ended' using errcode = 'no_data_found', hint = 'room_ended';
  end if;

  delete from public.live_room_presence where user_id = uid and room_id <> p_room_id;

  insert into public.live_room_presence (room_id, user_id)
  values (p_room_id, uid)
  on conflict do nothing;
end;
$$;

revoke execute on function public.join_live_room(uuid) from public, anon;
grant execute on function public.join_live_room(uuid) to authenticated;
