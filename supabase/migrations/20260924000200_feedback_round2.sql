-- Second round of testing feedback (2026-09-24): a stable order and a primary
-- space, chat controls (remove from circle, mute, block), and documents in
-- chat.

-- ---------------------------------------------------------------------------
-- Spaces keep their order, and one can be primary
-- ---------------------------------------------------------------------------

-- Onboarding opens every space in one transaction, so they all share one
-- opened_at and "oldest first" had no real order: rows came back in whatever
-- order they sat on disk, and saving Edit Profile reshuffled them. Spread the
-- ties out in catalogue order, and keep new ones from tying.
update public.user_chapters uc
set opened_at = uc.opened_at + (c.sort_order * interval '1 millisecond')
from public.chapters c
where c.slug = uc.chapter_slug
  and exists (
    select 1 from public.user_chapters other
    where other.user_id = uc.user_id and other.id <> uc.id and other.opened_at = uc.opened_at
  );

create or replace function private.untie_opened_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  latest timestamptz;
begin
  select max(uc.opened_at) into latest
  from public.user_chapters uc
  where uc.user_id = new.user_id and uc.opened_at >= new.opened_at;
  if latest is not null then
    new.opened_at := latest + interval '1 millisecond';
  end if;
  return new;
end;
$$;

create trigger user_chapters_untie_opened_at
  before insert on public.user_chapters
  for each row execute function private.untie_opened_at();

-- The primary space leads everywhere the person is summed up (under their
-- name, on their profile). Exactly one open space is primary.
alter table public.user_chapters add column is_primary boolean not null default false;

update public.user_chapters uc
set is_primary = true
where uc.status = 'open'
  and uc.id = (
    select first.id from public.user_chapters first
    where first.user_id = uc.user_id and first.status = 'open'
    order by first.opened_at
    limit 1
  );

create unique index user_chapters_one_primary
  on public.user_chapters (user_id)
  where is_primary and status = 'open';

-- Clients can't set it directly; set_primary_chapter() does.
revoke update on public.user_chapters from authenticated;
grant update (phase) on public.user_chapters to authenticated;

-- The first space becomes primary; closing the primary hands it to the
-- oldest remaining one.
create or replace function private.keep_a_primary_chapter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.status = 'closed' and old.is_primary then
    update public.user_chapters set is_primary = false where id = new.id;
  end if;

  if not exists (
    select 1 from public.user_chapters uc
    where uc.user_id = new.user_id and uc.status = 'open' and uc.is_primary
  ) then
    update public.user_chapters uc
    set is_primary = true
    where uc.id = (
      select next.id from public.user_chapters next
      where next.user_id = new.user_id and next.status = 'open'
      order by next.opened_at
      limit 1
    );
  end if;
  return null;
end;
$$;

create trigger user_chapters_keep_primary
  after insert or update of status on public.user_chapters
  for each row execute function private.keep_a_primary_chapter();

create or replace function public.set_primary_chapter(p_user_chapter_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if not exists (
    select 1 from public.user_chapters
    where id = p_user_chapter_id and user_id = uid and status = 'open'
  ) then
    raise exception 'That space is not open' using errcode = 'no_data_found';
  end if;

  update public.user_chapters set is_primary = false where user_id = uid and is_primary;
  update public.user_chapters set is_primary = true where id = p_user_chapter_id;
end;
$$;

revoke execute on function public.set_primary_chapter(uuid) from public, anon;
grant execute on function public.set_primary_chapter(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Chat controls: remove from circle, mute, block
-- ---------------------------------------------------------------------------

-- Removing someone from your circle ends a bond with them too: bonds are only
-- ever between connected people. Their shared history stays.
create or replace function private.release_bond_with_connection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status <> 'accepted' then
    return null;
  end if;
  update public.bonds
  set status = 'released', released_at = now()
  where user_low = old.user_low and user_high = old.user_high and status = 'active';
  delete from public.bond_ranks br
  using public.bonds b
  where b.id = br.bond_id and b.user_low = old.user_low and b.user_high = old.user_high and b.status = 'released';
  return null;
end;
$$;

create trigger connections_release_bond
  after delete on public.connections
  for each row execute function private.release_bond_with_connection();

-- Mute: no badge, no toast, nothing from this chat until unmuted.
alter table public.conversation_members add column muted boolean not null default false;

create or replace function public.set_chat_muted(p_conversation_id uuid, p_muted boolean)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.conversation_members
  set muted = p_muted
  where conversation_id = p_conversation_id and user_id = (select auth.uid());
$$;

revoke execute on function public.set_chat_muted(uuid, boolean) from public, anon;
grant execute on function public.set_chat_muted(uuid, boolean) to authenticated;

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
      and not cm.muted
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

-- Block: they can't message, call, connect with, see or find you nearby,
-- and neither can you them, until you unblock. Blocking ends the connection
-- (and so any bond). Only the blocker can see the block.
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocks_by_blocked on public.blocks (blocked_id);

alter table public.blocks enable row level security;

create policy "Blockers see who they blocked"
  on public.blocks for select
  to authenticated
  using (blocker_id = (select auth.uid()));

create or replace function private.blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

create or replace function public.block_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null or p_user_id = uid then
    raise exception 'Choose someone else' using errcode = 'check_violation';
  end if;
  insert into public.blocks (blocker_id, blocked_id) values (uid, p_user_id) on conflict do nothing;
  delete from public.connections
  where user_low = least(uid, p_user_id) and user_high = greatest(uid, p_user_id);
  -- A pending bond row can't exist any more, but an active one without a
  -- connection could (older invites); end it either way.
  update public.bonds set status = 'released', released_at = now()
  where user_low = least(uid, p_user_id) and user_high = greatest(uid, p_user_id) and status = 'active';
  update public.calls set status = 'ended', ended_at = now()
  where status in ('ringing', 'active')
    and conversation_id = (
      select c.id from public.conversations c
      where c.direct_key = least(uid, p_user_id)::text || ':' || greatest(uid, p_user_id)::text
    );
end;
$$;

create or replace function public.unblock_user(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.blocks where blocker_id = (select auth.uid()) and blocked_id = p_user_id;
$$;

revoke execute on function public.block_user(uuid) from public, anon;
revoke execute on function public.unblock_user(uuid) from public, anon;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;

-- No new connection request either way while a block stands.
create or replace function private.refuse_blocked_connection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.blocked_between(new.requester_id, new.addressee_id) then
    raise exception 'You can''t connect with this person' using errcode = 'insufficient_privilege', hint = 'blocked';
  end if;
  return new;
end;
$$;

create trigger connections_refuse_blocked
  before insert on public.connections
  for each row execute function private.refuse_blocked_connection();

-- Direct chats are for people who are still connected (or bonded) and not
-- blocked; after "Remove from circle" or a block, the old chat is read-only.
create or replace function private.refuse_direct_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  other uuid;
begin
  if new.sender_id is null then
    return new;
  end if;

  select m.user_id into other
  from public.conversation_members m
  join public.conversations c on c.id = m.conversation_id and c.kind = 'direct'
  where m.conversation_id = new.conversation_id and m.user_id <> new.sender_id
  limit 1;

  -- Not a direct chat, or the sender isn't in it (RLS turns that down).
  if other is null or not exists (
    select 1 from public.conversation_members me
    where me.conversation_id = new.conversation_id and me.user_id = new.sender_id
  ) then
    return new;
  end if;

  if private.blocked_between(new.sender_id, other) then
    raise exception 'You can''t message this person' using errcode = 'insufficient_privilege', hint = 'blocked';
  end if;
  if not private.are_connected(new.sender_id, other) then
    raise exception 'You''re no longer connected' using errcode = 'insufficient_privilege', hint = 'not_connected';
  end if;
  return new;
end;
$$;

create trigger messages_refuse_direct
  before insert on public.messages
  for each row execute function private.refuse_direct_message();

create or replace function private.refuse_blocked_call()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.conversation_members m
    where m.conversation_id = new.conversation_id
      and m.user_id <> new.caller_id
      and (private.blocked_between(new.caller_id, m.user_id) or not private.are_connected(new.caller_id, m.user_id))
  ) then
    raise exception 'You can''t call this person' using errcode = 'insufficient_privilege', hint = 'blocked';
  end if;
  return new;
end;
$$;

create trigger calls_refuse_blocked
  before insert on public.calls
  for each row execute function private.refuse_blocked_call();

-- ---------------------------------------------------------------------------
-- Documents in chat: PDF, Word, Excel, PowerPoint and plain text, 25 MB
-- ---------------------------------------------------------------------------

alter table public.messages
  add column file_name text check (char_length(file_name) <= 255),
  add column file_size bigint check (file_size between 0 and 26214400),
  add constraint messages_file_has_file check (kind <> 'file' or (media_path is not null and file_name is not null));

update storage.buckets
set allowed_mime_types = array[
  'image/*', 'video/*', 'audio/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv'
]
where id = 'chat';
