-- Chapter Companions — "Walk alongside a chapter".
--
-- A chapter invitation used to open the chapter's Space for whoever accepted
-- and put them in the sender's circle. That was wrong: an invitation now asks
-- someone to walk alongside YOUR chapter. Accepting creates a companion
-- relationship and nothing else — no Space opens for them, no circle
-- connection is made or changed.
--
-- What a companion can see is exactly what the owner chose:
--   * the moments the owner selected (Grouv Log entries and posts from that
--     chapter) — never the rest of their log;
--   * the owner's current note and next milestone (if shared);
--   * updates the owner shares afterwards (only to the companions they pick).
-- Companions check in and reply in a thread with the owner. Companions never
-- read the underlying tables: every read goes through the security definer
-- functions below, which check the relationship is live. The owner can
-- remove a companion (access ends at once); a companion can mute or leave.
--
-- An invitation is single-use: once someone accepts it, the link is spent.
-- One addressed to a person (recipient_id) only works for them.

-- ---------------------------------------------------------------------------
-- Invitations: the existing table, with the companion fields
-- ---------------------------------------------------------------------------

alter table public.chapter_invites
  -- The person it was written for; null means anyone holding the link.
  add column recipient_id uuid references public.profiles (id) on delete set null,
  -- "What would help from him?"
  add column ask text check (char_length(ask) <= 1000),
  -- What the companion will see. Older invitations get the defaults.
  add column share_story boolean not null default true,
  add column share_current boolean not null default true,
  add column share_future boolean not null default true;

-- `title` is the chapter's headline and `note` is "Why Victor?".

-- The moments the owner picked for this invitation (and, once accepted, its
-- companion): log entries or posts from that chapter, oldest first.
create table public.chapter_invite_moments (
  invite_id uuid not null references public.chapter_invites (id) on delete cascade,
  log_entry_id uuid references public.log_entries (id) on delete cascade,
  post_id uuid references public.posts (id) on delete cascade,
  position smallint not null default 0,
  check (num_nonnulls(log_entry_id, post_id) = 1),
  unique (invite_id, log_entry_id),
  unique (invite_id, post_id)
);

create index chapter_invite_moments_by_invite on public.chapter_invite_moments (invite_id, position);

alter table public.chapter_invite_moments enable row level security;

create policy "The owner reads the moments they picked"
  on public.chapter_invite_moments for select
  to authenticated
  using (
    exists (
      select 1 from public.chapter_invites i
      where i.id = invite_id and i.sender_id = (select auth.uid())
    )
  );

-- Where the owner is now and what's next, per chapter. Shown to companions
-- whose invitation shared "Current note and milestone".
create table public.companion_chapter_notes (
  user_chapter_id uuid primary key references public.user_chapters (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  where_now text check (char_length(where_now) <= 1000),
  milestone text check (char_length(milestone) <= 200),
  milestone_date date,
  updated_at timestamptz not null default now()
);

alter table public.companion_chapter_notes enable row level security;

create policy "The owner reads their chapter note"
  on public.companion_chapter_notes for select
  to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Companions
-- ---------------------------------------------------------------------------

create table public.chapter_companions (
  id uuid primary key default gen_random_uuid(),
  -- The invitation that started it: its note, ask, sharing choices, moments.
  invite_id uuid not null unique references public.chapter_invites (id) on delete cascade,
  user_chapter_id uuid not null references public.user_chapters (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  companion_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- The companion stopped notifications.
  muted_at timestamptz,
  -- Removed by the owner or left by the companion. Access ends here; the
  -- thread is kept for the owner.
  ended_at timestamptz,
  ended_by uuid references public.profiles (id) on delete set null,
  check (owner_id <> companion_id)
);

create unique index chapter_companions_live
  on public.chapter_companions (user_chapter_id, companion_id)
  where ended_at is null;
create index chapter_companions_by_companion on public.chapter_companions (companion_id) where ended_at is null;
create index chapter_companions_by_owner on public.chapter_companions (owner_id, user_chapter_id);

alter table public.chapter_companions enable row level security;

create policy "Owners and live companions read the relationship"
  on public.chapter_companions for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    or (companion_id = (select auth.uid()) and ended_at is null)
  );

-- Updates the owner shares, and exactly who each one went to.
create table public.companion_updates (
  id uuid primary key default gen_random_uuid(),
  user_chapter_id uuid not null references public.user_chapters (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  body text check (char_length(body) <= 2000),
  photo_path text,
  created_at timestamptz not null default now(),
  check (body is not null or photo_path is not null)
);

create index companion_updates_by_chapter on public.companion_updates (user_chapter_id, created_at desc);

create table public.companion_update_recipients (
  update_id uuid not null references public.companion_updates (id) on delete cascade,
  companion_id uuid not null references public.chapter_companions (id) on delete cascade,
  primary key (update_id, companion_id)
);

create index companion_update_recipients_by_companion on public.companion_update_recipients (companion_id);

alter table public.companion_updates enable row level security;
alter table public.companion_update_recipients enable row level security;

create policy "The owner reads their updates"
  on public.companion_updates for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "The owner reads who got an update"
  on public.companion_update_recipients for select
  to authenticated
  using (
    exists (
      select 1 from public.companion_updates u
      where u.id = update_id and u.owner_id = (select auth.uid())
    )
  );

-- Check-ins and replies: one thread per companion.
create table public.companion_messages (
  id uuid primary key default gen_random_uuid(),
  companion_id uuid not null references public.chapter_companions (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index companion_messages_by_thread on public.companion_messages (companion_id, created_at);

alter table public.companion_messages enable row level security;

-- ---------------------------------------------------------------------------
-- Access
-- ---------------------------------------------------------------------------

-- 'owner', 'companion' (only while live and unblocked), or null.
create or replace function private.companion_role(p_companion_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when c.owner_id = (select auth.uid()) then 'owner'
    when c.companion_id = (select auth.uid())
      and c.ended_at is null
      and not private.blocked_between(c.owner_id, c.companion_id) then 'companion'
  end
  from public.chapter_companions c
  where c.id = p_companion_id;
$$;

revoke execute on function private.companion_role(uuid) from public, anon;
grant execute on function private.companion_role(uuid) to authenticated;

create policy "Both sides read their thread"
  on public.companion_messages for select
  to authenticated
  using (private.companion_role(companion_id) is not null);

-- The old "join my chapter" functions go: accepting no longer opens a Space
-- or connects anyone.
drop function if exists public.create_chapter_invite(uuid, text, text, text[], uuid[]);
drop function if exists public.respond_chapter_invite(text, boolean, text);
drop function if exists public.chapter_invite_card(text);
drop function if exists public.my_chapter_invitations();

-- ---------------------------------------------------------------------------
-- Owner: invite
-- ---------------------------------------------------------------------------

-- Keeps only the owner's own moments from this chapter, oldest first.
create or replace function private.set_invite_moments(
  p_invite uuid,
  p_user_chapter uuid,
  p_owner uuid,
  p_log_entry_ids uuid[],
  p_post_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uc public.user_chapters;
  wanted integer := cardinality(coalesce(p_log_entry_ids, '{}')) + cardinality(coalesce(p_post_ids, '{}'));
  kept integer;
begin
  if wanted > 30 then
    raise exception 'Pick up to 30 moments' using errcode = '22023', hint = 'too_many_moments';
  end if;
  select * into uc from public.user_chapters u where u.id = p_user_chapter;

  delete from public.chapter_invite_moments m where m.invite_id = p_invite;

  insert into public.chapter_invite_moments (invite_id, log_entry_id, post_id, position)
  select p_invite, picked.log_id, picked.post_id, (row_number() over (order by picked.day, picked.at))::smallint
  from (
    select le.id as log_id, null::uuid as post_id, le.entry_date as day, le.created_at as at
    from public.log_entries le
    where le.id = any(coalesce(p_log_entry_ids, '{}'))
      and le.user_id = p_owner
      and le.user_chapter_id = p_user_chapter
    union all
    select null, p.id, (p.created_at at time zone 'utc')::date, p.created_at
    from public.posts p
    where p.id = any(coalesce(p_post_ids, '{}'))
      and p.author_id = p_owner
      and not p.is_anonymous
      and p.chapter_slug = uc.chapter_slug
  ) picked;

  get diagnostics kept = row_count;
  if kept <> wanted then
    raise exception 'You can only share your own moments from this chapter'
      using errcode = '42501', hint = 'not_your_moment';
  end if;
  return kept;
end;
$$;

revoke execute on function private.set_invite_moments(uuid, uuid, uuid, uuid[], uuid[]) from public, anon, authenticated;

-- Preview → "Send invitation". p_recipient is the person picked in the app
-- (circle, Bond or someone in this Space); null makes a link for anyone.
-- Returns the invitation and its link token.
create or replace function public.create_companion_invite(
  p_user_chapter_id uuid,
  p_title text,
  p_why text default null,
  p_ask text default null,
  p_where_now text default null,
  p_milestone text default null,
  p_milestone_date date default null,
  p_share_story boolean default true,
  p_share_current boolean default true,
  p_share_future boolean default true,
  p_log_entry_ids uuid[] default '{}',
  p_post_ids uuid[] default '{}',
  p_recipient uuid default null
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
  clean_why text := nullif(trim(coalesce(p_why, '')), '');
  clean_ask text := nullif(trim(coalesce(p_ask, '')), '');
  clean_now text := nullif(trim(coalesce(p_where_now, '')), '');
  clean_milestone text := nullif(trim(coalesce(p_milestone, '')), '');
  recent integer;
  new_id uuid;
  new_token text;
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
    raise exception 'Give your chapter a title' using errcode = '22023', hint = 'title';
  end if;
  if char_length(clean_title) > 120 then
    raise exception 'Keep the title under 120 characters' using errcode = '22023', hint = 'title';
  end if;
  if char_length(coalesce(clean_why, '')) > 1000 or char_length(coalesce(clean_ask, '')) > 1000
    or char_length(coalesce(clean_now, '')) > 1000 then
    raise exception 'Keep each answer under 1,000 characters' using errcode = '22023', hint = 'note';
  end if;
  if char_length(coalesce(clean_milestone, '')) > 200 then
    raise exception 'Keep the milestone under 200 characters' using errcode = '22023', hint = 'note';
  end if;
  if not (coalesce(p_share_story, false) or coalesce(p_share_current, false) or coalesce(p_share_future, false)) then
    raise exception 'Choose at least one thing to share' using errcode = '22023', hint = 'nothing_shared';
  end if;

  select count(*) into recent from public.chapter_invites i
  where i.sender_id = uid and i.created_at > now() - interval '1 day';
  if recent >= 20 then
    raise exception 'You''re doing that a lot. Take a breather and try again soon.'
      using errcode = 'check_violation', hint = 'rate_limited';
  end if;

  if p_recipient is not null then
    if p_recipient = uid then
      raise exception 'Pick someone other than yourself' using errcode = '22023', hint = 'not_reachable';
    end if;
    if private.blocked_between(uid, p_recipient) or not (
      exists (
        select 1 from public.connections c
        where c.user_low = least(uid, p_recipient) and c.user_high = greatest(uid, p_recipient)
          and c.status = 'accepted'
      )
      or exists (
        select 1 from public.user_chapters u
        where u.user_id = p_recipient and u.chapter_slug = uc.chapter_slug and u.status = 'open'
      )
    ) then
      raise exception 'You can only invite people in your circle or this Space'
        using errcode = 'check_violation', hint = 'not_reachable';
    end if;
    if exists (
      select 1 from public.chapter_companions c
      where c.user_chapter_id = uc.id and c.companion_id = p_recipient and c.ended_at is null
    ) then
      raise exception 'They''re already walking with you in this chapter'
        using errcode = 'check_violation', hint = 'already_companion';
    end if;
  end if;

  new_token := substr(md5(gen_random_uuid()::text || gen_random_uuid()::text), 1, 20);

  insert into public.chapter_invites (
    sender_id, user_chapter_id, chapter_slug, title, note, token,
    recipient_id, ask, share_story, share_current, share_future
  )
  values (
    uid, uc.id, uc.chapter_slug, clean_title, clean_why, new_token,
    p_recipient, clean_ask, coalesce(p_share_story, false), coalesce(p_share_current, false), coalesce(p_share_future, false)
  )
  returning chapter_invites.id into new_id;

  if p_share_story then
    perform private.set_invite_moments(new_id, uc.id, uid, p_log_entry_ids, p_post_ids);
  end if;

  -- Where you are now is the chapter's, not the invitation's: every
  -- companion who was shown it sees the latest.
  if p_share_current then
    insert into public.companion_chapter_notes (user_chapter_id, owner_id, where_now, milestone, milestone_date)
    values (uc.id, uid, clean_now, clean_milestone, p_milestone_date)
    on conflict (user_chapter_id) do update
      set where_now = excluded.where_now,
          milestone = excluded.milestone,
          milestone_date = excluded.milestone_date,
          updated_at = now();
  end if;

  if p_recipient is not null then
    insert into public.chapter_invite_recipients (invite_id, recipient_id) values (new_id, p_recipient);
    perform private.notify(
      p_recipient, 'companion_invite', uid, new_id,
      jsonb_build_object('title', clean_title, 'chapter_slug', uc.chapter_slug, 'token', new_token)
    );
  end if;

  id := new_id;
  token := new_token;
  return next;
end;
$$;

revoke execute on function public.create_companion_invite(uuid, text, text, text, text, text, date, boolean, boolean, boolean, uuid[], uuid[], uuid) from public, anon;
grant execute on function public.create_companion_invite(uuid, text, text, text, text, text, date, boolean, boolean, boolean, uuid[], uuid[], uuid) to authenticated;

-- An unanswered invitation the owner takes back.
create or replace function public.revoke_companion_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.chapter_invites
  set revoked_at = now()
  where id = p_invite_id and sender_id = (select auth.uid()) and revoked_at is null;
  delete from public.notifications n
  where n.entity_id = p_invite_id and n.kind in ('companion_invite', 'chapter_invite');
end;
$$;

revoke execute on function public.revoke_companion_invite(uuid) from public, anon;
grant execute on function public.revoke_companion_invite(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- The invitation card (/i/<token>, and in the app)
-- ---------------------------------------------------------------------------

-- Works signed out so a link can welcome someone new. Carries only what the
-- invitation itself says — counts, never the moments.
create or replace function public.companion_invite_card(p_token text)
returns table (
  id uuid,
  sender_id uuid,
  sender_name text,
  sender_avatar text,
  chapter_slug text,
  phase text,
  title text,
  why text,
  ask text,
  share_story boolean,
  share_current boolean,
  share_future boolean,
  moment_count integer,
  is_sender boolean,
  -- Addressed to someone, and the viewer isn't them.
  for_someone_else boolean,
  -- Someone has already accepted it (and it isn't the viewer).
  taken boolean,
  my_status public.invite_response,
  -- The viewer's companion relationship from this invitation, while live.
  my_companion_id uuid
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
    uc.phase,
    i.title,
    i.note,
    i.ask,
    i.share_story,
    i.share_current,
    i.share_future,
    (select count(*)::integer from public.chapter_invite_moments m where m.invite_id = i.id),
    i.sender_id = (select auth.uid()),
    i.recipient_id is not null and (select auth.uid()) is not null and i.recipient_id <> (select auth.uid()),
    exists (
      select 1 from public.chapter_companions c
      where c.invite_id = i.id and c.companion_id is distinct from (select auth.uid())
    ),
    (
      select r.status from public.chapter_invite_recipients r
      where r.invite_id = i.id and r.recipient_id = (select auth.uid())
    ),
    (
      select c.id from public.chapter_companions c
      where c.invite_id = i.id and c.companion_id = (select auth.uid()) and c.ended_at is null
    )
  from public.chapter_invites i
  join public.profiles p on p.id = i.sender_id
  join public.user_chapters uc on uc.id = i.user_chapter_id
  where i.token = p_token
    and i.revoked_at is null
    -- A block hides the card from either side.
    and not (
      (select auth.uid()) is not null
      and private.blocked_between(i.sender_id, (select auth.uid()))
    );
$$;

revoke execute on function public.companion_invite_card(text) from public;
grant execute on function public.companion_invite_card(text) to anon, authenticated;

-- "Accept invitation" / "Not now". Someone arriving by link becomes a
-- recipient as they answer. Accepting makes the viewer a companion of this
-- chapter — it never opens a Space for them or touches their circle.
-- Returns the answer and, when accepted, the companion relationship.
create or replace function public.respond_companion_invite(p_token text, p_accept boolean)
returns table (status text, companion_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  invite public.chapter_invites;
  answer public.invite_response;
  existing uuid;
  new_id uuid;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  select * into invite from public.chapter_invites i
  where i.token = p_token and i.revoked_at is null
  for update;
  if not found or private.blocked_between(invite.sender_id, uid) then
    raise exception 'This invitation is no longer available' using errcode = 'no_data_found', hint = 'gone';
  end if;
  if invite.sender_id = uid then
    raise exception 'This is your own invitation' using errcode = 'check_violation', hint = 'own';
  end if;
  if invite.recipient_id is not null and invite.recipient_id <> uid then
    raise exception 'This invitation was meant for someone else' using errcode = 'check_violation', hint = 'not_for_you';
  end if;
  if exists (select 1 from public.chapter_companions c where c.invite_id = invite.id and c.companion_id <> uid) then
    raise exception 'This invitation is no longer available' using errcode = 'no_data_found', hint = 'gone';
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

  delete from public.notifications n
  where n.user_id = uid and n.kind in ('companion_invite', 'chapter_invite') and n.entity_id = invite.id;

  if not p_accept then
    -- Quiet: the owner isn't told.
    update public.chapter_invite_recipients
    set status = 'declined', responded_at = now()
    where invite_id = invite.id and recipient_id = uid;
    status := 'declined';
    return next;
    return;
  end if;

  update public.chapter_invite_recipients
  set status = 'accepted', responded_at = now()
  where invite_id = invite.id and recipient_id = uid;

  -- Already walking with this chapter through another invitation: that one
  -- stays, this one is simply answered.
  select c.id into existing from public.chapter_companions c
  where c.user_chapter_id = invite.user_chapter_id and c.companion_id = uid and c.ended_at is null;
  if existing is not null then
    status := 'accepted';
    companion_id := existing;
    return next;
    return;
  end if;

  insert into public.chapter_companions (invite_id, user_chapter_id, owner_id, companion_id)
  values (invite.id, invite.user_chapter_id, invite.sender_id, uid)
  returning chapter_companions.id into new_id;

  perform private.notify(
    invite.sender_id, 'companion_accepted', uid, new_id,
    jsonb_build_object('title', invite.title, 'chapter_slug', invite.chapter_slug)
  );

  status := 'accepted';
  companion_id := new_id;
  return next;
end;
$$;

revoke execute on function public.respond_companion_invite(text, boolean) from public, anon;
grant execute on function public.respond_companion_invite(text, boolean) to authenticated;

-- INVITATIONS (the My Spaces and Space rails): invitations waiting on you.
create or replace function public.my_companion_invitations()
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
    and not exists (select 1 from public.chapter_companions c where c.invite_id = i.id)
    and not private.blocked_between(i.sender_id, r.recipient_id)
  order by r.created_at desc
  limit 20;
$$;

revoke execute on function public.my_companion_invitations() from public, anon;
grant execute on function public.my_companion_invitations() to authenticated;

-- ---------------------------------------------------------------------------
-- Companion: "Chapters I'm walking with" and the shared chapter
-- ---------------------------------------------------------------------------

create or replace function public.walking_with()
returns table (
  companion_id uuid,
  owner_id uuid,
  owner_name text,
  owner_avatar text,
  chapter_slug text,
  phase text,
  title text,
  milestone text,
  milestone_date date,
  latest_update text,
  latest_update_at timestamptz,
  muted boolean,
  since timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.owner_id,
    p.first_name,
    p.avatar_url,
    uc.chapter_slug,
    uc.phase,
    i.title,
    case when i.share_current then n.milestone end,
    case when i.share_current then n.milestone_date end,
    lu.body,
    lu.created_at,
    c.muted_at is not null,
    c.created_at
  from public.chapter_companions c
  join public.chapter_invites i on i.id = c.invite_id
  join public.user_chapters uc on uc.id = c.user_chapter_id
  join public.profiles p on p.id = c.owner_id
  left join public.companion_chapter_notes n on n.user_chapter_id = c.user_chapter_id
  left join lateral (
    select u.body, u.created_at
    from public.companion_update_recipients ur
    join public.companion_updates u on u.id = ur.update_id
    where ur.companion_id = c.id and i.share_future
    order by u.created_at desc
    limit 1
  ) lu on true
  where c.companion_id = (select auth.uid())
    and c.ended_at is null
    and not private.blocked_between(c.owner_id, c.companion_id)
  order by coalesce(lu.created_at, c.created_at) desc;
$$;

revoke execute on function public.walking_with() from public, anon;
grant execute on function public.walking_with() to authenticated;

-- The shared chapter's header — for its companion, or the owner.
create or replace function public.companion_detail(p_companion_id uuid)
returns table (
  companion_id uuid,
  user_chapter_id uuid,
  owner_id uuid,
  owner_name text,
  owner_avatar text,
  companion_user_id uuid,
  companion_name text,
  companion_avatar text,
  chapter_slug text,
  phase text,
  title text,
  why text,
  ask text,
  share_story boolean,
  share_current boolean,
  share_future boolean,
  where_now text,
  milestone text,
  milestone_date date,
  note_updated_at timestamptz,
  muted boolean,
  is_owner boolean,
  ended boolean,
  since timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.user_chapter_id,
    c.owner_id,
    op.first_name,
    op.avatar_url,
    c.companion_id,
    cp.first_name,
    cp.avatar_url,
    uc.chapter_slug,
    uc.phase,
    i.title,
    i.note,
    i.ask,
    i.share_story,
    i.share_current,
    i.share_future,
    case when i.share_current then n.where_now end,
    case when i.share_current then n.milestone end,
    case when i.share_current then n.milestone_date end,
    case when i.share_current then n.updated_at end,
    c.muted_at is not null,
    c.owner_id = (select auth.uid()),
    c.ended_at is not null,
    c.created_at
  from public.chapter_companions c
  join public.chapter_invites i on i.id = c.invite_id
  join public.user_chapters uc on uc.id = c.user_chapter_id
  join public.profiles op on op.id = c.owner_id
  join public.profiles cp on cp.id = c.companion_id
  left join public.companion_chapter_notes n on n.user_chapter_id = c.user_chapter_id
  where c.id = p_companion_id
    and private.companion_role(c.id) is not null;
$$;

revoke execute on function public.companion_detail(uuid) from public, anon;
grant execute on function public.companion_detail(uuid) to authenticated;

-- The moments the owner selected, oldest first. Only these paths ever leave
-- the database for a companion.
create or replace function public.companion_moments(p_companion_id uuid)
returns table (
  kind text,
  id uuid,
  body text,
  photo_path text,
  entry_date date,
  day_number integer,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case when m.log_entry_id is not null then 'log' else 'post' end,
    coalesce(le.id, p.id),
    coalesce(le.body, nullif(concat_ws(E'\n\n', p.title, p.body), '')),
    coalesce(
      le.photo_path,
      (
        select pm.storage_path from public.post_media pm
        where pm.post_id = p.id and pm.kind = 'photo'
        order by pm.position
        limit 1
      )
    ),
    coalesce(le.entry_date, (p.created_at at time zone 'utc')::date),
    greatest(
      1,
      coalesce(le.entry_date, (p.created_at at time zone 'utc')::date) - (uc.opened_at at time zone 'utc')::date + 1
    ),
    coalesce(le.created_at, p.created_at)
  from public.chapter_companions c
  join public.chapter_invites i on i.id = c.invite_id
  join public.user_chapters uc on uc.id = c.user_chapter_id
  join public.chapter_invite_moments m on m.invite_id = i.id
  left join public.log_entries le on le.id = m.log_entry_id
  left join public.posts p on p.id = m.post_id
  where c.id = p_companion_id
    and i.share_story
    and private.companion_role(c.id) is not null
    and (le.id is not null or p.id is not null)
  order by m.position;
$$;

revoke execute on function public.companion_moments(uuid) from public, anon;
grant execute on function public.companion_moments(uuid) to authenticated;

-- Updates shared with this companion, newest first.
create or replace function public.companion_shared_updates(p_companion_id uuid)
returns table (id uuid, body text, photo_path text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.body, u.photo_path, u.created_at
  from public.chapter_companions c
  join public.chapter_invites i on i.id = c.invite_id
  join public.companion_update_recipients ur on ur.companion_id = c.id
  join public.companion_updates u on u.id = ur.update_id
  where c.id = p_companion_id
    and i.share_future
    and private.companion_role(c.id) is not null
  order by u.created_at desc
  limit 100;
$$;

revoke execute on function public.companion_shared_updates(uuid) from public, anon;
grant execute on function public.companion_shared_updates(uuid) to authenticated;

-- Check-ins and replies, oldest first.
create or replace function public.companion_thread(p_companion_id uuid)
returns table (id uuid, author_id uuid, author_name text, author_avatar text, body text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.author_id, p.first_name, p.avatar_url, m.body, m.created_at
  from public.companion_messages m
  join public.profiles p on p.id = m.author_id
  where m.companion_id = p_companion_id
    and private.companion_role(p_companion_id) is not null
  order by m.created_at
  limit 300;
$$;

revoke execute on function public.companion_thread(uuid) from public, anon;
grant execute on function public.companion_thread(uuid) to authenticated;

-- "Check in with John" — or the owner's reply. Live relationships only.
create or replace function public.send_companion_message(p_companion_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  c public.chapter_companions;
  my_role text := private.companion_role(p_companion_id);
  clean text := trim(coalesce(p_body, ''));
  recent integer;
  new_id uuid;
  other uuid;
  slug text;
begin
  select * into c from public.chapter_companions cc where cc.id = p_companion_id;
  if my_role is null or c.ended_at is not null then
    raise exception 'You''re no longer walking with this chapter' using errcode = '42501', hint = 'not_companion';
  end if;
  if clean = '' then
    raise exception 'Write something first' using errcode = '22023', hint = 'body';
  end if;
  if char_length(clean) > 2000 then
    raise exception 'Keep it under 2,000 characters' using errcode = '22023', hint = 'body';
  end if;

  select count(*) into recent from public.companion_messages m
  where m.author_id = uid and m.created_at > now() - interval '1 hour';
  if recent >= 60 then
    raise exception 'You''re doing that a lot. Take a breather and try again soon.'
      using errcode = 'check_violation', hint = 'rate_limited';
  end if;

  insert into public.companion_messages (companion_id, author_id, body)
  values (p_companion_id, uid, clean)
  returning id into new_id;

  other := case when my_role = 'owner' then c.companion_id else c.owner_id end;
  select uc.chapter_slug into slug from public.user_chapters uc where uc.id = c.user_chapter_id;
  -- A muted companion still sees replies on the page, just without a ping.
  if not (my_role = 'owner' and c.muted_at is not null) then
    perform private.notify(
      other, 'companion_checkin', uid, p_companion_id,
      jsonb_build_object('chapter_slug', slug, 'from_owner', my_role = 'owner', 'excerpt', left(clean, 140))
    );
  end if;
  return new_id;
end;
$$;

revoke execute on function public.send_companion_message(uuid, text) from public, anon;
grant execute on function public.send_companion_message(uuid, text) to authenticated;

-- Mute or unmute (companion only).
create or replace function public.mute_companion(p_companion_id uuid, p_muted boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.chapter_companions
  set muted_at = case when p_muted then coalesce(muted_at, now()) end
  where id = p_companion_id and companion_id = (select auth.uid()) and ended_at is null;
  if not found then
    raise exception 'You''re no longer walking with this chapter' using errcode = '42501', hint = 'not_companion';
  end if;
end;
$$;

revoke execute on function public.mute_companion(uuid, boolean) from public, anon;
grant execute on function public.mute_companion(uuid, boolean) to authenticated;

-- The owner removes a companion, or the companion leaves. Access ends now.
create or replace function public.end_companion(p_companion_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  c public.chapter_companions;
begin
  select * into c from public.chapter_companions cc
  where cc.id = p_companion_id and cc.ended_at is null and uid in (cc.owner_id, cc.companion_id)
  for update;
  if not found then
    raise exception 'This companion is already gone' using errcode = 'no_data_found', hint = 'gone';
  end if;

  update public.chapter_companions set ended_at = now(), ended_by = uid where id = c.id;
  -- Nothing left for the companion to open.
  delete from public.notifications n
  where n.user_id = c.companion_id and n.entity_id = c.id
    and n.kind in ('companion_update', 'companion_checkin');
end;
$$;

revoke execute on function public.end_companion(uuid) from public, anon;
grant execute on function public.end_companion(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Owner: companions, updates, note, moments
-- ---------------------------------------------------------------------------

-- The Companions section of the owner's chapter.
create or replace function public.chapter_companion_list(p_user_chapter_id uuid)
returns table (
  companion_id uuid,
  user_id uuid,
  name text,
  avatar_url text,
  since timestamptz,
  share_story boolean,
  share_current boolean,
  share_future boolean,
  moment_count integer,
  last_message text,
  last_message_at timestamptz,
  last_message_mine boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.companion_id,
    p.first_name,
    p.avatar_url,
    c.created_at,
    i.share_story,
    i.share_current,
    i.share_future,
    (select count(*)::integer from public.chapter_invite_moments m where m.invite_id = i.id),
    lm.body,
    lm.created_at,
    lm.author_id = c.owner_id
  from public.chapter_companions c
  join public.chapter_invites i on i.id = c.invite_id
  join public.profiles p on p.id = c.companion_id
  left join lateral (
    select m.body, m.created_at, m.author_id from public.companion_messages m
    where m.companion_id = c.id
    order by m.created_at desc
    limit 1
  ) lm on true
  where c.user_chapter_id = p_user_chapter_id
    and c.owner_id = (select auth.uid())
    and c.ended_at is null
  order by coalesce(lm.created_at, c.created_at) desc;
$$;

revoke execute on function public.chapter_companion_list(uuid) from public, anon;
grant execute on function public.chapter_companion_list(uuid) to authenticated;

-- Invitations still out for this chapter.
create or replace function public.chapter_pending_invites(p_user_chapter_id uuid)
returns table (
  id uuid,
  token text,
  recipient_id uuid,
  recipient_name text,
  recipient_avatar text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, i.token, i.recipient_id, p.first_name, p.avatar_url, i.created_at
  from public.chapter_invites i
  left join public.profiles p on p.id = i.recipient_id
  where i.user_chapter_id = p_user_chapter_id
    and i.sender_id = (select auth.uid())
    and i.revoked_at is null
    and not exists (select 1 from public.chapter_companions c where c.invite_id = i.id)
    -- An addressed invitation they turned down is finished.
    and not exists (
      select 1 from public.chapter_invite_recipients r
      where r.invite_id = i.id and r.recipient_id = i.recipient_id and r.status <> 'pending'
    )
  order by i.created_at desc
  limit 30;
$$;

revoke execute on function public.chapter_pending_invites(uuid) from public, anon;
grant execute on function public.chapter_pending_invites(uuid) to authenticated;

-- "Share an update": to the companions picked (null = everyone who agreed to
-- future updates). Returns the update.
create or replace function public.share_companion_update(
  p_user_chapter_id uuid,
  p_body text,
  p_photo_path text default null,
  p_companion_ids uuid[] default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  uc public.user_chapters;
  clean text := nullif(trim(coalesce(p_body, '')), '');
  photo text := nullif(trim(coalesce(p_photo_path, '')), '');
  recent integer;
  audience uuid[];
  new_id uuid;
  target public.chapter_companions;
begin
  select * into uc from public.user_chapters u where u.id = p_user_chapter_id and u.user_id = uid;
  if not found then
    raise exception 'You can only share updates from your own chapter' using errcode = '42501', hint = 'not_yours';
  end if;
  if clean is null and photo is null then
    raise exception 'Write something or add a photo' using errcode = '22023', hint = 'body';
  end if;
  if char_length(coalesce(clean, '')) > 2000 then
    raise exception 'Keep it under 2,000 characters' using errcode = '22023', hint = 'body';
  end if;
  if photo is not null and photo not like uid::text || '/%' then
    raise exception 'Your photo didn''t finish uploading' using errcode = '22023', hint = 'photos';
  end if;

  select count(*) into recent from public.companion_updates u
  where u.owner_id = uid and u.created_at > now() - interval '1 day';
  if recent >= 30 then
    raise exception 'You''re doing that a lot. Take a breather and try again soon.'
      using errcode = 'check_violation', hint = 'rate_limited';
  end if;

  -- Only live companions of this chapter who agreed to future updates.
  select coalesce(array_agg(c.id), '{}') into audience
  from public.chapter_companions c
  join public.chapter_invites i on i.id = c.invite_id
  where c.user_chapter_id = uc.id
    and c.ended_at is null
    and i.share_future
    and (p_companion_ids is null or c.id = any(p_companion_ids));

  if p_companion_ids is not null and cardinality(audience) <> (select count(distinct x) from unnest(p_companion_ids) x) then
    raise exception 'Some of those people can''t get updates from this chapter'
      using errcode = 'check_violation', hint = 'not_companion';
  end if;
  if cardinality(audience) = 0 then
    raise exception 'No one to share this with yet' using errcode = 'check_violation', hint = 'no_audience';
  end if;

  insert into public.companion_updates (user_chapter_id, owner_id, body, photo_path)
  values (uc.id, uid, clean, photo)
  returning id into new_id;

  for target in select * from public.chapter_companions c where c.id = any(audience) loop
    insert into public.companion_update_recipients (update_id, companion_id) values (new_id, target.id);
    if target.muted_at is null then
      perform private.notify(
        target.companion_id, 'companion_update', uid, target.id,
        jsonb_build_object('chapter_slug', uc.chapter_slug, 'excerpt', left(coalesce(clean, ''), 140))
      );
    end if;
  end loop;

  return new_id;
end;
$$;

revoke execute on function public.share_companion_update(uuid, text, text, uuid[]) from public, anon;
grant execute on function public.share_companion_update(uuid, text, text, uuid[]) to authenticated;

-- Edit "Where are you now?" and the next milestone.
create or replace function public.set_companion_note(
  p_user_chapter_id uuid,
  p_where_now text,
  p_milestone text,
  p_milestone_date date default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  clean_now text := nullif(trim(coalesce(p_where_now, '')), '');
  clean_milestone text := nullif(trim(coalesce(p_milestone, '')), '');
begin
  if not exists (select 1 from public.user_chapters u where u.id = p_user_chapter_id and u.user_id = uid) then
    raise exception 'You can only edit your own chapter' using errcode = '42501', hint = 'not_yours';
  end if;
  if char_length(coalesce(clean_now, '')) > 1000 then
    raise exception 'Keep it under 1,000 characters' using errcode = '22023', hint = 'note';
  end if;
  if char_length(coalesce(clean_milestone, '')) > 200 then
    raise exception 'Keep the milestone under 200 characters' using errcode = '22023', hint = 'note';
  end if;
  insert into public.companion_chapter_notes (user_chapter_id, owner_id, where_now, milestone, milestone_date)
  values (p_user_chapter_id, uid, clean_now, clean_milestone, p_milestone_date)
  on conflict (user_chapter_id) do update
    set where_now = excluded.where_now,
        milestone = excluded.milestone,
        milestone_date = excluded.milestone_date,
        updated_at = now();
end;
$$;

revoke execute on function public.set_companion_note(uuid, text, text, date) from public, anon;
grant execute on function public.set_companion_note(uuid, text, text, date) to authenticated;

-- "Add more moments": replaces what one companion can see from the story so
-- far (and turns the story on for them).
create or replace function public.set_companion_moments(
  p_companion_id uuid,
  p_log_entry_ids uuid[],
  p_post_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  c public.chapter_companions;
  kept integer;
begin
  select * into c from public.chapter_companions cc
  where cc.id = p_companion_id and cc.owner_id = uid and cc.ended_at is null;
  if not found then
    raise exception 'You can only choose moments for your own companions' using errcode = '42501', hint = 'not_yours';
  end if;
  kept := private.set_invite_moments(c.invite_id, c.user_chapter_id, uid, p_log_entry_ids, p_post_ids);
  update public.chapter_invites set share_story = true where id = c.invite_id and not share_story;
  return kept;
end;
$$;

revoke execute on function public.set_companion_moments(uuid, uuid[], uuid[]) from public, anon;
grant execute on function public.set_companion_moments(uuid, uuid[], uuid[]) to authenticated;
