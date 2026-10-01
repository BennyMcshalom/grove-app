-- Life Wrapped (PRD §9, §13): short stories built from a member's own Grouv
-- Log, a safe public share card for one moment, and the closing ritual's undo.
--
-- A wrap copies the moments it picked (text and photo path) so the member can
-- edit the wrap without touching their Log. Sharing stores a sanitised
-- snapshot of one moment; the public page reads only that snapshot.
--
-- Generating, editing and sharing need the Season Pass. Wraps already made
-- stay readable on Free, and a link can always be revoked.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.wraps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  range public.wrap_range not null,
  -- The closed chapter a 'chapter' wrap covers.
  user_chapter_id uuid references public.user_chapters (id) on delete cascade,
  -- The chapters it pulled moments from.
  source_chapter_ids uuid[] not null,
  starts_on date not null,
  ends_on date not null,
  -- The stage the member was in: "Starting over".
  title text not null,
  created_at timestamptz not null default now(),
  check ((range = 'chapter') = (user_chapter_id is not null)),
  check (starts_on <= ends_on)
);

create unique index wraps_one_per_chapter on public.wraps (user_chapter_id) where user_chapter_id is not null;
create index wraps_by_user on public.wraps (user_id, created_at desc);

alter table public.wraps enable row level security;

create policy "Members read their own wraps"
  on public.wraps for select
  to authenticated
  using (user_id = (select auth.uid()));

create table public.wrap_moments (
  id uuid primary key default gen_random_uuid(),
  wrap_id uuid not null references public.wraps (id) on delete cascade,
  position smallint not null,
  -- The Log entry it came from; the wrap keeps its copy if that's deleted.
  log_entry_id uuid references public.log_entries (id) on delete set null,
  body text check (char_length(body) <= 2000),
  photo_path text,
  moment_date date not null,
  edited_at timestamptz,
  unique (wrap_id, position),
  check (body is not null or photo_path is not null)
);

alter table public.wrap_moments enable row level security;

create policy "Members read their own wrap moments"
  on public.wrap_moments for select
  to authenticated
  using (exists (
    select 1 from public.wraps w
    where w.id = wrap_id and w.user_id = (select auth.uid())
  ));

-- One public link per shared card. Everything the public page shows is
-- copied here when the link is made, already stripped of hidden details.
create table public.wrap_shares (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  user_id uuid not null references public.profiles (id) on delete cascade,
  wrap_id uuid not null references public.wraps (id) on delete cascade,
  moment_id uuid references public.wrap_moments (id) on delete set null,
  -- Null when "Hide names" was on.
  sharer_name text,
  range public.wrap_range not null,
  starts_on date not null,
  ends_on date not null,
  body text,
  -- Null when "Hide photos" was on.
  photo_path text,
  moment_date date not null,
  hide_names boolean not null,
  hide_photos boolean not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index wrap_shares_by_wrap on public.wrap_shares (wrap_id);

alter table public.wrap_shares enable row level security;

create policy "Members read their own share links"
  on public.wrap_shares for select
  to authenticated
  using (user_id = (select auth.uid()));

create trigger wrap_shares_rate_limit before insert on public.wrap_shares
  for each row execute function private.enforce_rate_limit('user_id', '30', '1 day');

-- ---------------------------------------------------------------------------
-- Building a wrap
-- ---------------------------------------------------------------------------

-- Picks up to five of the member's own solo Log moments in the window and
-- stores them as a wrap. No AI: the best moment of each day (a photo counts
-- most, then a real sentence), spread evenly across the days, then the
-- runners-up if there are fewer than five days. Returns null below three
-- moments ("Not enough moments yet").
create or replace function private.build_wrap(
  p_user uuid,
  p_range public.wrap_range,
  p_sources uuid[],
  p_starts date,
  p_ends date,
  p_user_chapter_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  available integer;
  picks jsonb;
  wrap_title text;
  new_id uuid;
begin
  select count(*) into available
  from public.log_entries e
  where e.user_id = p_user
    and e.scope = 'solo'
    and e.user_chapter_id = any(p_sources)
    and e.entry_date between p_starts and p_ends;

  if available < 3 then
    return null;
  end if;

  select coalesce(jsonb_agg(to_jsonb(pick)), '[]') into picks
  from (
    with candidates as (
      select
        e.id, e.user_chapter_id, e.body, e.photo_path, e.entry_date, e.created_at,
        (case when e.photo_path is not null then 2 else 0 end)
          + (case when char_length(coalesce(e.body, '')) >= 20 then 1 else 0 end) as score
      from public.log_entries e
      where e.user_id = p_user
        and e.scope = 'solo'
        and e.user_chapter_id = any(p_sources)
        and e.entry_date between p_starts and p_ends
    ),
    ranked as (
      select c.*, row_number() over (partition by c.entry_date order by c.score desc, c.created_at desc) as day_rank
      from candidates c
    ),
    days as (
      select r.*,
        row_number() over (order by r.entry_date) as k,
        count(*) over () as n
      from ranked r
      where r.day_rank = 1
    ),
    ordered as (
      select d.id, d.user_chapter_id, d.body, d.photo_path, d.entry_date, d.created_at, d.day_rank, d.score,
        -- 0 for the five days spread evenly across the window; a photo
        -- earns an off-spread day the same footing.
        (case when exists (
          select 1 from generate_series(0, 4) i where 1 + round(i * (d.n - 1) / 4.0) = d.k
        ) then 0 else 1 end) - (case when d.photo_path is not null then 1 else 0 end) as spread
      from days d
      union all
      select r.id, r.user_chapter_id, r.body, r.photo_path, r.entry_date, r.created_at, r.day_rank, r.score, 0
      from ranked r
      where r.day_rank > 1
    )
    select o.id as log_entry_id, o.user_chapter_id, o.body, o.photo_path, o.entry_date, o.created_at
    from ordered o
    order by o.day_rank, o.spread, o.score desc, o.entry_date desc
    limit 5
  ) pick;

  -- The stage of the chapter most of the moments came from.
  select coalesce(uc.phase, c.name, 'Your Life Wrapped') into wrap_title
  from (
    select p.user_chapter_id, count(*) as moments
    from jsonb_to_recordset(picks) as p (user_chapter_id uuid)
    group by p.user_chapter_id
    order by moments desc, p.user_chapter_id
    limit 1
  ) top
  join public.user_chapters uc on uc.id = top.user_chapter_id
  left join public.chapters c on c.slug = uc.chapter_slug;

  insert into public.wraps (user_id, range, user_chapter_id, source_chapter_ids, starts_on, ends_on, title)
  values (p_user, p_range, p_user_chapter_id, p_sources, p_starts, p_ends, coalesce(wrap_title, 'Your Life Wrapped'))
  returning id into new_id;

  insert into public.wrap_moments (wrap_id, position, log_entry_id, body, photo_path, moment_date)
  select new_id, row_number() over (order by p.entry_date, p.created_at), p.log_entry_id, p.body, p.photo_path, p.entry_date
  from jsonb_to_recordset(picks) as p (
    log_entry_id uuid, body text, photo_path text, entry_date date, created_at timestamptz
  );

  return new_id;
end;
$$;

revoke execute on function private.build_wrap(uuid, public.wrap_range, uuid[], date, date, uuid) from public, anon, authenticated;

-- "Choose a time range" → "Choose what to include" → Continue. Returns the
-- wrap (an existing one for the same window, so edits aren't lost). Raises
-- with hint 'not_enough' when there are fewer than three moments.
create or replace function public.generate_wrap(
  p_range public.wrap_range,
  p_source_chapter_ids uuid[] default '{}',
  p_user_chapter_id uuid default null,
  p_today date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  -- The member's calendar day, within a day of the server's.
  today date := case
    when p_today between current_date - 1 and current_date + 1 then p_today
    else current_date
  end;
  closed public.user_chapters;
  sources uuid[];
  starts date;
  ends date;
  existing uuid;
  built uuid;
begin
  if uid is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;

  -- An existing wrap comes back on any plan; only a new one needs the pass.
  if p_range = 'chapter' then
    select * into closed
    from public.user_chapters
    where id = p_user_chapter_id and user_id = uid and status = 'closed';
    if not found then
      raise exception 'That chapter isn''t closed yet' using errcode = 'no_data_found';
    end if;

    select w.id into existing from public.wraps w where w.user_chapter_id = closed.id;
    if existing is not null then
      return existing;
    end if;

    sources := array[closed.id];
    starts := closed.opened_at::date;
    ends := greatest(closed.closed_at::date, closed.opened_at::date);
  else
    sources := array(
      select uc.id from public.user_chapters uc
      where uc.user_id = uid and uc.id = any(p_source_chapter_ids)
      order by uc.id
    );
    if cardinality(sources) = 0 then
      raise exception 'Pick at least one chapter' using errcode = '22023', hint = 'no_sources';
    end if;

    ends := today;
    starts := case when p_range = 'week' then date_trunc('week', today)::date else today - 29 end;

    select w.id into existing
    from public.wraps w
    where w.user_id = uid
      and w.range = p_range
      and w.starts_on = starts
      and w.ends_on = ends
      and w.source_chapter_ids @> sources
      and sources @> w.source_chapter_ids
    order by w.created_at desc
    limit 1;
    if existing is not null then
      return existing;
    end if;
  end if;

  if not private.has_pass(uid) then
    raise exception 'Life Wrapped comes with the Season Pass' using errcode = '42501', hint = 'pass_required';
  end if;

  built := private.build_wrap(uid, p_range, sources, starts, ends, case when p_range = 'chapter' then closed.id end);
  if built is null then
    raise exception 'Not enough moments yet' using errcode = 'P0001', hint = 'not_enough';
  end if;

  -- A closed chapter's wrap can finish after the member has moved on.
  if p_range = 'chapter' then
    insert into public.notifications (user_id, kind, entity_id, data)
    values (uid, 'wrapped_ready', built, jsonb_build_object('range', 'chapter', 'chapter_slug', closed.chapter_slug));
  end if;

  return built;
end;
$$;

revoke execute on function public.generate_wrap(public.wrap_range, uuid[], uuid, date) from public, anon;
grant execute on function public.generate_wrap(public.wrap_range, uuid[], uuid, date) to authenticated;

-- "Edit this wrap" → Save. Changes the wrap's copy of the moment; with
-- p_update_source it also updates the original Log entry ("Memory updated"),
-- but only while that entry's chapter is open — closed chapters are read-only.
create or replace function public.update_wrap_moment(
  p_moment_id uuid,
  p_body text,
  p_update_source boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  moment public.wrap_moments;
  new_body text := nullif(trim(p_body), '');
  source_updated boolean := false;
begin
  if not private.has_pass(uid) then
    raise exception 'Editing a wrap comes with the Season Pass' using errcode = '42501', hint = 'pass_required';
  end if;

  select m.* into moment
  from public.wrap_moments m
  join public.wraps w on w.id = m.wrap_id
  where m.id = p_moment_id and w.user_id = uid;
  if not found then
    raise exception 'That moment isn''t in your wraps' using errcode = 'no_data_found';
  end if;

  if new_body is null and moment.photo_path is null then
    raise exception 'Write something for this moment' using errcode = '22023', hint = 'empty';
  end if;
  if char_length(new_body) > 2000 then
    raise exception 'That''s a little long for one moment' using errcode = '22001';
  end if;

  update public.wrap_moments set body = new_body, edited_at = now() where id = moment.id;

  if p_update_source and moment.log_entry_id is not null then
    update public.log_entries e
    set body = new_body
    where e.id = moment.log_entry_id
      and e.user_id = uid
      and (new_body is not null or e.photo_path is not null)
      and exists (
        select 1 from public.user_chapters uc
        where uc.id = e.user_chapter_id and uc.status = 'open'
      );
    source_updated := found;
  end if;

  return source_updated;
end;
$$;

revoke execute on function public.update_wrap_moment(uuid, text, boolean) from public, anon;
grant execute on function public.update_wrap_moment(uuid, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Sharing
-- ---------------------------------------------------------------------------

-- "Hide names": the member's own name and the people they're connected or
-- bonded with become "someone"; chapter names become "this chapter".
create or replace function private.hide_wrap_names(p_user uuid, p_body text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result text := p_body;
  person text;
  chapter_name text;
begin
  if p_body is null then
    return null;
  end if;

  for person in
    select distinct p.first_name
    from public.profiles p
    where char_length(p.first_name) >= 2
      and (
        p.id = p_user
        or exists (
          select 1 from public.connections c
          where c.status = 'accepted'
            and ((c.requester_id = p_user and c.addressee_id = p.id) or (c.addressee_id = p_user and c.requester_id = p.id))
        )
        or exists (
          select 1 from public.bonds b
          where (b.inviter_id = p_user and b.invitee_id = p.id) or (b.invitee_id = p_user and b.inviter_id = p.id)
        )
      )
  loop
    result := regexp_replace(
      result,
      '\m' || regexp_replace(person, '([^[:alnum:][:space:]])', '\\\1', 'g') || '\M',
      'someone',
      'gi'
    );
  end loop;

  for chapter_name in select c.name from public.chapters c loop
    result := regexp_replace(result, '\m' || chapter_name || '\M', 'this chapter', 'gi');
  end loop;

  return result;
end;
$$;

revoke execute on function private.hide_wrap_names(uuid, text) from public, anon, authenticated;

-- Preview → "Create link". Returns the new link's id and token.
create or replace function public.create_wrap_share(
  p_moment_id uuid,
  p_hide_names boolean default false,
  p_hide_photos boolean default false
)
returns table (id uuid, token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  moment public.wrap_moments;
  wrap public.wraps;
  new_token text;
  share_body text;
  share_photo text;
begin
  if not private.has_pass(uid) then
    raise exception 'Sharing a wrap comes with the Season Pass' using errcode = '42501', hint = 'pass_required';
  end if;

  select m.* into moment
  from public.wrap_moments m
  join public.wraps w on w.id = m.wrap_id
  where m.id = p_moment_id and w.user_id = uid;
  if not found then
    raise exception 'That moment isn''t in your wraps' using errcode = 'no_data_found';
  end if;
  select * into wrap from public.wraps w where w.id = moment.wrap_id;

  share_body := case when p_hide_names then private.hide_wrap_names(uid, moment.body) else moment.body end;
  share_photo := case when p_hide_photos then null else moment.photo_path end;
  if share_body is null and share_photo is null then
    raise exception 'This moment is only a photo. Turn off Hide photos to share it.' using errcode = '22023', hint = 'empty';
  end if;

  -- 64 random bits, short enough to read aloud.
  new_token := substr(md5(gen_random_uuid()::text || gen_random_uuid()::text), 1, 16);

  insert into public.wrap_shares as s (
    token, user_id, wrap_id, moment_id, sharer_name, range, starts_on, ends_on,
    body, photo_path, moment_date, hide_names, hide_photos
  )
  select
    new_token, uid, wrap.id, moment.id,
    case when p_hide_names then null else p.first_name end,
    wrap.range, wrap.starts_on, wrap.ends_on,
    share_body, share_photo, moment.moment_date, p_hide_names, p_hide_photos
  from public.profiles p
  where p.id = uid
  returning s.id, s.token into id, token;

  return next;
end;
$$;

revoke execute on function public.create_wrap_share(uuid, boolean, boolean) from public, anon;
grant execute on function public.create_wrap_share(uuid, boolean, boolean) to authenticated;

-- The Preview step: the moment's text exactly as the card would carry it.
create or replace function public.wrap_share_preview(p_moment_id uuid, p_hide_names boolean default false)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  moment_body text;
begin
  select m.body into moment_body
  from public.wrap_moments m
  join public.wraps w on w.id = m.wrap_id
  where m.id = p_moment_id and w.user_id = uid;
  if not found then
    raise exception 'That moment isn''t in your wraps' using errcode = 'no_data_found';
  end if;
  return case when p_hide_names then private.hide_wrap_names(uid, moment_body) else moment_body end;
end;
$$;

revoke execute on function public.wrap_share_preview(uuid, boolean) from public, anon;
grant execute on function public.wrap_share_preview(uuid, boolean) to authenticated;

-- "Revoke link". Never gated: taking something back is always allowed.
create or replace function public.revoke_wrap_share(p_share_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.wrap_shares
  set revoked_at = now()
  where id = p_share_id and user_id = (select auth.uid()) and revoked_at is null;
  if not found then
    raise exception 'That link is already off' using errcode = 'no_data_found';
  end if;
end;
$$;

revoke execute on function public.revoke_wrap_share(uuid) from public, anon;
grant execute on function public.revoke_wrap_share(uuid) to authenticated;

-- The public page at /w/<token>: the snapshot and nothing else. Works
-- signed out; a revoked or unknown token returns no row.
create or replace function public.shared_wrap_card(p_token text)
returns table (
  sharer_name text,
  range public.wrap_range,
  starts_on date,
  ends_on date,
  body text,
  photo_path text,
  moment_date date
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.sharer_name, s.range, s.starts_on, s.ends_on, s.body, s.photo_path, s.moment_date
  from public.wrap_shares s
  where s.token = p_token and s.revoked_at is null;
$$;

revoke execute on function public.shared_wrap_card(text) from public;
grant execute on function public.shared_wrap_card(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Closing ritual: undo
-- ---------------------------------------------------------------------------

-- "Chapter closed" → Undo. Safe only for a few minutes, and only while the
-- same chapter hasn't been opened again. Removes the closing reflection and
-- the chapter's wrap (and with it any links to it).
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

  update public.user_chapters set status = 'open', closed_at = null where id = target.id;
end;
$$;

revoke execute on function public.reopen_chapter(uuid) from public, anon;
grant execute on function public.reopen_chapter(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Weekly Wrapped
-- ---------------------------------------------------------------------------

-- Sunday evening: a week wrap for every Season Pass member with at least
-- three moments this week across their open chapters, then "Your weekly
-- Wrapped is ready". Skips anyone who already made this week's.
create or replace function private.generate_weekly_wraps()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  member record;
  built uuid;
  made integer := 0;
  week_start date := date_trunc('week', current_date)::date;
begin
  for member in
    select e.user_id, array_agg(distinct e.user_chapter_id order by e.user_chapter_id) as sources
    from public.log_entries e
    join public.user_chapters uc on uc.id = e.user_chapter_id and uc.status = 'open'
    where e.scope = 'solo' and e.entry_date between week_start and current_date
    group by e.user_id
    having count(*) >= 3
  loop
    continue when not private.has_pass(member.user_id);
    continue when exists (
      select 1 from public.wraps w
      where w.user_id = member.user_id and w.range = 'week' and w.starts_on = week_start
    );

    built := private.build_wrap(member.user_id, 'week', member.sources, week_start, current_date);
    if built is not null then
      insert into public.notifications (user_id, kind, entity_id, data)
      values (member.user_id, 'wrapped_ready', built, jsonb_build_object('range', 'week'));
      made := made + 1;
    end if;
  end loop;
  return made;
end;
$$;

revoke execute on function private.generate_weekly_wraps() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $job$select cron.schedule('grouv-weekly-wraps', '0 18 * * 0', 'select private.generate_weekly_wraps()')$job$;
  end if;
end;
$$;
