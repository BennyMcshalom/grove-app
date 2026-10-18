-- Security hardening 3/5: Nearby can't be used to pinpoint someone (audit
-- 2026-10-18, H1).
--
-- Members write their own proximity row, so anyone could place themselves
-- anywhere, ask nearby_people() from three spots and trilaterate a person to
-- ~100 m from the 0.1 km distances. Now:
--   * positions are kept on a 0.01° grid (~1 km), not 0.001°;
--   * distances come back as whole kilometres, never under 1 ("1 km");
--   * the search radius is capped at 25 km;
--   * a position may move at most once every 30 seconds (a faster move is
--     ignored and the previous spot kept, so a heartbeat never fails), and
--     never faster than 300 km/h since the last fix (that write is refused).
--     The last fix lives in private.last_fix and outlives the session, so
--     turning Proximity off and on doesn't reset it.
--   * Event check-ins (JA-02) still use the precise fix, inside this trigger,
--     before it is coarsened; the precise fix is never stored.
--   * People only show up when their "Current chapter" audience lets the
--     viewer see their chapter — the card always shows it.
--
-- A per-session random offset was considered and left out: on top of the
-- 1 km grid and whole-km bands it adds little, and it would make the 0.5 km
-- ring and event check-ins unreliable.

create table private.last_fix (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  -- On the 0.01° grid.
  latitude double precision not null,
  longitude double precision not null,
  -- When they were last seen at this spot / when the spot last changed.
  seen_at timestamptz not null default now(),
  changed_at timestamptz not null default now()
);

revoke all on private.last_fix from public, anon, authenticated;

create or replace function private.coarsen_location()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  last private.last_fix;
  lat double precision := round(new.latitude::numeric, 2)::double precision;
  lng double precision := round(new.longitude::numeric, 2)::double precision;
  -- The precise fix, for the event check-in only.
  fix_lat double precision := new.latitude;
  fix_lng double precision := new.longitude;
  had_fix boolean;
  moved boolean := false;
  hours double precision;
begin
  select * into last from private.last_fix f where f.user_id = new.user_id for update;
  had_fix := found;

  if had_fix and (last.latitude <> lat or last.longitude <> lng) then
    if last.changed_at > now() - interval '30 seconds' then
      -- One move per 30 seconds: keep the previous spot.
      lat := last.latitude;
      lng := last.longitude;
      fix_lat := lat;
      fix_lng := lng;
    else
      hours := greatest(extract(epoch from now() - last.seen_at) / 3600.0, 1.0 / 3600);
      if private.distance_km(last.latitude, last.longitude, lat, lng) / hours > 300 then
        raise exception 'That location doesn''t look right'
          using errcode = 'check_violation', hint = 'implausible_move';
      end if;
      moved := true;
    end if;
  end if;

  -- Gatherings: within 0.5 km of a venue checks you in.
  insert into private.event_checkins (event_id, user_id)
  select e.id, new.user_id
  from public.events e
  join public.event_attendees a on a.event_id = e.id and a.user_id = new.user_id
  where e.status = 'scheduled'
    and e.latitude is not null
    and now() between e.starts_at - interval '15 minutes' and e.starts_at + interval '4 hours'
    and private.distance_km(e.latitude, e.longitude, fix_lat, fix_lng) <= 0.5
  on conflict do nothing;

  insert into private.last_fix (user_id, latitude, longitude, seen_at, changed_at)
  values (new.user_id, lat, lng, now(), now())
  on conflict (user_id) do update
  set latitude = excluded.latitude,
      longitude = excluded.longitude,
      seen_at = now(),
      changed_at = case when moved then now() else private.last_fix.changed_at end;

  new.latitude := lat;
  new.longitude := lng;
  return new;
end;
$$;

revoke execute on function private.coarsen_location() from public, anon, authenticated;

-- The check-in moved into coarsen_location(), where the precise fix is.
drop trigger if exists proximity_sessions_check_in on public.proximity_sessions;
drop function if exists private.check_in_to_events();

-- As 20260923000200, with whole-km distances, a 25 km cap and the chapter
-- audience.
create or replace function public.nearby_people(p_radius_km double precision default 0.5)
returns table (
  user_id uuid,
  first_name text,
  avatar_url text,
  aura public.aura,
  chapter_slug text,
  phase text,
  distance_km numeric,
  same_stage boolean,
  waved_at_me boolean,
  i_waved boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  me public.proximity_sessions;
begin
  select * into me from public.proximity_sessions s
  where s.user_id = uid and s.expires_at > now();

  if not found then
    raise exception 'Turn on Proximity to see people nearby'
      using errcode = 'insufficient_privilege', hint = 'proximity_off';
  end if;

  return query
  select
    p.id,
    p.first_name,
    p.avatar_url,
    p.aura,
    coalesce(stage.chapter_slug, shown.chapter_slug),
    coalesce(stage.phase, shown.phase),
    greatest(1, ceil(distance.km))::numeric,
    stage.chapter_slug is not null,
    exists (select 1 from public.waves w where w.room_id is null and w.from_user = p.id and w.to_user = uid),
    exists (select 1 from public.waves w where w.room_id is null and w.from_user = uid and w.to_user = p.id)
  from public.proximity_sessions s
  join public.profiles p on p.id = s.user_id
  cross join lateral (
    select private.distance_km(me.latitude, me.longitude, s.latitude, s.longitude) as km
  ) distance
  -- A chapter where both are at the exact same stage, if any.
  left join lateral (
    select theirs.chapter_slug, theirs.phase
    from public.user_chapters theirs
    join public.user_chapters mine
      on mine.user_id = uid and mine.status = 'open'
      and mine.chapter_slug = theirs.chapter_slug and mine.phase = theirs.phase
    where theirs.user_id = s.user_id and theirs.status = 'open'
    order by theirs.opened_at
    limit 1
  ) stage on true
  -- Otherwise the chapter they've held longest, for the card.
  left join lateral (
    select theirs.chapter_slug, theirs.phase
    from public.user_chapters theirs
    where theirs.user_id = s.user_id and theirs.status = 'open'
    order by theirs.opened_at
    limit 1
  ) shown on true
  where s.user_id <> uid
    and s.expires_at > now()
    and distance.km <= least(greatest(p_radius_km, 0.1), 25)
    and (s.mode = 'open' or stage.chapter_slug is not null)
    and not private.blocked_between(uid, s.user_id)
    -- Their "Current chapter" audience: the card always shows a chapter.
    and private.field_visible(s.user_id, 'chapter')
    -- Stage-only viewers only look for their stage too.
    and (me.mode = 'open' or stage.chapter_slug is not null)
    and coalesce(stage.chapter_slug, shown.chapter_slug) is not null
  order by distance.km, p.id
  limit 50;
end;
$$;
