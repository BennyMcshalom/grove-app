-- Conversation types (2026-11-09), part 2.
--
-- "Root a thought" can now say what kind of conversation it starts, and a
-- topic inside its Space (Relationships → Family):
--   Unspoken   — what people rarely say.        Relate · Respond · Keep
--   Unfiltered — what people really think.      Agree · Another perspective · Keep
--   Unfinished — what people are still figuring out.  Respond · Follow story
-- Relate and Agree are the post's Root under another name, and Respond /
-- Another perspective are its comments, so nothing about those changes.
-- The type is optional: posts without one, and Just Grouv, work as before.
--
-- New here:
--   * Keep — save a post to your Kept list (kept_posts).
--   * Follow story — follow an Unfinished post (story_follows); its author
--     adds updates (post_updates) and followers are notified.
--   * A post you kept or follow stays readable to you after the 48 hours,
--     as long as it was shared with Everyone and neither of you blocked the
--     other. Nobody can keep a post they couldn't already see.

create type public.post_conversation as enum ('unspoken', 'unfiltered', 'unfinished');

alter table public.posts
  add column if not exists conversation public.post_conversation,
  add column if not exists topic text check (topic ~ '^[a-z][a-z-]{0,39}$');

alter table public.posts
  add constraint posts_conversation_is_a_root check (conversation is null or kind = 'root'),
  add constraint posts_topic_needs_conversation check (topic is null or conversation is not null);

-- ---------------------------------------------------------------------------
-- Keep
-- ---------------------------------------------------------------------------

create table if not exists public.kept_posts (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists kept_posts_by_post on public.kept_posts (post_id);

alter table public.kept_posts enable row level security;

create policy "People see what they kept"
  on public.kept_posts for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "People keep posts they can see"
  on public.kept_posts for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.posts p where p.id = post_id)
  );

create policy "People let go of what they kept"
  on public.kept_posts for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy two_step on public.kept_posts as restrictive for all to authenticated
  using ((select private.two_step_satisfied())) with check ((select private.two_step_satisfied()));

revoke all on public.kept_posts from anon;
grant select, insert, delete on public.kept_posts to authenticated;

-- ---------------------------------------------------------------------------
-- Follow story
-- ---------------------------------------------------------------------------

create table if not exists public.story_follows (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists story_follows_by_post on public.story_follows (post_id);

alter table public.story_follows enable row level security;

create policy "People see the stories they follow"
  on public.story_follows for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Only Unfinished posts are stories, and nobody follows their own.
create policy "People follow stories they can see"
  on public.story_follows for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.posts p
      where p.id = post_id
        and p.conversation = 'unfinished'
        and not private.owns('posts', p.id)
    )
  );

create policy "People unfollow stories"
  on public.story_follows for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy two_step on public.story_follows as restrictive for all to authenticated
  using ((select private.two_step_satisfied())) with check ((select private.two_step_satisfied()));

revoke all on public.story_follows from anon;
grant select, insert, delete on public.story_follows to authenticated;

create table if not exists public.post_updates (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists post_updates_by_post on public.post_updates (post_id, created_at);

alter table public.post_updates enable row level security;

-- Whoever can see the post sees its updates.
create policy "Updates follow their post"
  on public.post_updates for select
  to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));

-- The author, on an Unfinished post (up to 30 updates, see the trigger below;
-- a policy can't count rows of its own table).
create policy "Authors add updates to their stories"
  on public.post_updates for insert
  to authenticated
  with check (
    private.owns('posts', post_id)
    and exists (select 1 from public.posts p where p.id = post_id and p.conversation = 'unfinished')
  );

create or replace function private.cap_story_updates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.post_updates u where u.post_id = new.post_id) >= 30 then
    raise exception 'A story can have up to 30 updates' using errcode = 'check_violation', hint = 'too_many_updates';
  end if;
  return new;
end;
$$;

create trigger post_updates_cap
  before insert on public.post_updates
  for each row execute function private.cap_story_updates();

create policy "Authors remove their updates"
  on public.post_updates for delete
  to authenticated
  using (private.owns('posts', post_id));

create policy two_step on public.post_updates as restrictive for all to authenticated
  using ((select private.two_step_satisfied())) with check ((select private.two_step_satisfied()));

revoke all on public.post_updates from anon;
grant select, insert, delete on public.post_updates to authenticated;

-- Followers hear about each update. An anonymous author stays anonymous.
create or replace function private.notify_story_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  story public.posts;
  follower record;
begin
  select * into story from public.posts where id = new.post_id;
  if not found then
    return new;
  end if;

  for follower in select f.user_id from public.story_follows f where f.post_id = new.post_id loop
    if story.author_id is not null and private.blocked_between(follower.user_id, story.author_id) then
      continue;
    end if;
    perform private.notify(
      follower.user_id,
      'story_update',
      story.author_id,
      new.post_id,
      jsonb_build_object(
        'excerpt', left(regexp_replace(new.body, '\s+', ' ', 'g'), 140),
        'anonymous', story.is_anonymous
      )
    );
  end loop;
  return new;
end;
$$;

create trigger post_updates_notify_followers
  after insert on public.post_updates
  for each row execute function private.notify_story_update();

-- ---------------------------------------------------------------------------
-- Kept and followed posts stay readable
-- ---------------------------------------------------------------------------

create or replace function private.holds_on_to(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.kept_posts k where k.post_id = p_post_id and k.user_id = (select auth.uid())
  ) or exists (
    select 1 from public.story_follows f where f.post_id = p_post_id and f.user_id = (select auth.uid())
  );
$$;

revoke all on function private.holds_on_to(uuid) from public, anon;
grant execute on function private.holds_on_to(uuid) to authenticated;

-- As 20261024100000, plus the last clause.
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
      )
    )
  );

-- ---------------------------------------------------------------------------
-- The feed: type, topic, Keep, Follow and updates; and a "kept" scope
-- ---------------------------------------------------------------------------

drop function public.feed_posts(text, text, timestamptz, timestamptz, timestamptz, uuid, integer, uuid, double precision, uuid);

create function public.feed_posts(
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

-- ---------------------------------------------------------------------------
-- The signed-out post page shows the type, topic and story updates too
-- ---------------------------------------------------------------------------

drop function public.public_post(uuid);

create function public.public_post(p_post_id uuid)
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
  media jsonb,
  conversation public.post_conversation,
  topic text,
  updates jsonb
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
    ),
    p.conversation,
    p.topic,
    coalesce(
      (
        select jsonb_agg(jsonb_build_object('id', u.id, 'body', u.body, 'created_at', u.created_at) order by u.created_at)
        from public.post_updates u
        where u.post_id = p.id
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
