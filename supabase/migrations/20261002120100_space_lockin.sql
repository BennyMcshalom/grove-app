-- Choosing Free's four Spaces is final (testing feedback, 2 Oct 2026).
--
-- From three days before an in-app trial ends, the app asks which four Spaces
-- stay active. Once chosen — or, if they never choose, once the last-used
-- default applies at expiry — the choice is locked: on Free they can't swap a
-- paused Space for an active one. Season Pass (a plan, or a bonus month)
-- reactivates everything and clears the lock, as before.

alter table public.subscriptions
  -- When the four were locked in; null = not chosen (or cleared by a pass).
  add column spaces_locked_at timestamptz,
  -- The four that stay active on Free. Chosen during the trial, they take
  -- effect when it ends.
  add column locked_space_ids uuid[];

-- Season Pass only through Grouv's own trial: no store plan behind it and no
-- bonus month. A lock made now must survive into Free.
create or replace function private.pass_is_trial_only(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select private.has_pass(p_user_id)
      and s.status = 'trialing'
      and s.billing_store is null
      and coalesce(s.bonus_until, '-infinity'::timestamptz) <= now()
    from public.subscriptions s
    where s.user_id = p_user_id
  ), false);
$$;

revoke execute on function private.pass_is_trial_only(uuid) from public, anon, authenticated;

-- Brings one member's Spaces in line with their plan. With Season Pass every
-- paused Space comes back (and a paid pass clears the lock). On Free with more
-- than four active, a locked choice decides which four stay; without one, the
-- four used most recently stay and that default is locked in too.
create or replace function private.apply_space_limit(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  paused integer;
  keep uuid[];
begin
  if private.has_pass(p_user_id) then
    update public.user_chapters
    set paused_at = null
    where user_id = p_user_id and status = 'open' and paused_at is not null;

    update public.subscriptions
    set spaces_review_due = false
    where user_id = p_user_id and spaces_review_due;

    -- Subscribing or a bonus month frees the choice; a lock made during the
    -- trial is waiting for the trial to end, so it stays.
    if not private.pass_is_trial_only(p_user_id) then
      update public.subscriptions
      set spaces_locked_at = null, locked_space_ids = null
      where user_id = p_user_id and spaces_locked_at is not null;
    end if;
    return;
  end if;

  select s.locked_space_ids into keep
  from public.subscriptions s
  where s.user_id = p_user_id and s.spaces_locked_at is not null;

  -- The locked four rank first; any free slot left (a locked Space since
  -- closed) goes to the most recently used, as the default does.
  with ranked as (
    select
      uc.id,
      row_number() over (
        order by
        uc.id = any (coalesce(keep, '{}')) desc,
        greatest(
          uc.opened_at,
          coalesce((
            select max(p.created_at) from public.posts p
            where p.author_id = p_user_id and p.chapter_slug = uc.chapter_slug
          ), '-infinity'::timestamptz),
          coalesce((
            select max(l.created_at) from public.log_entries l
            where l.user_chapter_id = uc.id
          ), '-infinity'::timestamptz)
        ) desc,
        uc.is_primary desc,
        uc.opened_at desc
      ) as place
    from public.user_chapters uc
    where uc.user_id = p_user_id and uc.status = 'open' and uc.paused_at is null
  )
  update public.user_chapters uc
  set paused_at = now()
  from ranked
  where ranked.id = uc.id and ranked.place > 4;

  get diagnostics paused = row_count;
  if paused > 0 then
    -- Locked in: their choice, or — if they didn't choose in time — the
    -- default, which is now final too.
    update public.subscriptions
    set spaces_review_due = false,
        spaces_locked_at = coalesce(spaces_locked_at, now()),
        locked_space_ids = array(
          select uc.id from public.user_chapters uc
          where uc.user_id = p_user_id and uc.status = 'open' and uc.paused_at is null
        )
    where user_id = p_user_id;
    perform private.notify(p_user_id, 'spaces_paused', null, null, jsonb_build_object('paused', paused));
  end if;
end;
$$;

revoke execute on function private.apply_space_limit(uuid) from public, anon, authenticated;

-- "Choose which 4 Spaces stay active" → Lock in. During an in-app trial it
-- only records the choice (everything stays open until the trial ends). On
-- Free it pauses the others now. Either way it is final until Season Pass.
create or replace function public.choose_active_spaces(p_user_chapter_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  chosen uuid[] := array(select distinct unnest(coalesce(p_user_chapter_ids, '{}')));
  on_trial boolean;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  on_trial := private.pass_is_trial_only(uid);
  if private.has_pass(uid) and not on_trial then
    perform private.apply_space_limit(uid);
    return;
  end if;

  if exists (
    select 1 from public.subscriptions s
    where s.user_id = uid and s.spaces_locked_at is not null
  ) then
    raise exception 'Your four active Spaces are locked in on Free. Season Pass reactivates all eight.'
      using errcode = 'check_violation', hint = 'spaces_locked';
  end if;

  if cardinality(chosen) not between 1 and 4 then
    raise exception 'Choose up to four Spaces to keep active'
      using errcode = 'check_violation', hint = 'chapter_limit';
  end if;

  if exists (
    select 1 from unnest(chosen) as c(id)
    where not exists (
      select 1 from public.user_chapters uc
      where uc.id = c.id and uc.user_id = uid and uc.status = 'open'
    )
  ) then
    raise exception 'One of those Spaces is no longer open' using errcode = 'no_data_found';
  end if;

  if not on_trial then
    update public.user_chapters
    set paused_at = now()
    where user_id = uid and status = 'open' and paused_at is null and id <> all (chosen);

    update public.user_chapters
    set paused_at = null
    where user_id = uid and status = 'open' and paused_at is not null and id = any (chosen);
  end if;

  update public.subscriptions
  set spaces_review_due = false, spaces_locked_at = now(), locked_space_ids = chosen
  where user_id = uid;
end;
$$;

-- A paused Space's "Reactivate" when there's room (the limit trigger says no
-- otherwise). Once the four are locked in on Free, only Season Pass brings a
-- paused Space back.
create or replace function public.resume_space(p_user_chapter_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if not private.has_pass(uid) and exists (
    select 1 from public.subscriptions s
    where s.user_id = uid and s.spaces_locked_at is not null
  ) then
    raise exception 'Your four active Spaces are locked in on Free. Season Pass reactivates all eight.'
      using errcode = 'check_violation', hint = 'spaces_locked';
  end if;

  update public.user_chapters
  set paused_at = null
  where id = p_user_chapter_id and user_id = uid and status = 'open' and paused_at is not null;

  if not found then
    raise exception 'That Space is not paused' using errcode = 'no_data_found';
  end if;
end;
$$;

revoke execute on function public.choose_active_spaces(uuid[]) from public, anon;
grant execute on function public.choose_active_spaces(uuid[]) to authenticated;
revoke execute on function public.resume_space(uuid) from public, anon;
grant execute on function public.resume_space(uuid) to authenticated;
