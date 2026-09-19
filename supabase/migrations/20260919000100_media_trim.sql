-- Where a posted clip starts and ends.
--
-- Trimming happens in the composer without re-encoding: the whole file is
-- uploaded and these two columns say which part to play. Browsers take the
-- range as a media fragment, so no server-side processing is involved.

alter table public.post_media
  add column trim_start numeric(10, 3) check (trim_start >= 0),
  add column trim_end numeric(10, 3) check (trim_end > 0),
  add constraint post_media_trim_order check (trim_end is null or trim_start is null or trim_end > trim_start),
  -- Only a clip has a range to play.
  add constraint post_media_trim_video_only
    check (kind = 'video' or (trim_start is null and trim_end is null));

-- The feed hands that range to the player alongside the path. Recreated
-- whole because a function body cannot be patched in place.
create or replace function public.feed_posts(
  p_scope text default 'all',
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
  roots_count integer,
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
    p.roots_count,
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
        select jsonb_agg(jsonb_build_object('kind', m.kind, 'path', m.storage_path, 'trim_start', m.trim_start, 'trim_end', m.trim_end) order by m.position)
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
      p_before is null
      or (p.created_at, p.id) < (p_before, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))
    )
    and case p_scope
      when 'all' then true
      when 'mine' then private.owns('posts', p.id)
      when 'roots' then p.author_id is null or p.author_id = v.uid or private.in_circle(p.author_id)
      when 'open' then
        p.author_id is not null
        and p.author_id <> v.uid
        and not private.in_circle(p.author_id)
        and author_chapter.phase = v.phase
        and (p_within_km is null or private.km_from_me(p.author_id) <= p_within_km)
      else false
    end
  order by p.created_at desc, p.id desc
  limit least(greatest(p_limit, 1), 50);
$$;
