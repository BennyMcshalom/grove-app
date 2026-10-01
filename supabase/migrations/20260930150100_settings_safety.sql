-- Settings and safety (PRD §12, §13 Trust and safety, §15).
--
--   1. Usernames on profiles (unique, editable in Edit Profile).
--   2. Privacy & AI settings that the engine honours:
--        discoverable      → "Show me in suggestions": match_candidates (and
--                            so People you may know) leaves you out.
--        activity_matching → "Learn from my activity": nothing you do is
--                            written to the interaction log, so it stops
--                            shaping your Bonds and their depth.
--   3. Report outcomes: the reporter is told when staff resolve a report and
--      can read the outcome, never who reviewed it.
--   4. Data export: everything a member owns, as one JSON document.
--   5. Deep Focus return: which ended session still owes its "Welcome back",
--      and the calm digest of what happened while away.

-- ---------------------------------------------------------------------------
-- 1. Usernames
-- ---------------------------------------------------------------------------

-- Lowercase letters, numbers, dots and underscores; 3–30 characters; starts
-- and ends with a letter or number. Optional, so existing members aren't
-- forced to pick one.
alter table public.profiles
  add column username text
    check (
      username ~ '^[a-z0-9][a-z0-9_.]{1,28}[a-z0-9]$'
      and username !~ '[._]{2}'
      and username not in ('admin', 'grouv', 'support', 'staff', 'moderator', 'moderation', 'settings', 'help', 'me')
    );

create unique index profiles_username_unique on public.profiles (username);

-- Edit Profile asks before saving, so a taken name is caught as you type.
create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles p
    where p.username = lower(trim(p_username)) and p.id <> (select auth.uid())
  );
$$;

revoke execute on function public.username_available(text) from public, anon;
grant execute on function public.username_available(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Privacy & AI settings
-- ---------------------------------------------------------------------------

-- No row means the defaults (both on); the app upserts on the first change.
create table public.privacy_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  discoverable boolean not null default true,
  activity_matching boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger privacy_settings_set_updated_at
  before update on public.privacy_settings
  for each row execute function private.set_updated_at();

alter table public.privacy_settings enable row level security;

create policy "Users read their own privacy settings"
  on public.privacy_settings for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users create their own privacy settings"
  on public.privacy_settings for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users update their own privacy settings"
  on public.privacy_settings for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function private.is_discoverable(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select s.discoverable from public.privacy_settings s where s.user_id = p_user), true);
$$;

create or replace function private.learns_from_activity(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select s.activity_matching from public.privacy_settings s where s.user_id = p_user), true);
$$;

grant execute on function private.is_discoverable(uuid) to authenticated;
grant execute on function private.learns_from_activity(uuid) to authenticated;

-- The interaction log (back engine) with one new rule: nothing is recorded
-- for a pair when either person has turned activity-based matching off.
create or replace function private.log_interaction(
  p_actor uuid,
  p_other uuid,
  p_type private.interaction_type,
  p_chapter text default null,
  p_ref uuid default null,
  p_once boolean default false,
  p_weight numeric default null,
  p_minutes integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor is null or p_other is null or p_actor = p_other then
    return;
  end if;

  if not private.learns_from_activity(p_actor) or not private.learns_from_activity(p_other) then
    return;
  end if;

  if p_once and p_ref is not null and exists (
    select 1 from private.interactions i
    where i.ref_id = p_ref
      and i.type = p_type
      and i.user_low = least(p_actor, p_other)
      and i.user_high = greatest(p_actor, p_other)
  ) then
    return;
  end if;

  insert into private.interactions (user_a, user_b, type, chapter_slug, weight, duration_minutes, ref_id)
  values (
    p_actor,
    p_other,
    p_type,
    p_chapter,
    coalesce(p_weight, (select w.weight from private.interaction_weights w where w.type = p_type)),
    p_minutes,
    p_ref
  );
end;
$$;

-- The matching engine (back engine C-06), unchanged except that people who
-- turned "Show me in suggestions" off are never offered to anyone.
create or replace function public.match_candidates(
  p_chapter_slug text default null,
  p_global boolean default false,
  p_page integer default 0
)
returns table (
  user_id uuid,
  first_name text,
  avatar_url text,
  aura public.aura,
  chapter_slug text,
  phase text
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select
      (select auth.uid()) as uid,
      not p_global and exists (
        select 1 from private.user_regions r where r.user_id = (select auth.uid())
      ) as local_mode
  ),
  scored as (
    select
      theirs.user_id,
      theirs.chapter_slug,
      theirs.phase,
      (case
        when their_phase.sort_order = my_phase.sort_order then 100
        when abs(their_phase.sort_order - my_phase.sort_order) = 1 then 60
        else 20
      end)
      + (case when private.chapter_age_bucket(mine.opened_at) = private.chapter_age_bucket(theirs.opened_at) then 15 else 0 end)
        as score
    from me
    join public.user_chapters mine on mine.user_id = me.uid and mine.status = 'open'
    join public.chapter_phases my_phase on my_phase.chapter_slug = mine.chapter_slug and my_phase.label = mine.phase
    join public.user_chapters theirs
      on theirs.chapter_slug = mine.chapter_slug and theirs.status = 'open' and theirs.user_id <> me.uid
    join public.chapter_phases their_phase
      on their_phase.chapter_slug = theirs.chapter_slug and their_phase.label = theirs.phase
    join public.profiles p on p.id = theirs.user_id and p.onboarded_at is not null
    where (p_chapter_slug is null or mine.chapter_slug = p_chapter_slug)
      and not private.blocked_between(me.uid, theirs.user_id)
      -- Privacy & AI → "Show me in suggestions".
      and private.is_discoverable(theirs.user_id)
      -- Already connected, asked, or previously declined: any connection row.
      and not exists (
        select 1 from public.connections c
        where c.user_low = least(me.uid, theirs.user_id) and c.user_high = greatest(me.uid, theirs.user_id)
      )
      and not exists (
        select 1 from public.bonds b
        where b.status in ('pending', 'active')
          and b.user_low = least(me.uid, theirs.user_id) and b.user_high = greatest(me.uid, theirs.user_id)
      )
  ),
  pool as (
    select distinct on (s.user_id)
      s.user_id,
      s.chapter_slug,
      s.phase,
      s.score,
      private.km_from_me(s.user_id) as km,
      coalesce((
        select their_region.geo_hash = my_region.geo_hash
        from private.user_regions my_region
        join private.user_regions their_region on their_region.user_id = s.user_id
        where my_region.user_id = (select uid from me)
      ), false) as same_hash
    from scored s
    order by s.user_id, s.score desc
  ),
  radius as (
    select case
      when not (select local_mode from me) then null
      else coalesce(
        (
          select r from unnest(array[10, 25, 50, 100]) as r
          where (select count(*) from pool where pool.km <= r) >= 8
          order by r
          limit 1
        ),
        100
      )
    end as km
  )
  select pool.user_id, p.first_name, p.avatar_url, p.aura, pool.chapter_slug, pool.phase
  from pool
  cross join radius
  cross join me
  join public.profiles p on p.id = pool.user_id
  left join private.user_signals s on s.user_id = pool.user_id
  where radius.km is null or pool.km <= radius.km
  order by
    pool.score
      + (case when me.local_mode and pool.same_hash then 20 else 0 end)
      - (case when coalesce(s.reciprocity_health_flag, false) then 40 else 0 end) desc,
    md5(pool.user_id::text || me.uid::text)
  offset greatest(p_page, 0) * 12
  limit 12;
$$;

revoke execute on function public.match_candidates(text, boolean, integer) from public, anon;

-- ---------------------------------------------------------------------------
-- 3. Report outcomes
-- ---------------------------------------------------------------------------

-- Reporters can read their own reports, but never who reviewed them or the
-- reviewer's private note (PRD §15: "Reporter receives status and outcome
-- only"). Staff read the queue through moderation_queue().
revoke select on public.reports from authenticated;
grant select (id, reporter_id, target_type, target_id, reason, details, status, created_at, reviewed_at)
  on public.reports to authenticated;

-- Who or what a report was about, in words the reporter already saw: a
-- person's first name for a profile, a message or a named post or comment;
-- otherwise nothing (and the app says "a post", "a group"…). Never an
-- anonymous author.
create or replace function private.report_subject(p_type public.report_target, p_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case p_type
    when 'profile' then (select p.first_name from public.profiles p where p.id = p_id)
    when 'message' then (
      select p.first_name from public.messages m join public.profiles p on p.id = m.sender_id where m.id = p_id
    )
    when 'post' then (
      select p.first_name from public.posts po join public.profiles p on p.id = po.author_id where po.id = p_id
    )
    when 'comment' then (
      select p.first_name from public.comments c join public.profiles p on p.id = c.author_id where c.id = p_id
    )
    else null
  end;
$$;

-- "Update on your report". The reviewer is never the actor.
create or replace function private.notify_report_reviewed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('actioned', 'dismissed') and old.status not in ('actioned', 'dismissed') then
    perform private.notify(
      new.reporter_id,
      'report_reviewed',
      null,
      new.id,
      jsonb_build_object(
        'target_type', new.target_type,
        'subject', private.report_subject(new.target_type, new.target_id)
      )
    );
  end if;
  return new;
end;
$$;

create trigger reports_notify_reviewed
  after update of status on public.reports
  for each row execute function private.notify_report_reviewed();

-- The outcome page. Only the reporter can open it.
create or replace function public.my_report(p_report_id uuid)
returns table (
  id uuid,
  target_type public.report_target,
  reason public.report_reason,
  status public.report_status,
  created_at timestamptz,
  reviewed_at timestamptz,
  subject text
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.target_type, r.reason, r.status, r.created_at, r.reviewed_at,
    coalesce(
      (select n.data ->> 'subject' from public.notifications n
       where n.user_id = r.reporter_id and n.kind = 'report_reviewed' and n.entity_id = r.id
       limit 1),
      private.report_subject(r.target_type, r.target_id)
    )
  from public.reports r
  where r.id = p_report_id and r.reporter_id = (select auth.uid());
$$;

revoke execute on function public.my_report(uuid) from public, anon;
grant execute on function public.my_report(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Data export
-- ---------------------------------------------------------------------------

-- Everything the member owns or wrote, as one document: their profile and
-- settings, chapters, posts (anonymous ones too — they're theirs), comments,
-- Grouv Log entries, messages they sent, connections, Bonds, groups, events,
-- blocks and the reports they filed (status only). Other people appear by
-- first name only; nobody else's words are included.
create or replace function public.export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Sign in to export your data' using errcode = 'insufficient_privilege';
  end if;

  return jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = uid),
    'prompts', (select to_jsonb(pp) - 'user_id' from public.profile_prompts pp where pp.user_id = uid),
    'notification_preferences', (select to_jsonb(np) - 'user_id' from public.notification_preferences np where np.user_id = uid),
    'privacy_settings', (select to_jsonb(ps) - 'user_id' from public.privacy_settings ps where ps.user_id = uid),
    'subscription', (
      select jsonb_build_object('status', s.status, 'trial_started_at', s.trial_started_at, 'trial_ends_at', s.trial_ends_at,
        'current_period_end', s.current_period_end)
      from public.subscriptions s where s.user_id = uid
    ),
    'chapters', coalesce((
      select jsonb_agg(
        (to_jsonb(uc) - 'user_id') || jsonb_build_object(
          'stages', coalesce((select jsonb_agg(to_jsonb(ph) - 'user_chapter_id' order by ph.started_at)
                              from public.user_chapter_phases ph where ph.user_chapter_id = uc.id), '[]'),
          'closure', (select to_jsonb(cc) - 'user_chapter_id' from public.chapter_closures cc where cc.user_chapter_id = uc.id)
        )
        order by uc.opened_at
      )
      from public.user_chapters uc where uc.user_id = uid
    ), '[]'),
    'posts', coalesce((
      select jsonb_agg(
        to_jsonb(po) || jsonb_build_object(
          'media', coalesce((select jsonb_agg(to_jsonb(m) - 'post_id') from public.post_media m where m.post_id = po.id), '[]')
        )
        order by po.created_at
      )
      from public.posts po
      join private.content_owners o on o.content_type = 'posts' and o.content_id = po.id
      where o.owner_id = uid
    ), '[]'),
    'comments', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.created_at) from public.comments c where c.author_id = uid
    ), '[]'),
    'truths', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.created_at)
      from public.truths t
      join private.content_owners o on o.content_type = 'truths' and o.content_id = t.id
      where o.owner_id = uid
    ), '[]'),
    'space_questions', coalesce((
      select jsonb_agg(to_jsonb(q) order by q.created_at)
      from public.space_questions q
      join private.content_owners o on o.content_type = 'space_questions' and o.content_id = q.id
      where o.owner_id = uid
    ), '[]'),
    'log_entries', coalesce((
      select jsonb_agg(to_jsonb(le) - 'user_id' order by le.entry_date, le.created_at)
      from public.log_entries le where le.user_id = uid
    ), '[]'),
    'messages_sent', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'conversation_id', m.conversation_id, 'kind', m.kind, 'body', m.body, 'media_path', m.media_path,
          'link_url', m.link_url, 'shared_post_id', m.shared_post_id, 'created_at', m.created_at,
          'edited_at', m.edited_at, 'deleted_at', m.deleted_at
        )
        order by m.created_at
      )
      from public.messages m where m.sender_id = uid
    ), '[]'),
    'connections', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'with', other.first_name, 'status', c.status, 'you_asked', c.requester_id = uid,
          'chapter_slug', c.chapter_slug, 'created_at', c.created_at, 'responded_at', c.responded_at
        )
        order by c.created_at
      )
      from public.connections c
      join public.profiles other on other.id = case when c.requester_id = uid then c.addressee_id else c.requester_id end
      where uid in (c.requester_id, c.addressee_id)
    ), '[]'),
    'bonds', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'with', other.first_name, 'status', b.status, 'chapter_slug', b.chapter_slug,
          'created_at', b.created_at, 'accepted_at', b.accepted_at, 'released_at', b.released_at
        )
        order by b.created_at
      )
      from public.bonds b
      join public.profiles other on other.id = case when b.inviter_id = uid then b.invitee_id else b.inviter_id end
      where uid in (b.inviter_id, b.invitee_id)
    ), '[]'),
    'groups', coalesce((
      select jsonb_agg(jsonb_build_object('title', g.title, 'role', gm.role, 'joined_at', gm.joined_at) order by gm.joined_at)
      from public.group_members gm join public.groups g on g.id = gm.group_id
      where gm.user_id = uid
    ), '[]'),
    'events_hosted', coalesce((
      select jsonb_agg(
        jsonb_build_object('title', e.title, 'venue', e.venue_name, 'starts_at', e.starts_at, 'status', e.status,
          'description', e.description, 'capacity', e.capacity)
        order by e.starts_at
      )
      from public.events e where e.host_id = uid
    ), '[]'),
    'events_joined', coalesce((
      select jsonb_agg(jsonb_build_object('title', e.title, 'starts_at', e.starts_at, 'joined_at', a.created_at) order by e.starts_at)
      from public.event_attendees a join public.events e on e.id = a.event_id
      where a.user_id = uid
    ), '[]'),
    'blocked', coalesce((
      select jsonb_agg(jsonb_build_object('name', p.first_name, 'blocked_at', bl.created_at) order by bl.created_at)
      from public.blocks bl join public.profiles p on p.id = bl.blocked_id
      where bl.blocker_id = uid
    ), '[]'),
    'reports_filed', coalesce((
      select jsonb_agg(
        jsonb_build_object('target_type', r.target_type, 'reason', r.reason, 'details', r.details,
          'status', r.status, 'created_at', r.created_at, 'reviewed_at', r.reviewed_at)
        order by r.created_at
      )
      from public.reports r where r.reporter_id = uid
    ), '[]'),
    'deep_focus_sessions', coalesce((
      select jsonb_agg(to_jsonb(f) - 'user_id' - 'id' order by f.started_at)
      from public.focus_sessions f where f.user_id = uid
    ), '[]')
  );
end;
$$;

revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Deep Focus return and digest
-- ---------------------------------------------------------------------------

-- Set once the member has seen "Welcome back" (and skipped or read the
-- digest). An ended session without it still owes them that screen.
alter table public.focus_sessions add column digest_seen_at timestamptz;

-- Sessions that ended before this existed have nothing to welcome back to.
update public.focus_sessions
set digest_seen_at = coalesce(ended_early_at, ends_at)
where coalesce(ended_early_at, ends_at) <= now();

-- "While you were away": counts, and at most one name, from the member's
-- latest ended session. No message text; no urgency.
create or replace function public.focus_digest()
returns table (
  started_at timestamptz,
  ended_at timestamptz,
  new_matches integer,
  bond_messages integer,
  bond_sender text,
  other_messages integer,
  other_sender text,
  group_replies integer,
  group_title text,
  post_comments integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  s public.focus_sessions;
  window_end timestamptz;
begin
  select * into s from public.focus_sessions f
  where f.user_id = uid and coalesce(f.ended_early_at, f.ends_at) <= now()
  order by f.started_at desc
  limit 1;

  if not found then
    return;
  end if;
  window_end := coalesce(s.ended_early_at, s.ends_at);

  return query
  with direct as (
    select
      m.sender_id,
      m.created_at,
      exists (
        select 1 from public.bonds b
        where b.status = 'active'
          and b.user_low = least(uid, m.sender_id) and b.user_high = greatest(uid, m.sender_id)
      ) as bonded
    from public.conversation_members cm
    join public.conversations c on c.id = cm.conversation_id and c.kind = 'direct'
    join public.messages m on m.conversation_id = c.id
    where cm.user_id = uid
      and m.sender_id is not null and m.sender_id <> uid
      and m.deleted_at is null
      and m.created_at >= s.started_at and m.created_at < window_end
  ),
  grouped as (
    select g.title, count(*)::integer as n
    from public.group_members gm
    join public.groups g on g.id = gm.group_id
    join public.messages m on m.conversation_id = g.conversation_id
    where gm.user_id = uid
      and m.sender_id is not null and m.sender_id <> uid
      and m.deleted_at is null
      and m.created_at >= s.started_at and m.created_at < window_end
    group by g.title
  )
  select
    s.started_at,
    window_end,
    (select count(*)::integer from public.notifications n
     where n.user_id = uid and n.created_at >= s.started_at and n.created_at < window_end
       and n.kind in ('connection_suggested', 'connection_request', 'introduction_received')),
    (select count(*)::integer from direct d where d.bonded),
    (select p.first_name from direct d join public.profiles p on p.id = d.sender_id
     where d.bonded order by d.created_at desc limit 1),
    (select count(*)::integer from direct d where not d.bonded),
    (select p.first_name from direct d join public.profiles p on p.id = d.sender_id
     where not d.bonded order by d.created_at desc limit 1),
    coalesce((select sum(gr.n)::integer from grouped gr), 0),
    (select gr.title from grouped gr order by gr.n desc, gr.title limit 1),
    (select count(*)::integer from public.notifications n
     where n.user_id = uid and n.created_at >= s.started_at and n.created_at < window_end
       and n.kind = 'post_commented');
end;
$$;

revoke execute on function public.focus_digest() from public, anon;
grant execute on function public.focus_digest() to authenticated;
