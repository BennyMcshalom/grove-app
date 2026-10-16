-- Testing feedback, 16 October: when one person released a Bond, the other
-- still saw it until they reloaded, and nothing told them where the Bond Log
-- went. The app now refreshes on Bond notifications; the chat also needs to
-- know about a released Bond to say so, so the Bonds rail carries the latest
-- released Bond between the two people.

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
  unread_count integer,
  blocked_by_me boolean,
  released_bond_id uuid,
  released_at timestamptz,
  released_by_me boolean
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
    coalesce(stats.unread, 0),
    exists (select 1 from public.blocks bl where bl.blocker_id = me.uid and bl.blocked_id = r.other),
    released.id,
    released.released_at,
    released.ended_by = me.uid
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
  -- The most recent Bond between you that one of you released.
  left join lateral (
    select rb.id, rb.released_at, rb.ended_by
    from public.bonds rb
    where rb.status = 'released'
      and rb.user_low = least(me.uid, r.other)
      and rb.user_high = greatest(me.uid, r.other)
    order by rb.released_at desc nulls last
    limit 1
  ) released on true
  left join public.conversation_members mine
    on mine.conversation_id = conv.id and mine.user_id = me.uid
  left join lateral (
    select m.body, m.kind, m.created_at, m.sender_id
    from public.messages m
    where m.conversation_id = conv.id
      and m.deleted_at is null
      and m.created_at > coalesce(mine.cleared_at, '-infinity'::timestamptz)
    order by m.created_at desc
    limit 1
  ) last_message on true
  left join lateral (
    select
      (count(*) filter (
        where m.sender_id <> me.uid
          and m.created_at > coalesce(mine.last_read_at, '-infinity'::timestamptz)
          and m.created_at > coalesce(mine.cleared_at, '-infinity'::timestamptz)
      ))::integer as unread
    from public.messages m
    where m.conversation_id = conv.id
  ) stats on true
  order by (r.relationship = 'bond') desc, br.rank nulls last, last_message.created_at desc nulls last, p.first_name;
$$;

revoke execute on function public.bonds_overview() from public, anon;
grant execute on function public.bonds_overview() to authenticated;
