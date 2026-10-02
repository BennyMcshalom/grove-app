-- Testing feedback, 2 Oct 2026:
--
-- 1. Chapter group cards are flat solid colours with line-art, not gradients.
--    Groups gain `art` (an illustration key, src/components/app/GroupArt.tsx)
--    and `color` opens up from Figma's eight pastels to any solid hex, so a
--    Space's groups can each take a different colour. Existing groups get a
--    random colour that's distinct within their Space and art for their Space.
-- 2. "Chapter groups" in the rail came up empty for people holding the
--    group's Space. group_cards(p_suggested) dropped every group the viewer had
--    joined, started or asked to join — so the creator, its members and anyone
--    waiting on approval saw "Groups in your chapters show up here." while
--    someone else in the same Space saw the group — and it never offered
--    groups started for "Any space" at all. Suggestions are now every group in
--    any of the viewer's open Spaces (plus "Any space" ones), the ones they
--    haven't joined first.
-- 3. Profiles gain `banner`: a key from the in-app banner set (solid colours
--    and drawn art, src/lib/banners.ts). Null is the default solid colour.

-- ---------------------------------------------------------------------------
-- Group art + solid colours
-- ---------------------------------------------------------------------------

alter table public.groups
  add column art text not null default 'sprout'
    check (art in (
      'crossroads', 'sprout', 'piggy-bank', 'summit', 'briefcase', 'heart-hands',
      'book', 'palette', 'compass', 'plane', 'house', 'stroller', 'sneaker',
      'lotus', 'lightbulb', 'handshake'
    ));

alter table public.groups drop constraint groups_color_check;
alter table public.groups alter column color set default '#F28C78';

-- The same sixteen flat colours as GROUP_PALETTE in src/lib/group-look.ts.
with palette as (
  select hex, n
  from unnest(array[
    '#F28C78', '#2BB3A3', '#E9B949', '#F49AC1', '#8E9BF0', '#7CC47F', '#F2A65A', '#5DADE2',
    '#C39BD3', '#E8E36B', '#4A7C8C', '#D9534F', '#3D5A98', '#A3C9A8', '#F7C8A0', '#8D6E63'
  ]) with ordinality as p (hex, n)
),
ranked as (
  select id, (row_number() over (partition by chapter_slug order by random()) - 1) % 16 + 1 as n
  from public.groups
)
update public.groups g
set
  color = palette.hex,
  art = case g.chapter_slug
    when 'career' then 'briefcase'
    when 'wealth' then 'piggy-bank'
    when 'health' then 'sneaker'
    when 'relationships' then 'heart-hands'
    when 'creative' then 'palette'
    when 'learning' then 'book'
    when 'spiritual' then 'lotus'
    when 'adventure' then 'compass'
    else 'crossroads'
  end
from ranked
join palette on palette.n = ranked.n
where ranked.id = g.id;

alter table public.groups
  add constraint groups_color_check check (color ~ '^#[0-9A-Fa-f]{6}$');

-- Admins change the look later (RLS "Admins edit their groups" still applies).
grant update (art) on public.groups to authenticated;

-- ---------------------------------------------------------------------------
-- group_cards: + art, and suggestions cover every group in the viewer's Spaces
-- ---------------------------------------------------------------------------

drop function public.group_cards(text, text, boolean, integer);

create function public.group_cards(
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
  art text,
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
    g.art,
    g.chapter_slug,
    g.join_policy,
    g.member_count,
    g.conversation_id,
    g.created_at,
    mine.role,
    req.pending,
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
  cross join lateral (
    select exists (
      select 1 from public.group_join_requests r
      where r.group_id = g.id and r.user_id = (select auth.uid()) and r.status = 'pending'
    ) as pending
  ) req
  where (p_slug is null or g.slug = p_slug)
    and (
      p_query is null
      or strpos(lower(g.title || ' ' || coalesce(g.label, '') || ' ' || coalesce(g.description, '')), lower(trim(p_query))) > 0
    )
    and (
      not p_suggested
      or g.chapter_slug is null
      or g.chapter_slug in (
        select uc.chapter_slug from public.user_chapters uc
        where uc.user_id = (select auth.uid()) and uc.status = 'open'
      )
    )
  order by
    -- Browsing: your groups first. Suggestions: the ones you could still join
    -- first, then those in one of your Spaces before "Any space" ones.
    case when p_suggested then mine.role is null and not req.pending else mine.role is not null end desc,
    case when p_suggested then g.chapter_slug is not null else true end desc,
    g.member_count desc,
    g.created_at desc
  limit least(greatest(p_limit, 1), 100);
$$;

revoke execute on function public.group_cards(text, text, boolean, integer) from public, anon;
grant execute on function public.group_cards(text, text, boolean, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Profile banner
-- ---------------------------------------------------------------------------

-- "color:<key>" or "art:<key>"; the app validates the key against its set.
alter table public.profiles
  add column banner text check (banner is null or banner ~ '^(color|art):[a-z0-9-]{1,40}$');
