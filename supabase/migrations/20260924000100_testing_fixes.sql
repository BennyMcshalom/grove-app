-- Fixes from the Grouv testing doc (2026-09-24).

-- Documents in chat (used from 20260924000200; a new enum value can't be used
-- in the transaction that adds it).
alter type public.message_kind add value if not exists 'file';

-- ---------------------------------------------------------------------------
-- Comments: one level of replies and a Root on each comment, as in Figma
-- (component "Comment": Root 22 · Reply · Hide 1 reply).
-- ---------------------------------------------------------------------------

alter table public.comments
  add column parent_id uuid references public.comments (id) on delete cascade,
  add column roots_count integer not null default 0;

create index comments_by_parent on public.comments (parent_id, created_at) where parent_id is not null;

-- A reply answers a top-level comment on the same post; replies don't nest.
create or replace function private.check_comment_parent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.parent_id is null then
    return new;
  end if;
  if not exists (
    select 1 from public.comments c
    where c.id = new.parent_id and c.post_id = new.post_id and c.parent_id is null
  ) then
    raise exception 'Replies go under a comment on the same post' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger comments_check_parent
  before insert on public.comments
  for each row execute function private.check_comment_parent();

create table public.comment_roots (
  comment_id uuid not null references public.comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index comment_roots_by_user on public.comment_roots (user_id);

create or replace function private.bump_comment_roots()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.comments set roots_count = roots_count + 1 where id = new.comment_id;
  else
    update public.comments set roots_count = greatest(roots_count - 1, 0) where id = old.comment_id;
  end if;
  return null;
end;
$$;

create trigger comment_roots_bump_count
  after insert or delete on public.comment_roots
  for each row execute function private.bump_comment_roots();

alter table public.comment_roots enable row level security;

create policy "Comment roots are visible with their comment"
  on public.comment_roots for select
  to authenticated
  using (exists (select 1 from public.comments c where c.id = comment_id));

create policy "Users root comments they can see"
  on public.comment_roots for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.comments c where c.id = comment_id)
  );

create policy "Users unroot their own comment roots"
  on public.comment_roots for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- Clients may only write a comment's words, never its counter or thread.
revoke insert on public.comments from authenticated;
grant insert (post_id, author_id, body, media_path, parent_id) on public.comments to authenticated;

-- Replying to someone's comment, and rooting it, count toward that pair.
create or replace function private.log_comment_interaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
  chapter text;
begin
  if tg_table_name = 'comment_roots' then
    select c.author_id, p.chapter_slug into target, chapter
    from public.comments c join public.posts p on p.id = c.post_id
    where c.id = new.comment_id;
    perform private.log_interaction(new.user_id, target, 'i_see_you', chapter, new.comment_id, true);
  elsif new.parent_id is not null then
    select c.author_id, p.chapter_slug into target, chapter
    from public.comments c join public.posts p on p.id = c.post_id
    where c.id = new.parent_id;
    perform private.log_interaction(new.author_id, target, 'post_response', chapter, new.parent_id, true);
  end if;
  return null;
end;
$$;

create trigger comment_roots_log_interaction
  after insert on public.comment_roots
  for each row execute function private.log_comment_interaction();

create trigger comments_log_reply_interaction
  after insert on public.comments
  for each row execute function private.log_comment_interaction();

-- ---------------------------------------------------------------------------
-- Circle logs: each moment carries its own space's stage, so the chip changes
-- with the moment being shown instead of staying on the latest one.
-- ---------------------------------------------------------------------------

create or replace function public.circle_logs(p_scope text default 'solo', p_limit integer default 20)
returns table (
  user_id uuid,
  first_name text,
  avatar_url text,
  aura public.aura,
  chapter_slug text,
  phase text,
  latest_at timestamptz,
  entries jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  with visible as (
    select
      le.id,
      le.user_id,
      le.body,
      le.photo_path,
      le.entry_date,
      le.created_at,
      uc.chapter_slug,
      uc.phase,
      (le.entry_date - uc.opened_at::date + 1) as day_number,
      row_number() over (partition by le.user_id order by le.entry_date desc, le.created_at desc) as rn
    from public.log_entries le
    join public.user_chapters uc on uc.id = le.user_chapter_id
    where le.user_id <> (select auth.uid())
      and le.scope = case when p_scope = 'bond' then 'bond'::public.log_scope else 'solo'::public.log_scope end
  )
  select
    p.id,
    p.first_name,
    p.avatar_url,
    p.aura,
    (array_agg(v.chapter_slug order by v.rn))[1],
    (array_agg(v.phase order by v.rn))[1],
    max(v.created_at),
    jsonb_agg(
      jsonb_build_object(
        'id', v.id,
        'body', v.body,
        'photo_path', v.photo_path,
        'entry_date', v.entry_date,
        'day_number', v.day_number,
        'chapter_slug', v.chapter_slug,
        'phase', v.phase
      )
      order by v.rn
    )
  from visible v
  join public.profiles p on p.id = v.user_id
  where v.rn <= 10
  group by p.id
  order by max(v.created_at) desc
  limit least(greatest(p_limit, 1), 50);
$$;

-- ---------------------------------------------------------------------------
-- Unread messages: the Bonds nav badge. Direct chats only; a chat is read up
-- to the viewer's last_read_at.
-- ---------------------------------------------------------------------------

create or replace function public.my_unread_messages()
returns table (unread integer, latest_sender text)
language sql
stable
security invoker
set search_path = ''
as $$
  with mine as (
    select m.created_at, m.sender_id
    from public.conversation_members cm
    join public.conversations c on c.id = cm.conversation_id and c.kind = 'direct'
    join public.messages m on m.conversation_id = cm.conversation_id
    where cm.user_id = (select auth.uid())
      and m.sender_id is not null
      and m.sender_id <> (select auth.uid())
      and m.deleted_at is null
      and m.created_at > coalesce(cm.last_read_at, '-infinity'::timestamptz)
  )
  select
    (select count(*)::integer from mine),
    (
      select p.first_name from mine
      join public.profiles p on p.id = mine.sender_id
      order by mine.created_at desc
      limit 1
    );
$$;

revoke execute on function public.my_unread_messages() from public, anon;
grant execute on function public.my_unread_messages() to authenticated;
