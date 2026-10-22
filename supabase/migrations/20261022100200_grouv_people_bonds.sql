-- Someone's Grouv no longer shows other people's bonds (2026-10-22).
--
-- grouv_people labelled each face 'bond' or 'circle' and put bonds first, so
-- looking at a friend's profile told you which of your mutual friends they had
-- bonded with. Bonds are otherwise private to the pair. A face is now marked
-- 'bond' only when the viewer is one of the two people in it.

create or replace function public.grouv_people(p_user_id uuid)
returns table (user_id uuid, first_name text, avatar_url text, aura public.aura, relationship text)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select (select auth.uid()) as id),
  theirs as (
    select case when c.requester_id = p_user_id then c.addressee_id else c.requester_id end as id,
      exists (
        select 1 from public.bonds b
        where b.status = 'active'
          and b.user_low = least(c.requester_id, c.addressee_id)
          and b.user_high = greatest(c.requester_id, c.addressee_id)
      ) as bonded
    from public.connections c
    where c.status = 'accepted' and p_user_id in (c.requester_id, c.addressee_id)
  ),
  shown as (
    select t.id, t.bonded and me.id in (p_user_id, t.id) as bonded
    from theirs t
    cross join me
    where me.id is not null
      and not private.blocked_between(me.id, p_user_id)
      and not private.blocked_between(me.id, t.id)
      and (
        t.id = me.id
        or exists (
          select 1 from public.connections c
          where c.status = 'accepted'
            and c.user_low = least(me.id, t.id)
            and c.user_high = greatest(me.id, t.id)
        )
      )
  )
  select p.id, p.first_name, p.avatar_url, p.aura, case when s.bonded then 'bond' else 'circle' end
  from shown s
  cross join me
  join public.profiles p on p.id = s.id
  order by s.bonded desc, (s.id = me.id) desc, p.first_name
  limit 4;
$$;

revoke execute on function public.grouv_people(uuid) from public, anon;
grant execute on function public.grouv_people(uuid) to authenticated;
