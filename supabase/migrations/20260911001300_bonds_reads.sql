-- Read helpers for the Bonds screen and the right rail.

-- Everyone the viewer is bonded with or has in their circle, with the chat
-- they share. A bond outranks plain circle membership for the same person.
-- Depth grows with how much you talk and how long you've been bonded:
-- ln(1 + messages) * 12 + days together / 3, capped at 100.
create or replace function public.bonds_overview()
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
  depth integer,
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
    least(
      100,
      floor(
        ln(1 + coalesce(stats.message_count, 0)) * 12
        + extract(epoch from now() - r.since)::double precision / 86400 / 3
      )
    )::integer,
    conv.id,
    last_message.body,
    last_message.kind,
    last_message.created_at,
    last_message.sender_id = me.uid,
    coalesce(stats.unread, 0)
  from ranked r
  cross join me
  join public.profiles p on p.id = r.other
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
      count(*)::integer as message_count,
      (count(*) filter (
        where m.sender_id <> me.uid
          and m.created_at > coalesce(cm.last_read_at, '-infinity'::timestamptz)
      ))::integer as unread
    from public.messages m
    left join public.conversation_members cm
      on cm.conversation_id = m.conversation_id and cm.user_id = me.uid
    where m.conversation_id = conv.id
  ) stats on true
  order by (r.relationship = 'bond') desc, last_message.created_at desc nulls last, p.first_name;
$$;

revoke execute on function public.bonds_overview() from public, anon;
grant execute on function public.bonds_overview() to authenticated;

-- Incoming requests waiting on the viewer: circle connections and bond invites.
create or replace function public.pending_requests()
returns table (
  kind text,
  request_id uuid,
  user_id uuid,
  first_name text,
  avatar_url text,
  chapter_slug text,
  phase text,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from (
    select
      'connection'::text,
      c.id,
      p.id,
      p.first_name,
      p.avatar_url,
      held.chapter_slug,
      held.phase,
      c.created_at
    from public.connections c
    join public.profiles p on p.id = c.requester_id
    left join lateral (
      select uc.chapter_slug, uc.phase from public.user_chapters uc
      where uc.user_id = p.id and uc.status = 'open'
      order by uc.opened_at
      limit 1
    ) held on true
    where c.addressee_id = (select auth.uid()) and c.status = 'pending'
    union all
    select
      'bond'::text,
      b.id,
      p.id,
      p.first_name,
      p.avatar_url,
      held.chapter_slug,
      held.phase,
      b.created_at
    from public.bonds b
    join public.profiles p on p.id = b.inviter_id
    left join lateral (
      select uc.chapter_slug, uc.phase from public.user_chapters uc
      where uc.user_id = p.id and uc.status = 'open'
      order by uc.opened_at
      limit 1
    ) held on true
    where b.invitee_id = (select auth.uid()) and b.status = 'pending'
  ) requests (kind, request_id, user_id, first_name, avatar_url, chapter_slug, phase, created_at)
  order by created_at desc
  limit 50;
$$;

revoke execute on function public.pending_requests() from public, anon;
grant execute on function public.pending_requests() to authenticated;

-- People who hold one of the viewer's open chapters and have no connection or
-- live bond with them yet, most mutual connections first. Security definer so
-- it can count mutual connections (rows the viewer can't read); it only
-- returns public profile fields and faces from the viewer's own circle.
create or replace function public.people_you_may_know(p_limit integer default 10)
returns table (
  user_id uuid,
  first_name text,
  avatar_url text,
  phase text,
  shared_chapter text,
  mutual_count integer,
  mutual_avatars text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select (select auth.uid()) as uid
  ),
  my_circle as (
    select case when c.requester_id = me.uid then c.addressee_id else c.requester_id end as friend
    from public.connections c
    cross join me
    where c.status = 'accepted' and me.uid in (c.requester_id, c.addressee_id)
  ),
  candidates as (
    select distinct on (theirs.user_id)
      theirs.user_id,
      theirs.chapter_slug,
      theirs.phase
    from public.user_chapters mine
    cross join me
    join public.user_chapters theirs
      on theirs.chapter_slug = mine.chapter_slug
      and theirs.status = 'open'
      and theirs.user_id <> me.uid
    where mine.user_id = me.uid
      and mine.status = 'open'
      and not exists (
        select 1 from public.connections c
        where c.user_low = least(me.uid, theirs.user_id)
          and c.user_high = greatest(me.uid, theirs.user_id)
      )
      and not exists (
        select 1 from public.bonds b
        where b.status in ('pending', 'active')
          and b.user_low = least(me.uid, theirs.user_id)
          and b.user_high = greatest(me.uid, theirs.user_id)
      )
    -- Prefer the chapter where they're at the viewer's own stage.
    order by theirs.user_id, (theirs.phase = mine.phase) desc
  )
  select
    p.id,
    p.first_name,
    p.avatar_url,
    candidate.phase,
    candidate.chapter_slug,
    coalesce(mutual.n, 0),
    coalesce(mutual.avatars, '{}')
  from candidates candidate
  join public.profiles p on p.id = candidate.user_id
  left join lateral (
    select
      count(*)::integer as n,
      (array_agg(friend_profile.avatar_url) filter (where friend_profile.avatar_url is not null))[1:4] as avatars
    from public.connections c
    join my_circle mc
      on mc.friend = case when c.requester_id = candidate.user_id then c.addressee_id else c.requester_id end
    join public.profiles friend_profile on friend_profile.id = mc.friend
    where c.status = 'accepted' and candidate.user_id in (c.requester_id, c.addressee_id)
  ) mutual on true
  where (select uid from me) is not null
  order by coalesce(mutual.n, 0) desc, p.created_at desc
  limit least(greatest(p_limit, 1), 20);
$$;

revoke execute on function public.people_you_may_know(integer) from public, anon;
grant execute on function public.people_you_may_know(integer) to authenticated;
