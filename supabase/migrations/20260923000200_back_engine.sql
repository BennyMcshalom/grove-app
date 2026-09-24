-- The back engine (Developer Engine Brief, 2026).
--
-- Everything here runs underneath the product. Users never see a score, a
-- point, a depth or a flag: engine state lives in the `private` schema, which
-- the Data API can't reach, and only its results (a Bond, a notification, the
-- order of a candidate list) ever surface.
--
-- The brief suggests Supabase Edge Functions for the scheduled jobs; they are
-- SQL functions on pg_cron here instead, like every other job in this app, so
-- they run next to the data and inside one transaction each.
--
-- Where the brief says "space", this schema says chapter (`chapter_slug`).

-- ===========================================================================
-- Shared helpers
-- ===========================================================================

-- Whether either of two people has blocked the other. A placeholder here so
-- the reads below can refer to it; 20260924000200 gives it the real body
-- once the blocks table exists.
create or replace function private.blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select false;
$$;

-- Connected = an accepted connection or an active bond, either direction.
-- Unlike in_circle(), this answers about any two people (engine use only).
create or replace function private.are_connected(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.connections c
    where c.status = 'accepted' and c.user_low = least(a, b) and c.user_high = greatest(a, b)
  ) or exists (
    select 1 from public.bonds bo
    where bo.status = 'active' and bo.user_low = least(a, b) and bo.user_high = greatest(a, b)
  );
$$;

-- How closely two people's stage tags line up, 0–1. For every chapter both
-- hold: 1 at the same phase, 0.5 one phase apart, 0 otherwise; divided by the
-- larger of their open chapter counts so it reads the same both ways.
create or replace function private.stage_overlap(a uuid, b uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select uc.chapter_slug, ph.sort_order
    from public.user_chapters uc
    join public.chapter_phases ph on ph.chapter_slug = uc.chapter_slug and ph.label = uc.phase
    where uc.user_id = a and uc.status = 'open'
  ),
  theirs as (
    select uc.chapter_slug, ph.sort_order
    from public.user_chapters uc
    join public.chapter_phases ph on ph.chapter_slug = uc.chapter_slug and ph.label = uc.phase
    where uc.user_id = b and uc.status = 'open'
  )
  select coalesce(
    round(
      sum(case when m.sort_order = t.sort_order then 1 when abs(m.sort_order - t.sort_order) = 1 then 0.5 else 0 end)
      / nullif(greatest((select count(*) from mine), (select count(*) from theirs)), 0),
      3
    ),
    0
  )
  from mine m
  join theirs t on t.chapter_slug = m.chapter_slug;
$$;

-- Chapter age buckets for matching: early (< 60 days), mid (< 180), late.
create or replace function private.chapter_age_bucket(opened timestamptz)
returns smallint
language sql
stable
set search_path = ''
as $$
  select case
    when opened > now() - interval '60 days' then 1
    when opened > now() - interval '180 days' then 2
    else 3
  end::smallint;
$$;

-- ===========================================================================
-- C-01 · Interaction logger
-- ===========================================================================

create type private.interaction_type as enum (
  'message_sent',
  'message_reply',
  'chat_session_exchange',
  'voice_call',
  'video_call',
  'post_response',
  'i_see_you',
  'wander_card_sent',
  'curio_card_sent',
  'event_attended_together',
  'logged_together',
  'anonymous_ask_response',
  'chapter_acknowledged',
  'weekly_prompt_shared',
  'introduction_accepted',
  'nearby_wave'
);

-- Point values from the brief. `category` groups types for the "3+ different
-- communication types" multiplier (so chat alone can't count as three).
-- `directional` types count toward reciprocity; joint activities (calls,
-- events, logging together…) belong to both people equally and don't.
create table private.interaction_weights (
  type private.interaction_type primary key,
  weight numeric(6, 2) not null check (weight >= 0),
  category text not null,
  directional boolean not null
);

insert into private.interaction_weights (type, weight, category, directional) values
  ('message_sent',            0.02, 'chat',         true),
  ('message_reply',           0.02, 'chat',         true),
  ('chat_session_exchange',   0.02, 'chat',         true),
  -- Calls are weighted by duration band; see private.call_weight().
  ('voice_call',              0.02, 'voice_call',   false),
  ('video_call',              0.02, 'video_call',   false),
  ('post_response',           0.02, 'posts',        true),
  ('i_see_you',               0.02, 'posts',        true),
  ('wander_card_sent',        0.04, 'cards',        true),
  ('curio_card_sent',         0.02, 'cards',        true),
  ('event_attended_together', 0.08, 'together',     false),
  ('logged_together',         0.08, 'log',          false),
  ('anonymous_ask_response',  0.02, 'asks',         true),
  ('chapter_acknowledged',    0.06, 'chapters',     true),
  ('weekly_prompt_shared',    0.04, 'log',          false),
  ('introduction_accepted',   0.04, 'introductions', false),
  ('nearby_wave',             0.02, 'nearby',       true);

-- Every action between two people. user_a did it, toward user_b; for joint
-- activities user_a is whoever completed the pair. Never holds content: a call
-- is a type and a duration, a message is a type.
create table private.interactions (
  id bigint generated always as identity primary key,
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  type private.interaction_type not null,
  -- The space it happened in, when there was one.
  chapter_slug text references public.chapters (slug) on update cascade on delete set null,
  weight numeric(6, 2) not null check (weight >= 0),
  duration_minutes integer check (duration_minutes >= 0),
  -- The post, call, event… it came from, so one thing isn't counted twice.
  ref_id uuid,
  created_at timestamptz not null default now(),
  user_low uuid generated always as (least(user_a, user_b)) stored,
  user_high uuid generated always as (greatest(user_a, user_b)) stored,
  check (user_a <> user_b)
);

create index interactions_by_pair on private.interactions (user_low, user_high, created_at);
create index interactions_recent on private.interactions (created_at);
create index interactions_by_ref on private.interactions (ref_id) where ref_id is not null;

-- Call weight by duration band (voice / video).
create or replace function private.call_weight(p_kind public.call_kind, p_minutes integer)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when p_minutes < 5 then 0.02
    when p_minutes < 20 then case p_kind when 'video' then 0.06 else 0.04 end
    when p_minutes < 60 then case p_kind when 'video' then 0.10 else 0.08 end
    when p_minutes < 180 then case p_kind when 'video' then 0.16 else 0.14 end
    else case p_kind when 'video' then 0.22 else 0.20 end
  end;
$$;

-- The one way into the log. p_once skips the write when this pair already
-- has this type for the same ref (one "I see you" per post, and so on).
create or replace function private.log_interaction(
  p_actor uuid,
  p_other uuid,
  p_type private.interaction_type,
  p_chapter text default null,
  p_ref uuid default null,
  p_once boolean default false,
  p_weight numeric default null,
  p_minutes integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor is null or p_other is null or p_actor = p_other then
    return;
  end if;

  if p_once and p_ref is not null and exists (
    select 1 from private.interactions i
    where i.ref_id = p_ref
      and i.type = p_type
      and i.user_low = least(p_actor, p_other)
      and i.user_high = greatest(p_actor, p_other)
  ) then
    return;
  end if;

  insert into private.interactions (user_a, user_b, type, chapter_slug, weight, duration_minutes, ref_id)
  values (
    p_actor,
    p_other,
    p_type,
    p_chapter,
    coalesce(p_weight, (select w.weight from private.interaction_weights w where w.type = p_type)),
    p_minutes,
    p_ref
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Wiring: every feature that brings two people together writes here.
-- ---------------------------------------------------------------------------

-- Direct messages. A message answering the other person is a reply; once a
-- sitting has 10+ back-and-forths in the last hour, each reply is part of an
-- active chat session. Same points, different type.
create or replace function private.log_message_interaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  other uuid;
  previous_sender uuid;
  switches integer;
  card text;
begin
  if new.sender_id is null or new.kind = 'system' then
    return null;
  end if;

  select m.user_id into other
  from public.conversation_members m
  join public.conversations c on c.id = m.conversation_id and c.kind = 'direct'
  where m.conversation_id = new.conversation_id and m.user_id <> new.sender_id
  limit 1;

  if other is null then
    return null;
  end if;

  if new.kind = 'card' then
    select cc.kind::text into card from public.content_cards cc where cc.id = new.card_id;
    perform private.log_interaction(
      new.sender_id, other,
      case card when 'wander' then 'wander_card_sent' else 'curio_card_sent' end::private.interaction_type,
      null, new.card_id, true
    );
    return null;
  end if;

  select m.sender_id into previous_sender
  from public.messages m
  where m.conversation_id = new.conversation_id
    and m.id <> new.id
    and m.sender_id is not null
    and m.created_at <= new.created_at
  order by m.created_at desc
  limit 1;

  if previous_sender is distinct from other then
    perform private.log_interaction(new.sender_id, other, 'message_sent');
    return null;
  end if;

  select count(*) into switches
  from (
    select m.sender_id, lag(m.sender_id) over (order by m.created_at) as before
    from public.messages m
    where m.conversation_id = new.conversation_id
      and m.sender_id is not null
      and m.created_at > new.created_at - interval '1 hour'
  ) turns
  where turns.before is not null and turns.before <> turns.sender_id;

  perform private.log_interaction(
    new.sender_id, other,
    case when switches >= 10 then 'chat_session_exchange' else 'message_reply' end::private.interaction_type
  );
  return null;
end;
$$;

-- Calls: when an answered call ends, the pair gets its duration band. Only
-- the number of minutes is kept; nothing about what was said exists anywhere.
create or replace function private.log_call_interaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  other uuid;
  minutes integer;
begin
  if new.status <> 'ended' or old.status <> 'active' or new.answered_at is null then
    return null;
  end if;

  select m.user_id into other
  from public.conversation_members m
  where m.conversation_id = new.conversation_id and m.user_id is distinct from new.caller_id
  limit 1;

  minutes := greatest(0, floor(extract(epoch from coalesce(new.ended_at, now()) - new.answered_at) / 60))::integer;

  perform private.log_interaction(
    new.caller_id, other,
    case new.kind when 'video' then 'video_call' else 'voice_call' end::private.interaction_type,
    null, new.id, true,
    private.call_weight(new.kind, minutes),
    minutes
  );
  return null;
end;
$$;

-- Responding to someone's post (a comment), and the "I see you" reaction
-- (post_roots). Once per post per pair, so toggling can't farm points.
create or replace function private.log_post_interaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
  chapter text;
begin
  select o.owner_id, p.chapter_slug into owner, chapter
  from private.content_owners o
  join public.posts p on p.id = o.content_id
  where o.content_type = 'posts' and o.content_id = new.post_id;

  if tg_table_name = 'post_roots' then
    perform private.log_interaction(new.user_id, owner, 'i_see_you', chapter, new.post_id, true);
  else
    perform private.log_interaction(new.author_id, owner, 'post_response', chapter, new.post_id, true);
  end if;
  return null;
end;
$$;

-- Answering someone's Anonymous Ask. The pair is known only in here.
create or replace function private.log_ask_interaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  asker uuid;
  chapter text;
begin
  select o.owner_id, q.chapter_slug into asker, chapter
  from private.content_owners o
  join public.space_questions q on q.id = o.content_id
  where o.content_type = 'space_questions' and o.content_id = new.question_id;

  perform private.log_interaction((select auth.uid()), asker, 'anonymous_ask_response', chapter, new.question_id, true);
  return null;
end;
$$;

-- Waves (Meet & Greet rooms and Nearby). A wave is logged the first time only.
create or replace function private.log_wave_interaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.log_interaction(new.from_user, new.to_user, 'nearby_wave', null, new.id, true);
  return null;
end;
$$;

-- Grouv Log (JA-01). Logging together: a Bond Log entry, or two connections
-- logging in the same chapter within an hour of each other. Once per pair per
-- day. Answering the same weekly prompt in the same chapter in the same week
-- counts separately.
create or replace function private.log_entry_interaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chapter text;
  partner uuid;
begin
  select uc.chapter_slug into chapter from public.user_chapters uc where uc.id = new.user_chapter_id;

  if new.bond_id is not null then
    select case when b.inviter_id = new.user_id then b.invitee_id else b.inviter_id end
    into partner
    from public.bonds b where b.id = new.bond_id;

    if partner is not null and not exists (
      select 1 from private.interactions i
      where i.type = 'logged_together'
        and i.user_low = least(new.user_id, partner)
        and i.user_high = greatest(new.user_id, partner)
        and i.created_at > now() - interval '1 day'
    ) then
      perform private.log_interaction(new.user_id, partner, 'logged_together', chapter, new.id);
    end if;
  end if;

  for partner in
    select distinct e.user_id
    from public.log_entries e
    join public.user_chapters uc on uc.id = e.user_chapter_id and uc.chapter_slug = chapter
    where e.user_id <> new.user_id
      and e.created_at > now() - interval '1 hour'
      and private.are_connected(new.user_id, e.user_id)
      and not exists (
        select 1 from private.interactions i
        where i.type = 'logged_together'
          and i.user_low = least(new.user_id, e.user_id)
          and i.user_high = greatest(new.user_id, e.user_id)
          and i.created_at > now() - interval '1 day'
      )
  loop
    perform private.log_interaction(new.user_id, partner, 'logged_together', chapter, new.id);
  end loop;

  if new.prompt_id is not null then
    for partner in
      select distinct e.user_id
      from public.log_entries e
      join public.user_chapters uc on uc.id = e.user_chapter_id and uc.chapter_slug = chapter
      where e.user_id <> new.user_id
        and e.prompt_id = new.prompt_id
        and e.created_at >= date_trunc('week', now())
        and private.are_connected(new.user_id, e.user_id)
        and not exists (
          select 1 from private.interactions i
          where i.type = 'weekly_prompt_shared'
            and i.ref_id = new.prompt_id
            and i.user_low = least(new.user_id, e.user_id)
            and i.user_high = greatest(new.user_id, e.user_id)
            and i.created_at >= date_trunc('week', now())
        )
    loop
      perform private.log_interaction(new.user_id, partner, 'weekly_prompt_shared', chapter, new.prompt_id);
    end loop;
  end if;

  return null;
end;
$$;

-- ===========================================================================
-- C-13 · Content delivery (tables first: messages can carry a card)
-- ===========================================================================

create type public.card_kind as enum ('curio', 'wander');

-- The editorial catalogue. Curio cards belong to a chapter; Wander cards sit
-- in topic clusters reached through the adjacency graph below.
create table public.content_cards (
  id uuid primary key default gen_random_uuid(),
  kind public.card_kind not null,
  chapter_slug text references public.chapters (slug) on update cascade,
  topic_cluster text not null check (topic_cluster ~ '^[a-z][a-z0-9-]*$'),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 600),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check ((kind = 'curio') = (chapter_slug is not null))
);

create index content_cards_curio on public.content_cards (chapter_slug) where kind = 'curio' and active;
create index content_cards_wander on public.content_cards (topic_cluster) where kind = 'wander' and active;

alter table public.content_cards enable row level security;

create policy "Signed-in users read active cards"
  on public.content_cards for select
  to authenticated
  using (active);

-- The static, hand-curated Wander graph: from a chapter someone holds to the
-- clusters one step sideways from it. Editorial, not learned — nothing about
-- what anyone opened or skipped ever feeds it.
create table private.wander_adjacency (
  chapter_slug text not null references public.chapters (slug) on update cascade on delete cascade,
  topic_cluster text not null,
  primary key (chapter_slug, topic_cluster)
);

-- Today's cards. The UI reads this and respects expires_at (noon local).
create table public.user_daily_curio (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  card_id uuid not null references public.content_cards (id) on delete cascade,
  kind public.card_kind not null,
  chapter_slug text references public.chapters (slug) on update cascade,
  served_on date not null,
  expires_at timestamptz not null,
  unique (user_id, card_id, served_on)
);

create index user_daily_curio_live on public.user_daily_curio (user_id, expires_at);

alter table public.user_daily_curio enable row level security;

create policy "Users see their own cards until noon"
  on public.user_daily_curio for select
  to authenticated
  using (user_id = (select auth.uid()) and expires_at > now());

-- What was served, for the 60-day and same-cluster rules. Deliberately no
-- engagement column of any kind — no opened, saved, clicked or dismissed.
create table private.cards_served (
  user_id uuid not null references public.profiles (id) on delete cascade,
  card_id uuid not null references public.content_cards (id) on delete cascade,
  topic_cluster text not null,
  served_at timestamptz not null default now()
);

create index cards_served_by_user on private.cards_served (user_id, served_at desc);

-- Sending a card privately in a chat.
alter table public.messages
  add column card_id uuid references public.content_cards (id) on delete set null,
  add constraint messages_card_has_card check (kind <> 'card' or card_id is not null);

-- ===========================================================================
-- Wire the logger (after content_cards exists, which the message trigger reads)
-- ===========================================================================

create trigger messages_log_interaction
  after insert on public.messages
  for each row execute function private.log_message_interaction();

create trigger calls_log_interaction
  after update of status on public.calls
  for each row execute function private.log_call_interaction();

create trigger post_roots_log_interaction
  after insert on public.post_roots
  for each row execute function private.log_post_interaction();

create trigger comments_log_interaction
  after insert on public.comments
  for each row execute function private.log_post_interaction();

create trigger space_question_replies_log_interaction
  after insert on public.space_question_replies
  for each row execute function private.log_ask_interaction();

create trigger waves_log_interaction
  after insert on public.waves
  for each row execute function private.log_wave_interaction();

create trigger log_entries_log_interaction
  after insert on public.log_entries
  for each row execute function private.log_entry_interaction();

-- ===========================================================================
-- Engine rules (one row; tune without a migration)
-- ===========================================================================

create table private.engine_rules (
  id boolean primary key default true check (id),
  bond_threshold numeric not null default 500,
  reciprocity_floor numeric not null default 0.30,
  reciprocity_max_penalty numeric not null default 0.50,
  multiplier_cap numeric not null default 2.0,
  freeze_after interval not null default '21 days',
  decay_after interval not null default '30 days',
  weekly_decay numeric not null default 0.03
);

insert into private.engine_rules default values;

-- ===========================================================================
-- C-02 · Weekly Bond score calculator
-- ===========================================================================

create table private.bond_depth (
  user_low uuid not null references public.profiles (id) on delete cascade,
  user_high uuid not null references public.profiles (id) on delete cascade,
  -- Accumulated points. Never reset; grows with interactions, decays in silence.
  raw_score numeric(12, 2) not null default 0,
  weighted_score numeric(12, 2) not null default 0,
  reciprocity_ratio numeric(4, 3),
  interaction_type_count smallint not null default 0,
  days_connected integer not null default 0,
  last_interaction_at timestamptz,
  threshold_met boolean not null default false,
  -- Interactions up to here are already in raw_score.
  scored_through timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_low, user_high),
  check (user_low < user_high)
);

create index bond_depth_threshold on private.bond_depth (weighted_score desc) where threshold_met;

create or replace function private.score_bond_depth(p_now timestamptz default now())
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  rules private.engine_rules;
begin
  select * into rules from private.engine_rules;

  -- Pairs seen in the last 30 days; fully dormant pairs are only decayed.
  insert into private.bond_depth (user_low, user_high)
  select distinct i.user_low, i.user_high
  from private.interactions i
  where i.created_at > p_now - interval '30 days' and i.created_at <= p_now
  on conflict do nothing;

  -- New points since the last run.
  update private.bond_depth d
  set raw_score = d.raw_score + fresh.points,
      last_interaction_at = greatest(d.last_interaction_at, fresh.last_at),
      scored_through = p_now
  from (
    select i.user_low, i.user_high, sum(i.weight) as points, max(i.created_at) as last_at
    from private.interactions i
    join private.bond_depth pair on pair.user_low = i.user_low and pair.user_high = i.user_high
    where i.created_at > coalesce(pair.scored_through, '-infinity'::timestamptz)
      and i.created_at <= p_now
    group by i.user_low, i.user_high
  ) fresh
  where d.user_low = fresh.user_low and d.user_high = fresh.user_high;

  -- 30+ days of silence: 3% a week off both scores.
  update private.bond_depth d
  set raw_score = round(d.raw_score * (1 - rules.weekly_decay), 2),
      weighted_score = round(d.weighted_score * (1 - rules.weekly_decay), 2),
      threshold_met = d.weighted_score * (1 - rules.weekly_decay) >= rules.bond_threshold
        and coalesce(d.reciprocity_ratio, 0) >= rules.reciprocity_floor,
      updated_at = p_now
  where d.last_interaction_at < p_now - rules.decay_after;

  -- Re-weigh everyone still active.
  with active as (
    select d.* from private.bond_depth d
    where d.last_interaction_at >= p_now - rules.decay_after
  ),
  sides as (
    select i.user_low, i.user_high,
      count(*) filter (where i.user_a = i.user_low) as low_n,
      count(*) filter (where i.user_a = i.user_high) as high_n
    from private.interactions i
    join private.interaction_weights w on w.type = i.type and w.directional
    join active a on a.user_low = i.user_low and a.user_high = i.user_high
    where i.created_at > p_now - interval '180 days' and i.created_at <= p_now
    group by i.user_low, i.user_high
  ),
  breadth as (
    select i.user_low, i.user_high,
      count(distinct w.category) as kinds,
      count(distinct date_trunc('week', i.created_at)) filter (where i.created_at > p_now - interval '56 days') as weeks
    from private.interactions i
    join private.interaction_weights w on w.type = i.type
    join active a on a.user_low = i.user_low and a.user_high = i.user_high
    where i.created_at > p_now - interval '90 days' and i.created_at <= p_now
    group by i.user_low, i.user_high
  ),
  measured as (
    select
      a.user_low,
      a.user_high,
      a.raw_score,
      a.weighted_score as previous_weighted,
      a.last_interaction_at,
      case
        when coalesce(s.low_n, 0) + coalesce(s.high_n, 0) = 0 then 0.5
        else least(s.low_n, s.high_n)::numeric / (s.low_n + s.high_n)
      end as ratio,
      coalesce(b.kinds, 0) as kinds,
      coalesce(b.weeks, 0) as weeks,
      coalesce((
        select floor(extract(epoch from p_now - coalesce(c.responded_at, c.created_at)) / 86400)::integer
        from public.connections c
        where c.user_low = a.user_low and c.user_high = a.user_high and c.status = 'accepted'
      ), 0) as days,
      (
        select count(*) from public.user_chapters x
        join public.user_chapters y on y.chapter_slug = x.chapter_slug and y.user_id = a.user_high and y.status = 'open'
        where x.user_id = a.user_low and x.status = 'open'
      ) as shared_spaces
    from active a
    left join sides s on s.user_low = a.user_low and s.user_high = a.user_high
    left join breadth b on b.user_low = a.user_low and b.user_high = a.user_high
  ),
  weighed as (
    select
      m.*,
      least(
        (case when m.days >= 90 then 1.4 when m.days >= 60 and m.weeks >= 6 then 1.2 else 1 end)
        * (case when m.kinds >= 3 then 1.3 else 1 end)
        * (case when m.shared_spaces >= 2 then 1.2 else 1 end),
        rules.multiplier_cap
      ) as multiplier,
      case
        when m.ratio >= rules.reciprocity_floor then 1
        else 1 - rules.reciprocity_max_penalty * (rules.reciprocity_floor - m.ratio) / rules.reciprocity_floor
      end as penalty
    from measured m
  )
  update private.bond_depth d
  set weighted_score = scored.weighted,
      reciprocity_ratio = round(w.ratio, 3),
      interaction_type_count = w.kinds,
      days_connected = w.days,
      threshold_met = scored.weighted >= rules.bond_threshold and w.ratio >= rules.reciprocity_floor,
      updated_at = p_now
  from weighed w
  cross join lateral (
    select case
      -- 21+ days quiet: frozen. Tenure can't lift the score while nobody talks.
      when w.last_interaction_at < p_now - rules.freeze_after
        then least(w.previous_weighted, round(w.raw_score * w.multiplier * w.penalty, 2))
      else round(w.raw_score * w.multiplier * w.penalty, 2)
    end as weighted
  ) scored
  where d.user_low = w.user_low and d.user_high = w.user_high;
end;
$$;

-- ===========================================================================
-- C-03 · Bond assignment and reshuffle
-- ===========================================================================

-- Bonds are the engine's now. Nobody invites, accepts or releases one.
drop trigger if exists bonds_notify on public.bonds;
drop function if exists private.notify_bond();
drop trigger if exists bonds_rate_limit on public.bonds;
drop function if exists public.invite_bond(uuid, text);
drop function if exists public.respond_to_bond(uuid, boolean);
drop function if exists public.release_bond(uuid);

update public.bonds set status = 'declined' where status = 'pending';

-- Depth is engine state, never shown; the column is gone from the public row.
alter table public.bonds drop column if exists depth;

-- Hard rule: at most 5 active bonds per person, enforced here and not just in
-- the engine. Locks both profiles so concurrent writes can't both slip in.
create or replace function private.enforce_bond_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'active' or (tg_op = 'UPDATE' and old.status = 'active') then
    return new;
  end if;

  perform 1 from public.profiles where id in (new.inviter_id, new.invitee_id) order by id for update;

  if (
    select count(*) from public.bonds b
    where b.status = 'active' and b.id <> new.id and new.inviter_id in (b.inviter_id, b.invitee_id)
  ) >= 5 or (
    select count(*) from public.bonds b
    where b.status = 'active' and b.id <> new.id and new.invitee_id in (b.inviter_id, b.invitee_id)
  ) >= 5 then
    raise exception 'Nobody can hold more than 5 bonds' using errcode = 'check_violation', hint = 'bond_cap';
  end if;

  return new;
end;
$$;

create trigger bonds_enforce_cap
  before insert or update of status on public.bonds
  for each row execute function private.enforce_bond_cap();

-- Each person's rank for each of their bonds, 1–5 (shown only as the colour
-- of the bond mark). unique (user_id, rank) with rank 1–5 is a second,
-- structural cap on five.
create table public.bond_ranks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  bond_id uuid not null references public.bonds (id) on delete cascade,
  rank smallint not null check (rank between 1 and 5),
  primary key (user_id, bond_id),
  unique (user_id, rank)
);

alter table public.bond_ranks enable row level security;

create policy "Users read their own bond ranks"
  on public.bond_ranks for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Runs right after scoring. Every pair that crossed the threshold (and is
-- connected), plus every current bond, is taken strongest first; a pair
-- becomes or stays a bond while both people still have a free slot. So a new
-- pair only displaces someone's Bond 5 by outscoring it, and on a tie the
-- existing bond stays.
create or replace function private.assign_bonds(p_now timestamptz default now())
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pair record;
  slots jsonb := '{}';
  kept text[] := '{}';
  low_used integer;
  high_used integer;
  released public.bonds;
  formed uuid;
begin
  for pair in
    select x.user_low, x.user_high, coalesce(d.weighted_score, 0) as score, (b.id is not null) as current
    from (
      select b.user_low, b.user_high from public.bonds b where b.status = 'active'
      union
      select d.user_low, d.user_high
      from private.bond_depth d
      join public.connections c
        on c.user_low = d.user_low and c.user_high = d.user_high and c.status = 'accepted'
      where d.threshold_met
    ) x
    left join private.bond_depth d on d.user_low = x.user_low and d.user_high = x.user_high
    left join public.bonds b on b.user_low = x.user_low and b.user_high = x.user_high and b.status = 'active'
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

  -- Out first, so the cap never trips mid-reshuffle. One quiet in-app note
  -- each; shared history stays exactly where it was.
  for released in
    update public.bonds b
    set status = 'released', released_at = p_now
    where b.status = 'active'
      and not ((b.user_low::text || ':' || b.user_high::text) = any (kept))
    returning b.*
  loop
    perform private.notify(released.user_low, 'bond_shifted', released.user_high, released.id);
    perform private.notify(released.user_high, 'bond_shifted', released.user_low, released.id);
  end loop;

  -- Then in: "Something between you and [name] has taken root."
  for pair in
    select split_part(k, ':', 1)::uuid as user_low, split_part(k, ':', 2)::uuid as user_high
    from unnest(kept) as k
  loop
    if not exists (
      select 1 from public.bonds b
      where b.user_low = pair.user_low and b.user_high = pair.user_high and b.status = 'active'
    ) then
      insert into public.bonds (inviter_id, invitee_id, status, accepted_at)
      values (pair.user_low, pair.user_high, 'active', p_now)
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

create or replace function private.run_bond_engine()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.score_bond_depth(now());
  perform private.assign_bonds(now());
end;
$$;

-- Closing a chapter no longer releases bonds: scores never reset, and only
-- the engine moves someone out of Bond status.
create or replace function public.close_chapter(
  p_user_chapter_id uuid,
  p_taught text default null,
  p_advice text default null,
  p_carrying_forward text default null,
  p_reflections text[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  closed public.user_chapters;
begin
  update public.user_chapters
  set status = 'closed', closed_at = now()
  where id = p_user_chapter_id and user_id = uid and status = 'open'
  returning * into closed;

  if not found then
    raise exception 'That chapter is not open' using errcode = 'no_data_found';
  end if;

  insert into public.chapter_closures (user_chapter_id, taught, advice, carrying_forward, reflections)
  values (
    closed.id,
    nullif(trim(p_taught), ''),
    nullif(trim(p_advice), ''),
    nullif(trim(p_carrying_forward), ''),
    coalesce(
      array(select trim(r) from unnest(p_reflections) as r where nullif(trim(r), '') is not null),
      '{}'
    )
  );
end;
$$;

-- Incoming requests are connection requests only now.
create or replace function public.pending_requests()
returns table (
  kind text,
  request_id uuid,
  user_id uuid,
  first_name text,
  avatar_url text,
  chapter_slug text,
  phase text,
  created_at timestamptz
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
    c.created_at
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

-- The Bonds screen: depth is gone, the viewer's rank for each bond is in.
drop function public.bonds_overview();

create function public.bonds_overview()
returns table (
  user_id uuid,
  first_name text,
  avatar_url text,
  aura public.aura,
  chapter_slug text,
  phase text,
  relationship text,
  bond_id uuid,
  together_since timestamptz,
  bond_rank smallint,
  conversation_id uuid,
  last_message_body text,
  last_message_kind public.message_kind,
  last_message_at timestamptz,
  last_message_from_me boolean,
  unread_count integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with me as (
    select (select auth.uid()) as uid
  ),
  people as (
    select
      case when b.inviter_id = me.uid then b.invitee_id else b.inviter_id end as other,
      'bond'::text as relationship,
      b.id as bond_id,
      coalesce(b.accepted_at, b.created_at) as since
    from public.bonds b
    cross join me
    where b.status = 'active' and me.uid in (b.inviter_id, b.invitee_id)
    union all
    select
      case when c.requester_id = me.uid then c.addressee_id else c.requester_id end,
      'circle',
      null,
      coalesce(c.responded_at, c.created_at)
    from public.connections c
    cross join me
    where c.status = 'accepted' and me.uid in (c.requester_id, c.addressee_id)
  ),
  ranked as (
    select distinct on (other) other, relationship, bond_id, since
    from people
    order by other, (relationship = 'bond') desc
  )
  select
    p.id,
    p.first_name,
    p.avatar_url,
    p.aura,
    held.chapter_slug,
    held.phase,
    r.relationship,
    r.bond_id,
    r.since,
    br.rank,
    conv.id,
    last_message.body,
    last_message.kind,
    last_message.created_at,
    last_message.sender_id = me.uid,
    coalesce(stats.unread, 0)
  from ranked r
  cross join me
  join public.profiles p on p.id = r.other
  left join public.bond_ranks br on br.user_id = me.uid and br.bond_id = r.bond_id
  left join lateral (
    select uc.chapter_slug, uc.phase from public.user_chapters uc
    where uc.user_id = p.id and uc.status = 'open'
    order by uc.opened_at
    limit 1
  ) held on true
  left join public.conversations conv
    on conv.direct_key = least(me.uid, r.other)::text || ':' || greatest(me.uid, r.other)::text
  left join lateral (
    select m.body, m.kind, m.created_at, m.sender_id
    from public.messages m
    where m.conversation_id = conv.id and m.deleted_at is null
    order by m.created_at desc
    limit 1
  ) last_message on true
  left join lateral (
    select
      (count(*) filter (
        where m.sender_id <> me.uid
          and m.created_at > coalesce(cm.last_read_at, '-infinity'::timestamptz)
      ))::integer as unread
    from public.messages m
    left join public.conversation_members cm
      on cm.conversation_id = m.conversation_id and cm.user_id = me.uid
    where m.conversation_id = conv.id
  ) stats on true
  order by (r.relationship = 'bond') desc, br.rank nulls last, last_message.created_at desc nulls last, p.first_name;
$$;

revoke execute on function public.bonds_overview() from public, anon;
grant execute on function public.bonds_overview() to authenticated;

-- ===========================================================================
-- Pair signals (drift, dormancy) — engine state, never readable by users
-- ===========================================================================

create table private.connection_signals (
  user_low uuid not null references public.profiles (id) on delete cascade,
  user_high uuid not null references public.profiles (id) on delete cascade,
  stage_overlap_at_connect numeric(4, 3),
  drift_prompted_at timestamptz,
  drift_prompt_overlap numeric(4, 3),
  dormancy_nudge_sent_at timestamptz,
  nudge_dismissed boolean not null default false,
  primary key (user_low, user_high)
);

insert into private.connection_signals (user_low, user_high, stage_overlap_at_connect)
select c.user_low, c.user_high, private.stage_overlap(c.user_low, c.user_high)
from public.connections c
where c.status = 'accepted'
on conflict do nothing;

-- ===========================================================================
-- C-14 · Introductions
-- ===========================================================================

-- "These two people are in a similar chapter. Want to introduce them?" The
-- introducer writes it; the engine never connects anyone by itself.
create table public.introductions (
  id uuid primary key default gen_random_uuid(),
  introducer_id uuid not null references public.profiles (id) on delete cascade,
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  -- Set once the two connect and the introducer's points are logged.
  credited_at timestamptz,
  user_low uuid generated always as (least(user_a, user_b)) stored,
  user_high uuid generated always as (greatest(user_a, user_b)) stored,
  check (user_a <> user_b),
  check (introducer_id not in (user_a, user_b)),
  unique (introducer_id, user_low, user_high)
);

create index introductions_by_pair on public.introductions (user_low, user_high) where credited_at is null;

alter table public.introductions enable row level security;

create policy "The three people in an introduction can see it"
  on public.introductions for select
  to authenticated
  using ((select auth.uid()) in (introducer_id, user_a, user_b));

create table private.introduction_suggestions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  user_low uuid not null references public.profiles (id) on delete cascade,
  user_high uuid not null references public.profiles (id) on delete cascade,
  suggested_at timestamptz not null default now(),
  primary key (user_id, user_low, user_high)
);

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
  if not (private.are_connected(uid, p_user_a) and private.are_connected(uid, p_user_b)) then
    raise exception 'You can only introduce people in your circle'
      using errcode = 'insufficient_privilege', hint = 'not_in_circle';
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

revoke execute on function public.introduce(uuid, uuid, text) from public, anon;
grant execute on function public.introduce(uuid, uuid, text) to authenticated;

-- When a connection is accepted: remember the stage overlap at that moment
-- (for drift), and credit whoever introduced the two.
create or replace function private.on_connection_accepted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  intro public.introductions;
begin
  if new.status <> 'accepted' or (tg_op = 'UPDATE' and old.status = 'accepted') then
    return null;
  end if;

  insert into private.connection_signals (user_low, user_high, stage_overlap_at_connect)
  values (new.user_low, new.user_high, private.stage_overlap(new.user_low, new.user_high))
  on conflict (user_low, user_high) do update
  set stage_overlap_at_connect = excluded.stage_overlap_at_connect,
      drift_prompted_at = null,
      drift_prompt_overlap = null;

  for intro in
    update public.introductions i
    set credited_at = now()
    where i.user_low = new.user_low and i.user_high = new.user_high and i.credited_at is null
    returning i.*
  loop
    perform private.log_interaction(intro.introducer_id, intro.user_a, 'introduction_accepted', null, intro.id, true);
    perform private.log_interaction(intro.introducer_id, intro.user_b, 'introduction_accepted', null, intro.id, true);
  end loop;

  return null;
end;
$$;

create trigger connections_on_accepted
  after insert or update of status on public.connections
  for each row execute function private.on_connection_accepted();

-- Weekly: for each person, at most one pair of their connections who share a
-- space at 70%+ stage overlap and don't know each other yet. Never the same
-- pair twice.
create or replace function private.send_introduction_suggestions()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pick record;
begin
  for pick in
    with circles as (
      select c.requester_id as user_id, c.addressee_id as friend from public.connections c where c.status = 'accepted'
      union
      select c.addressee_id, c.requester_id from public.connections c where c.status = 'accepted'
    )
    select distinct on (x.user_id) x.user_id, x.friend as user_low, y.friend as user_high
    from circles x
    join circles y on y.user_id = x.user_id and y.friend > x.friend
    where exists (
        select 1 from public.user_chapters a
        join public.user_chapters b on b.chapter_slug = a.chapter_slug and b.user_id = y.friend and b.status = 'open'
        where a.user_id = x.friend and a.status = 'open'
      )
      and not exists (
        select 1 from public.connections c where c.user_low = x.friend and c.user_high = y.friend
      )
      and not exists (
        select 1 from private.introduction_suggestions s
        where s.user_id = x.user_id and s.user_low = x.friend and s.user_high = y.friend
      )
      and not exists (
        select 1 from public.introductions i
        where i.introducer_id = x.user_id and i.user_low = x.friend and i.user_high = y.friend
      )
      and private.stage_overlap(x.friend, y.friend) > 0.7
    order by x.user_id, private.stage_overlap(x.friend, y.friend) desc, x.friend, y.friend
  loop
    insert into private.introduction_suggestions (user_id, user_low, user_high)
    values (pick.user_id, pick.user_low, pick.user_high);
    perform private.notify(
      pick.user_id, 'introduction_suggested', pick.user_low, pick.user_high,
      jsonb_build_object('other_name', (select p.first_name from public.profiles p where p.id = pick.user_high))
    );
  end loop;
end;
$$;

-- ===========================================================================
-- C-09 · Stage drift detector (bi-weekly)
-- ===========================================================================

create or replace function private.send_stage_drift_prompts(p_force boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pair record;
begin
  -- Scheduled weekly; acts every other week.
  if not p_force and extract(week from now())::integer % 2 <> 0 then
    return;
  end if;

  insert into private.connection_signals (user_low, user_high, stage_overlap_at_connect)
  select c.user_low, c.user_high, private.stage_overlap(c.user_low, c.user_high)
  from public.connections c where c.status = 'accepted'
  on conflict do nothing;

  for pair in
    select s.user_low, s.user_high, overlap.now_overlap
    from private.connection_signals s
    join public.connections c
      on c.user_low = s.user_low and c.user_high = s.user_high and c.status = 'accepted'
    cross join lateral (select private.stage_overlap(s.user_low, s.user_high) as now_overlap) overlap
    where coalesce(c.responded_at, c.created_at) < now() - interval '45 days'
      and s.stage_overlap_at_connect - overlap.now_overlap > 0.5
      -- One prompt per drift; again only if they've drifted further since.
      and (s.drift_prompt_overlap is null or overlap.now_overlap < s.drift_prompt_overlap)
  loop
    perform private.notify(pair.user_low, 'stage_drift', pair.user_high, pair.user_high);
    perform private.notify(pair.user_high, 'stage_drift', pair.user_low, pair.user_low);
    update private.connection_signals
    set drift_prompted_at = now(), drift_prompt_overlap = pair.now_overlap
    where user_low = pair.user_low and user_high = pair.user_high;
  end loop;
end;
$$;

-- ===========================================================================
-- C-10 · Dormancy monitor (weekly)
-- ===========================================================================

create or replace function private.send_dormancy_nudges()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  pair record;
begin
  insert into private.connection_signals (user_low, user_high, stage_overlap_at_connect)
  select c.user_low, c.user_high, private.stage_overlap(c.user_low, c.user_high)
  from public.connections c where c.status = 'accepted'
  on conflict do nothing;

  for pair in
    select s.user_low, s.user_high
    from private.connection_signals s
    join public.connections c
      on c.user_low = s.user_low and c.user_high = s.user_high and c.status = 'accepted'
    where s.dormancy_nudge_sent_at is null
      and not s.nudge_dismissed
      and coalesce(c.responded_at, c.created_at) < now() - interval '30 days'
      and not exists (
        select 1 from private.interactions i
        where i.user_low = s.user_low and i.user_high = s.user_high
          and i.created_at > now() - interval '30 days'
      )
  loop
    perform private.notify(pair.user_low, 'dormancy_nudge', pair.user_high, pair.user_high);
    perform private.notify(pair.user_high, 'dormancy_nudge', pair.user_low, pair.user_low);
    update private.connection_signals set dormancy_nudge_sent_at = now()
    where user_low = pair.user_low and user_high = pair.user_high;
  end loop;
end;
$$;

-- Clearing the nudge dismisses it for good for that pair.
create or replace function private.on_notification_cleared()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.kind = 'dormancy_nudge' and old.actor_id is not null then
    update private.connection_signals
    set nudge_dismissed = true
    where user_low = least(old.user_id, old.actor_id) and user_high = greatest(old.user_id, old.actor_id);
  end if;
  return null;
end;
$$;

create trigger notifications_on_cleared
  after delete on public.notifications
  for each row execute function private.on_notification_cleared();

-- ===========================================================================
-- C-11 · Chapter age and stage edits; bonds hear about new chapters
-- ===========================================================================

create table private.chapter_signals (
  user_chapter_id uuid primary key references public.user_chapters (id) on delete cascade,
  stage_tag_edit_count smallint not null default 0,
  last_stage_edit_at timestamptz,
  closing_ritual_suggested_at timestamptz
);

-- 3 stage edits inside 30 days suggests the Chapter Closing Ritual (once a
-- month at most).
create or replace function private.track_stage_edit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  signal private.chapter_signals;
begin
  if new.phase is not distinct from old.phase then
    return null;
  end if;

  insert into private.chapter_signals as cs (user_chapter_id, stage_tag_edit_count, last_stage_edit_at)
  values (new.id, 1, now())
  on conflict (user_chapter_id) do update
  set stage_tag_edit_count = case
        when cs.last_stage_edit_at > now() - interval '30 days'
          then cs.stage_tag_edit_count + 1
        else 1
      end,
      last_stage_edit_at = now()
  returning * into signal;

  if signal.stage_tag_edit_count >= 3
     and (signal.closing_ritual_suggested_at is null or signal.closing_ritual_suggested_at < now() - interval '30 days') then
    update private.chapter_signals set closing_ritual_suggested_at = now() where user_chapter_id = new.id;
    insert into public.notifications (user_id, kind, entity_id, data)
    values (new.user_id, 'chapter_closing_suggested', new.id, jsonb_build_object('chapter_slug', new.chapter_slug));
  end if;

  return null;
end;
$$;

create trigger user_chapters_track_stage_edit
  after update of phase on public.user_chapters
  for each row execute function private.track_stage_edit();

-- Opening a chapter tells your bonds (a bond-only notification). Onboarding's
-- first chapters don't count.
create or replace function private.tell_bonds_about_chapter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  bonded uuid;
begin
  if not exists (select 1 from public.profiles p where p.id = new.user_id and p.onboarded_at is not null) then
    return null;
  end if;

  for bonded in
    select case when b.inviter_id = new.user_id then b.invitee_id else b.inviter_id end
    from public.bonds b
    where b.status = 'active' and new.user_id in (b.inviter_id, b.invitee_id)
  loop
    perform private.notify(bonded, 'bond_chapter_opened', new.user_id, new.id,
      jsonb_build_object('chapter_slug', new.chapter_slug));
  end loop;
  return null;
end;
$$;

create trigger user_chapters_tell_bonds
  after insert on public.user_chapters
  for each row execute function private.tell_bonds_about_chapter();

-- The bond's "Acknowledge" on that notification.
create or replace function public.acknowledge_chapter(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  note public.notifications;
begin
  update public.notifications n
  set read_at = coalesce(n.read_at, now())
  where n.id = p_notification_id and n.user_id = uid and n.kind = 'bond_chapter_opened'
  returning * into note;

  if not found then
    raise exception 'Nothing to acknowledge' using errcode = 'no_data_found';
  end if;

  perform private.log_interaction(uid, note.actor_id, 'chapter_acknowledged', note.data ->> 'chapter_slug', note.entity_id, true);
end;
$$;

revoke execute on function public.acknowledge_chapter(uuid) from public, anon;
grant execute on function public.acknowledge_chapter(uuid) to authenticated;

-- ===========================================================================
-- C-17 · Reciprocity and connection health (monthly, internal only)
-- ===========================================================================

create table private.user_signals (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  -- Most of their connections are one-sided: they initiate, others rarely
  -- answer. Only ever used to weigh down matching (C-06).
  reciprocity_health_flag boolean not null default false,
  updated_at timestamptz not null default now()
);

create or replace function private.update_reciprocity_health()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.user_signals (user_id, reciprocity_health_flag, updated_at)
  select
    per_user.user_id,
    per_user.one_sided > per_user.measured / 2.0,
    now()
  from (
    select sides.me as user_id,
      count(*) as measured,
      count(*) filter (where sides.mine::numeric / (sides.mine + sides.theirs) > 0.7) as one_sided
    from (
      select
        u.me,
        count(*) filter (where i.user_a = u.me) as mine,
        count(*) filter (where i.user_a <> u.me) as theirs
      from private.interactions i
      join private.interaction_weights w on w.type = i.type and w.directional
      cross join lateral (values (i.user_low), (i.user_high)) as u (me)
      where i.created_at > now() - interval '90 days'
        and private.are_connected(i.user_low, i.user_high)
      group by u.me, i.user_low, i.user_high
      having count(*) >= 5
    ) sides
    group by sides.me
    having count(*) >= 3
  ) per_user
  on conflict (user_id) do update
  set reciprocity_health_flag = excluded.reciprocity_health_flag, updated_at = excluded.updated_at;
end;
$$;

-- ===========================================================================
-- C-05 · Geographical surfacing
-- ===========================================================================

-- Geohash of a (rounded) point. Precision 4 ≈ 39 × 20 km: city level.
create or replace function private.geohash(lat double precision, lng double precision, precision_chars integer default 4)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  alphabet constant text := '0123456789bcdefghjkmnpqrstuvwxyz';
  lat_lo double precision := -90;
  lat_hi double precision := 90;
  lng_lo double precision := -180;
  lng_hi double precision := 180;
  mid double precision;
  hash text := '';
  bit_count integer := 0;
  chunk integer := 0;
  even boolean := true;
begin
  while char_length(hash) < precision_chars loop
    if even then
      mid := (lng_lo + lng_hi) / 2;
      if lng >= mid then chunk := chunk * 2 + 1; lng_lo := mid; else chunk := chunk * 2; lng_hi := mid; end if;
    else
      mid := (lat_lo + lat_hi) / 2;
      if lat >= mid then chunk := chunk * 2 + 1; lat_lo := mid; else chunk := chunk * 2; lat_hi := mid; end if;
    end if;
    even := not even;
    bit_count := bit_count + 1;
    if bit_count = 5 then
      hash := hash || substr(alphabet, chunk + 1, 1);
      bit_count := 0;
      chunk := 0;
    end if;
  end loop;
  return hash;
end;
$$;

-- The region row already rounds to 0.1° (~11 km) and is private; it now
-- carries the city-level geohash too, overwritten on every session.
alter table private.user_regions add column geo_hash text;

update private.user_regions set geo_hash = private.geohash(latitude, longitude);

create or replace function public.set_my_region(p_latitude double precision, p_longitude double precision)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  lat double precision := round(p_latitude::numeric, 1)::double precision;
  lng double precision := round(p_longitude::numeric, 1)::double precision;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  if p_latitude is null or p_longitude is null then
    delete from private.user_regions where user_id = uid;
    return;
  end if;

  insert into private.user_regions (user_id, latitude, longitude, geo_hash)
  values (uid, lat, lng, private.geohash(lat, lng))
  on conflict (user_id) do update
  set latitude = excluded.latitude,
      longitude = excluded.longitude,
      geo_hash = excluded.geo_hash,
      updated_at = now();
end;
$$;

-- ===========================================================================
-- C-06 · Stage-based matching
-- ===========================================================================

-- Twelve candidates at a time for discovery; p_page asks for the next twelve.
-- Local (default): people in the viewer's region first, widening 10 → 25 →
-- 50 → 100 km until at least 8 are in range. Global: no geography at all.
-- Scores are stage only (plus the geo and chapter-age bonuses) and never
-- leave this function. No demographics are read.
create or replace function public.match_candidates(
  p_chapter_slug text default null,
  p_global boolean default false,
  p_page integer default 0
)
returns table (
  user_id uuid,
  first_name text,
  avatar_url text,
  aura public.aura,
  chapter_slug text,
  phase text
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select
      (select auth.uid()) as uid,
      not p_global and exists (
        select 1 from private.user_regions r where r.user_id = (select auth.uid())
      ) as local_mode
  ),
  scored as (
    select
      theirs.user_id,
      theirs.chapter_slug,
      theirs.phase,
      (case
        when their_phase.sort_order = my_phase.sort_order then 100
        when abs(their_phase.sort_order - my_phase.sort_order) = 1 then 60
        else 20
      end)
      + (case when private.chapter_age_bucket(mine.opened_at) = private.chapter_age_bucket(theirs.opened_at) then 15 else 0 end)
        as score
    from me
    join public.user_chapters mine on mine.user_id = me.uid and mine.status = 'open'
    join public.chapter_phases my_phase on my_phase.chapter_slug = mine.chapter_slug and my_phase.label = mine.phase
    join public.user_chapters theirs
      on theirs.chapter_slug = mine.chapter_slug and theirs.status = 'open' and theirs.user_id <> me.uid
    join public.chapter_phases their_phase
      on their_phase.chapter_slug = theirs.chapter_slug and their_phase.label = theirs.phase
    join public.profiles p on p.id = theirs.user_id and p.onboarded_at is not null
    where (p_chapter_slug is null or mine.chapter_slug = p_chapter_slug)
      and not private.blocked_between(me.uid, theirs.user_id)
      -- Already connected, asked, or previously declined: any connection row.
      and not exists (
        select 1 from public.connections c
        where c.user_low = least(me.uid, theirs.user_id) and c.user_high = greatest(me.uid, theirs.user_id)
      )
      and not exists (
        select 1 from public.bonds b
        where b.status in ('pending', 'active')
          and b.user_low = least(me.uid, theirs.user_id) and b.user_high = greatest(me.uid, theirs.user_id)
      )
  ),
  pool as (
    select distinct on (s.user_id)
      s.user_id,
      s.chapter_slug,
      s.phase,
      s.score,
      private.km_from_me(s.user_id) as km,
      coalesce((
        select their_region.geo_hash = my_region.geo_hash
        from private.user_regions my_region
        join private.user_regions their_region on their_region.user_id = s.user_id
        where my_region.user_id = (select uid from me)
      ), false) as same_hash
    from scored s
    order by s.user_id, s.score desc
  ),
  radius as (
    select case
      when not (select local_mode from me) then null
      else coalesce(
        (
          select r from unnest(array[10, 25, 50, 100]) as r
          where (select count(*) from pool where pool.km <= r) >= 8
          order by r
          limit 1
        ),
        100
      )
    end as km
  )
  select pool.user_id, p.first_name, p.avatar_url, p.aura, pool.chapter_slug, pool.phase
  from pool
  cross join radius
  cross join me
  join public.profiles p on p.id = pool.user_id
  left join private.user_signals s on s.user_id = pool.user_id
  where radius.km is null or pool.km <= radius.km
  order by
    pool.score
      + (case when me.local_mode and pool.same_hash then 20 else 0 end)
      - (case when coalesce(s.reciprocity_health_flag, false) then 40 else 0 end) desc,
    md5(pool.user_id::text || me.uid::text)
  offset greatest(p_page, 0) * 12
  limit 12;
$$;

revoke execute on function public.match_candidates(text, boolean, integer) from public, anon;
grant execute on function public.match_candidates(text, boolean, integer) to authenticated;

-- The rails' "people you may know" now read from the matching engine (local
-- first), keeping their mutual-connection faces.
create or replace function public.people_you_may_know(p_limit integer default 10)
returns table (
  user_id uuid,
  first_name text,
  avatar_url text,
  phase text,
  shared_chapter text,
  mutual_count integer,
  mutual_avatars text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select (select auth.uid()) as uid
  ),
  my_circle as (
    select case when c.requester_id = me.uid then c.addressee_id else c.requester_id end as friend
    from public.connections c
    cross join me
    where c.status = 'accepted' and me.uid in (c.requester_id, c.addressee_id)
  ),
  candidates as (
    select m.*, row_number() over () as place
    from public.match_candidates(null, false, 0) m
  )
  select
    candidate.user_id,
    candidate.first_name,
    candidate.avatar_url,
    candidate.phase,
    candidate.chapter_slug,
    coalesce(mutual.n, 0),
    coalesce(mutual.avatars, '{}')
  from candidates candidate
  left join lateral (
    select
      count(*)::integer as n,
      (array_agg(friend_profile.avatar_url) filter (where friend_profile.avatar_url is not null))[1:4] as avatars
    from public.connections c
    join my_circle mc
      on mc.friend = case when c.requester_id = candidate.user_id then c.addressee_id else c.requester_id end
    join public.profiles friend_profile on friend_profile.id = mc.friend
    where c.status = 'accepted' and candidate.user_id in (c.requester_id, c.addressee_id)
  ) mutual on true
  where (select uid from me) is not null
  order by candidate.place
  limit least(greatest(p_limit, 1), 12);
$$;

-- ===========================================================================
-- C-07 · Nearby proximity engine
-- ===========================================================================

-- Open: anyone nearby on Grouv sees you. Stage-only: only people at your exact
-- stage in a chapter you share. (Event mode is Gatherings and Meet & Greet.)
create type public.proximity_mode as enum ('open', 'stage_only');

alter table public.proximity_sessions
  add column mode public.proximity_mode not null default 'stage_only';

-- A Nearby wave has no room. It isn't a request and sends no notification.
alter table public.waves alter column room_id drop not null;
create unique index waves_one_nearby_per_pair on public.waves (from_user, to_user) where room_id is null;

create or replace function private.notify_wave()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.room_id is not null then
    perform private.notify(new.to_user, 'wave_received', new.from_user, new.room_id);
  end if;
  return new;
end;
$$;

drop function public.nearby_people(double precision);

-- Whoever can see the viewer and whom the viewer can see, out to 100 km.
-- Visibility follows the other person's mode: open shows them to everyone
-- nearby; stage-only only to people at their exact stage in a shared chapter.
create function public.nearby_people(p_radius_km double precision default 0.5)
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
    round(distance.km::numeric, 1),
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
    and distance.km <= least(greatest(p_radius_km, 0.1), 100)
    and (s.mode = 'open' or stage.chapter_slug is not null)
    and not private.blocked_between(uid, s.user_id)
    -- Stage-only viewers only look for their stage too.
    and (me.mode = 'open' or stage.chapter_slug is not null)
    and coalesce(stage.chapter_slug, shown.chapter_slug) is not null
  order by distance.km, p.id
  limit 50;
end;
$$;

revoke execute on function public.nearby_people(double precision) from public, anon;
grant execute on function public.nearby_people(double precision) to authenticated;

-- The Wave button: a small "I see you, nearby". Only between two people who
-- can see each other right now; waving again just refreshes it.
create or replace function public.wave_nearby(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if not exists (select 1 from public.nearby_people(100) n where n.user_id = p_user_id) then
    raise exception 'They''re not nearby any more' using errcode = 'no_data_found', hint = 'not_nearby';
  end if;

  insert into public.waves (room_id, from_user, to_user)
  values (null, uid, p_user_id)
  on conflict (from_user, to_user) where room_id is null do update set created_at = now();
end;
$$;

revoke execute on function public.wave_nearby(uuid) from public, anon;
grant execute on function public.wave_nearby(uuid) to authenticated;

-- JA-02 · Event attendance, confirmed by proximity. While someone who RSVP'd
-- has Proximity on within 0.5 km of the venue, from 15 minutes before the
-- start to 4 hours after, they're checked in. Every checked-in pair gets the
-- joint-activity points once. An RSVP alone never counts.
create table private.event_checkins (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create or replace function private.check_in_to_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.event_checkins (event_id, user_id)
  select e.id, new.user_id
  from public.events e
  join public.event_attendees a on a.event_id = e.id and a.user_id = new.user_id
  where e.status = 'scheduled'
    and e.latitude is not null
    and now() between e.starts_at - interval '15 minutes' and e.starts_at + interval '4 hours'
    and private.distance_km(e.latitude, e.longitude, new.latitude, new.longitude) <= 0.5
  on conflict do nothing;
  return null;
end;
$$;

create trigger proximity_sessions_check_in
  after insert or update on public.proximity_sessions
  for each row execute function private.check_in_to_events();

create or replace function private.log_event_attendance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  other uuid;
  chapter text;
begin
  select e.chapter_slug into chapter from public.events e where e.id = new.event_id;
  for other in
    select c.user_id from private.event_checkins c
    where c.event_id = new.event_id and c.user_id <> new.user_id
  loop
    perform private.log_interaction(new.user_id, other, 'event_attended_together', chapter, new.event_id, true);
  end loop;
  return null;
end;
$$;

create trigger event_checkins_log_interaction
  after insert on private.event_checkins
  for each row execute function private.log_event_attendance();

-- ===========================================================================
-- C-08 · Feed visibility
-- ===========================================================================

-- C-15 · Open Grove: one globally visible post per person per space per
-- calendar month (UTC). The only posts that reach outside someone's
-- connections, and only to people holding that space.
alter table public.posts
  add column open_grove boolean not null default false,
  add constraint posts_open_grove_is_named check (not (open_grove and is_anonymous));

create table private.open_grove_gate (
  user_id uuid not null references public.profiles (id) on delete cascade,
  chapter_slug text not null references public.chapters (slug) on update cascade on delete cascade,
  last_open_grove_post_at timestamptz not null,
  primary key (user_id, chapter_slug)
);

create or replace function private.gate_open_grove()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  last_at timestamptz;
begin
  if not new.open_grove then
    return new;
  end if;

  select g.last_open_grove_post_at into last_at
  from private.open_grove_gate g
  where g.user_id = uid and g.chapter_slug = new.chapter_slug
  for update;

  if last_at is not null
     and date_trunc('month', last_at at time zone 'UTC') = date_trunc('month', now() at time zone 'UTC') then
    raise exception 'Open Grove is used for this space this month'
      using errcode = 'check_violation', hint = 'open_grove_used';
  end if;

  insert into private.open_grove_gate (user_id, chapter_slug, last_open_grove_post_at)
  values (uid, new.chapter_slug, now())
  on conflict (user_id, chapter_slug) do update set last_open_grove_post_at = excluded.last_open_grove_post_at;
  return new;
end;
$$;

create trigger posts_gate_open_grove
  before insert on public.posts
  for each row execute function private.gate_open_grove();

-- Whether the composer offers Open Grove for this space right now. The UI
-- just hides the option when it's false; no explanation.
create or replace function public.open_grove_available(p_chapter_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.holds_chapter(p_chapter_slug) and not exists (
    select 1 from private.open_grove_gate g
    where g.user_id = (select auth.uid())
      and g.chapter_slug = p_chapter_slug
      and date_trunc('month', g.last_open_grove_post_at at time zone 'UTC') = date_trunc('month', now() at time zone 'UTC')
  );
$$;

revoke execute on function public.open_grove_available(text) from public, anon;
grant execute on function public.open_grove_available(text) to authenticated;

-- Posts and questions now become visible only through their owner (not
-- through the space), and `insert … returning` checks visibility before
-- AFTER triggers run. Record the hidden owner BEFORE the insert instead; the
-- id default is already set by then, and a failed insert rolls it back.
-- owns() must see that row within the same statement; a stable function
-- keeps the statement's starting snapshot and wouldn't.
alter function private.owns(text, uuid) volatile;

drop trigger posts_record_owner on public.posts;
create trigger posts_record_owner
  before insert on public.posts
  for each row execute function private.record_content_owner('posts');

drop trigger space_questions_record_owner on public.space_questions;
create trigger space_questions_record_owner
  before insert on public.space_questions
  for each row execute function private.record_content_owner('space_questions');

-- An anonymous post's hidden author is in the viewer's circle or a bond.
create or replace function private.owner_is_close(p_type text, p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.content_owners o
    where o.content_type = p_type
      and o.content_id = p_id
      and (private.in_circle(o.owner_id) or private.is_bonded(o.owner_id))
  );
$$;

grant execute on function private.owner_is_close(text, uuid) to authenticated;

-- Who can see a post:
--   · its author, always;
--   · their bonds, in any space (Bond cross-space visibility);
--   · their circle, for 48 hours, only in a space the reader holds;
--   · Open Grove posts, to anyone holding that space, for the month.
-- Space members who aren't connected no longer see ordinary posts.
drop policy "Posts are visible to their space and the author's circle" on public.posts;

create policy "Posts reach connections for 48 hours, bonds across spaces"
  on public.posts for select
  to authenticated
  using (
    private.owns('posts', id)
    or (author_id is not null and private.is_bonded(author_id))
    or (
      created_at > now() - interval '48 hours'
      and private.holds_chapter(chapter_slug)
      and case
        when author_id is null then private.owner_is_close('posts', id)
        else private.in_circle(author_id)
      end
    )
    or (open_grove and created_at > now() - interval '31 days' and private.holds_chapter(chapter_slug))
  );

-- The feed. Chronological, newest first, and nothing else: no reaction count
-- is returned or used for ordering. 'home' and 'roots' only ever reach back
-- 48 hours and have no next page. 'mine' (your own history) still pages.
drop function public.feed_posts(text, text, timestamptz, timestamptz, timestamptz, uuid, integer, uuid, double precision);

create function public.feed_posts(
  p_scope text default 'home',
  p_chapter_slug text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_before timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 20,
  -- Narrows to one post, for permalinks. Use with p_scope 'all'.
  p_post_id uuid default null,
  -- Scope 'open' only: authors whose region is within this many km.
  p_within_km double precision default null
)
returns table (
  id uuid,
  chapter_slug text,
  kind public.post_kind,
  title text,
  progress public.post_progress,
  body text,
  is_anonymous boolean,
  open_grove boolean,
  comments_count integer,
  created_at timestamptz,
  author_id uuid,
  author_name text,
  author_avatar text,
  author_phase text,
  is_mine boolean,
  rooted boolean,
  media jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  with viewer as (
    select
      (select auth.uid()) as uid,
      (
        select uc.phase from public.user_chapters uc
        where uc.user_id = (select auth.uid())
          and uc.chapter_slug = p_chapter_slug
          and uc.status = 'open'
      ) as phase
  )
  select
    p.id,
    p.chapter_slug,
    p.kind,
    p.title,
    p.progress,
    p.body,
    p.is_anonymous,
    p.open_grove,
    p.comments_count,
    p.created_at,
    p.author_id,
    author.first_name,
    author.avatar_url,
    author_chapter.phase,
    private.owns('posts', p.id),
    exists (select 1 from public.post_roots r where r.post_id = p.id and r.user_id = v.uid),
    coalesce(
      (
        select jsonb_agg(jsonb_build_object('kind', m.kind, 'path', m.storage_path, 'trim_start', m.trim_start, 'trim_end', m.trim_end) order by m.position)
        from public.post_media m
        where m.post_id = p.id
      ),
      '[]'::jsonb
    )
  from public.posts p
  cross join viewer v
  left join public.profiles author on author.id = p.author_id
  left join public.user_chapters author_chapter
    on author_chapter.user_id = p.author_id
    and author_chapter.chapter_slug = p.chapter_slug
    and author_chapter.status = 'open'
  where (p_post_id is null or p.id = p_post_id)
    and (p_chapter_slug is null or p.chapter_slug = p_chapter_slug)
    and (p_from is null or p.created_at >= p_from)
    and (p_to is null or p.created_at <= p_to)
    and (
      p_scope in ('home', 'roots')
      or p_before is null
      or (p.created_at, p.id) < (p_before, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))
    )
    and case p_scope
      when 'all' then true
      when 'mine' then private.owns('posts', p.id)
      -- Home and a space's Roots tab: you and your connections, 48 hours.
      when 'home' then
        p.created_at > now() - interval '48 hours'
        and (
          private.owns('posts', p.id)
          or (p.author_id is not null and (private.in_circle(p.author_id) or private.is_bonded(p.author_id)))
          or (p.author_id is null and private.owner_is_close('posts', p.id))
        )
      when 'roots' then
        p.created_at > now() - interval '48 hours'
        and (
          private.owns('posts', p.id)
          or (p.author_id is not null and (private.in_circle(p.author_id) or private.is_bonded(p.author_id)))
          or (p.author_id is null and private.owner_is_close('posts', p.id))
        )
      -- Open Grove, surfaced to people at the same stage by recency alone.
      when 'open' then
        p.open_grove
        and p.author_id is not null
        and p.author_id <> v.uid
        and not private.in_circle(p.author_id)
        and not private.is_bonded(p.author_id)
        and author_chapter.phase = v.phase
        and (p_within_km is null or private.km_from_me(p.author_id) <= p_within_km)
      else false
    end
  order by p.created_at desc, p.id desc
  limit case when p_scope in ('home', 'roots') then 100 else least(greatest(p_limit, 1), 50) end;
$$;

revoke execute on function public.feed_posts(text, text, timestamptz, timestamptz, timestamptz, uuid, integer, uuid, double precision) from public, anon;
grant execute on function public.feed_posts(text, text, timestamptz, timestamptz, timestamptz, uuid, integer, uuid, double precision) to authenticated;

-- ===========================================================================
-- C-16 · Anonymous Ask router
-- ===========================================================================

-- A question reaches only the asker's connections in that space whose stage
-- overlap with the asker is above 60%. Routed once, when it's asked.
create table private.space_question_recipients (
  question_id uuid not null references public.space_questions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (question_id, user_id)
);

create index space_question_recipients_by_user on private.space_question_recipients (user_id);

create or replace function private.receives_question(p_question_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.space_question_recipients r
    where r.question_id = p_question_id and r.user_id = (select auth.uid())
  );
$$;

grant execute on function private.receives_question(uuid) to authenticated;

-- One Anonymous Ask per person per space per week.
create or replace function private.limit_space_questions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    return new;
  end if;

  perform 1 from public.profiles where id = uid for update;

  if exists (
    select 1 from private.content_owners o
    join public.space_questions q on q.id = o.content_id
    where o.content_type = 'space_questions'
      and o.owner_id = uid
      and q.chapter_slug = new.chapter_slug
      and q.created_at > now() - interval '7 days'
  ) then
    raise exception 'You can ask this space once a week' using errcode = 'check_violation', hint = 'ask_limit';
  end if;
  return new;
end;
$$;

create trigger space_questions_weekly_limit
  before insert on public.space_questions
  for each row execute function private.limit_space_questions();

create or replace function private.route_space_question()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  insert into private.space_question_recipients (question_id, user_id)
  select new.id, uc.user_id
  from public.user_chapters uc
  where uc.chapter_slug = new.chapter_slug
    and uc.status = 'open'
    and uc.user_id <> uid
    and private.are_connected(uid, uc.user_id)
    and private.stage_overlap(uid, uc.user_id) > 0.6;
  return null;
end;
$$;

create trigger space_questions_route
  after insert on public.space_questions
  for each row execute function private.route_space_question();

drop policy "Live questions are visible to their space" on public.space_questions;

create policy "Live questions reach their routed recipients"
  on public.space_questions for select
  to authenticated
  using (
    private.owns('space_questions', id)
    or (expires_at > now() and private.receives_question(id))
  );

-- Delivered with the words and the space only: no author, and no time that
-- could be matched against who was online. The asker still sees their own.
create or replace function public.live_space_questions(p_chapter_slug text)
returns table (
  id uuid,
  body text,
  expires_at timestamptz,
  created_at timestamptz,
  is_mine boolean,
  reply_count integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    q.id,
    q.body,
    case when private.owns('space_questions', q.id) then q.expires_at end,
    case when private.owns('space_questions', q.id) then q.created_at end,
    private.owns('space_questions', q.id),
    (select count(*)::integer from public.space_question_replies r where r.question_id = q.id)
  from public.space_questions q
  where q.chapter_slug = p_chapter_slug and q.expires_at > now()
  order by private.owns('space_questions', q.id) desc, q.id
  limit 50;
$$;

-- ===========================================================================
-- C-12 · Notification budget
-- ===========================================================================

-- The only outbound "push" Grouv sends is email; every one goes through
-- claim_notification_emails(), which is where the budget lives.
alter table public.notification_preferences
  add column timezone text not null default 'UTC';

alter table public.notifications
  add column email_sent boolean not null default false;

-- Session start: the browser's IANA zone, for quiet hours and morning cards.
create or replace function public.set_my_timezone(p_timezone text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'Unknown time zone' using errcode = 'check_violation';
  end if;
  update public.notification_preferences set timezone = p_timezone where user_id = (select auth.uid());
end;
$$;

revoke execute on function public.set_my_timezone(text) from public, anon;
grant execute on function public.set_my_timezone(text) to authenticated;

-- At most 3 emails per person per local day, only between 08:00 and 21:00
-- their time; anything over waits for the next window (up to 3 days). Bond
-- news goes first. Kinds that are in-app only are marked and never sent.
create or replace function public.claim_notification_emails(p_limit integer default 50)
returns table (
  notification_id uuid,
  kind public.notification_kind,
  recipient_email text,
  recipient_name text,
  actor_name text,
  entity_id uuid,
  data jsonb,
  group_slug text,
  group_title text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- One claimer at a time, so two workers can't both spend the same budget.
  perform pg_advisory_xact_lock(hashtext('grouv-claim-notification-emails'));

  update public.notifications n
  set emailed_at = now()
  where n.emailed_at is null
    and (
      n.kind not in (
        'bond_formed', 'connection_request', 'group_join_request', 'group_join_reviewed',
        'connection_suggested', 'introduction_received'
      )
      or n.created_at < now() - interval '3 days'
      or exists (
        select 1 from public.notification_preferences np
        where np.user_id = n.user_id and not np.email_updates
      )
    );

  return query
  with waiting as (
    select
      n.id,
      n.user_id,
      n.created_at,
      row_number() over (
        partition by n.user_id
        order by (n.kind = 'bond_formed') desc, n.created_at
      ) as place,
      3 - (
        select count(*) from public.notifications sent
        where sent.user_id = n.user_id
          and sent.email_sent
          and sent.emailed_at >= (date_trunc('day', now() at time zone np.timezone) at time zone np.timezone)
      ) as budget
    from public.notifications n
    join public.notification_preferences np on np.user_id = n.user_id
    where n.emailed_at is null
      and extract(hour from now() at time zone np.timezone) between 8 and 20
  ),
  picked as (
    select w.id from waiting w
    where w.place <= w.budget
    order by w.created_at
    limit least(greatest(p_limit, 1), 200)
  ),
  claimed as (
    update public.notifications n
    set emailed_at = now(), email_sent = true
    where n.id in (select picked.id from picked)
    returning n.*
  )
  select
    c.id,
    c.kind,
    u.email::text,
    recipient.first_name,
    actor.first_name,
    c.entity_id,
    c.data,
    g.slug,
    g.title
  from claimed c
  join auth.users u on u.id = c.user_id
  join public.profiles recipient on recipient.id = c.user_id
  left join public.profiles actor on actor.id = c.actor_id
  left join public.groups g on g.id = nullif(c.data ->> 'group_id', '')::uuid
  where u.email is not null;
end;
$$;

-- ===========================================================================
-- C-13 · Morning delivery
-- ===========================================================================

-- Hourly at :45. Anyone whose local clock reads 05:xx and hasn't had today's
-- cards gets one Curio per open space and one Wander card, expiring at noon
-- local. Never a card they've seen in 60 days; never two from one topic
-- cluster in a week. Selection is random within those rules — no behaviour.
create or replace function private.deliver_daily_cards(p_now timestamptz default now(), p_any_hour boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  person record;
  noon timestamptz;
begin
  for person in
    select np.user_id, np.timezone, (p_now at time zone np.timezone)::date as local_day
    from public.notification_preferences np
    join public.profiles p on p.id = np.user_id and p.onboarded_at is not null
    where (p_any_hour or extract(hour from p_now at time zone np.timezone) = 5)
      and not exists (
        select 1 from public.user_daily_curio d
        where d.user_id = np.user_id and d.served_on = (p_now at time zone np.timezone)::date
      )
  loop
    noon := (person.local_day + time '12:00') at time zone person.timezone;

    insert into public.user_daily_curio (user_id, card_id, kind, chapter_slug, served_on, expires_at)
    select person.user_id, pick.id, 'curio', uc.chapter_slug, person.local_day, noon
    from public.user_chapters uc
    cross join lateral (
      select c.id from public.content_cards c
      where c.active and c.kind = 'curio' and c.chapter_slug = uc.chapter_slug
        and not exists (
          select 1 from private.cards_served s
          where s.user_id = person.user_id
            and (
              (s.card_id = c.id and s.served_at > p_now - interval '60 days')
              or (s.topic_cluster = c.topic_cluster and s.served_at > p_now - interval '7 days')
            )
        )
      order by random()
      limit 1
    ) pick
    where uc.user_id = person.user_id and uc.status = 'open';

    insert into public.user_daily_curio (user_id, card_id, kind, chapter_slug, served_on, expires_at)
    select person.user_id, c.id, 'wander', null, person.local_day, noon
    from public.content_cards c
    where c.active and c.kind = 'wander'
      and c.topic_cluster in (
        select a.topic_cluster from private.wander_adjacency a
        join public.user_chapters uc on uc.chapter_slug = a.chapter_slug
        where uc.user_id = person.user_id and uc.status = 'open'
      )
      and not exists (
        select 1 from private.cards_served s
        where s.user_id = person.user_id
          and (
            (s.card_id = c.id and s.served_at > p_now - interval '60 days')
            or (s.topic_cluster = c.topic_cluster and s.served_at > p_now - interval '7 days')
          )
      )
    order by random()
    limit 1;

    insert into private.cards_served (user_id, card_id, topic_cluster, served_at)
    select d.user_id, d.card_id, c.topic_cluster, p_now
    from public.user_daily_curio d
    join public.content_cards c on c.id = d.card_id
    where d.user_id = person.user_id and d.served_on = person.local_day;
  end loop;
end;
$$;

-- Today's cards with their words, for the home screen.
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
language sql
stable
security invoker
set search_path = ''
as $$
  select d.id, c.id, d.kind, d.chapter_slug, c.title, c.body, d.expires_at
  from public.user_daily_curio d
  join public.content_cards c on c.id = d.card_id
  where d.user_id = (select auth.uid()) and d.expires_at > now()
  order by d.kind, d.chapter_slug;
$$;

revoke execute on function public.my_daily_cards() from public, anon;
grant execute on function public.my_daily_cards() to authenticated;

-- ===========================================================================
-- Housekeeping and schedules
-- ===========================================================================

create or replace function private.cleanup_stale()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Tabs that closed without leaving a room (deleting ends empty rooms).
  delete from public.live_room_presence where seen_at < now() - interval '10 minutes';
  -- Rooms someone named but nobody stayed in.
  update public.live_rooms set ended_at = now()
  where ended_at is null and here_count = 0 and started_at < now() - interval '30 minutes';
  -- Proximity that was never turned off.
  delete from public.proximity_sessions where expires_at < now();
  -- Notifications older than 90 days are read history nobody scrolls to.
  delete from public.notifications where created_at < now() - interval '90 days' and read_at is not null;
  -- Yesterday's cards, and serving history past the 60-day rule.
  delete from public.user_daily_curio where expires_at < now() - interval '1 day';
  delete from private.cards_served where served_at < now() - interval '61 days';
end;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- C-02 + C-03: Sunday 02:00 UTC.
    execute $job$select cron.schedule('grouv-bond-engine', '0 2 * * 0', 'select private.run_bond_engine()')$job$;
    -- C-09 (every other Monday), C-10 and C-14 (weekly).
    execute $job$select cron.schedule('grouv-stage-drift', '0 3 * * 1', 'select private.send_stage_drift_prompts()')$job$;
    execute $job$select cron.schedule('grouv-dormancy', '30 3 * * 1', 'select private.send_dormancy_nudges()')$job$;
    execute $job$select cron.schedule('grouv-introductions', '0 11 * * 4', 'select private.send_introduction_suggestions()')$job$;
    -- C-13: hourly, so every timezone gets its 05:45.
    execute $job$select cron.schedule('grouv-daily-cards', '45 * * * *', 'select private.deliver_daily_cards()')$job$;
    -- C-17: first of the month.
    execute $job$select cron.schedule('grouv-reciprocity-health', '0 4 1 * *', 'select private.update_reciprocity_health()')$job$;
  end if;
end;
$$;
