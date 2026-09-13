-- Messaging: one model for Bond chats (direct), group conversations and event
-- chats. Groups and events create their conversation and keep its membership
-- in sync from their own migrations.

create type public.conversation_kind as enum ('direct', 'group', 'event');

create type public.message_kind as enum (
  'text',
  'voice',
  'video',
  'image',
  'link',
  'post_share',
  'system'
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind public.conversation_kind not null,
  -- "<lower uuid>:<higher uuid>" so a pair has exactly one direct chat.
  direct_key text unique,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  check ((kind = 'direct') = (direct_key is not null))
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create index conversation_members_by_user on public.conversation_members (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  -- Null only for system notices ("Group created for First Down Walk").
  sender_id uuid references public.profiles (id) on delete cascade,
  kind public.message_kind not null default 'text',
  body text check (char_length(body) <= 4000),
  media_path text,
  duration_seconds integer check (duration_seconds >= 0),
  link_url text,
  link_title text,
  link_description text,
  -- References posts; the foreign key is added with the posts table.
  shared_post_id uuid,
  mentions uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  check ((kind = 'system') = (sender_id is null)),
  check (
    case kind
      when 'text' then body is not null
      when 'system' then body is not null
      when 'voice' then media_path is not null
      when 'video' then media_path is not null
      when 'image' then media_path is not null
      when 'link' then link_url is not null
      when 'post_share' then shared_post_id is not null
    end
  )
);

create index messages_by_conversation on public.messages (conversation_id, created_at desc);

create or replace function private.is_conversation_member(conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_members m
    where m.conversation_id = conversation
      and m.user_id = (select auth.uid())
  );
$$;

grant execute on function private.is_conversation_member(uuid) to authenticated;

create or replace function private.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function private.touch_conversation();

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

create policy "Members can see their conversations"
  on public.conversations for select
  to authenticated
  using (private.is_conversation_member(id));

create policy "Members can see who else is in a conversation"
  on public.conversation_members for select
  to authenticated
  using (private.is_conversation_member(conversation_id));

-- Only the read marker is writable, and only on your own membership row.
revoke update on public.conversation_members from authenticated;
grant update (last_read_at) on public.conversation_members to authenticated;

create policy "Members mark their own conversations read"
  on public.conversation_members for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Members can read messages"
  on public.messages for select
  to authenticated
  using (private.is_conversation_member(conversation_id));

create policy "Members can send messages as themselves"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and kind <> 'system'
    and private.is_conversation_member(conversation_id)
    -- Attachments live in chat/<conversation>/<sender>/.
    and (
      media_path is null
      or media_path like conversation_id::text || '/' || (select auth.uid())::text || '/%'
    )
  );

-- Editing and soft-deleting your own messages.
revoke update on public.messages from authenticated;
grant update (body, edited_at, deleted_at) on public.messages to authenticated;

create policy "Senders edit their own messages"
  on public.messages for update
  to authenticated
  using (sender_id = (select auth.uid()))
  with check (sender_id = (select auth.uid()));

-- Opens (or returns) the 1:1 chat with someone in your circle or a bond.
create or replace function public.open_direct_conversation(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  key text;
  conversation uuid;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;
  if p_other = uid then
    raise exception 'You cannot message yourself' using errcode = 'check_violation';
  end if;
  if not (private.in_circle(p_other) or private.is_bonded(p_other)) then
    raise exception 'You can only message people in your circle'
      using errcode = 'insufficient_privilege', hint = 'not_connected';
  end if;

  key := least(uid, p_other)::text || ':' || greatest(uid, p_other)::text;

  insert into public.conversations (kind, direct_key)
  values ('direct', key)
  on conflict (direct_key) do nothing;

  select id into conversation from public.conversations where direct_key = key;

  insert into public.conversation_members (conversation_id, user_id)
  values (conversation, uid), (conversation, p_other)
  on conflict do nothing;

  return conversation;
end;
$$;

revoke execute on function public.open_direct_conversation(uuid) from public, anon;
grant execute on function public.open_direct_conversation(uuid) to authenticated;
