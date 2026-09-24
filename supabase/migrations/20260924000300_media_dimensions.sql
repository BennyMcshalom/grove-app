-- Media keeps its space while it loads.
--
-- The composer now records each photo and video's pixel size when it is
-- attached (post_media.width / height already existed, but nothing filled
-- them). The feed returns them, so a card reserves the right shape before
-- the file arrives instead of jumping when it does. Older posts have none
-- and fall back to measuring the file once it loads.
--
-- Recreated whole: a function body can't be patched in place. The
-- signature and return type are unchanged.

create or replace function public.feed_posts(
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
  media jsonb
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
    )
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
