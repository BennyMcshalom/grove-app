-- Testing feedback, 2 Oct 2026.
--
--   1. PENDING CONNECTION shows the introduction: pending_requests() returns
--      the note and starter prompt the sender wrote with introduce_yourself.
--   2. Bond Log photos: a response can carry a photo like a solo Log moment.

-- 1. pending_requests ---------------------------------------------------------
-- The return type grows, so it's dropped and recreated whole (latest:
-- 20260923000200_back_engine.sql). Still security invoker: the connections
-- row is the addressee's to read.
drop function public.pending_requests();

create function public.pending_requests()
returns table (
  kind text,
  request_id uuid,
  user_id uuid,
  first_name text,
  avatar_url text,
  chapter_slug text,
  phase text,
  created_at timestamptz,
  message text,
  prompt text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    'connection'::text,
    c.id,
    p.id,
    p.first_name,
    p.avatar_url,
    held.chapter_slug,
    held.phase,
    c.created_at,
    c.intro_message,
    c.intro_prompt
  from public.connections c
  join public.profiles p on p.id = c.requester_id
  left join lateral (
    select uc.chapter_slug, uc.phase from public.user_chapters uc
    where uc.user_id = p.id and uc.status = 'open'
    order by uc.opened_at
    limit 1
  ) held on true
  where c.addressee_id = (select auth.uid()) and c.status = 'pending'
  order by c.created_at desc
  limit 50;
$$;

revoke execute on function public.pending_requests() from public, anon;
grant execute on function public.pending_requests() to authenticated;

-- 2. Bond Log photos ----------------------------------------------------------
-- A response is words, a photo, or both — like a solo Log moment. The photo
-- sits in the author's own folder of the `media` bucket; its path only leaves
-- the table through bond_log(), which hands the partner theirs once shared,
-- so a draft's photo stays the author's.
alter table public.bond_log_responses
  add column photo_path text check (char_length(photo_path) <= 300),
  alter column body drop not null,
  add constraint bond_log_responses_has_content check (body is not null or photo_path is not null);

-- The signature grows, so the old one goes (latest:
-- 20260930120100_bond_invites_and_log.sql).
drop function public.save_bond_response(uuid, integer, text, boolean);

create function public.save_bond_response(
  p_activity_id uuid,
  p_round integer,
  p_body text,
  p_share boolean,
  p_photo_path text default null
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

  insert into public.bond_log_responses (activity_id, bond_id, round, author_id, body, photo_path, shared_at)
  values (a.id, b.id, p_round, uid, body, photo, case when p_share then now() end)
  on conflict (activity_id, round, author_id)
  do update set body = excluded.body, photo_path = excluded.photo_path, shared_at = excluded.shared_at
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

-- One Bond's log, round by round. Your own draft or answer, and theirs once
-- they've shared it — now with each side's photo. Return type grows, so it's
-- dropped and recreated whole.
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
  my_saved boolean
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
    mine.id is not null
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

revoke execute on function public.save_bond_response(uuid, integer, text, boolean, text) from public, anon;
revoke execute on function public.bond_log(uuid) from public, anon;
grant execute on function public.save_bond_response(uuid, integer, text, boolean, text) to authenticated;
grant execute on function public.bond_log(uuid) to authenticated;
