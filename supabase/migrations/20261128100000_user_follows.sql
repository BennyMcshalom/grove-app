-- Follow people (2026-11-28).
--
-- Connect and Bonds are hidden in the app, so profiles get Follow instead:
-- one-way, instant, no request to accept. You see who you follow and who
-- follows you; nobody else does. You can't follow someone you've blocked or
-- who blocked you, and a block ends any follow between the two of you.
--
-- For You treats someone you follow like a connection (the affinity part of
-- the score), so their posts rank a little higher. Connections and Bonds
-- still count, so nobody loses anything. The rest of conversation_feed is
-- unchanged from 20261126100000.

create table if not exists public.user_follows (
  follower_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index if not exists user_follows_by_followee on public.user_follows (followee_id);

alter table public.user_follows enable row level security;

create policy "People see who they follow and who follows them"
  on public.user_follows for select
  to authenticated
  using (follower_id = (select auth.uid()) or followee_id = (select auth.uid()));

create policy "People follow onboarded people they haven't blocked"
  on public.user_follows for insert
  to authenticated
  with check (
    follower_id = (select auth.uid())
    and not private.blocked_between(follower_id, followee_id)
    and exists (select 1 from public.profiles p where p.id = followee_id and p.onboarded_at is not null)
  );

create policy "People unfollow"
  on public.user_follows for delete
  to authenticated
  using (follower_id = (select auth.uid()));

grant select, insert, delete on public.user_follows to authenticated;

-- A block ends the follow both ways.
create or replace function private.unfollow_on_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.user_follows
  where (follower_id = new.blocker_id and followee_id = new.blocked_id)
     or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  return new;
end;
$$;

revoke execute on function private.unfollow_on_block() from public, anon, authenticated;

drop trigger if exists blocks_end_follows on public.blocks;
create trigger blocks_end_follows
  after insert on public.blocks
  for each row execute function private.unfollow_on_block();

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
        and (private.in_circle(p.author_id) or private.is_bonded(p.author_id)
          or exists (select 1 from public.user_follows uf where uf.follower_id = v.uid and uf.followee_id = p.author_id))) as is_close,
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
          p.conversation = 'unfinished'
          and exists (select 1 from public.story_follows f where f.post_id = p.id and f.user_id = v.uid)
        when 'for_you' then p.created_at > v.as_of - interval '30 days'
        when 'space' then p_chapter_slug is not null and p.created_at > v.as_of - interval '90 days'
        else false
      end
  ),
  scored as (
    select
      b.*,
      case when b.in_space or p_view = 'space' then 1.0 else 0.25 end as relevance,
      power(0.5, greatest(extract(epoch from v.as_of - b.activity_at), 0) / 3600.0 / 18.0) as freshness,
      private.discussion_quality(b.id, b.author_id, b.roots_count) as discussion,
      case when b.is_close then 1.0 else 0.0 end as affinity,
      case when b.author_id is not null and not b.is_anonymous and private.author_is_new(b.author_id) then 1.0 else 0.0 end as exploration
    from base b
    cross join v
  ),
  weighted as (
    select
      s.*,
      (0.4 + 0.6 * (0.35 * s.relevance + 0.20 * s.discussion + 0.15 * s.affinity + 0.05 * s.exploration) / 0.75) * s.freshness as raw_score
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
      when p_view = 'following' then 'following_story'
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
