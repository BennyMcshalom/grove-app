-- "Soma replied to your introduction" showed the moment Soma tapped Accept,
-- though Soma never wrote a word. A reply is a message: my_introductions now
-- says when each side last wrote in their direct chat, so Home can tell
-- "said yes" from "replied" and retire the card once you've answered.

drop function if exists public.my_introductions(integer);

create function public.my_introductions(p_limit integer default 20)
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
  responded_at timestamptz,
  their_message_at timestamptz,
  my_message_at timestamptz
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
    c.responded_at,
    chat.their_at,
    chat.my_at
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
  left join lateral (
    select
      max(m.created_at) filter (where m.sender_id = other.id) as their_at,
      max(m.created_at) filter (where m.sender_id = (select auth.uid())) as my_at
    from public.conversations conv
    join public.messages m on m.conversation_id = conv.id and m.deleted_at is null
    where c.status = 'accepted'
      and conv.direct_key = c.user_low::text || ':' || c.user_high::text
  ) chat on true
  where (select auth.uid()) in (c.requester_id, c.addressee_id)
    and c.intro_message is not null
    and not private.blocked_between(c.requester_id, c.addressee_id)
  order by coalesce(c.responded_at, c.created_at) desc
  limit least(greatest(p_limit, 1), 50);
$$;

revoke execute on function public.my_introductions(integer) from public, anon;
grant execute on function public.my_introductions(integer) to authenticated;
