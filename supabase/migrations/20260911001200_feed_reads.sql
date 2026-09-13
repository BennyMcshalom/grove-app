-- Read helpers for the feed, a space's people and its anonymous questions.
-- All run as the caller, so posts/profiles RLS still decides what comes back;
-- they only add the joins and per-viewer flags PostgREST can't express.

-- One page of posts, newest first.
--   p_scope 'all'   — everything the viewer may see (home feed)
--           'roots' — a space's posts from the viewer, their circle, or anonymous
--           'open'  — named people outside the circle at the viewer's stage
--           'mine'  — the viewer's own posts, anonymous ones included
-- Page with p_before / p_before_id from the last row of the previous page.
create or replace function public.feed_posts(
  p_scope text default 'all',
  p_chapter_slug text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_before timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 20,
  -- Narrows to one post, for permalinks. Use with p_scope 'all'.
  p_post_id uuid default null
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
        select jsonb_agg(jsonb_build_object('kind', m.kind, 'path', m.storage_path) order by m.position)
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
      else false
    end
  order by p.created_at desc, p.id desc
  limit least(greatest(p_limit, 1), 50);
$$;

revoke execute on function public.feed_posts(text, text, timestamptz, timestamptz, timestamptz, uuid, integer, uuid)
  from public, anon;
grant execute on function public.feed_posts(text, text, timestamptz, timestamptz, timestamptz, uuid, integer, uuid)
  to authenticated;

-- Everyone else holding a space open, circle first, with where the viewer
-- stands with each of them (for Connect and "Enter Grouv").
create or replace function public.space_members(p_chapter_slug text)
returns table (
  user_id uuid,
  first_name text,
  avatar_url text,
  aura public.aura,
  phase text,
  in_circle boolean,
  connection_status public.connection_status,
  connection_from_me boolean,
  bond_status public.bond_status
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
    uc.phase,
    private.in_circle(p.id),
    c.status,
    c.requester_id = (select auth.uid()),
    (
      select b.status from public.bonds b
      where b.status in ('pending', 'active')
        and b.user_low = least(p.id, (select auth.uid()))
        and b.user_high = greatest(p.id, (select auth.uid()))
      limit 1
    )
  from public.user_chapters uc
  join public.profiles p on p.id = uc.user_id
  left join public.connections c
    on c.user_low = least(p.id, (select auth.uid()))
    and c.user_high = greatest(p.id, (select auth.uid()))
  where uc.chapter_slug = p_chapter_slug
    and uc.status = 'open'
    and uc.user_id <> (select auth.uid())
  order by private.in_circle(p.id) desc, uc.opened_at desc
  limit 100;
$$;

revoke execute on function public.space_members(text) from public, anon;
grant execute on function public.space_members(text) to authenticated;

-- A space's live anonymous questions. reply_count is what the viewer may see:
-- every reply for the asker, only their own for anyone else.
create or replace function public.live_space_questions(p_chapter_slug text)
returns table (
  id uuid,
  body text,
  expires_at timestamptz,
  created_at timestamptz,
  is_mine boolean,
  reply_count integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    q.id,
    q.body,
    q.expires_at,
    q.created_at,
    private.owns('space_questions', q.id),
    (select count(*)::integer from public.space_question_replies r where r.question_id = q.id)
  from public.space_questions q
  where q.chapter_slug = p_chapter_slug and q.expires_at > now()
  order by q.created_at desc
  limit 50;
$$;

revoke execute on function public.live_space_questions(text) from public, anon;
grant execute on function public.live_space_questions(text) to authenticated;
