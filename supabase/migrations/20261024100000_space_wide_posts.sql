-- Posts reach everyone in their Space (2026-10-24).
--
-- Home only showed your own posts and your circle's, so someone new saw an
-- empty feed until they'd made friends. Now a named post shared with
-- "Everyone" also reaches everyone who holds that Space, for the same 48
-- hours, and Home shows them along with Open Grouv posts from your Spaces.
--
-- Posts already shared were promised "your whole Grouv circle", so they keep
-- that audience: space_wide is false for every existing row and true for new
-- ones. Anonymous posts stay with the circle. Blocks apply both ways.

alter table public.posts add column if not exists space_wide boolean not null default false;
alter table public.posts alter column space_wide set default true;

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
      )
    )
  );

-- Home and a Space's Roots tab: you, your connections, and now everyone in
-- your Spaces. Every other scope, column and rule is unchanged from
-- 20261001090000.
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
  audience public.audience
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
    p.audience
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
      when 'person' then
        p.author_id = p_author_id
        and not p.is_anonymous
      -- Home and a space's Roots tab, 48 hours: you, your connections, and
      -- everyone in your Spaces who shared to the whole Space or Open Grouv.
      when 'home' then
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
      when 'roots' then
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
  order by p.created_at desc, p.id desc
  limit case when p_scope in ('home', 'roots') then 100 else least(greatest(p_limit, 1), 50) end;
$$;

revoke execute on function public.feed_posts(text, text, timestamptz, timestamptz, timestamptz, uuid, integer, uuid, double precision, uuid) from public, anon;
grant execute on function public.feed_posts(text, text, timestamptz, timestamptz, timestamptz, uuid, integer, uuid, double precision, uuid) to authenticated;
