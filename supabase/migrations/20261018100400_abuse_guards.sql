-- Security hardening 4/5: abuse guards (audit 2026-10-18: M1, M2, M3, M4, L2,
-- L3, L5, L6).
--
--   M1  A bad time zone can't be saved (it broke the hourly card and email
--       jobs for everyone); members update only their notification switches.
--   M2  Referral rewards: the friend's chapter must have been open 7 days
--       before closing it qualifies; undoing the close undoes that; at most 12
--       rewards a year. New referral codes get a random suffix (L3) — existing
--       codes are kept so shared links still work.
--   M3  Rows written straight through the API get server timestamps, and a
--       message can't arrive pinned, deleted or edited.
--   M4  Blocks: no notifications from someone across a block (waves, nudges,
--       introductions...), no introducing across a block, no waving at them
--       in a room, and no editing old messages in a chat with them.
--   L2  revoke_companion_invite only touches your own invitation.
--   L5  The Bond engine never forms a Bond across a block.
--   L6  Only the people a question was routed to can answer it.

-- ===========================================================================
-- M1 · Time zones
-- ===========================================================================

create or replace function private.check_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Unknown time zone' using errcode = 'check_violation', hint = 'bad_timezone';
  end if;
  return new;
end;
$$;

update public.notification_preferences np
set timezone = 'UTC'
where not exists (select 1 from pg_catalog.pg_timezone_names t where t.name = np.timezone);

create trigger notification_preferences_check_timezone
  before insert or update of timezone on public.notification_preferences
  for each row execute function private.check_timezone();

-- The Settings switches (src/app/(app)/settings/actions.ts). The time zone
-- goes through set_my_timezone().
revoke update on public.notification_preferences from authenticated, anon;
grant update (chapter_prompt, wave_received, email_updates) on public.notification_preferences to authenticated;

-- ===========================================================================
-- M3 · Server timestamps on direct inserts
-- ===========================================================================

-- Only for rows a member writes through the API (current_user is
-- 'authenticated'); SECURITY DEFINER functions, jobs and the service role are
-- untouched. TG_ARGV[0] names the table's "when" column.
create or replace function private.force_insert_defaults()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  patch jsonb;
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  patch := jsonb_build_object(tg_argv[0], now());

  if tg_table_name = 'messages' then
    patch := patch || jsonb_build_object(
      'pinned_at', null, 'pinned_by', null,
      'deleted_at', null, 'deleted_by', null,
      'edited_at', null
    );
  elsif tg_table_name = 'reports' then
    patch := patch || jsonb_build_object('reviewed_by', null, 'reviewed_at', null, 'resolution_note', null);
  elsif tg_table_name = 'group_join_requests' then
    patch := patch || jsonb_build_object('reviewed_by', null, 'reviewed_at', null, 'requester_seen_at', null);
  elsif tg_table_name in ('posts', 'log_entries') then
    patch := patch || jsonb_build_object('updated_at', now());
  end if;

  new := jsonb_populate_record(new, patch);

  -- The member's own calendar day, within a day of the server's. (Nested:
  -- PL/pgSQL resolves every field in an expression, and only log_entries has
  -- entry_date.)
  if tg_table_name = 'log_entries' then
    if new.entry_date not between current_date - 1 and current_date + 1 then
      new.entry_date := current_date;
    end if;
  end if;
  return new;
end;
$$;

do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('posts', 'created_at'),
      ('messages', 'created_at'),
      ('log_entries', 'created_at'),
      ('space_questions', 'created_at'),
      ('space_question_replies', 'created_at'),
      ('truths', 'created_at'),
      ('truth_felt', 'created_at'),
      ('video_truths', 'created_at'),
      ('events', 'created_at'),
      ('event_attendees', 'created_at'),
      ('groups', 'created_at'),
      ('group_join_requests', 'created_at'),
      ('reports', 'created_at'),
      ('post_roots', 'created_at'),
      ('comment_roots', 'created_at'),
      ('waves', 'created_at'),
      ('match_dismissals', 'created_at'),
      ('live_rooms', 'started_at'),
      ('user_chapters', 'opened_at')
    ) as x (tbl, col)
  loop
    -- "force" sorts before the other BEFORE INSERT triggers that read these
    -- columns (e.g. user_chapters_untie_opened_at).
    execute format('drop trigger if exists %I on public.%I', t.tbl || '_force_defaults', t.tbl);
    execute format(
      'create trigger %I before insert on public.%I for each row execute function private.force_insert_defaults(%L)',
      t.tbl || '_force_defaults', t.tbl, t.col
    );
  end loop;
end;
$$;

-- ===========================================================================
-- M2 · Referrals
-- ===========================================================================

-- Qualifies when the friend closes a chapter they held for at least a week
-- (opened_at is the server's clock, see M3). Otherwise as 20260930100100.
create or replace function private.qualify_referral()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  qualified record;
begin
  if new.status = 'closed' and old.status = 'open'
     and coalesce(new.closed_at, now()) - new.opened_at >= interval '7 days' then
    for qualified in
      update public.referrals
      set status = 'qualified', qualified_at = now()
      where invitee_id = new.user_id and status = 'joined'
      returning id, referrer_id
    loop
      perform private.notify(qualified.referrer_id, 'referral_reward_earned', new.user_id, qualified.id);
    end loop;
  end if;
  return new;
end;
$$;

-- "Claim reward", at most 12 in any 12 months. Otherwise as 20260930100100.
create or replace function public.claim_referral_reward(p_referral_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  s public.subscriptions;
  base timestamptz;
  until timestamptz;
begin
  if (
    select count(*) from public.referrals r
    where r.referrer_id = uid and r.status = 'applied' and r.applied_at > now() - interval '1 year'
  ) >= 12 then
    raise exception 'You''ve claimed the most rewards for this year' using errcode = 'check_violation', hint = 'reward_cap';
  end if;

  update public.referrals
  set status = 'applied', applied_at = now()
  where id = p_referral_id and referrer_id = uid and status = 'qualified';

  if not found then
    raise exception 'That reward isn''t ready to claim' using errcode = 'no_data_found';
  end if;

  select * into s from public.subscriptions where user_id = uid for update;

  base := greatest(now(), coalesce(s.bonus_until, now()));
  if s.status = 'trialing' then
    base := greatest(base, coalesce(s.trial_ends_at, now()));
  elsif s.status in ('active', 'past_due', 'canceled') then
    base := greatest(base, coalesce(s.current_period_end, now()));
  end if;
  until := base + interval '1 month';

  update public.subscriptions set bonus_until = until where user_id = uid;
  return until;
end;
$$;

-- "Chapter closed" → Undo: as 20260930110100, and a referral this close
-- qualified (and that isn't claimed yet) goes back to waiting.
create or replace function public.reopen_chapter(p_user_chapter_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  target public.user_chapters;
begin
  select * into target
  from public.user_chapters
  where id = p_user_chapter_id and user_id = uid and status = 'closed'
  for update;
  if not found then
    raise exception 'That chapter isn''t closed' using errcode = 'no_data_found';
  end if;

  if target.closed_at < now() - interval '15 minutes' then
    raise exception 'This chapter is in your Life Archive now' using errcode = '22023', hint = 'too_late';
  end if;

  if exists (
    select 1 from public.user_chapters uc
    where uc.user_id = uid and uc.chapter_slug = target.chapter_slug and uc.status = 'open'
  ) then
    raise exception 'You''ve already started this chapter again' using errcode = '22023', hint = 'reopened';
  end if;

  delete from public.notifications n
  where n.user_id = uid and n.kind = 'wrapped_ready'
    and n.entity_id in (select w.id from public.wraps w where w.user_chapter_id = target.id);
  delete from public.wraps where user_chapter_id = target.id;
  delete from public.chapter_closures where user_chapter_id = target.id;

  update public.referrals
  set status = 'joined', qualified_at = null
  where invitee_id = uid and status = 'qualified' and qualified_at >= target.closed_at;

  update public.user_chapters set status = 'open', closed_at = null where id = target.id;
end;
$$;

-- New codes: the first name plus 8 random characters, so a code can't be
-- guessed from a name (L3). Codes already handed out stay as they are.
create or replace function public.my_referral()
returns table (code text, invites_sent integer, friends_joined integer, rewards_earned integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  mine text;
  base text;
  attempt integer := 0;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  select rc.code into mine from public.referral_codes rc where rc.user_id = uid;

  if mine is null then
    select coalesce(nullif(left(lower(regexp_replace(p.first_name, '[^a-zA-Z0-9]', '', 'g')), 12), ''), 'friend')
    into base
    from public.profiles p where p.id = uid;
    if char_length(base) < 3 then base := base || 'grv'; end if;

    loop
      attempt := attempt + 1;
      begin
        insert into public.referral_codes (user_id, code)
        values (uid, base || substr(md5(gen_random_uuid()::text), 1, 8))
        returning referral_codes.code into mine;
        exit;
      exception when unique_violation then
        -- Someone else won that code (or this user, concurrently).
        select rc.code into mine from public.referral_codes rc where rc.user_id = uid;
        exit when mine is not null or attempt >= 20;
      end;
    end loop;
  end if;

  return query
  select
    mine,
    (select count(*)::integer from public.referral_invites i where i.referrer_id = uid),
    (select count(*)::integer from public.referrals r where r.referrer_id = uid),
    (select count(*)::integer from public.referrals r where r.referrer_id = uid and r.status <> 'joined');
end;
$$;

-- ===========================================================================
-- M4 · Blocks
-- ===========================================================================

-- Nothing reaches someone from a person either of them has blocked. As
-- 20260911000900 otherwise.
create or replace function private.notify(
  p_user uuid,
  p_kind public.notification_kind,
  p_actor uuid,
  p_entity uuid,
  p_data jsonb default '{}'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null or p_user = p_actor then
    return;
  end if;

  if p_actor is not null and private.blocked_between(p_user, p_actor) then
    return;
  end if;

  if p_kind = 'wave_received' and exists (
    select 1 from public.notification_preferences np
    where np.user_id = p_user and not np.wave_received
  ) then
    return;
  end if;

  insert into public.notifications (user_id, kind, actor_id, entity_id, data)
  values (p_user, p_kind, p_actor, p_entity, coalesce(p_data, '{}'));
end;
$$;

-- Introductions: never across a block between any two of the three (the
-- connection survives a block now, so are_connected alone let it through).
-- Otherwise as 20260923000200.
create or replace function public.introduce(p_user_a uuid, p_user_b uuid, p_note text default null)
returns public.introductions
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  result public.introductions;
  clean_note text := nullif(trim(p_note), '');
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;
  if p_user_a = p_user_b or uid in (p_user_a, p_user_b) then
    raise exception 'Choose two other people' using errcode = 'check_violation';
  end if;
  if not (private.are_connected(uid, p_user_a) and private.are_connected(uid, p_user_b))
     or private.blocked_between(uid, p_user_a)
     or private.blocked_between(uid, p_user_b) then
    raise exception 'You can only introduce people in your circle'
      using errcode = 'insufficient_privilege', hint = 'not_in_circle';
  end if;
  if private.blocked_between(p_user_a, p_user_b) then
    raise exception 'They can''t be introduced' using errcode = 'check_violation', hint = 'blocked';
  end if;
  if exists (
    select 1 from public.connections c
    where c.user_low = least(p_user_a, p_user_b) and c.user_high = greatest(p_user_a, p_user_b)
  ) then
    raise exception 'They already know each other' using errcode = 'check_violation', hint = 'already_connected';
  end if;
  if char_length(clean_note) > 500 then
    raise exception 'Keep the note under 500 characters' using errcode = 'check_violation';
  end if;

  insert into public.introductions (introducer_id, user_a, user_b, note)
  values (uid, p_user_a, p_user_b, clean_note)
  on conflict (introducer_id, user_low, user_high) do nothing
  returning * into result;

  if result.id is null then
    raise exception 'You''ve already introduced them' using errcode = 'check_violation', hint = 'already_introduced';
  end if;

  perform private.notify(p_user_a, 'introduction_received', uid, p_user_b, jsonb_build_object('note', clean_note));
  perform private.notify(p_user_b, 'introduction_received', uid, p_user_a, jsonb_build_object('note', clean_note));
  return result;
end;
$$;

-- Waving in a Meet & Greet room: not at someone across a block.
drop policy "People in a room wave at each other" on public.waves;
create policy "People in a room wave at each other"
  on public.waves for insert
  to authenticated
  with check (
    from_user = (select auth.uid())
    and private.in_live_room(room_id)
    and private.user_in_live_room(room_id, to_user)
    and not private.blocked_between(from_user, to_user)
  );

-- A deleted message stays deleted, an edit is marked, and (new) nobody edits
-- their words in a direct chat across a block. Covers edit_my_message() and
-- direct updates. Deleting your own message is still allowed. Otherwise as
-- 20261008100100.
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
    if old.sender_id is not null and exists (
      select 1
      from public.conversations c
      join public.conversation_members m on m.conversation_id = c.id and m.user_id <> old.sender_id
      where c.id = old.conversation_id
        and c.kind = 'direct'
        and private.blocked_between(old.sender_id, m.user_id)
    ) then
      raise exception 'You can''t edit messages in this chat' using errcode = 'insufficient_privilege', hint = 'blocked';
    end if;
    new.edited_at := now();
  end if;
  return new;
end;
$$;

-- ===========================================================================
-- L2 · revoke_companion_invite: only your own
-- ===========================================================================

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
  if not found then
    raise exception 'That invitation is already off' using errcode = 'no_data_found', hint = 'gone';
  end if;
  delete from public.notifications n
  where n.entity_id = p_invite_id and n.kind in ('companion_invite', 'chapter_invite');
end;
$$;

-- ===========================================================================
-- L5 · No Bond across a block
-- ===========================================================================

-- As 20260930120100, with blocked pairs left out of the engine's candidates.
create or replace function private.assign_bonds(p_now timestamptz default now())
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  rules private.engine_rules;
  pair record;
  slots jsonb := '{}';
  kept text[] := '{}';
  low_used integer;
  high_used integer;
  released public.bonds;
  formed uuid;
begin
  select * into rules from private.engine_rules;

  for pair in
    select b.user_low, b.user_high from public.bonds b
    where b.status = 'active' and b.origin = 'invite'
  loop
    low_used := coalesce((slots ->> pair.user_low::text)::integer, 0);
    high_used := coalesce((slots ->> pair.user_high::text)::integer, 0);
    slots := slots
      || jsonb_build_object(pair.user_low::text, low_used + 1)
      || jsonb_build_object(pair.user_high::text, high_used + 1);
    kept := kept || (pair.user_low::text || ':' || pair.user_high::text);
  end loop;

  for pair in
    select x.user_low, x.user_high, coalesce(d.weighted_score, 0) as score, (b.id is not null) as current
    from (
      select b.user_low, b.user_high from public.bonds b where b.status = 'active' and b.origin = 'engine'
      union
      select d.user_low, d.user_high
      from private.bond_depth d
      join public.connections c
        on c.user_low = d.user_low and c.user_high = d.user_high and c.status = 'accepted'
      where d.threshold_met
    ) x
    left join private.bond_depth d on d.user_low = x.user_low and d.user_high = x.user_high
    left join public.bonds b
      on b.user_low = x.user_low and b.user_high = x.user_high and b.status = 'active' and b.origin = 'engine'
    where not exists (
        select 1 from public.bonds o
        where o.user_low = x.user_low and o.user_high = x.user_high
          and (o.status = 'pending' or (o.status = 'active' and o.origin = 'invite'))
      )
      and not exists (
        select 1 from public.bonds r
        where r.user_low = x.user_low and r.user_high = x.user_high
          and r.ended_by is not null
          and r.released_at > p_now - rules.release_cooldown
      )
      and not private.blocked_between(x.user_low, x.user_high)
    order by score desc, current desc, x.user_low, x.user_high
  loop
    low_used := coalesce((slots ->> pair.user_low::text)::integer, 0);
    high_used := coalesce((slots ->> pair.user_high::text)::integer, 0);
    if low_used < 5 and high_used < 5 then
      slots := slots
        || jsonb_build_object(pair.user_low::text, low_used + 1)
        || jsonb_build_object(pair.user_high::text, high_used + 1);
      kept := kept || (pair.user_low::text || ':' || pair.user_high::text);
    end if;
  end loop;

  -- Out first, so the cap never trips mid-reshuffle. Only engine Bonds move.
  for released in
    update public.bonds b
    set status = 'released', released_at = p_now
    where b.status = 'active'
      and b.origin = 'engine'
      and not ((b.user_low::text || ':' || b.user_high::text) = any (kept))
    returning b.*
  loop
    perform private.notify(released.user_low, 'bond_shifted', released.user_high, released.id);
    perform private.notify(released.user_high, 'bond_shifted', released.user_low, released.id);
  end loop;

  for pair in
    select split_part(k, ':', 1)::uuid as user_low, split_part(k, ':', 2)::uuid as user_high
    from unnest(kept) as k
  loop
    if not exists (
      select 1 from public.bonds b
      where b.user_low = pair.user_low and b.user_high = pair.user_high and b.status = 'active'
    ) then
      insert into public.bonds (inviter_id, invitee_id, status, accepted_at, origin)
      values (pair.user_low, pair.user_high, 'active', p_now, 'engine')
      returning id into formed;
      perform private.notify(pair.user_low, 'bond_formed', pair.user_high, formed);
      perform private.notify(pair.user_high, 'bond_formed', pair.user_low, formed);
    end if;
  end loop;

  delete from public.bond_ranks;
  insert into public.bond_ranks (user_id, bond_id, rank)
  select held.user_id, held.bond_id,
    row_number() over (partition by held.user_id order by held.score desc, held.since, held.bond_id)
  from (
    select b.id as bond_id, side.user_id, coalesce(d.weighted_score, 0) as score, coalesce(b.accepted_at, b.created_at) as since
    from public.bonds b
    cross join lateral (values (b.inviter_id), (b.invitee_id)) as side (user_id)
    left join private.bond_depth d on d.user_low = b.user_low and d.user_high = b.user_high
    where b.status = 'active'
  ) held;
end;
$$;

-- ===========================================================================
-- L6 · Only routed recipients answer a question
-- ===========================================================================

drop policy "Space members reply to live questions" on public.space_question_replies;
create policy "Routed recipients reply to live questions"
  on public.space_question_replies for insert
  to authenticated
  with check (
    private.receives_question(question_id)
    and exists (
      select 1 from public.space_questions q
      where q.id = question_id and q.expires_at > now()
    )
  );
