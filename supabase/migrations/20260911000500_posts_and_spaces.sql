-- Posts, roots, comments, reports and a space's anonymous questions.
--
-- Anonymous content: a readable row can't hide one of its own columns, so the
-- real author of anything that may be anonymous is kept in
-- private.content_owners, which the Data API can't reach. The public row only
-- carries author_id when the author chose to be named.

create type public.post_kind as enum ('root', 'grouv');

-- Composer "Where are you with it?" chips.
create type public.post_progress as enum (
  'just_started',
  'in_progress',
  'in_the_thick_of_it',
  'almost_done',
  'wrapping_up',
  'starting_over'
);

create type public.media_kind as enum ('photo', 'video');

create type public.report_target as enum (
  'post',
  'comment',
  'message',
  'group',
  'event',
  'profile',
  'truth',
  'space_question'
);

create type public.report_reason as enum ('spam', 'harassment', 'inappropriate', 'other');
create type public.report_status as enum ('open', 'reviewing', 'actioned', 'dismissed');

-- ---------------------------------------------------------------------------
-- Hidden ownership
-- ---------------------------------------------------------------------------

create table private.content_owners (
  content_type text not null
    check (content_type in ('posts', 'space_questions', 'space_question_replies', 'truths')),
  content_id uuid not null,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  primary key (content_type, content_id)
);

create index content_owners_by_owner on private.content_owners (owner_id);

revoke all on private.content_owners from public, anon, authenticated;

create or replace function private.owns(p_type text, p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.content_owners o
    where o.content_type = p_type
      and o.content_id = p_id
      and o.owner_id = (select auth.uid())
  );
$$;

grant execute on function private.owns(text, uuid) to authenticated;

-- AFTER INSERT on an ownable table; TG_ARGV[0] is the table name.
create or replace function private.record_content_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Content must be created by a signed-in user'
      using errcode = 'insufficient_privilege';
  end if;

  insert into private.content_owners (content_type, content_id, owner_id)
  values (tg_argv[0], new.id, (select auth.uid()));
  return new;
end;
$$;

-- AFTER DELETE on an ownable table: drop the ownership row with it.
create or replace function private.forget_content_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from private.content_owners
  where content_type = tg_argv[0] and content_id = old.id;
  return old;
end;
$$;

-- Deleting an account cascades to its ownership rows; take the (possibly
-- anonymous) content with them.
create or replace function private.delete_owned_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  execute format('delete from public.%I where id = $1', old.content_type) using old.content_id;
  return old;
end;
$$;

create trigger content_owners_delete_content
  after delete on private.content_owners
  for each row execute function private.delete_owned_content();

-- ---------------------------------------------------------------------------
-- Posts
-- ---------------------------------------------------------------------------

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  -- Null when anonymous. Set by trigger, never by the client.
  author_id uuid references public.profiles (id) on delete cascade,
  chapter_slug text not null references public.chapters (slug) on update cascade,
  kind public.post_kind not null default 'root',
  -- "What are you doing right now?" (Root a thought only)
  title text check (char_length(title) <= 500),
  progress public.post_progress,
  -- "One honest thing about where you are", or the Just Grouv caption.
  body text check (char_length(body) <= 4000),
  is_anonymous boolean not null default false,
  roots_count integer not null default 0,
  comments_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (is_anonymous = (author_id is null)),
  check (kind = 'root' or (title is null and progress is null))
);

create index posts_by_chapter on public.posts (chapter_slug, created_at desc);
create index posts_by_author on public.posts (author_id, created_at desc);

create or replace function private.set_post_author()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.author_id := case when new.is_anonymous then null else (select auth.uid()) end;
  new.roots_count := 0;
  new.comments_count := 0;
  return new;
end;
$$;

create trigger posts_set_author
  before insert on public.posts
  for each row execute function private.set_post_author();

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function private.set_updated_at();

create trigger posts_record_owner
  after insert on public.posts
  for each row execute function private.record_content_owner('posts');

create trigger posts_forget_owner
  after delete on public.posts
  for each row execute function private.forget_content_owner('posts');

alter table public.messages
  add constraint messages_shared_post_id_fkey
  foreign key (shared_post_id) references public.posts (id) on delete cascade;

alter table public.posts enable row level security;

-- Your own posts, posts in spaces you hold, and named posts from your circle.
create policy "Posts are visible to their space and the author's circle"
  on public.posts for select
  to authenticated
  using (
    private.owns('posts', id)
    or private.holds_chapter(chapter_slug)
    or (author_id is not null and private.in_circle(author_id))
  );

create policy "Users post into spaces they hold"
  on public.posts for insert
  to authenticated
  with check (private.holds_chapter(chapter_slug));

-- Edit Post changes the words and the stage, nothing else.
revoke update on public.posts from authenticated;
grant update (title, progress, body) on public.posts to authenticated;

create policy "Authors edit their own posts"
  on public.posts for update
  to authenticated
  using (private.owns('posts', id))
  with check (private.owns('posts', id));

create policy "Authors delete their own posts"
  on public.posts for delete
  to authenticated
  using (private.owns('posts', id));

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  kind public.media_kind not null,
  -- Object path in the `media` storage bucket.
  storage_path text not null,
  position smallint not null default 0,
  width integer,
  height integer,
  duration_seconds integer check (duration_seconds >= 0),
  created_at timestamptz not null default now(),
  unique (post_id, position)
);

alter table public.post_media enable row level security;

create policy "Media is visible with its post"
  on public.post_media for select
  to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));

create policy "Authors attach media to their posts"
  on public.post_media for insert
  to authenticated
  with check (private.owns('posts', post_id));

create policy "Authors remove media from their posts"
  on public.post_media for delete
  to authenticated
  using (private.owns('posts', post_id));

-- ---------------------------------------------------------------------------
-- Roots (the one reaction) and comments
-- ---------------------------------------------------------------------------

create table public.post_roots (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index post_roots_by_user on public.post_roots (user_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text check (char_length(body) <= 2000),
  -- "Comment with photo".
  media_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (body is not null or media_path is not null)
);

create index comments_by_post on public.comments (post_id, created_at);

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function private.set_updated_at();

-- Denormalised counts; users can't write other people's posts, so the counter
-- runs as definer.
create or replace function private.bump_post_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := case when tg_op = 'INSERT' then new.post_id else old.post_id end;
  delta integer := case when tg_op = 'INSERT' then 1 else -1 end;
begin
  if tg_table_name = 'post_roots' then
    update public.posts set roots_count = greatest(roots_count + delta, 0) where id = target;
  else
    update public.posts set comments_count = greatest(comments_count + delta, 0) where id = target;
  end if;
  return null;
end;
$$;

create trigger post_roots_bump_count
  after insert or delete on public.post_roots
  for each row execute function private.bump_post_count();

create trigger comments_bump_count
  after insert or delete on public.comments
  for each row execute function private.bump_post_count();

alter table public.post_roots enable row level security;
alter table public.comments enable row level security;

create policy "Roots are visible with their post"
  on public.post_roots for select
  to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));

create policy "Users root posts they can see"
  on public.post_roots for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.posts p where p.id = post_id)
  );

create policy "Users unroot their own roots"
  on public.post_roots for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Comments are visible with their post"
  on public.comments for select
  to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));

create policy "Users comment on posts they can see"
  on public.comments for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (select 1 from public.posts p where p.id = post_id)
  );

revoke update on public.comments from authenticated;
grant update (body, media_path) on public.comments to authenticated;

create policy "Authors edit their own comments"
  on public.comments for update
  to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy "Authors and post owners delete comments"
  on public.comments for delete
  to authenticated
  using (author_id = (select auth.uid()) or private.owns('posts', post_id));

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_type public.report_target not null,
  target_id uuid not null,
  reason public.report_reason not null,
  details text check (char_length(details) <= 2000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

create index reports_open on public.reports (created_at) where status = 'open';

alter table public.reports enable row level security;

create policy "Users file reports as themselves"
  on public.reports for insert
  to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'open');

create policy "Users see their own reports"
  on public.reports for select
  to authenticated
  using (reporter_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- A space's anonymous questions ("Replies come back without names")
-- ---------------------------------------------------------------------------

create table public.space_questions (
  id uuid primary key default gen_random_uuid(),
  chapter_slug text not null references public.chapters (slug) on update cascade,
  body text not null check (char_length(body) between 1 and 1000),
  -- "Live for 7 days".
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);

create index space_questions_live on public.space_questions (chapter_slug, expires_at desc);

create trigger space_questions_record_owner
  after insert on public.space_questions
  for each row execute function private.record_content_owner('space_questions');

create trigger space_questions_forget_owner
  after delete on public.space_questions
  for each row execute function private.forget_content_owner('space_questions');

create table public.space_question_replies (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.space_questions (id) on delete cascade,
  body text check (char_length(body) <= 2000),
  -- "Record a reply": object path in the `media` bucket.
  audio_path text,
  duration_seconds integer check (duration_seconds >= 0),
  created_at timestamptz not null default now(),
  check (body is not null or audio_path is not null)
);

create index space_question_replies_by_question
  on public.space_question_replies (question_id, created_at);

create trigger space_question_replies_record_owner
  after insert on public.space_question_replies
  for each row execute function private.record_content_owner('space_question_replies');

create trigger space_question_replies_forget_owner
  after delete on public.space_question_replies
  for each row execute function private.forget_content_owner('space_question_replies');

alter table public.space_questions enable row level security;
alter table public.space_question_replies enable row level security;

create policy "Live questions are visible to their space"
  on public.space_questions for select
  to authenticated
  using (
    private.owns('space_questions', id)
    or (expires_at > now() and private.holds_chapter(chapter_slug))
  );

create policy "Users ask spaces they hold"
  on public.space_questions for insert
  to authenticated
  with check (private.holds_chapter(chapter_slug) and expires_at <= now() + interval '7 days');

create policy "Askers delete their own questions"
  on public.space_questions for delete
  to authenticated
  using (private.owns('space_questions', id));

-- Replies go back to the asker only (and stay visible to whoever replied).
create policy "Replies are visible to the asker and the replier"
  on public.space_question_replies for select
  to authenticated
  using (
    private.owns('space_question_replies', id)
    or private.owns('space_questions', question_id)
  );

create policy "Space members reply to live questions"
  on public.space_question_replies for insert
  to authenticated
  with check (
    exists (
      select 1 from public.space_questions q
      where q.id = question_id and q.expires_at > now()
    )
  );

create policy "Repliers delete their own replies"
  on public.space_question_replies for delete
  to authenticated
  using (private.owns('space_question_replies', id));
