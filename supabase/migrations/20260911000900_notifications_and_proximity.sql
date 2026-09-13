-- Notifications (written only by triggers) and Nearby proximity sessions.

create type public.notification_kind as enum (
  'connection_suggested',
  'connection_request',
  'connection_accepted',
  'bond_invitation',
  'bond_accepted',
  'post_rooted',
  'post_commented',
  'group_join_request',
  'group_join_reviewed',
  'wave_received',
  'chapter_prompt'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.notification_kind not null,
  actor_id uuid references public.profiles (id) on delete cascade,
  -- The post, connection, group request, room… the notification points at.
  entity_id uuid,
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_by_user on public.notifications (user_id, created_at desc);
create index notifications_unread on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

create policy "Users read their own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "Users mark their own notifications read"
  on public.notifications for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- "Clear Notifications".
create policy "Users clear their own notifications"
  on public.notifications for delete
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function private.notify(
  p_user uuid,
  p_kind public.notification_kind,
  p_actor uuid,
  p_entity uuid,
  p_data jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null or p_user = p_actor then
    return;
  end if;

  if p_kind = 'wave_received' and exists (
    select 1 from public.notification_preferences np
    where np.user_id = p_user and not np.wave_received
  ) then
    return;
  end if;

  insert into public.notifications (user_id, kind, actor_id, entity_id, data)
  values (p_user, p_kind, p_actor, p_entity, coalesce(p_data, '{}'));
end;
$$;

-- ---------------------------------------------------------------------------
-- Notification triggers
-- ---------------------------------------------------------------------------

create or replace function private.notify_connection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.notify(new.addressee_id, 'connection_request', new.requester_id, new.id);
  elsif new.status = 'accepted' and old.status <> 'accepted' then
    perform private.notify(new.requester_id, 'connection_accepted', new.addressee_id, new.id);
  end if;
  return new;
end;
$$;

create trigger connections_notify
  after insert or update of status on public.connections
  for each row execute function private.notify_connection();

create or replace function private.notify_bond()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.notify(new.invitee_id, 'bond_invitation', new.inviter_id, new.id);
  elsif new.status = 'active' and old.status <> 'active' then
    perform private.notify(new.inviter_id, 'bond_accepted', new.invitee_id, new.id);
  end if;
  return new;
end;
$$;

create trigger bonds_notify
  after insert or update of status on public.bonds
  for each row execute function private.notify_bond();

-- The post's real owner is notified even when the post is anonymous; the
-- notification goes only to them, so nothing about authorship leaks.
create or replace function private.notify_post_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
  actor uuid;
  kind public.notification_kind;
begin
  -- Separate branches: PL/pgSQL resolves every field in an expression, and
  -- post_roots rows have no author_id.
  if tg_table_name = 'post_roots' then
    actor := new.user_id;
    kind := 'post_rooted';
  else
    actor := new.author_id;
    kind := 'post_commented';
  end if;

  select o.owner_id into owner from private.content_owners o
  where o.content_type = 'posts' and o.content_id = new.post_id;

  perform private.notify(owner, kind, actor, new.post_id);
  return new;
end;
$$;

create trigger post_roots_notify
  after insert on public.post_roots
  for each row execute function private.notify_post_activity();

create trigger comments_notify
  after insert on public.comments
  for each row execute function private.notify_post_activity();

create or replace function private.notify_join_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin uuid;
begin
  if tg_op = 'INSERT' then
    for admin in
      select m.user_id from public.group_members m
      where m.group_id = new.group_id and m.role = 'admin'
    loop
      perform private.notify(admin, 'group_join_request', new.user_id, new.id,
        jsonb_build_object('group_id', new.group_id));
    end loop;
  elsif new.status <> 'pending' and old.status = 'pending' then
    perform private.notify(new.user_id, 'group_join_reviewed', new.reviewed_by, new.id,
      jsonb_build_object('group_id', new.group_id, 'approved', new.status = 'approved'));
  end if;
  return new;
end;
$$;

create trigger group_join_requests_notify
  after insert or update of status on public.group_join_requests
  for each row execute function private.notify_join_request();

create or replace function private.notify_wave()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.notify(new.to_user, 'wave_received', new.from_user, new.room_id);
  return new;
end;
$$;

create trigger waves_notify
  after insert on public.waves
  for each row execute function private.notify_wave();

-- ---------------------------------------------------------------------------
-- Nearby
-- ---------------------------------------------------------------------------

-- Exists only while Proximity is on: the page upserts a heartbeat and deletes
-- the row when the user leaves ("Turns off the moment you leave this page").
-- A missed delete ages out at expires_at. Nobody can read another person's
-- row; nearby_people() is the only way in, and it returns rounded distance.
create table public.proximity_sessions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '2 minutes',
  check (expires_at <= now() + interval '10 minutes')
);

create index proximity_sessions_live on public.proximity_sessions (expires_at);

-- "Never shared precisely": store ~100m precision, never the raw fix.
create or replace function private.coarsen_location()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.latitude := round(new.latitude::numeric, 3)::double precision;
  new.longitude := round(new.longitude::numeric, 3)::double precision;
  return new;
end;
$$;

create trigger proximity_sessions_coarsen
  before insert or update on public.proximity_sessions
  for each row execute function private.coarsen_location();

alter table public.proximity_sessions enable row level security;

create policy "Users manage only their own proximity session"
  on public.proximity_sessions for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- People nearby who hold at least one of your open chapters. Visibility is
-- mutual: you only see others while your own Proximity is on.
create or replace function public.nearby_people(p_radius_km double precision default 5)
returns table (
  user_id uuid,
  first_name text,
  avatar_url text,
  aura public.aura,
  chapter_slug text,
  phase text,
  distance_km numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  me public.proximity_sessions;
begin
  select * into me from public.proximity_sessions s
  where s.user_id = uid and s.expires_at > now();

  if not found then
    raise exception 'Turn on Proximity to see people nearby'
      using errcode = 'insufficient_privilege', hint = 'proximity_off';
  end if;

  return query
  select distinct on (distance.km, p.id)
    p.id,
    p.first_name,
    p.avatar_url,
    p.aura,
    theirs.chapter_slug,
    theirs.phase,
    round(distance.km::numeric, 1)
  from public.proximity_sessions s
  join public.profiles p on p.id = s.user_id
  join public.user_chapters theirs
    on theirs.user_id = s.user_id and theirs.status = 'open'
  join public.user_chapters mine
    on mine.user_id = uid and mine.status = 'open' and mine.chapter_slug = theirs.chapter_slug
  cross join lateral (
    select private.distance_km(me.latitude, me.longitude, s.latitude, s.longitude) as km
  ) distance
  where s.user_id <> uid
    and s.expires_at > now()
    and distance.km <= least(greatest(p_radius_km, 0.1), 50)
  order by distance.km, p.id, theirs.chapter_slug
  limit 50;
end;
$$;

revoke execute on function public.nearby_people(double precision) from public, anon;
grant execute on function public.nearby_people(double precision) to authenticated;
