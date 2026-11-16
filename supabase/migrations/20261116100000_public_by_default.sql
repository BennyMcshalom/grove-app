-- Every post is public, and the feed is ranked (2026-11-16).
--
-- The composer no longer asks who can see a post (Selected Bonds, Everyone,
-- Anonymously, Open Grouv): a new post goes out to everyone on Grouv as soon
-- as it's posted. Home and a Space's Roots stop being "the last 48 hours,
-- newest first" and become a ranked feed: recent posts with more roots,
-- replies and keeps rise, and posts from your circle, your Bonds and your
-- Spaces get a lift.
--
-- Posts already shared were promised a narrower audience, so they keep it:
-- public_reach is false for every existing row and true for new ones (as
-- link_public and space_wide did). Anonymous posts and posts for selected
-- Bonds never reach everyone. Blocks apply both ways.

alter table public.posts add column if not exists public_reach boolean not null default false;
alter table public.posts alter column public_reach set default true;

comment on column public.posts.public_reach is
  'Reaches everyone on Grouv (named "Everyone" posts only). False for posts made before 2026-11-16.';

create index if not exists posts_public_recent on public.posts (created_at desc) where public_reach;

-- ---------------------------------------------------------------------------
-- Who can read a post: as 20261109100100, plus public posts.
-- ---------------------------------------------------------------------------

drop policy "Posts reach the audience their author chose" on public.posts;

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
        or (
          space_wide
          and not is_anonymous
          and author_id is not null
          and created_at > now() - interval '48 hours'
          and private.holds_chapter(chapter_slug)
          and not private.blocked_between((select auth.uid()), author_id)
        )
        or (
          private.holds_on_to(id)
          and (author_id is null or not private.blocked_between((select auth.uid()), author_id))
        )
        or (
          public_reach
          and not is_anonymous
          and author_id is not null
          and not private.blocked_between((select auth.uid()), author_id)
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- The ranking
-- ---------------------------------------------------------------------------

-- Engagement over age, with a lift for people and Spaces close to the reader.
-- An age-decayed score (as Hacker News and Reddit do): a new post with no
-- reactions still starts high, and a well-loved post stays up for days.
-- Keeps are counted here, as the definer, because a reader sees only their own.
create or replace function private.feed_score(
  p_post_id uuid,
  p_created_at timestamptz,
  p_roots integer,
  p_comments integer,
  p_close boolean,
  p_in_space boolean
)
returns double precision
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      1
      + coalesce(p_roots, 0)
      + 2 * coalesce(p_comments, 0)
      + 3 * (select count(*) from public.kept_posts k where k.post_id = p_post_id)
    )
    * (1 + case when p_close then 1.5 else 0 end + case when p_in_space then 0.5 else 0 end)
    / power(greatest(extract(epoch from now() - p_created_at), 0) / 3600 + 2, 1.5);
$$;

revoke all on function private.feed_score(uuid, timestamptz, integer, integer, boolean, boolean) from public, anon;
grant execute on function private.feed_score(uuid, timestamptz, integer, integer, boolean, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- The feed: as 20261109100100; home and roots add public posts from the last
-- 7 days and are ordered by the ranking. The other scopes stay newest first.
-- ---------------------------------------------------------------------------

create or replace function public.feed_posts(
  p_scope text default 'home',
  p_chapter_slug text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_before timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 20,
  p_post_id uuid default null,
  p_within_km double precision default null,
  p_author_id uuid default null
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
  audience public.audience,
  conversation public.post_conversation,
  topic text,
  kept boolean,
  following boolean,
  updates jsonb
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
    p.audience,
    p.conversation,
    p.topic,
    exists (select 1 from public.kept_posts k where k.post_id = p.id and k.user_id = v.uid),
    exists (select 1 from public.story_follows f where f.post_id = p.id and f.user_id = v.uid),
    coalesce(
      (
        select jsonb_agg(jsonb_build_object('id', u.id, 'body', u.body, 'created_at', u.created_at) order by u.created_at)
        from public.post_updates u
        where u.post_id = p.id
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
      when 'kept' then exists (select 1 from public.kept_posts k where k.post_id = p.id and k.user_id = v.uid)
      when 'person' then
        p.author_id = p_author_id
        and not p.is_anonymous
      when 'home' then
        (
          p.created_at > now() - interval '48 hours'
          and (
            private.owns('posts', p.id)
            or (p.author_id is not null and (private.in_circle(p.author_id) or private.is_bonded(p.author_id)))
            or (p.author_id is null and private.owner_is_close('posts', p.id))
            or (
              (p.space_wide or p.open_grove)
              and p.audience = 'everyone'
              and p.author_id is not null
              and private.holds_chapter(p.chapter_slug)
              and not private.blocked_between(v.uid, p.author_id)
            )
          )
        )
        or (
          p.public_reach
          and p.audience = 'everyone'
          and not p.is_anonymous
          and p.author_id is not null
          and p.created_at > now() - interval '7 days'
          and not private.blocked_between(v.uid, p.author_id)
        )
      when 'roots' then
        (
          p.created_at > now() - interval '48 hours'
          and (
            private.owns('posts', p.id)
            or (p.author_id is not null and (private.in_circle(p.author_id) or private.is_bonded(p.author_id)))
            or (p.author_id is null and private.owner_is_close('posts', p.id))
            or (
              (p.space_wide or p.open_grove)
              and p.audience = 'everyone'
              and p.author_id is not null
              and private.holds_chapter(p.chapter_slug)
              and not private.blocked_between(v.uid, p.author_id)
            )
          )
        )
        or (
          p.public_reach
          and p.audience = 'everyone'
          and not p.is_anonymous
          and p.author_id is not null
          and p.created_at > now() - interval '7 days'
          and not private.blocked_between(v.uid, p.author_id)
        )
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
  order by
    case
      when p_scope in ('home', 'roots') then
        private.feed_score(
          p.id,
          p.created_at,
          p.roots_count,
          p.comments_count,
          private.owns('posts', p.id)
            or (p.author_id is not null and (private.in_circle(p.author_id) or private.is_bonded(p.author_id))),
          private.holds_chapter(p.chapter_slug)
        )
    end desc nulls last,
    p.created_at desc,
    p.id desc
  limit case when p_scope in ('home', 'roots') then 100 else least(greatest(p_limit, 1), 50) end;
$$;

revoke execute on function public.feed_posts(text, text, timestamptz, timestamptz, timestamptz, uuid, integer, uuid, double precision, uuid) from public, anon;
grant execute on function public.feed_posts(text, text, timestamptz, timestamptz, timestamptz, uuid, integer, uuid, double precision, uuid) to authenticated;
