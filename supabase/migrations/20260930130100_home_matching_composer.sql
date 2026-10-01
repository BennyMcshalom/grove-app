-- Home, matching and the memory composer (PRD v1.1 §5–6).
--
--   1. Post audience: Everyone / Selected Bonds / Only me, chosen at creation
--      and enforced by RLS (and so by every read built on it, the feed too).
--   2. Introductions: "Introduce yourself" is a connection request that
--      carries a note and an optional starter prompt. Chat still unlocks only
--      when the other person accepts (open_direct_conversation and
--      refuse_direct_message already require an accepted connection). Both
--      decisions come back to the sender as notifications.
--   3. Matching: potential connections with the reason they match, "Not
--      relevant", match preferences, and new-match notifications. Core matches
--      and notifications are Free; the life stage, looking-for and distance
--      preferences are Season Pass (private.has_pass), in SQL as well as the UI.

-- ===========================================================================
-- 1 · Post audience
-- ===========================================================================

alter table public.posts
  add column audience public.audience not null default 'everyone';

-- Open Grove reaches strangers at your stage; it only makes sense for a post
-- that's for everyone.
alter table public.posts
  add constraint posts_open_grove_is_public check (not open_grove or audience = 'everyone');

-- The exact people a "Selected Bonds" post is for.
create table public.post_audience (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index post_audience_by_user on public.post_audience (user_id);

alter table public.post_audience enable row level security;

-- The author sees the whole list (the composer's "This post will be visible
-- to:"); a recipient sees only their own row. Written by set_post_audience.
create policy "Authors and recipients see a post's audience"
  on public.post_audience for select
  to authenticated
  using (user_id = (select auth.uid()) or private.owns('posts', post_id));

create or replace function private.in_post_audience(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.post_audience a
    where a.post_id = p_post_id and a.user_id = (select auth.uid())
  );
$$;

revoke execute on function private.in_post_audience(uuid) from public, anon;
grant execute on function private.in_post_audience(uuid) to authenticated;

-- Who can see a post now:
--   · its author, always;
--   · "Only me": nobody else;
--   · "Selected Bonds": exactly the people listed, in any space, for as long
--     as the post exists;
--   · "Everyone": as before — bonds across spaces, the circle for 48 hours in
--     a space they hold, Open Grove for the month.
drop policy "Posts reach connections for 48 hours, bonds across spaces" on public.posts;

create policy "Posts reach the audience their author chose"
  on public.posts for select
  to authenticated
  using (
    private.owns('posts', id)
    or (audience = 'selected_bonds' and private.in_post_audience(id))
    or (
      audience = 'everyone'
      and (
        (author_id is not null and private.is_bonded(author_id))
        or (
          created_at > now() - interval '48 hours'
          and private.holds_chapter(chapter_slug)
          and case
            when author_id is null then private.owner_is_close('posts', id)
            else private.in_circle(author_id)
          end
        )
        or (open_grove and created_at > now() - interval '31 days' and private.holds_chapter(chapter_slug))
      )
    )
  );

-- Composer → "Selected Bonds". Replaces the list; every person must be an
-- active bond of the author. Only the author, only on their own post.
create or replace function public.set_post_audience(p_post_id uuid, p_user_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  target public.posts;
  wanted uuid[] := coalesce((select array_agg(distinct x) from unnest(p_user_ids) x where x is not null), '{}');
  added integer;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  select * into target from public.posts where id = p_post_id;
  if not found or not private.owns('posts', p_post_id) then
    raise exception 'You can only choose the audience of your own posts'
      using errcode = 'insufficient_privilege';
  end if;
  if target.audience <> 'selected_bonds' then
    raise exception 'This post isn''t shared with selected bonds' using errcode = 'check_violation';
  end if;
  if cardinality(wanted) = 0 then
    raise exception 'Choose at least one bond' using errcode = 'check_violation', hint = 'empty_audience';
  end if;
  if cardinality(wanted) > 50 then
    raise exception 'That''s too many people' using errcode = 'check_violation';
  end if;
  if exists (select 1 from unnest(wanted) x where not private.is_bonded(x)) then
    raise exception 'You can only share with your bonds'
      using errcode = 'insufficient_privilege', hint = 'not_bonded';
  end if;

  delete from public.post_audience where post_id = p_post_id;
  insert into public.post_audience (post_id, user_id)
  select p_post_id, x from unnest(wanted) x;
  get diagnostics added = row_count;
  return added;
end;
$$;

revoke execute on function public.set_post_audience(uuid, uuid[]) from public, anon;
grant execute on function public.set_post_audience(uuid, uuid[]) to authenticated;

-- The feed now returns each post's audience (the author's cards label a post
-- that isn't for everyone) and keeps Open Grove to posts for everyone. RLS
-- already hides what the viewer isn't in the audience for; this function is
-- security invoker. Recreated whole from 20260924000300; every scope and
-- column is unchanged apart from the new `audience`.
drop function public.feed_posts(text, text, timestamptz, timestamptz, timestamptz, uuid, integer, uuid, double precision);

create function public.feed_posts(
  p_scope text default 'home',
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
  open_grove boolean,
  comments_count integer,
  created_at timestamptz,
  author_id uuid,
  author_name text,
  author_avatar text,
  author_phase text,
  is_mine boolean,
  rooted boolean,
  media jsonb,
  audience public.audience
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
    p.open_grove,
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
        select jsonb_agg(jsonb_build_object('kind', m.kind, 'path', m.storage_path, 'trim_start', m.trim_start, 'trim_end', m.trim_end, 'width', m.width, 'height', m.height) order by m.position)
        from public.post_media m
        where m.post_id = p.id
      ),
      '[]'::jsonb
    ),
    p.audience
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
      p_scope in ('home', 'roots')
      or p_before is null
      or (p.created_at, p.id) < (p_before, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))
    )
    and case p_scope
      when 'all' then true
      when 'mine' then private.owns('posts', p.id)
      -- Home and a space's Roots tab: you and your connections, 48 hours.
      when 'home' then
        p.created_at > now() - interval '48 hours'
        and (
          private.owns('posts', p.id)
          or (p.author_id is not null and (private.in_circle(p.author_id) or private.is_bonded(p.author_id)))
          or (p.author_id is null and private.owner_is_close('posts', p.id))
        )
      when 'roots' then
        p.created_at > now() - interval '48 hours'
        and (
          private.owns('posts', p.id)
          or (p.author_id is not null and (private.in_circle(p.author_id) or private.is_bonded(p.author_id)))
          or (p.author_id is null and private.owner_is_close('posts', p.id))
        )
      -- Open Grove, surfaced to people at the same stage by recency alone.
      when 'open' then
        p.open_grove
        and p.audience = 'everyone'
        and p.author_id is not null
        and p.author_id <> v.uid
        and not private.in_circle(p.author_id)
        and not private.is_bonded(p.author_id)
        and author_chapter.phase = v.phase
        and (p_within_km is null or private.km_from_me(p.author_id) <= p_within_km)
      else false
    end
  order by p.created_at desc, p.id desc
  limit case when p_scope in ('home', 'roots') then 100 else least(greatest(p_limit, 1), 50) end;
$$;

revoke execute on function public.feed_posts(text, text, timestamptz, timestamptz, timestamptz, uuid, integer, uuid, double precision) from public, anon;
grant execute on function public.feed_posts(text, text, timestamptz, timestamptz, timestamptz, uuid, integer, uuid, double precision) to authenticated;

-- ===========================================================================
-- 2 · Introductions
-- ===========================================================================

alter table public.connections
  -- "Your message". Set only by introduce_yourself; a plain Connect has none.
  add column intro_message text check (char_length(intro_message) between 1 and 1000),
  -- The optional starter prompt the sender picked, e.g. "Ask about their move".
  add column intro_prompt text check (char_length(intro_prompt) <= 200),
  -- When the recipient first saw it ("Priya has seen your introduction").
  add column intro_seen_at timestamptz;

-- "Introduce yourself" (Figma 980:20547). One per pair, like any request. If
-- they already introduced themselves to you, this accepts theirs instead.
create or replace function public.introduce_yourself(
  p_other uuid,
  p_message text,
  p_prompt text default null,
  p_chapter_slug text default null
)
returns public.connections
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  clean_message text := nullif(trim(p_message), '');
  clean_prompt text := nullif(trim(p_prompt), '');
  result public.connections;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;
  if p_other is null or p_other = uid then
    raise exception 'You can''t introduce yourself to yourself' using errcode = 'check_violation';
  end if;
  if clean_message is null then
    raise exception 'Write a short note first' using errcode = 'check_violation', hint = 'empty_message';
  end if;
  if char_length(clean_message) > 1000 then
    raise exception 'Keep your note under 1,000 characters' using errcode = 'check_violation', hint = 'too_long';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_other and p.onboarded_at is not null) then
    raise exception 'That person isn''t on Grouv' using errcode = 'no_data_found';
  end if;

  select * into result from public.connections
  where user_low = least(uid, p_other) and user_high = greatest(uid, p_other)
  for update;

  if not found then
    insert into public.connections (requester_id, addressee_id, chapter_slug, intro_message, intro_prompt)
    values (uid, p_other, p_chapter_slug, clean_message, left(clean_prompt, 200))
    returning * into result;
  elsif result.status = 'pending' and result.addressee_id = uid then
    update public.connections
    set status = 'accepted', responded_at = now()
    where id = result.id
    returning * into result;
  elsif result.status = 'accepted' then
    raise exception 'You''re already connected' using errcode = 'unique_violation', hint = 'already_connected';
  elsif result.status = 'pending' then
    raise exception 'Your introduction is on its way' using errcode = 'unique_violation', hint = 'already_sent';
  else
    raise exception 'They''re not able to connect right now' using errcode = 'unique_violation', hint = 'declined';
  end if;

  return result;
end;
$$;

revoke execute on function public.introduce_yourself(uuid, text, text, text) from public, anon;
grant execute on function public.introduce_yourself(uuid, text, text, text) to authenticated;

-- Introductions use their own notification kinds, and a declined one is
-- answered too ("Not this time", Figma 1176:20234). A plain request is
-- unchanged: no word when it's declined.
create or replace function private.notify_connection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_intro boolean := new.intro_message is not null;
begin
  if tg_op = 'INSERT' then
    perform private.notify(
      new.addressee_id,
      case when is_intro then 'introduction_request' else 'connection_request' end::public.notification_kind,
      new.requester_id,
      new.id
    );
  elsif new.status = 'accepted' and old.status <> 'accepted' then
    perform private.notify(
      new.requester_id,
      case when is_intro then 'introduction_accepted' else 'connection_accepted' end::public.notification_kind,
      new.addressee_id,
      new.id
    );
  elsif is_intro and new.status = 'declined' and old.status <> 'declined' then
    perform private.notify(new.requester_id, 'introduction_declined', new.addressee_id, new.id);
  end if;
  return new;
end;
$$;

-- Home's Chapter Today and the introduction status modal: introductions the
-- viewer sent or received, newest first. The other side's shared-space stage
-- comes with it for the "Career · First tech job" chip.
create or replace function public.my_introductions(p_limit integer default 20)
returns table (
  connection_id uuid,
  direction text,
  other_id uuid,
  first_name text,
  avatar_url text,
  status public.connection_status,
  message text,
  prompt text,
  chapter_slug text,
  phase text,
  seen_at timestamptz,
  created_at timestamptz,
  responded_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    case when c.requester_id = (select auth.uid()) then 'sent' else 'received' end,
    other.id,
    other.first_name,
    other.avatar_url,
    c.status,
    c.intro_message,
    c.intro_prompt,
    coalesce(stage.chapter_slug, c.chapter_slug),
    stage.phase,
    c.intro_seen_at,
    c.created_at,
    c.responded_at
  from public.connections c
  join public.profiles other
    on other.id = case when c.requester_id = (select auth.uid()) then c.addressee_id else c.requester_id end
  left join lateral (
    select uc.chapter_slug, uc.phase
    from public.user_chapters uc
    where uc.user_id = other.id and uc.status = 'open'
    order by (uc.chapter_slug = c.chapter_slug) desc nulls last, uc.opened_at
    limit 1
  ) stage on true
  where (select auth.uid()) in (c.requester_id, c.addressee_id)
    and c.intro_message is not null
    and not private.blocked_between(c.requester_id, c.addressee_id)
  order by coalesce(c.responded_at, c.created_at) desc
  limit least(greatest(p_limit, 1), 50);
$$;

revoke execute on function public.my_introductions(integer) from public, anon;
grant execute on function public.my_introductions(integer) to authenticated;

-- The recipient has looked at their introductions (Home or the modal).
create or replace function public.mark_introductions_seen()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  touched integer;
begin
  update public.connections
  set intro_seen_at = now()
  where addressee_id = (select auth.uid())
    and intro_message is not null
    and intro_seen_at is null;
  get diagnostics touched = row_count;
  return touched;
end;
$$;

revoke execute on function public.mark_introductions_seen() from public, anon;
grant execute on function public.mark_introductions_seen() to authenticated;

-- ===========================================================================
-- 3 · Matching
-- ===========================================================================

-- Match Preferences (Figma 1215:22432). Life stage and looking-for describe
-- where you are and what you want; distance caps how far matches may be. Those
-- three are Season Pass. The new-match notification is Free.
create table public.match_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  life_stages text[] not null default '{}'
    check (life_stages <@ array['starting_over', 'rebuilding_routines', 'new_to_city', 'career_pivot', 'becoming_parent']),
  looking_for text[] not null default '{}'
    check (looking_for <@ array['accountability', 'creative_collaboration', 'sounding_board', 'adventure_partners', 'quiet_checkins']),
  distance_km integer check (distance_km between 1 and 500),
  notify_new_matches boolean not null default false,
  last_match_notified_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.match_preferences enable row level security;

-- Your own row only. Others' looking-for reaches a match card through
-- potential_matches, never by reading this table.
create policy "Users read their own match preferences"
  on public.match_preferences for select
  to authenticated
  using (user_id = (select auth.uid()));

-- "Save preferences". Without the Season Pass only the notification switch
-- can change; the rest keep whatever was saved (a downgrade pauses them).
create or replace function public.save_match_preferences(
  p_life_stages text[],
  p_looking_for text[],
  p_distance_km integer,
  p_notify boolean
)
returns public.match_preferences
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  current_row public.match_preferences;
  result public.match_preferences;
  stages text[] := coalesce((select array_agg(distinct x order by x) from unnest(p_life_stages) x), '{}');
  wants text[] := coalesce((select array_agg(distinct x order by x) from unnest(p_looking_for) x), '{}');
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  select * into current_row from public.match_preferences where user_id = uid;

  if not private.has_pass(uid) and (
    stages is distinct from coalesce((select array_agg(x order by x) from unnest(current_row.life_stages) x), '{}')
    or wants is distinct from coalesce((select array_agg(x order by x) from unnest(current_row.looking_for) x), '{}')
    or p_distance_km is distinct from current_row.distance_km
  ) then
    raise exception 'Match filters are part of the Season Pass'
      using errcode = 'insufficient_privilege', hint = 'pass_required';
  end if;

  insert into public.match_preferences (user_id, life_stages, looking_for, distance_km, notify_new_matches, updated_at)
  values (uid, stages, wants, p_distance_km, coalesce(p_notify, false), now())
  on conflict (user_id) do update
    set life_stages = excluded.life_stages,
        looking_for = excluded.looking_for,
        distance_km = excluded.distance_km,
        notify_new_matches = excluded.notify_new_matches,
        -- Turning notifications on starts the "new since" clock now.
        last_match_notified_at = case
          when excluded.notify_new_matches and not public.match_preferences.notify_new_matches then now()
          else public.match_preferences.last_match_notified_at
        end,
        updated_at = now()
  returning * into result;

  return result;
end;
$$;

revoke execute on function public.save_match_preferences(text[], text[], integer, boolean) from public, anon;
grant execute on function public.save_match_preferences(text[], text[], integer, boolean) to authenticated;

-- "Not relevant": never shown to you again.
create table public.match_dismissals (
  user_id uuid not null references public.profiles (id) on delete cascade,
  other_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, other_id),
  check (user_id <> other_id)
);

alter table public.match_dismissals enable row level security;

create policy "Users see who they dismissed"
  on public.match_dismissals for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users dismiss matches for themselves"
  on public.match_dismissals for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- The candidate pool for one person: everyone holding one of their open
-- spaces who isn't already connected, asked, bonded, blocked or dismissed,
-- scored by stage (as match_candidates does) plus shared preferences. A
-- member's own preferences only filter and rank while they hold the Season
-- Pass. Scores and distances never leave this function.
create or replace function private.match_pool(p_uid uuid)
returns table (
  user_id uuid,
  chapter_slug text,
  phase text,
  same_phase boolean,
  looking_for text[],
  shared_looking_for text[],
  shared_life_stages text[],
  opened_at timestamptz,
  rank_score integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select
      p_uid as uid,
      private.has_pass(p_uid) as pass,
      mp.life_stages,
      mp.looking_for,
      mp.distance_km
    from (select 1) one
    left join public.match_preferences mp on mp.user_id = p_uid
  ),
  scored as (
    select
      theirs.user_id,
      theirs.chapter_slug,
      theirs.phase,
      theirs.opened_at,
      their_phase.sort_order = my_phase.sort_order as same_phase,
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
    where not private.blocked_between(me.uid, theirs.user_id)
      and not exists (
        select 1 from public.connections c
        where c.user_low = least(me.uid, theirs.user_id) and c.user_high = greatest(me.uid, theirs.user_id)
      )
      and not exists (
        select 1 from public.bonds b
        where b.status in ('pending', 'active')
          and b.user_low = least(me.uid, theirs.user_id) and b.user_high = greatest(me.uid, theirs.user_id)
      )
      and not exists (
        select 1 from public.match_dismissals d
        where d.user_id = me.uid and d.other_id = theirs.user_id
      )
  ),
  best as (
    select distinct on (s.user_id) s.*
    from scored s
    order by s.user_id, s.score desc, s.opened_at
  ),
  located as (
    select
      b.*,
      (
        select round(
          6371 * 2 * asin(sqrt(
            power(sin(radians(theirs.latitude - mine.latitude) / 2), 2)
            + cos(radians(mine.latitude)) * cos(radians(theirs.latitude))
              * power(sin(radians(theirs.longitude - mine.longitude) / 2), 2)
          ))
        )
        from private.user_regions mine
        join private.user_regions theirs on theirs.user_id = b.user_id
        where mine.user_id = (select uid from me)
      ) as km,
      coalesce(theirs_prefs.looking_for, '{}') as their_wants,
      coalesce(theirs_prefs.life_stages, '{}') as their_stages
    from best b
    left join public.match_preferences theirs_prefs on theirs_prefs.user_id = b.user_id
  )
  select
    l.user_id,
    l.chapter_slug,
    l.phase,
    l.same_phase,
    l.their_wants,
    case when me.pass then array(select unnest(l.their_wants) intersect select unnest(coalesce(me.looking_for, '{}'))) else '{}' end,
    case when me.pass then array(select unnest(l.their_stages) intersect select unnest(coalesce(me.life_stages, '{}'))) else '{}' end,
    l.opened_at,
    (
      l.score
      + case when me.pass then 30 * cardinality(array(select unnest(l.their_wants) intersect select unnest(coalesce(me.looking_for, '{}')))) else 0 end
      + case when me.pass then 20 * cardinality(array(select unnest(l.their_stages) intersect select unnest(coalesce(me.life_stages, '{}')))) else 0 end
      + case when l.km is not null and l.km <= 50 then 10 else 0 end
      - case when coalesce(sig.reciprocity_health_flag, false) then 40 else 0 end
    )::integer
  from located l
  cross join me
  left join private.user_signals sig on sig.user_id = l.user_id
  where not (me.pass and me.distance_km is not null)
     or (l.km is not null and l.km <= me.distance_km);
$$;

revoke execute on function private.match_pool(uuid) from public, anon, authenticated;

-- "We found some potential connections" (Figma 650:37394): the best few, with
-- what the match card needs to say why.
create or replace function public.potential_matches(p_limit integer default 4)
returns table (
  user_id uuid,
  first_name text,
  avatar_url text,
  chapter_slug text,
  phase text,
  same_phase boolean,
  looking_for text[],
  shared_looking_for text[],
  shared_life_stages text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    pool.user_id,
    p.first_name,
    p.avatar_url,
    pool.chapter_slug,
    pool.phase,
    pool.same_phase,
    pool.looking_for,
    pool.shared_looking_for,
    pool.shared_life_stages
  from private.match_pool((select auth.uid())) pool
  join public.profiles p on p.id = pool.user_id
  where (select auth.uid()) is not null
  order by pool.rank_score desc, md5(pool.user_id::text || (select auth.uid())::text)
  limit least(greatest(p_limit, 1), 12);
$$;

revoke execute on function public.potential_matches(integer) from public, anon;
grant execute on function public.potential_matches(integer) to authenticated;

create or replace function public.dismiss_match(p_other uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.match_dismissals (user_id, other_id)
  values ((select auth.uid()), p_other)
  on conflict do nothing;
$$;

revoke execute on function public.dismiss_match(uuid) from public, anon;
grant execute on function public.dismiss_match(uuid) to authenticated;

-- "Notify me about new matches": once someone new opens a space you share
-- (after you last heard), say so — at most every three days, and without
-- naming them; the match list does that.
create or replace function private.send_match_notifications()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  subscriber record;
  sent integer := 0;
begin
  for subscriber in
    select mp.user_id, coalesce(mp.last_match_notified_at, mp.updated_at) as since
    from public.match_preferences mp
    where mp.notify_new_matches
      and (mp.last_match_notified_at is null or mp.last_match_notified_at < now() - interval '3 days')
  loop
    if exists (
      select 1 from private.match_pool(subscriber.user_id) pool
      where pool.opened_at > subscriber.since
    ) then
      perform private.notify(subscriber.user_id, 'match_available', null, null);
      update public.match_preferences set last_match_notified_at = now() where user_id = subscriber.user_id;
      sent := sent + 1;
    end if;
  end loop;
  return sent;
end;
$$;

revoke execute on function private.send_match_notifications() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $job$select cron.schedule('grouv-match-notifications', '15 * * * *', 'select private.send_match_notifications()')$job$;
  end if;
end;
$$;
