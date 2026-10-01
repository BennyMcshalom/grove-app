-- Spaces, Chapter Groups (PRD v1.1 §6, §7, §8).
--
-- 1. Chapter invitations: a card (title, optional photos and note) that
--    brings people into one of your open chapters, sent to people in your
--    circle or your Space, and shareable as a /i/<token> link.
--
--    Joining someone's chapter means: the chapter's Space opens for you (at
--    the stage you pick, within your plan's Space limit — Free 4, Season Pass
--    8) if you don't already hold it, and you and the sender land in each
--    other's circle, found in that chapter. Declining is quiet.
--
-- 2. Chapter Groups: starting one needs the Season Pass (trial or paid);
--    admins keep reviewing requests on Free. Requesters learn the outcome
--    once, and admins see how many requests wait per group.

-- ---------------------------------------------------------------------------
-- Chapter invitations
-- ---------------------------------------------------------------------------

create table public.chapter_invites (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  user_chapter_id uuid not null references public.user_chapters (id) on delete cascade,
  chapter_slug text not null references public.chapters (slug) on update cascade,
  -- "Career : starting again in a new city" — the headline the card carries.
  title text not null check (char_length(title) between 1 and 120),
  note text check (char_length(note) <= 1000),
  -- Up to four photos in the sender's media folder.
  photo_paths text[] not null default '{}' check (cardinality(photo_paths) <= 4),
  -- The /i/<token> link. Unguessable; the card is readable by anyone holding it.
  token text not null unique,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index chapter_invites_by_sender on public.chapter_invites (sender_id, created_at desc);

create table public.chapter_invite_recipients (
  invite_id uuid not null references public.chapter_invites (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  status public.invite_response not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (invite_id, recipient_id)
);

create index chapter_invite_recipients_pending
  on public.chapter_invite_recipients (recipient_id)
  where status = 'pending';

alter table public.chapter_invites enable row level security;
alter table public.chapter_invite_recipients enable row level security;

create or replace function private.is_chapter_invite_party(p_invite uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.chapter_invites i
    where i.id = p_invite and i.sender_id = (select auth.uid())
  ) or exists (
    select 1 from public.chapter_invite_recipients r
    where r.invite_id = p_invite and r.recipient_id = (select auth.uid())
  );
$$;

revoke execute on function private.is_chapter_invite_party(uuid) from public, anon;
grant execute on function private.is_chapter_invite_party(uuid) to authenticated;

-- Writes go through the functions below.
create policy "Sender and recipients read an invitation"
  on public.chapter_invites for select
  to authenticated
  using (private.is_chapter_invite_party(id));

create policy "Sender and recipients read who was invited"
  on public.chapter_invite_recipients for select
  to authenticated
  using (
    recipient_id = (select auth.uid())
    or exists (
      select 1 from public.chapter_invites i
      where i.id = invite_id and i.sender_id = (select auth.uid())
    )
  );

-- Preview → "Send Invite". Recipients must be in your circle or hold the same
-- Space (the picker's "Your Bond" and "Suggested people"); anyone else joins
-- through the link. Returns the invitation and its link token.
create or replace function public.create_chapter_invite(
  p_user_chapter_id uuid,
  p_title text,
  p_note text default null,
  p_photo_paths text[] default '{}',
  p_recipients uuid[] default '{}'
)
returns table (id uuid, token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  uc public.user_chapters;
  clean_title text := trim(coalesce(p_title, ''));
  clean_note text := nullif(trim(coalesce(p_note, '')), '');
  photos text[] := coalesce(p_photo_paths, '{}');
  people uuid[];
  recent integer;
  new_id uuid;
  new_token text;
  recipient uuid;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  select * into uc from public.user_chapters u
  where u.id = p_user_chapter_id and u.user_id = uid and u.status = 'open';
  if not found then
    raise exception 'You can only invite people into a chapter you hold' using errcode = '42501', hint = 'not_yours';
  end if;
  if uc.paused_at is not null then
    raise exception 'This Space is paused. Reactivate it to invite someone.'
      using errcode = 'check_violation', hint = 'space_paused';
  end if;

  if clean_title = '' then
    raise exception 'Give your invitation a title' using errcode = '22023', hint = 'title';
  end if;
  if char_length(clean_title) > 120 then
    raise exception 'Keep the title under 120 characters' using errcode = '22023', hint = 'title';
  end if;
  if char_length(coalesce(clean_note, '')) > 1000 then
    raise exception 'Keep the note under 1,000 characters' using errcode = '22023', hint = 'note';
  end if;
  if cardinality(photos) > 4 then
    raise exception 'Add up to four photos' using errcode = '22023', hint = 'photos';
  end if;
  if exists (select 1 from unnest(photos) p where p is null or p not like uid::text || '/%') then
    raise exception 'Your photo didn''t finish uploading' using errcode = '22023', hint = 'photos';
  end if;

  select count(*) into recent from public.chapter_invites i
  where i.sender_id = uid and i.created_at > now() - interval '1 day';
  if recent >= 20 then
    raise exception 'You''re doing that a lot. Take a breather and try again soon.'
      using errcode = 'check_violation', hint = 'rate_limited';
  end if;

  select coalesce(array_agg(distinct r), '{}') into people
  from unnest(coalesce(p_recipients, '{}')) r
  where r is not null and r <> uid;

  if cardinality(people) > 30 then
    raise exception 'Invite up to 30 people at a time' using errcode = '22023', hint = 'too_many';
  end if;

  foreach recipient in array people loop
    if private.blocked_between(uid, recipient) or not (
      exists (
        select 1 from public.connections c
        where c.user_low = least(uid, recipient) and c.user_high = greatest(uid, recipient)
          and c.status = 'accepted'
      )
      or exists (
        select 1 from public.user_chapters u
        where u.user_id = recipient and u.chapter_slug = uc.chapter_slug and u.status = 'open'
      )
    ) then
      raise exception 'You can only invite people in your circle or this Space'
        using errcode = 'check_violation', hint = 'not_reachable';
    end if;
  end loop;

  new_token := substr(md5(gen_random_uuid()::text || gen_random_uuid()::text), 1, 20);

  insert into public.chapter_invites (sender_id, user_chapter_id, chapter_slug, title, note, photo_paths, token)
  values (uid, uc.id, uc.chapter_slug, clean_title, clean_note, photos, new_token)
  returning chapter_invites.id into new_id;

  foreach recipient in array people loop
    insert into public.chapter_invite_recipients (invite_id, recipient_id) values (new_id, recipient);
    perform private.notify(
      recipient, 'chapter_invite', uid, new_id,
      jsonb_build_object('title', clean_title, 'chapter_slug', uc.chapter_slug, 'token', new_token)
    );
  end loop;

  id := new_id;
  token := new_token;
  return next;
end;
$$;

revoke execute on function public.create_chapter_invite(uuid, text, text, text[], uuid[]) from public, anon;
grant execute on function public.create_chapter_invite(uuid, text, text, text[], uuid[]) to authenticated;

-- The card behind /i/<token> (1524:25315). Works signed out so a link can
-- welcome someone new; signed in, it also says how you answered.
create or replace function public.chapter_invite_card(p_token text)
returns table (
  id uuid,
  sender_id uuid,
  sender_name text,
  sender_avatar text,
  chapter_slug text,
  title text,
  note text,
  photo_paths text[],
  is_sender boolean,
  my_status public.invite_response,
  holds_chapter boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    i.id,
    i.sender_id,
    p.first_name,
    p.avatar_url,
    i.chapter_slug,
    i.title,
    i.note,
    i.photo_paths,
    i.sender_id = (select auth.uid()),
    (
      select r.status from public.chapter_invite_recipients r
      where r.invite_id = i.id and r.recipient_id = (select auth.uid())
    ),
    exists (
      select 1 from public.user_chapters u
      where u.user_id = (select auth.uid()) and u.chapter_slug = i.chapter_slug and u.status = 'open'
    )
  from public.chapter_invites i
  join public.profiles p on p.id = i.sender_id
  where i.token = p_token
    and i.revoked_at is null
    -- A block hides the card from either side.
    and not (
      (select auth.uid()) is not null
      and private.blocked_between(i.sender_id, (select auth.uid()))
    );
$$;

revoke execute on function public.chapter_invite_card(text) from public;
grant execute on function public.chapter_invite_card(text) to anon, authenticated;

-- "Join chapter" / "Decline invitation". Someone arriving by link becomes a
-- recipient as they answer. Accepting opens the Space when you don't hold it
-- (p_phase is the stage you pick; the Space limit applies) and puts you in
-- the sender's circle. Returns 'joined' or 'declined'.
create or replace function public.respond_chapter_invite(
  p_token text,
  p_accept boolean,
  p_phase text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  invite public.chapter_invites;
  answer public.invite_response;
  conn public.connections;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  select * into invite from public.chapter_invites i
  where i.token = p_token and i.revoked_at is null;
  if not found or private.blocked_between(invite.sender_id, uid) then
    raise exception 'This invitation is no longer available' using errcode = 'no_data_found', hint = 'gone';
  end if;
  if invite.sender_id = uid then
    raise exception 'This is your own invitation' using errcode = 'check_violation', hint = 'own';
  end if;

  insert into public.chapter_invite_recipients (invite_id, recipient_id)
  values (invite.id, uid)
  on conflict do nothing;

  select r.status into answer from public.chapter_invite_recipients r
  where r.invite_id = invite.id and r.recipient_id = uid
  for update;
  if answer <> 'pending' then
    raise exception 'You''ve already answered this invitation' using errcode = 'check_violation', hint = 'answered';
  end if;

  if not p_accept then
    update public.chapter_invite_recipients
    set status = 'declined', responded_at = now()
    where invite_id = invite.id and recipient_id = uid;
    -- Nothing to act on any more.
    delete from public.notifications n
    where n.user_id = uid and n.kind = 'chapter_invite' and n.entity_id = invite.id;
    return 'declined';
  end if;

  if not exists (
    select 1 from public.user_chapters u
    where u.user_id = uid and u.chapter_slug = invite.chapter_slug and u.status = 'open'
  ) then
    if p_phase is null or not exists (
      select 1 from public.chapter_phases cp
      where cp.chapter_slug = invite.chapter_slug and cp.label = p_phase
    ) then
      raise exception 'Pick where you are in this chapter first' using errcode = '22023', hint = 'phase_required';
    end if;
    -- The Space limit trigger raises hint 'chapter_limit' when you're full.
    insert into public.user_chapters (user_id, chapter_slug, phase)
    values (uid, invite.chapter_slug, p_phase);
  end if;

  -- Both of you chose this, so you're in each other's circle.
  select * into conn from public.connections c
  where c.user_low = least(uid, invite.sender_id) and c.user_high = greatest(uid, invite.sender_id)
  for update;
  if not found then
    insert into public.connections (requester_id, addressee_id, status, chapter_slug, responded_at)
    values (invite.sender_id, uid, 'accepted', invite.chapter_slug, now())
    returning * into conn;
    -- The insert trigger announces a request; there's nothing to answer.
    delete from public.notifications n
    where n.user_id = uid and n.kind = 'connection_request' and n.entity_id = conn.id;
  elsif conn.status <> 'accepted' then
    update public.connections
    set status = 'accepted', responded_at = now(), chapter_slug = coalesce(chapter_slug, invite.chapter_slug)
    where id = conn.id;
  end if;

  update public.chapter_invite_recipients
  set status = 'accepted', responded_at = now()
  where invite_id = invite.id and recipient_id = uid;

  delete from public.notifications n
  where n.user_id = uid and n.kind = 'chapter_invite' and n.entity_id = invite.id;
  perform private.notify(
    invite.sender_id, 'chapter_invite_accepted', uid, invite.id,
    jsonb_build_object('title', invite.title, 'chapter_slug', invite.chapter_slug)
  );

  return 'joined';
end;
$$;

revoke execute on function public.respond_chapter_invite(text, boolean, text) from public, anon;
grant execute on function public.respond_chapter_invite(text, boolean, text) to authenticated;

-- INVITATIONS (the My Spaces and Space rails): invitations waiting on you.
create or replace function public.my_chapter_invitations()
returns table (
  id uuid,
  token text,
  title text,
  chapter_slug text,
  sender_id uuid,
  sender_name text,
  sender_avatar text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, i.token, i.title, i.chapter_slug, i.sender_id, p.first_name, p.avatar_url, r.created_at
  from public.chapter_invite_recipients r
  join public.chapter_invites i on i.id = r.invite_id
  join public.profiles p on p.id = i.sender_id
  where r.recipient_id = (select auth.uid())
    and r.status = 'pending'
    and i.revoked_at is null
    and not private.blocked_between(i.sender_id, r.recipient_id)
  order by r.created_at desc
  limit 20;
$$;

revoke execute on function public.my_chapter_invitations() from public, anon;
grant execute on function public.my_chapter_invitations() to authenticated;

-- ---------------------------------------------------------------------------
-- Chapter Groups
-- ---------------------------------------------------------------------------

-- "Creating a group requires trial or Season Pass." Service-side inserts
-- (no auth.uid()) are seeds and pass through.
create or replace function private.require_pass_to_create_group()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is not null and not private.has_pass(uid) then
    raise exception 'Starting a group comes with the Season Pass'
      using errcode = '42501', hint = 'pass_required';
  end if;
  return new;
end;
$$;

create trigger groups_require_pass
  before insert on public.groups
  for each row execute function private.require_pass_to_create_group();

-- The requester sees an approve/decline outcome once, then it's acknowledged.
alter table public.group_join_requests
  add column requester_seen_at timestamptz;

-- The latest reviewed request the viewer hasn't seen the outcome of.
create or replace function public.group_request_outcome(p_group_id uuid)
returns public.request_status
language sql
stable
security definer
set search_path = ''
as $$
  select r.status from public.group_join_requests r
  where r.group_id = p_group_id
    and r.user_id = (select auth.uid())
    and r.status <> 'pending'
    and r.requester_seen_at is null
  order by r.reviewed_at desc nulls last
  limit 1;
$$;

create or replace function public.acknowledge_group_request(p_group_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.group_join_requests
  set requester_seen_at = now()
  where group_id = p_group_id
    and user_id = (select auth.uid())
    and status <> 'pending'
    and requester_seen_at is null;
$$;

-- Admin Mode: pending requests per group you run.
create or replace function public.admin_pending_requests()
returns table (group_id uuid, pending integer)
language sql
stable
security definer
set search_path = ''
as $$
  select m.group_id, count(r.id)::integer
  from public.group_members m
  join public.group_join_requests r on r.group_id = m.group_id and r.status = 'pending'
  where m.user_id = (select auth.uid()) and m.role = 'admin'
  group by m.group_id;
$$;

revoke execute on function public.group_request_outcome(uuid) from public, anon;
revoke execute on function public.acknowledge_group_request(uuid) from public, anon;
revoke execute on function public.admin_pending_requests() from public, anon;
grant execute on function public.group_request_outcome(uuid) to authenticated;
grant execute on function public.acknowledge_group_request(uuid) to authenticated;
grant execute on function public.admin_pending_requests() to authenticated;
