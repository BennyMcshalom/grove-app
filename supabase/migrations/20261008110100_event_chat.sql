-- Event and group conversations — Figma 1779:27909 / 1784:37381 and the
-- per-message menus (host 1766:37295, You 1784:37877, Member 1784:37907).
--
--   * Reply: a message can quote another one in the same conversation.
--   * Edit: your own text messages ("· edited").
--   * Delete: your own messages; the event host (or a group admin) can
--     remove anyone's. A message the host removed stays in the list as
--     "Removed by the host" — its words are cleared for everyone.
--   * Pin to top: the host / a group admin pins one message per
--     conversation; it shows above the rest.
--   * "Delete Event" cancels the event and tells everyone who was going.
--
-- Every change goes through the security definer functions below, which
-- check who may do it. Realtime already carries `messages` UPDATEs, so
-- edits, removals and pins reach everyone in the room live.

-- Reply (messages.reply_to_id, checked to stay in the same conversation),
-- editing your own message (public.edit_my_message) and the "deleted stays
-- deleted / edits are marked" guard come from 20261008100100_chat_actions.sql
-- (the Bond chat's actions); rooms reuse them.

-- 1. Columns ------------------------------------------------------------------
alter table public.messages
  add column if not exists reply_to_id uuid references public.messages (id) on delete set null,
  -- Who removed it: the sender, or the host / an admin.
  add column deleted_by uuid references public.profiles (id) on delete set null,
  add column pinned_at timestamptz,
  add column pinned_by uuid references public.profiles (id) on delete set null;

create index messages_pinned on public.messages (conversation_id) where pinned_at is not null;

-- Only the functions below set these; a sender's direct UPDATE grant stays
-- (body, edited_at, deleted_at) as before.

-- 2. Who moderates a conversation ---------------------------------------------
-- The event's host, or an admin of the group.
create or replace function private.conversation_moderator(p_conversation uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.events e
    where e.conversation_id = p_conversation and e.host_id = p_user
  ) or exists (
    select 1 from public.groups g
    join public.group_members gm on gm.group_id = g.id
    where g.conversation_id = p_conversation and gm.user_id = p_user and gm.role = 'admin'
  );
$$;

revoke execute on function private.conversation_moderator(uuid, uuid) from public, anon;
grant execute on function private.conversation_moderator(uuid, uuid) to authenticated;

-- For the client: may the viewer pin and remove others' messages here?
create or replace function public.can_moderate_conversation(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.conversation_moderator(p_conversation_id, (select auth.uid()));
$$;

revoke execute on function public.can_moderate_conversation(uuid) from public, anon;
grant execute on function public.can_moderate_conversation(uuid) to authenticated;

-- 3. Delete -------------------------------------------------------------------
-- Your own, or anyone's when you host / admin the conversation. The words are
-- cleared for everyone; a pin comes off with it.
create or replace function public.delete_room_message(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  m public.messages;
begin
  select * into m from public.messages where id = p_message_id;
  if m.id is null or m.kind = 'system' or not private.is_conversation_member(m.conversation_id) or not (
    m.sender_id = uid or private.conversation_moderator(m.conversation_id, uid)
  ) then
    raise exception 'You can''t delete this message' using errcode = '42501', hint = 'not_allowed';
  end if;
  if m.deleted_at is not null then
    return;
  end if;
  update public.messages
  set deleted_at = now(),
      deleted_by = uid,
      -- Text needs a body, so it becomes empty; the words are gone either way.
      body = case when kind = 'text' then '' else null end,
      mentions = '{}',
      pinned_at = null,
      pinned_by = null
  where id = m.id;
end;
$$;

revoke execute on function public.delete_room_message(uuid) from public, anon;
grant execute on function public.delete_room_message(uuid) to authenticated;

-- 4. Pin to top ---------------------------------------------------------------
-- One pinned message per conversation: pinning another replaces it.
create or replace function public.pin_room_message(p_message_id uuid, p_pin boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  m public.messages;
begin
  select * into m from public.messages where id = p_message_id;
  if m.id is null or not private.conversation_moderator(m.conversation_id, uid) then
    raise exception 'Only the host can pin messages' using errcode = '42501', hint = 'not_host';
  end if;
  if p_pin and (m.deleted_at is not null or m.kind = 'system') then
    raise exception 'That message can''t be pinned' using errcode = '22023', hint = 'not_pinnable';
  end if;

  if p_pin then
    update public.messages set pinned_at = null, pinned_by = null
    where conversation_id = m.conversation_id and pinned_at is not null and id <> m.id;
    update public.messages set pinned_at = now(), pinned_by = uid where id = m.id;
  else
    update public.messages set pinned_at = null, pinned_by = null where id = m.id;
  end if;
end;
$$;

revoke execute on function public.pin_room_message(uuid, boolean) from public, anon;
grant execute on function public.pin_room_message(uuid, boolean) to authenticated;

-- 5. "Delete Event" -----------------------------------------------------------
-- Cancelling (by the host, or moderation) tells everyone who was going.
create or replace function private.notify_event_cancelled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    for r in
      select a.user_id from public.event_attendees a
      where a.event_id = new.id and a.user_id is distinct from new.host_id
    loop
      perform private.notify(
        r.user_id, 'event_cancelled', new.host_id, new.id,
        jsonb_build_object('title', new.title)
      );
    end loop;
  end if;
  return new;
end;
$$;

create trigger events_notify_cancelled
  after update of status on public.events
  for each row execute function private.notify_event_cancelled();

-- 6. Bond Log — "Try something new together" (Figma 1732:44501 / 1798:48762)
-- The activity's answer carries a TITLE ("Give your challenge a title")
-- above the words. Both functions grow, so they're dropped and recreated
-- whole (latest: 20261002110100_bond_log_media.sql).
alter table public.bond_log_responses
  add column title text check (char_length(title) <= 120);

drop function public.save_bond_response(uuid, integer, text, boolean, text);

create function public.save_bond_response(
  p_activity_id uuid,
  p_round integer,
  p_body text,
  p_share boolean,
  p_photo_path text default null,
  p_title text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  a public.bond_activities;
  b public.bonds;
  body text := nullif(trim(p_body), '');
  photo text := nullif(trim(p_photo_path), '');
  clean_title text := nullif(trim(coalesce(p_title, '')), '');
  saved public.bond_log_responses;
begin
  if not private.has_pass(uid) then
    raise exception 'The Bond Log is part of the Season Pass'
      using errcode = 'insufficient_privilege', hint = 'pass_required';
  end if;
  select * into a from public.bond_activities where id = p_activity_id;
  select * into b from public.bonds where id = a.bond_id and uid in (inviter_id, invitee_id);
  if a.id is null or b.id is null or b.status <> 'active' or a.ended_at is not null then
    raise exception 'This log is read-only now' using errcode = 'no_data_found', hint = 'read_only';
  end if;
  if p_round < 1 or p_round > private.bond_activity_rounds(a.kind, a.started_on, a.ended_at) then
    raise exception 'That prompt isn''t open yet' using errcode = '22023', hint = 'not_open';
  end if;
  if (body is null and photo is null) or char_length(body) > 2000 then
    raise exception 'Write something or add a photo first' using errcode = '22023', hint = 'empty';
  end if;
  if char_length(clean_title) > 120 then
    raise exception 'Keep the title under 120 characters' using errcode = '22023', hint = 'too_long';
  end if;
  -- Only a photo from your own folder: never someone else's upload.
  if photo is not null and (
    split_part(photo, '/', 1) <> uid::text or position('..' in photo) > 0 or char_length(photo) > 300
  ) then
    raise exception 'That photo can''t be used' using errcode = '22023', hint = 'bad_photo';
  end if;
  if exists (
    select 1 from public.bond_log_responses r
    where r.activity_id = a.id and r.round = p_round and r.author_id = uid and r.shared_at is not null
  ) then
    raise exception 'You''ve already shared this one' using errcode = 'check_violation', hint = 'already_shared';
  end if;

  insert into public.bond_log_responses (activity_id, bond_id, round, author_id, body, photo_path, title, shared_at)
  values (a.id, b.id, p_round, uid, body, photo, clean_title, case when p_share then now() end)
  on conflict (activity_id, round, author_id)
  do update set body = excluded.body, photo_path = excluded.photo_path, title = excluded.title, shared_at = excluded.shared_at
  returning * into saved;

  if p_share then
    perform private.notify(
      case when b.inviter_id = uid then b.invitee_id else b.inviter_id end,
      'bond_log_shared', uid, b.id,
      jsonb_build_object('activity', a.kind, 'round', p_round)
    );
    perform private.log_interaction(
      uid, case when b.inviter_id = uid then b.invitee_id else b.inviter_id end,
      'weekly_prompt_shared', b.chapter_slug, saved.id, true
    );
  end if;
end;
$$;

drop function public.bond_log(uuid);

create function public.bond_log(p_bond_id uuid)
returns table (
  activity_id uuid,
  kind public.bond_activity_kind,
  activity_started_at timestamptz,
  activity_ended boolean,
  round integer,
  opens_on date,
  title text,
  subtitle text,
  my_body text,
  my_shared boolean,
  their_body text,
  their_shared boolean,
  my_photo_path text,
  their_photo_path text,
  my_saved boolean,
  my_title text,
  their_title text
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select (select auth.uid()) as uid
  ),
  bond as (
    select b.* from public.bonds b cross join me
    where b.id = p_bond_id and me.uid in (b.inviter_id, b.invitee_id)
  ),
  acts as (
    select a.*, coalesce(a.ended_at, bond.released_at) as closed_at
    from public.bond_activities a
    join bond on bond.id = a.bond_id
  ),
  rounds as (
    select acts.*, g.n
    from acts
    cross join lateral generate_series(1, private.bond_activity_rounds(acts.kind, acts.started_on, acts.closed_at)) as g (n)
  )
  select
    r.id,
    r.kind,
    r.started_at,
    r.closed_at is not null,
    r.n,
    case r.kind
      when 'weekly' then r.started_on + 7 * (r.n - 1)
      when 'gratitude' then r.started_on + (r.n - 1)
      else r.started_on
    end,
    p.title,
    p.subtitle,
    mine.body,
    mine.shared_at is not null,
    case when theirs.shared_at is not null then theirs.body end,
    theirs.shared_at is not null,
    mine.photo_path,
    case when theirs.shared_at is not null then theirs.photo_path end,
    mine.id is not null,
    mine.title,
    case when theirs.shared_at is not null then theirs.title end
  from rounds r
  cross join me
  left join lateral (
    select bp.title, bp.subtitle from public.bond_prompts bp
    where bp.kind = r.kind
    order by bp.sort_order
    offset ((r.n - 1) % greatest((select count(*) from public.bond_prompts c where c.kind = r.kind), 1))
    limit 1
  ) p on true
  left join public.bond_log_responses mine
    on mine.activity_id = r.id and mine.round = r.n and mine.author_id = me.uid
  left join public.bond_log_responses theirs
    on theirs.activity_id = r.id and theirs.round = r.n and theirs.author_id <> me.uid
  order by r.started_at desc, r.n desc;
$$;

revoke execute on function public.save_bond_response(uuid, integer, text, boolean, text, text) from public, anon;
revoke execute on function public.bond_log(uuid) from public, anon;
grant execute on function public.save_bond_response(uuid, integer, text, boolean, text, text) to authenticated;
grant execute on function public.bond_log(uuid) to authenticated;
