-- Curio for 24 hours, and everyone gets their Curio (testing feedback, 6 Oct 2026).
--
-- Why some members saw only Wander: the starter catalogue has four Curio cards
-- per Space, and a card was never served again inside 60 days (nor anything
-- from its topic cluster inside 7). After four mornings a Space's pool was
-- empty, so its Curio slot quietly went blank — while Wander, drawing from
-- several clusters across every Space someone holds, kept going a little
-- longer. Members who joined after 05:00 also waited until the next morning,
-- because cards were only ever delivered by the 05:45 job.
--
-- Now:
--   * Cards live for 24 hours from when they're served (a rolling day: the
--     data already carries expires_at, and a set served at 9pm shouldn't
--     vanish at midnight).
--   * Opening Home serves a set if there's no live one, so nobody waits for
--     the morning job; the job still prepares sets at 05:xx local.
--   * One Curio per active Space (paused Spaces skip), at most four a day —
--     Free's four Spaces always all get one; with more, the Spaces that waited
--     longest go first. Plus one Wander.
--   * Fresh cards first (the 60-day and 7-day rules still lead). When a pool
--     is exhausted, the least recently served card comes back rather than
--     nothing.
--   * A Space opened mid-day is topped up into the live set.
--
-- Still no engagement signal of any kind: only what was served, and when.

-- One member's cards: a new 24-hour set when nothing is live, otherwise a
-- top-up for any active Space the live set is missing.
create or replace function private.serve_daily_cards(p_user_id uuid, p_now timestamptz default now())
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  tz text;
  live_until timestamptz;
  live_day date;
  curio_live integer;
  fresh_set boolean;
  added uuid[];
  more uuid[];
begin
  if not exists (
    select 1 from public.profiles p where p.id = p_user_id and p.onboarded_at is not null
  ) then
    return;
  end if;

  -- Two tabs opening Home at once mustn't serve two sets.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('daily_cards:' || p_user_id::text));

  select coalesce(np.timezone, 'UTC') into tz
  from public.notification_preferences np where np.user_id = p_user_id;
  tz := coalesce(tz, 'UTC');

  select max(d.expires_at), min(d.served_on), count(*) filter (where d.kind = 'curio')
  into live_until, live_day, curio_live
  from public.user_daily_curio d
  where d.user_id = p_user_id and d.expires_at > p_now;

  fresh_set := live_until is null;
  if fresh_set then
    live_until := p_now + interval '24 hours';
    live_day := (p_now at time zone tz)::date;
    curio_live := 0;
    -- Yesterday's set is over; clearing it also keeps a recycled card from
    -- colliding with it when the two land on the same local date.
    delete from public.user_daily_curio d where d.user_id = p_user_id and d.expires_at <= p_now;
  end if;

  with ins as (
  insert into public.user_daily_curio (user_id, card_id, kind, chapter_slug, served_on, expires_at)
  select p_user_id, pick.id, 'curio', space.chapter_slug, live_day, live_until
  from (
    select uc.chapter_slug
    from public.user_chapters uc
    where uc.user_id = p_user_id and uc.status = 'open' and uc.paused_at is null
      and not exists (
        select 1 from public.user_daily_curio d
        where d.user_id = p_user_id and d.expires_at > p_now and d.chapter_slug = uc.chapter_slug
      )
    -- The Space that has waited longest for a card goes first.
    order by (
      select max(s.served_at) from private.cards_served s
      join public.content_cards c on c.id = s.card_id
      where s.user_id = p_user_id and c.chapter_slug = uc.chapter_slug
    ) asc nulls first, random()
    limit greatest(4 - curio_live, 0)
  ) space
  cross join lateral (
    select c.id
    from public.content_cards c
    where c.active and c.kind = 'curio' and c.chapter_slug = space.chapter_slug
    order by
      -- Fresh: not seen in 60 days, nothing from its cluster this week.
      not exists (
        select 1 from private.cards_served s
        where s.user_id = p_user_id
          and (
            (s.card_id = c.id and s.served_at > p_now - interval '60 days')
            or (s.topic_cluster = c.topic_cluster and s.served_at > p_now - interval '7 days')
          )
      ) desc,
      -- Otherwise the one seen longest ago comes back round.
      (select max(s.served_at) from private.cards_served s where s.user_id = p_user_id and s.card_id = c.id) asc nulls first,
      random()
    limit 1
  ) pick
  on conflict (user_id, card_id, served_on) do nothing
  returning card_id
  )
  select coalesce(array_agg(ins.card_id), '{}') into added from ins;

  if fresh_set then
    with ins as (
    insert into public.user_daily_curio (user_id, card_id, kind, chapter_slug, served_on, expires_at)
    select p_user_id, c.id, 'wander', null, live_day, live_until
    from public.content_cards c
    where c.active and c.kind = 'wander'
      and c.topic_cluster in (
        select a.topic_cluster from private.wander_adjacency a
        join public.user_chapters uc on uc.chapter_slug = a.chapter_slug
        where uc.user_id = p_user_id and uc.status = 'open' and uc.paused_at is null
      )
    order by
      not exists (
        select 1 from private.cards_served s
        where s.user_id = p_user_id
          and (
            (s.card_id = c.id and s.served_at > p_now - interval '60 days')
            or (s.topic_cluster = c.topic_cluster and s.served_at > p_now - interval '7 days')
          )
      ) desc,
      (select max(s.served_at) from private.cards_served s where s.user_id = p_user_id and s.card_id = c.id) asc nulls first,
      random()
    limit 1
    on conflict (user_id, card_id, served_on) do nothing
    returning card_id
    )
    select coalesce(array_agg(ins.card_id), '{}') into more from ins;
    added := added || more;
  end if;

  -- Record what this call added.
  insert into private.cards_served (user_id, card_id, topic_cluster, served_at)
  select p_user_id, c.id, c.topic_cluster, p_now
  from public.content_cards c
  where c.id = any(added);
end;
$$;

revoke execute on function private.serve_daily_cards(uuid, timestamptz) from public, anon, authenticated;

-- Hourly at :45: anyone whose local clock reads 05:xx gets a set ready (or a
-- top-up) before they wake. Opening Home does the same at any hour.
create or replace function private.deliver_daily_cards(p_now timestamptz default now(), p_any_hour boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  person record;
begin
  for person in
    select np.user_id
    from public.notification_preferences np
    join public.profiles p on p.id = np.user_id and p.onboarded_at is not null
    where p_any_hour or extract(hour from p_now at time zone np.timezone) = 5
  loop
    perform private.serve_daily_cards(person.user_id, p_now);
  end loop;
end;
$$;

-- Today's cards with their words, for the home screen — serving them first if
-- there's no live set, so a card is always waiting.
create or replace function public.my_daily_cards()
returns table (
  id uuid,
  card_id uuid,
  kind public.card_kind,
  chapter_slug text,
  title text,
  body text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    return;
  end if;
  perform private.serve_daily_cards(me, now());
  return query
    select d.id, c.id, d.kind, d.chapter_slug, c.title, c.body, d.expires_at
    from public.user_daily_curio d
    join public.content_cards c on c.id = d.card_id
    where d.user_id = me and d.expires_at > now()
    order by d.kind, d.chapter_slug;
end;
$$;

revoke execute on function public.my_daily_cards() from public, anon;
grant execute on function public.my_daily_cards() to authenticated;

-- The policy name said noon; the rule (expires_at) is unchanged.
alter policy "Users see their own cards until noon" on public.user_daily_curio
  rename to "Users see their own cards while live";
