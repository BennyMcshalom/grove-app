-- New Home + Spaces, Phase 1 (handoff "Grouv New Direction", 2026-11-19).
--
-- Additive only: a new feed function beside feed_posts (which the legacy
-- Home and Spaces keep using), a Hide list, and the screens' ranking.
--
--   For You    endless, ranked: Space relevance 35%, freshness 25%,
--              discussion quality 20%, connection affinity 15%, exploration 5%.
--              Freshness decays (0.5 ^ (age_hours / 48)); nothing expires.
--              An Unfinished story's newest update counts as its age.
--              No more than two posts per author near each other (a third
--              and later post from the same person is halved each time).
--   Following  accepted connections (and Bonds) plus Unfinished stories you
--              follow, newest activity first. No recommendations.
--   Space      one Space (optionally one subhub/topic), ranked as For You.
--
-- Safety and access come before ranking: RLS decides what the reader may see;
-- posts they hid, and posts reported by three or more people that moderation
-- hasn't cleared, never enter the list.

-- A subhub (topic) is optional on any post, not only on the three formats:
-- "Space: Relationships · Subhub: Family" works for a Regular post too.
alter table public.posts drop constraint if exists posts_topic_needs_conversation;

-- ---------------------------------------------------------------------------
-- Hide (the ⋯ menu)
-- ---------------------------------------------------------------------------

create table public.post_hides (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table public.post_hides enable row level security;

create policy "People see what they hid"
  on public.post_hides for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "People hide posts"
  on public.post_hides for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "People unhide posts"
  on public.post_hides for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy two_step on public.post_hides as restrictive for all to authenticated
  using ((select private.two_step_satisfied())) with check ((select private.two_step_satisfied()));

revoke all on public.post_hides from anon;
grant select, insert, delete on public.post_hides to authenticated;

-- ---------------------------------------------------------------------------
-- Ranking helpers (definer: reports and keeps aren't readable by everyone)
-- ---------------------------------------------------------------------------

-- Reported by three or more people and still waiting for moderation.
create or replace function private.post_flagged(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (
    select count(distinct r.reporter_id) from public.reports r
    where r.target_type = 'post' and r.target_id = p_post_id and r.status in ('open', 'reviewing')
  ) >= 3;
$$;

-- 0..1. Distinct people who replied, keeps and roots, on a log scale, so a
-- long back-and-forth between two people (or a pile-on) doesn't run away.
create or replace function private.discussion_quality(p_post_id uuid, p_author_id uuid, p_roots integer)
returns double precision
language sql
stable
security definer
set search_path = ''
as $$
  select least(
    1.0,
    ln(
      1
      + (select count(distinct c.author_id) from public.comments c
         where c.post_id = p_post_id and c.author_id is distinct from p_author_id)
      + 1.5 * (select count(*) from public.kept_posts k where k.post_id = p_post_id)
      + 0.5 * coalesce(p_roots, 0)
    ) / ln(31)
  );
$$;

-- A new contributor: joined in the last 14 days or has posted five times or
-- fewer. Guides are never "new".
create or replace function private.author_is_new(p_author_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (select 1 from public.guides g where g.user_id = p_author_id)
    and (
      exists (select 1 from public.profiles pr where pr.id = p_author_id and pr.created_at > now() - interval '14 days')
      or (select count(*) from public.posts p where p.author_id = p_author_id) <= 5
    );
$$;

revoke all on function private.post_flagged(uuid) from public, anon;
revoke all on function private.discussion_quality(uuid, uuid, integer) from public, anon;
revoke all on function private.author_is_new(uuid) from public, anon;
grant execute on function private.post_flagged(uuid) to authenticated;
grant execute on function private.discussion_quality(uuid, uuid, integer) to authenticated;
grant execute on function private.author_is_new(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The feed
-- ---------------------------------------------------------------------------
-- Cursor: For You and Space page on (score, id) with the first page's p_as_of
-- held fixed, so scores don't drift between pages; Following on (activity, id).
-- reason: why it's here, for "Why am I seeing this?" —
--   connection | space | new_voice | discussion | public | following_story

create or replace function public.conversation_feed(
  p_view text default 'for_you',
  p_chapter_slug text default null,
  p_topic text default null,
  p_as_of timestamptz default null,
  p_cursor_score double precision default null,
  p_cursor_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 15
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
  updates jsonb,
  score double precision,
  reason text,
  activity_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  with v as (
    select (select auth.uid()) as uid, coalesce(p_as_of, now()) as as_of
  ),
  base as (
    select
      p.*,
      greatest(
        p.created_at,
        coalesce((select max(u.created_at) from public.post_updates u where u.post_id = p.id), p.created_at)
      ) as activity_at,
      (p.author_id is not null and not p.is_anonymous
        and (private.in_circle(p.author_id) or private.is_bonded(p.author_id))) as is_close,
      private.holds_chapter(p.chapter_slug) as in_space,
      exists (select 1 from public.story_follows f where f.post_id = p.id and f.user_id = v.uid) as followed
    from public.posts p
    cross join v
    where p.created_at <= v.as_of
      and not exists (select 1 from public.post_hides h where h.post_id = p.id and h.user_id = v.uid)
      and not private.post_flagged(p.id)
      and (p_chapter_slug is null or p.chapter_slug = p_chapter_slug)
      and (p_topic is null or p.topic = p_topic)
      and case p_view
        when 'following' then
          not private.owns('posts', p.id)
          and (
            (p.author_id is not null and not p.is_anonymous
              and (private.in_circle(p.author_id) or private.is_bonded(p.author_id)))
            or exists (select 1 from public.story_follows f where f.post_id = p.id and f.user_id = v.uid)
          )
        when 'for_you' then p.created_at > v.as_of - interval '30 days'
        when 'space' then p_chapter_slug is not null and p.created_at > v.as_of - interval '90 days'
        else false
      end
  ),
  scored as (
    select
      b.*,
      case when b.in_space or p_view = 'space' then 1.0 else 0.25 end as relevance,
      power(0.5, greatest(extract(epoch from v.as_of - b.activity_at), 0) / 3600.0 / 48.0) as freshness,
      private.discussion_quality(b.id, b.author_id, b.roots_count) as discussion,
      case when b.is_close then 1.0 else 0.0 end as affinity,
      case when b.author_id is not null and not b.is_anonymous and private.author_is_new(b.author_id) then 1.0 else 0.0 end as exploration
    from base b
    cross join v
  ),
  weighted as (
    select
      s.*,
      0.35 * s.relevance + 0.25 * s.freshness + 0.20 * s.discussion + 0.15 * s.affinity + 0.05 * s.exploration as raw_score
    from scored s
  ),
  ranked as (
    select
      w.*,
      w.raw_score * power(
        0.5::float8,
        greatest(
          row_number() over (partition by coalesce(w.author_id, w.id) order by w.raw_score desc, w.id desc) - 2,
          0
        )
      ) as final_score
    from weighted w
  )
  select
    r.id,
    r.chapter_slug,
    r.kind,
    r.title,
    r.progress,
    r.body,
    r.is_anonymous,
    r.open_grove,
    r.comments_count,
    r.created_at,
    r.author_id,
    author.first_name,
    author.avatar_url,
    author_chapter.phase,
    private.owns('posts', r.id),
    exists (select 1 from public.post_roots pr where pr.post_id = r.id and pr.user_id = v.uid),
    coalesce(
      (
        select jsonb_agg(jsonb_build_object('kind', m.kind, 'path', m.storage_path, 'trim_start', m.trim_start, 'trim_end', m.trim_end, 'width', m.width, 'height', m.height) order by m.position)
        from public.post_media m
        where m.post_id = r.id
      ),
      '[]'::jsonb
    ),
    r.audience,
    r.conversation,
    r.topic,
    exists (select 1 from public.kept_posts k where k.post_id = r.id and k.user_id = v.uid),
    r.followed,
    coalesce(
      (
        select jsonb_agg(jsonb_build_object('id', u.id, 'body', u.body, 'created_at', u.created_at) order by u.created_at)
        from public.post_updates u
        where u.post_id = r.id
      ),
      '[]'::jsonb
    ),
    r.final_score,
    case
      when p_view = 'following' then case when r.is_close then 'connection' else 'following_story' end
      when r.affinity = 1 then 'connection'
      when r.in_space and p_view <> 'space' then 'space'
      when r.exploration = 1 then 'new_voice'
      when r.discussion >= 0.4 then 'discussion'
      else 'public'
    end,
    r.activity_at
  from ranked r
  cross join v
  left join public.profiles author on author.id = r.author_id
  left join public.user_chapters author_chapter
    on author_chapter.user_id = r.author_id
    and author_chapter.chapter_slug = r.chapter_slug
    and author_chapter.status = 'open'
  where case
    when p_view = 'following' then
      p_cursor_at is null
      or (r.activity_at, r.id) < (p_cursor_at, coalesce(p_cursor_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))
    else
      p_cursor_score is null
      or (r.final_score, r.id) < (p_cursor_score, coalesce(p_cursor_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))
  end
  order by
    case when p_view <> 'following' then r.final_score end desc nulls last,
    case when p_view = 'following' then r.activity_at end desc nulls last,
    r.id desc
  limit least(greatest(p_limit, 1), 30);
$$;

revoke execute on function public.conversation_feed(text, text, text, timestamptz, double precision, timestamptz, uuid, integer) from public, anon;
grant execute on function public.conversation_feed(text, text, text, timestamptz, double precision, timestamptz, uuid, integer) to authenticated;
