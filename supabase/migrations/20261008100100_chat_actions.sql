-- Bond chat message actions (Figma 1788:38139 "mine" / 1788:38148 "theirs"):
-- Reply, Edit (marked edited), Delete (soft, "This message was deleted" for
-- everyone) and Forward. Only the sender can edit or delete a message; both
-- go through these functions so the checks live in the database.

-- Reply: a message can quote an earlier one from the same conversation.
alter table public.messages
  add column if not exists reply_to_id uuid references public.messages (id) on delete set null;

create or replace function private.check_message_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.reply_to_id is not null and not exists (
    select 1 from public.messages m
    where m.id = new.reply_to_id and m.conversation_id = new.conversation_id
  ) then
    raise exception 'You can only reply to a message in this conversation.' using hint = 'bad_reply';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_check_reply on public.messages;
create trigger messages_check_reply
  before insert on public.messages
  for each row execute function private.check_message_reply();

-- A deleted message stays deleted, and a body change always carries "edited".
-- Covers direct updates too (the sender's update policy predates these).
create or replace function private.guard_message_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.deleted_at is not null then
    if new.deleted_at is null or new.body is distinct from old.body then
      raise exception 'That message was deleted.' using hint = 'deleted';
    end if;
  elsif new.deleted_at is null and new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists messages_guard_update on public.messages;
create trigger messages_guard_update
  before update on public.messages
  for each row execute function private.guard_message_update();

-- Edit: your own, undeleted text message. Returns when it was edited.
create or replace function public.edit_my_message(p_message uuid, p_body text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  msg public.messages;
  text_body text := btrim(coalesce(p_body, ''));
begin
  select * into msg from public.messages where id = p_message;
  if msg.id is null or not private.is_conversation_member(msg.conversation_id) then
    raise exception 'That message is no longer here.' using hint = 'not_found';
  end if;
  if msg.sender_id is distinct from me then
    raise exception 'You can only edit your own messages.' using hint = 'not_sender';
  end if;
  if msg.deleted_at is not null then
    raise exception 'That message was deleted.' using hint = 'deleted';
  end if;
  if msg.kind <> 'text' then
    raise exception 'Only text messages can be edited.' using hint = 'not_text';
  end if;
  if text_body = '' then
    raise exception 'Write a message first.' using hint = 'empty';
  end if;
  if char_length(text_body) > 4000 then
    raise exception 'Keep messages under 4,000 characters.' using hint = 'too_long';
  end if;

  if text_body is distinct from msg.body then
    update public.messages set body = text_body, edited_at = now() where id = msg.id;
  end if;
  return (select edited_at from public.messages where id = msg.id);
end;
$$;

-- Delete: your own message, for everyone. The row stays (replies and reports
-- point at it) with its words cleared.
create or replace function public.delete_my_message(p_message uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  msg public.messages;
begin
  select * into msg from public.messages where id = p_message;
  if msg.id is null or not private.is_conversation_member(msg.conversation_id) then
    raise exception 'That message is no longer here.' using hint = 'not_found';
  end if;
  if msg.sender_id is distinct from me then
    raise exception 'You can only delete your own messages.' using hint = 'not_sender';
  end if;
  if msg.deleted_at is not null then
    return;
  end if;

  update public.messages
    set deleted_at = now(),
        body = case when kind in ('text', 'system') then '' else null end,
        mentions = '{}'
    where id = msg.id;
end;
$$;

revoke execute on function public.edit_my_message(uuid, text) from public, anon;
revoke execute on function public.delete_my_message(uuid) from public, anon;
grant execute on function public.edit_my_message(uuid, text) to authenticated;
grant execute on function public.delete_my_message(uuid) to authenticated;
