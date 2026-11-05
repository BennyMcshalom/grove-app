-- Shared post links open signed out (2026-11-05).
--
-- A link to a post (grouv.app/posts/<id>) used to send anyone signed out to
-- sign-in. Now, like X, a signed-out visitor reads the post, its counts and
-- the start of the conversation (the first few comments); the rest of the
-- thread, rooting and replying need an account.
--
-- Only named posts shared with "Everyone" can be read this way: anonymous
-- posts and posts kept to Selected Bonds or Only me never are. Posts written
-- before today were promised "your circle and everyone in this Space", so
-- they stay closed (link_public is false for every existing row) until their
-- author shares one themselves (share_post_link below). New posts default to
-- readable by link, and the composer now says so.
--
-- Everything here is read through two SECURITY DEFINER functions that return
-- only what the page shows; anon still has no access to the tables.

alter table public.posts add column if not exists link_public boolean not null default false;
alter table public.posts alter column link_public set default true;

-- One rule for "anyone with the link may read this".
create or replace function private.post_link_is_public(p public.posts)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p.link_public
    and p.audience = 'everyone'
    and not p.is_anonymous
    and p.author_id is not null;
$$;

-- The post as a signed-out visitor sees it. Media paths come back so the
-- server can sign them with the secret key; they never reach the browser.
create or replace function public.public_post(p_post_id uuid)
returns table (
  id uuid,
  chapter_slug text,
  chapter_name text,
  kind public.post_kind,
  title text,
  progress public.post_progress,
  body text,
  created_at timestamptz,
  author_name text,
  author_avatar text,
  author_phase text,
  roots_count integer,
  comments_count integer,
  media jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.chapter_slug,
    c.name,
    p.kind,
    p.title,
    p.progress,
    p.body,
    p.created_at,
    author.first_name,
    author.avatar_url,
    author_chapter.phase,
    p.roots_count,
    p.comments_count,
    coalesce(
      (
        select jsonb_agg(jsonb_build_object('kind', m.kind, 'path', m.storage_path, 'trim_start', m.trim_start, 'trim_end', m.trim_end, 'width', m.width, 'height', m.height) order by m.position)
        from public.post_media m
        where m.post_id = p.id
      ),
      '[]'::jsonb
    )
  from public.posts p
  join public.profiles author on author.id = p.author_id
  left join public.chapters c on c.slug = p.chapter_slug
  left join public.user_chapters author_chapter
    on author_chapter.user_id = p.author_id
    and author_chapter.chapter_slug = p.chapter_slug
    and author_chapter.status = 'open'
  where p.id = p_post_id
    and private.post_link_is_public(p);
$$;

revoke execute on function public.public_post(uuid) from public;
grant execute on function public.public_post(uuid) to anon, authenticated;

-- The start of the conversation: the first few top-level comments with words
-- in them, oldest first, and how many replies each has. Capped at 5 whatever
-- the caller asks, so the rest of the thread stays behind sign-up.
create or replace function public.public_post_comments(p_post_id uuid, p_limit integer default 3)
returns table (
  id uuid,
  author_name text,
  author_avatar text,
  body text,
  created_at timestamptz,
  roots_count integer,
  reply_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    cm.id,
    author.first_name,
    author.avatar_url,
    cm.body,
    cm.created_at,
    cm.roots_count,
    (select count(*)::integer from public.comments r where r.parent_id = cm.id)
  from public.posts p
  join public.comments cm on cm.post_id = p.id and cm.parent_id is null and cm.body is not null
  join public.profiles author on author.id = cm.author_id
  where p.id = p_post_id
    and private.post_link_is_public(p)
  order by cm.created_at, cm.id
  limit least(greatest(coalesce(p_limit, 3), 0), 5);
$$;

revoke execute on function public.public_post_comments(uuid, integer) from public;
grant execute on function public.public_post_comments(uuid, integer) to anon, authenticated;

-- Share on a post: when it's your own named "Everyone" post, sharing it opens
-- the link (this is how older posts become readable). Answers whether the
-- link opens signed out, for the note in the share sheet.
create or replace function public.share_post_link(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    return false;
  end if;

  update public.posts p
  set link_public = true
  where p.id = p_post_id
    and p.author_id = uid
    and p.audience = 'everyone'
    and not p.is_anonymous
    and not p.link_public;

  return exists (
    select 1 from public.posts p
    where p.id = p_post_id and private.post_link_is_public(p)
  );
end;
$$;

revoke execute on function public.share_post_link(uuid) from public, anon;
grant execute on function public.share_post_link(uuid) to authenticated;
