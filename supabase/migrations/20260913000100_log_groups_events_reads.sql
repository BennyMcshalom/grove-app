-- Read helpers and small additions for the Grouv Log, groups, events, live
-- rooms, notifications, search and a space's anonymous replies, plus the
-- scheduled jobs that keep ephemeral data tidy.

-- ---------------------------------------------------------------------------
-- Grouv Log
-- ---------------------------------------------------------------------------

-- A few prompts per chapter so the daily card rotates. A null chapter suits any.
insert into public.log_prompts (chapter_slug, body, sort_order) values
  ('career', 'What moved forward today, however small', 2),
  ('career', 'What did you learn about how you work', 3),
  ('spiritual', 'Where did you notice something bigger today', 1),
  ('spiritual', 'What are you holding with open hands', 2),
  ('wealth', 'What did you choose not to spend on today', 1),
  ('wealth', 'One money decision you''re proud of', 2),
  ('adventure', 'What surprised you today', 1),
  ('adventure', 'Where did you feel most alive', 2),
  ('health', 'How did you look after your body today', 1),
  ('health', 'What did your body ask you for', 2),
  ('creative', 'What did you make today, even a little', 1),
  ('creative', 'What caught your eye', 2),
  ('learning', 'What clicked today', 1),
  ('learning', 'What are you still stuck on', 2),
  ('relationships', 'Who showed up for you today', 1),
  ('relationships', 'What did you say that you meant', 2),
  (null, 'One honest moment from today', 99);

-- Logs from other people the viewer may see (RLS on log_entries decides),
-- newest person first, each with their ten latest moments.
-- p_scope 'solo' is circle logs; 'bond' is entries shared inside the viewer's bonds.
create or replace function public.circle_logs(p_scope text default 'solo', p_limit integer default 20)
returns table (
  user_id uuid,
  first_name text,
  avatar_url text,
  aura public.aura,
  chapter_slug text,
  phase text,
  latest_at timestamptz,
  entries jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  with visible as (
    select
      le.id,
      le.user_id,
      le.body,
      le.photo_path,
      le.entry_date,
      le.created_at,
      uc.chapter_slug,
      uc.phase,
      (le.entry_date - uc.opened_at::date + 1) as day_number,
      row_number() over (partition by le.user_id order by le.entry_date desc, le.created_at desc) as rn
    from public.log_entries le
    join public.user_chapters uc on uc.id = le.user_chapter_id
    where le.user_id <> (select auth.uid())
      and le.scope = case when p_scope = 'bond' then 'bond'::public.log_scope else 'solo'::public.log_scope end
  )
  select
    p.id,
    p.first_name,
    p.avatar_url,
    p.aura,
    (array_agg(v.chapter_slug order by v.rn))[1],
    (array_agg(v.phase order by v.rn))[1],
    max(v.created_at),
    jsonb_agg(
      jsonb_build_object(
        'id', v.id,
        'body', v.body,
        'photo_path', v.photo_path,
        'entry_date', v.entry_date,
        'day_number', v.day_number,
        'chapter_slug', v.chapter_slug
      )
      order by v.rn
    )
  from visible v
  join public.profiles p on p.id = v.user_id
  where v.rn <= 10
  group by p.id
  order by max(v.created_at) desc
  limit least(greatest(p_limit, 1), 50);
$$;

revoke execute on function public.circle_logs(text, integer) from public, anon;
grant execute on function public.circle_logs(text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Groups
-- ---------------------------------------------------------------------------

-- Group cards with the viewer's standing in each.
--   p_slug      one group (the detail page)
--   p_suggested groups in the viewer's open chapters they haven't joined or asked to
create or replace function public.group_cards(
  p_query text default null,
  p_slug text default null,
  p_suggested boolean default false,
  p_limit integer default 50
)
returns table (
  id uuid,
  slug text,
  title text,
  label text,
  description text,
  icon text,
  color text,
  chapter_slug text,
  join_policy public.join_policy,
  member_count integer,
  conversation_id uuid,
  created_at timestamptz,
  my_role public.group_role,
  request_pending boolean,
  member_avatars text[]
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    g.id,
    g.slug,
    g.title,
    g.label,
    g.description,
    g.icon,
    g.color,
    g.chapter_slug,
    g.join_policy,
    g.member_count,
    g.conversation_id,
    g.created_at,
    mine.role,
    exists (
      select 1 from public.group_join_requests r
      where r.group_id = g.id and r.user_id = (select auth.uid()) and r.status = 'pending'
    ),
    coalesce(
      (
        select (array_agg(p.avatar_url order by m.joined_at) filter (where p.avatar_url is not null))[1:4]
        from public.group_members m
        join public.profiles p on p.id = m.user_id
        where m.group_id = g.id
      ),
      '{}'
    )
  from public.groups g
  left join public.group_members mine
    on mine.group_id = g.id and mine.user_id = (select auth.uid())
  where (p_slug is null or g.slug = p_slug)
    and (
      p_query is null
      or strpos(lower(g.title || ' ' || coalesce(g.label, '') || ' ' || coalesce(g.description, '')), lower(trim(p_query))) > 0
    )
    and (
      not p_suggested
      or (
        mine.role is null
        and g.chapter_slug in (
          select uc.chapter_slug from public.user_chapters uc
          where uc.user_id = (select auth.uid()) and uc.status = 'open'
        )
        and not exists (
          select 1 from public.group_join_requests r
          where r.group_id = g.id and r.user_id = (select auth.uid()) and r.status = 'pending'
        )
      )
    )
  order by (mine.role is not null) desc, g.member_count desc, g.created_at desc
  limit least(greatest(p_limit, 1), 100);
$$;

revoke execute on function public.group_cards(text, text, boolean, integer) from public, anon;
grant execute on function public.group_cards(text, text, boolean, integer) to authenticated;

-- The Truth Board with the viewer's own marks.
create or replace function public.group_truths(p_group_id uuid)
returns table (
  id uuid,
  body text,
  felt_count integer,
  created_at timestamptz,
  felt_by_me boolean,
  is_mine boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    t.id,
    t.body,
    t.felt_count,
    t.created_at,
    exists (select 1 from public.truth_felt f where f.truth_id = t.id and f.user_id = (select auth.uid())),
    private.owns('truths', t.id)
  from public.truths t
  where t.group_id = p_group_id
  order by t.created_at desc
  limit 100;
$$;

revoke execute on function public.group_truths(uuid) from public, anon;
grant execute on function public.group_truths(uuid) to authenticated;

-- Admins leaving would orphan a group: hand admin to the longest-standing member.
create or replace function private.keep_a_group_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  successor uuid;
begin
  if old.role <> 'admin' then
    return old;
  end if;
  if exists (select 1 from public.group_members m where m.group_id = old.group_id and m.role = 'admin') then
    return old;
  end if;

  select m.user_id into successor from public.group_members m
  where m.group_id = old.group_id
  order by m.joined_at
  limit 1;

  if successor is not null then
    update public.group_members set role = 'admin'
    where group_id = old.group_id and user_id = successor;
  end if;
  return old;
end;
$$;

create trigger group_members_keep_admin
  after delete on public.group_members
  for each row execute function private.keep_a_group_admin();

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------

-- Event cards: upcoming by default, or one event, or the viewer's RSVPs.
create or replace function public.event_cards(
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
  circle_avatars text[]
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
    )
  from public.events e
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
    -- Events in the viewer's own spaces first, then soonest.
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
-- Meet & Greet live rooms
-- ---------------------------------------------------------------------------

-- A heartbeat so rooms empty out when a tab closes without saying goodbye.
alter table public.live_room_presence
  add column seen_at timestamptz not null default now();

grant update (seen_at) on public.live_room_presence to authenticated;

create policy "Users keep their own presence fresh"
  on public.live_room_presence for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- "Turn on here": joins the live room of the same name if someone already
-- started it, otherwise starts one. Returns the room.
create or replace function public.start_live_room(
  p_title text,
  p_community_label text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  clean_title text := nullif(trim(p_title), '');
  room uuid;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;
  if clean_title is null or char_length(clean_title) > 120 then
    raise exception 'Name the place or event' using errcode = 'check_violation';
  end if;

  select r.id into room from public.live_rooms r
  where r.ended_at is null and lower(r.title) = lower(clean_title)
  order by r.here_count desc
  limit 1;

  if room is null then
    insert into public.live_rooms (title, community_label)
    values (clean_title, nullif(trim(p_community_label), ''))
    returning id into room;
  end if;

  perform public.join_live_room(room);
  return room;
end;
$$;

revoke execute on function public.start_live_room(text, text) from public, anon;
grant execute on function public.start_live_room(text, text) to authenticated;

-- Refresh join_live_room so rejoining also refreshes the heartbeat.
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
  on conflict (room_id, user_id) do update set seen_at = now();
end;
$$;

-- Live rooms with the viewer's place in them.
create or replace function public.live_room_cards()
returns table (
  id uuid,
  title text,
  community_label text,
  venue_name text,
  here_count integer,
  started_at timestamptz,
  i_am_here boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    r.id,
    r.title,
    r.community_label,
    r.venue_name,
    r.here_count,
    r.started_at,
    exists (
      select 1 from public.live_room_presence p
      where p.room_id = r.id and p.user_id = (select auth.uid())
    )
  from public.live_rooms r
  where r.ended_at is null
  order by r.here_count desc, r.started_at desc
  limit 50;
$$;

revoke execute on function public.live_room_cards() from public, anon;
grant execute on function public.live_room_cards() to authenticated;

-- HERE RIGHT NOW: everyone in a room the viewer is in, with waves both ways.
create or replace function public.live_room_people(p_room_id uuid)
returns table (
  user_id uuid,
  first_name text,
  avatar_url text,
  aura public.aura,
  chapter_slug text,
  phase text,
  is_me boolean,
  i_waved boolean,
  waved_at_me boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p.id,
    p.first_name,
    p.avatar_url,
    p.aura,
    held.chapter_slug,
    held.phase,
    p.id = (select auth.uid()),
    exists (
      select 1 from public.waves w
      where w.room_id = p_room_id and w.from_user = (select auth.uid()) and w.to_user = p.id
    ),
    exists (
      select 1 from public.waves w
      where w.room_id = p_room_id and w.from_user = p.id and w.to_user = (select auth.uid())
    )
  from public.live_room_presence presence
  join public.profiles p on p.id = presence.user_id
  left join lateral (
    select uc.chapter_slug, uc.phase from public.user_chapters uc
    where uc.user_id = p.id and uc.status = 'open'
    order by uc.opened_at
    limit 1
  ) held on true
  where presence.room_id = p_room_id
  order by (p.id = (select auth.uid())) desc, presence.joined_at;
$$;

revoke execute on function public.live_room_people(uuid) from public, anon;
grant execute on function public.live_room_people(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

-- The inbox with who did it and where it points.
create or replace function public.my_notifications(p_limit integer default 50)
returns table (
  id uuid,
  kind public.notification_kind,
  actor_id uuid,
  actor_name text,
  actor_avatar text,
  entity_id uuid,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz,
  group_slug text,
  group_title text,
  room_title text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    n.id,
    n.kind,
    n.actor_id,
    actor.first_name,
    actor.avatar_url,
    n.entity_id,
    n.data,
    n.read_at,
    n.created_at,
    g.slug,
    g.title,
    r.title
  from public.notifications n
  left join public.profiles actor on actor.id = n.actor_id
  left join public.groups g on g.id = nullif(n.data ->> 'group_id', '')::uuid
  left join public.live_rooms r on n.kind = 'wave_received' and r.id = n.entity_id
  where n.user_id = (select auth.uid())
  order by n.created_at desc
  limit least(greatest(p_limit, 1), 100);
$$;

revoke execute on function public.my_notifications(integer) from public, anon;
grant execute on function public.my_notifications(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- A space's anonymous replies
-- ---------------------------------------------------------------------------

create or replace function public.question_replies(p_question_id uuid)
returns table (
  id uuid,
  body text,
  audio_path text,
  duration_seconds integer,
  created_at timestamptz,
  is_mine boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    r.id,
    r.body,
    r.audio_path,
    r.duration_seconds,
    r.created_at,
    private.owns('space_question_replies', r.id)
  from public.space_question_replies r
  where r.question_id = p_question_id
  order by r.created_at;
$$;

revoke execute on function public.question_replies(uuid) from public, anon;
grant execute on function public.question_replies(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Search
-- ---------------------------------------------------------------------------

-- People, posts, groups and spaces matching a phrase. Runs as the caller, so
-- posts stay limited to what they may already see. Substring matching is fine
-- at this size; add pg_trgm indexes when tables grow.
create or replace function public.search_everything(p_query text, p_limit integer default 8)
returns table (
  kind text,
  id text,
  title text,
  subtitle text,
  image text,
  chapter_slug text
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select lower(trim(p_query)) as term, least(greatest(p_limit, 1), 20) as n
  )
  select * from (
    (
      select
        'person'::text,
        p.id::text,
        p.first_name,
        held.phase,
        p.avatar_url,
        held.chapter_slug
      from public.profiles p
      cross join q
      left join lateral (
        select uc.chapter_slug, uc.phase from public.user_chapters uc
        where uc.user_id = p.id and uc.status = 'open'
        order by uc.opened_at
        limit 1
      ) held on true
      where char_length(q.term) >= 2
        and p.id <> (select auth.uid())
        and p.onboarded_at is not null
        and strpos(lower(p.first_name), q.term) > 0
      order by strpos(lower(p.first_name), q.term), p.first_name
      limit (select n from q)
    )
    union all
    (
      select
        'post'::text,
        po.id::text,
        coalesce(po.title, left(po.body, 120), 'A post'),
        case when po.is_anonymous then 'Anonymous' else author.first_name end,
        null,
        po.chapter_slug
      from public.posts po
      cross join q
      left join public.profiles author on author.id = po.author_id
      where char_length(q.term) >= 2
        and strpos(lower(coalesce(po.title, '') || ' ' || coalesce(po.body, '')), q.term) > 0
      order by po.created_at desc
      limit (select n from q)
    )
    union all
    (
      select
        'group'::text,
        g.slug,
        g.title,
        g.label,
        null,
        g.chapter_slug
      from public.groups g
      cross join q
      where char_length(q.term) >= 2
        and strpos(lower(g.title || ' ' || coalesce(g.label, '') || ' ' || coalesce(g.description, '')), q.term) > 0
      order by g.member_count desc
      limit (select n from q)
    )
    union all
    (
      select distinct on (c.slug)
        'space'::text,
        c.slug,
        c.name,
        case when strpos(lower(c.name || ' ' || c.tagline), q.term) > 0 then c.tagline else ph.label end,
        c.icon,
        c.slug
      from public.chapters c
      cross join q
      left join public.chapter_phases ph
        on ph.chapter_slug = c.slug and strpos(lower(ph.label), q.term) > 0
      where char_length(q.term) >= 2
        and (strpos(lower(c.name || ' ' || c.tagline), q.term) > 0 or ph.label is not null)
      order by c.slug, ph.sort_order
    )
  ) results (kind, id, title, subtitle, image, chapter_slug);
$$;

revoke execute on function public.search_everything(text, integer) from public, anon;
grant execute on function public.search_everything(text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Scheduled jobs
-- ---------------------------------------------------------------------------

-- Ephemeral rows that outlive their moment.
create or replace function private.cleanup_stale()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Tabs that closed without leaving a room (deleting ends empty rooms).
  delete from public.live_room_presence where seen_at < now() - interval '10 minutes';
  -- Rooms someone named but nobody stayed in.
  update public.live_rooms set ended_at = now()
  where ended_at is null and here_count = 0 and started_at < now() - interval '30 minutes';
  -- Proximity that was never turned off.
  delete from public.proximity_sessions where expires_at < now();
  -- Focus sessions and questions long past are kept; notifications older than
  -- 90 days are read history nobody scrolls to.
  delete from public.notifications where created_at < now() - interval '90 days' and read_at is not null;
end;
$$;

-- "Chapter prompt — Weekly reflection nudge", for people who kept it on.
create or replace function private.send_chapter_prompts()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, kind, data)
  select
    uc.user_id,
    'chapter_prompt',
    jsonb_build_object('chapter_slug', (array_agg(uc.chapter_slug order by uc.opened_at))[1])
  from public.user_chapters uc
  join public.notification_preferences np on np.user_id = uc.user_id and np.chapter_prompt
  where uc.status = 'open'
    and not exists (
      select 1 from public.notifications n
      where n.user_id = uc.user_id
        and n.kind = 'chapter_prompt'
        and n.created_at > now() - interval '6 days'
    )
  group by uc.user_id;
end;
$$;

-- pg_cron ships with Supabase; skip scheduling where it isn't available (tests).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    execute 'create extension if not exists pg_cron with schema pg_catalog';
    execute $job$select cron.schedule('grouv-cleanup', '*/5 * * * *', 'select private.cleanup_stale()')$job$;
    execute $job$select cron.schedule('grouv-chapter-prompts', '0 9 * * 1', 'select private.send_chapter_prompts()')$job$;
  end if;
end;
$$;
