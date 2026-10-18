-- Security hardening 2/5: profiles, chapters and group membership follow the
-- privacy settings and blocks (audit 2026-10-18, H2, M2 profile guard, L4, L8).
--
--   * Someone who blocked you is gone for you: their profile row (except in
--     the 1:1 chat you already share, so the block isn't announced) and their
--     chapters no longer come back. The blocker still sees the people they
--     blocked, so Settings → Blocked can list them to unblock.
--   * location_label is no longer readable from profiles by anyone — the
--     Location audience is applied by profile_for(); the owner reads their own
--     through my_location_label().
--   * Open chapters (chapter + stage) follow the "Current chapter" audience.
--     The SECURITY DEFINER readers that hand out someone's stage apply it too.
--   * Members can't rewrite onboarded_at / terms_accepted_at once set, nor
--     created_at; avatar_url must be our avatars bucket or a Google photo.
--   * Group membership lists are for the group's members.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Has `other` blocked the signed-in member?
create or replace function private.has_blocked_me(other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks b
    where b.blocker_id = other and b.blocked_id = (select auth.uid())
  );
$$;

revoke execute on function private.has_blocked_me(uuid) from public, anon;
grant execute on function private.has_blocked_me(uuid) to authenticated;

-- Does the signed-in member share a 1:1 chat with `other`? Blocking keeps the
-- chat (WhatsApp-style, 20261014100100) and the blocked person isn't told, so
-- their chat list still needs the other person's name and photo.
create or replace function private.shares_direct_chat(other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversations c
    join public.conversation_members m on m.conversation_id = c.id and m.user_id = (select auth.uid())
    where c.direct_key = least((select auth.uid()), other)::text || ':' || greatest((select auth.uid()), other)::text
  );
$$;

revoke execute on function private.shares_direct_chat(uuid) from public, anon;
grant execute on function private.shares_direct_chat(uuid) to authenticated;

-- May `viewer` see `owner`'s current chapter and stage? Same rule as
-- field_visible(owner, 'chapter'), for an explicit viewer (jobs have no
-- signed-in user).
create or replace function private.chapter_visible_to(owner uuid, viewer uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.audience_allows(
    owner,
    viewer,
    coalesce(
      (select d.chapter_audience from public.profile_details d where d.user_id = owner),
      'everyone'::public.log_visibility
    )
  );
$$;

revoke execute on function private.chapter_visible_to(uuid, uuid) from public, anon;
grant execute on function private.chapter_visible_to(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Profiles: blocks, location, locked columns
-- ---------------------------------------------------------------------------

drop policy "Signed-in users can read profiles" on public.profiles;

-- Someone who blocked you drops out of search, profile pages, mentions,
-- group lists... everywhere except the 1:1 chat you already had, which stays
-- as it was so a block isn't announced.
create policy "Profiles are visible except to people their owner blocked"
  on public.profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or not private.has_blocked_me(id)
    or private.shares_direct_chat(id)
  );

-- Every column but location_label. A column-level revoke can't carve one
-- column out of a table-level grant, so the table grant goes.
revoke select on public.profiles from authenticated, anon;
grant select (
  id, first_name, avatar_url, aura, theme, log_visibility, terms_accepted_at,
  onboarded_at, created_at, updated_at, username, banner
) on public.profiles to authenticated;

-- The member's own location, for Edit Profile.
create or replace function public.my_location_label()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.location_label from public.profiles p where p.id = (select auth.uid());
$$;

revoke execute on function public.my_location_label() from public, anon;
grant execute on function public.my_location_label() to authenticated;

-- Members write the fields Edit Profile and Settings write. onboarded_at is
-- set by complete_onboarding(), which runs as the member.
revoke update on public.profiles from authenticated, anon;
grant update (
  first_name, avatar_url, location_label, aura, theme, log_visibility,
  username, banner, onboarded_at, terms_accepted_at
) on public.profiles to authenticated;

-- Once set, onboarding and terms acceptance stay set (so nobody can "un-onboard"
-- to claim a referral), and created_at never moves. Server-side code (service
-- role, SECURITY DEFINER functions) isn't limited.
create or replace function private.guard_profile_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;
  new.id := old.id;
  new.created_at := old.created_at;
  if old.onboarded_at is not null then
    new.onboarded_at := old.onboarded_at;
  end if;
  if old.terms_accepted_at is not null then
    new.terms_accepted_at := old.terms_accepted_at;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_columns
  before update on public.profiles
  for each row execute function private.guard_profile_columns();

-- Avatars: an upload in our public `avatars` bucket (any https host, so the
-- project URL and a custom domain both work), or a Google profile photo.
create or replace function private.allowed_avatar_url(url text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select url is null
    or url ~ '^https://[^/?#]+/storage/v1/object/public/avatars/'
    or url like 'https://lh3.googleusercontent.com/%';
$$;

grant execute on function private.allowed_avatar_url(text) to authenticated;

alter table public.profiles
  add constraint profiles_avatar_url_allowed check (private.allowed_avatar_url(avatar_url)) not valid;

-- Validate when every existing row already passes; otherwise new writes are
-- checked and old rows wait for a cleanup (see the report on this migration).
do $$
begin
  if not exists (select 1 from public.profiles p where not private.allowed_avatar_url(p.avatar_url)) then
    alter table public.profiles validate constraint profiles_avatar_url_allowed;
  end if;
end;
$$;

-- New accounts: a sign-up picture from anywhere else is dropped rather than
-- failing the sign-up. Otherwise as 20260911000200.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  name text := nullif(trim(coalesce(
    meta ->> 'first_name',
    meta ->> 'given_name',
    split_part(coalesce(meta ->> 'full_name', meta ->> 'name', ''), ' ', 1)
  )), '');
  picture text := coalesce(meta ->> 'avatar_url', meta ->> 'picture');
begin
  insert into public.profiles (id, first_name, avatar_url, terms_accepted_at)
  values (
    new.id,
    left(coalesce(name, nullif(split_part(new.email, '@', 1), ''), 'Friend'), 50),
    case when private.allowed_avatar_url(picture) then picture end,
    case when meta ->> 'terms_accepted' = 'true' then now() end
  );

  insert into public.notification_preferences (user_id) values (new.id);
  insert into public.subscriptions (user_id) values (new.id);

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Chapters follow the "Current chapter" audience
-- ---------------------------------------------------------------------------

drop policy "Open chapters are visible; closed ones only to their owner" on public.user_chapters;

-- field_visible() also hides everything across a block, either way.
create policy "Open chapters follow their owner's chapter audience"
  on public.user_chapters for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (status = 'open' and private.field_visible(user_id, 'chapter'))
  );

-- Discovery (People you may know): as 20260930150100, plus the candidate's
-- chapter audience.
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
      -- Privacy & AI → "Show me in suggestions".
      and private.is_discoverable(theirs.user_id)
      -- Their "Current chapter" audience.
      and private.chapter_visible_to(theirs.user_id, me.uid)
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

-- Home's potential connections: as 20260930130100, plus "Show me in
-- suggestions" (audit M5, it was never applied here) and the candidate's
-- chapter audience.
create or replace function private.match_pool(p_uid uuid)
returns table (
  user_id uuid,
  chapter_slug text,
  phase text,
  same_phase boolean,
  looking_for text[],
  shared_looking_for text[],
  shared_life_stages text[],
  opened_at timestamptz,
  rank_score integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select
      p_uid as uid,
      private.has_pass(p_uid) as pass,
      mp.life_stages,
      mp.looking_for,
      mp.distance_km
    from (select 1) one
    left join public.match_preferences mp on mp.user_id = p_uid
  ),
  scored as (
    select
      theirs.user_id,
      theirs.chapter_slug,
      theirs.phase,
      theirs.opened_at,
      their_phase.sort_order = my_phase.sort_order as same_phase,
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
    where not private.blocked_between(me.uid, theirs.user_id)
      and private.is_discoverable(theirs.user_id)
      and private.chapter_visible_to(theirs.user_id, me.uid)
      and not exists (
        select 1 from public.connections c
        where c.user_low = least(me.uid, theirs.user_id) and c.user_high = greatest(me.uid, theirs.user_id)
      )
      and not exists (
        select 1 from public.bonds b
        where b.status in ('pending', 'active')
          and b.user_low = least(me.uid, theirs.user_id) and b.user_high = greatest(me.uid, theirs.user_id)
      )
      and not exists (
        select 1 from public.match_dismissals d
        where d.user_id = me.uid and d.other_id = theirs.user_id
      )
  ),
  best as (
    select distinct on (s.user_id) s.*
    from scored s
    order by s.user_id, s.score desc, s.opened_at
  ),
  located as (
    select
      b.*,
      (
        select round(
          6371 * 2 * asin(sqrt(
            power(sin(radians(theirs.latitude - mine.latitude) / 2), 2)
            + cos(radians(mine.latitude)) * cos(radians(theirs.latitude))
              * power(sin(radians(theirs.longitude - mine.longitude) / 2), 2)
          ))
        )
        from private.user_regions mine
        join private.user_regions theirs on theirs.user_id = b.user_id
        where mine.user_id = (select uid from me)
      ) as km,
      coalesce(theirs_prefs.looking_for, '{}') as their_wants,
      coalesce(theirs_prefs.life_stages, '{}') as their_stages
    from best b
    left join public.match_preferences theirs_prefs on theirs_prefs.user_id = b.user_id
  )
  select
    l.user_id,
    l.chapter_slug,
    l.phase,
    l.same_phase,
    l.their_wants,
    case when me.pass then array(select unnest(l.their_wants) intersect select unnest(coalesce(me.looking_for, '{}'))) else '{}' end,
    case when me.pass then array(select unnest(l.their_stages) intersect select unnest(coalesce(me.life_stages, '{}'))) else '{}' end,
    l.opened_at,
    (
      l.score
      + case when me.pass then 30 * cardinality(array(select unnest(l.their_wants) intersect select unnest(coalesce(me.looking_for, '{}')))) else 0 end
      + case when me.pass then 20 * cardinality(array(select unnest(l.their_stages) intersect select unnest(coalesce(me.life_stages, '{}')))) else 0 end
      + case when l.km is not null and l.km <= 50 then 10 else 0 end
      - case when coalesce(sig.reciprocity_health_flag, false) then 40 else 0 end
    )::integer
  from located l
  cross join me
  left join private.user_signals sig on sig.user_id = l.user_id
  where not (me.pass and me.distance_km is not null)
     or (l.km is not null and l.km <= me.distance_km);
$$;

revoke execute on function private.match_pool(uuid) from public, anon, authenticated;

-- The /i/<token> card: as 20261006100100, but signed-out visitors don't get
-- the sender's id, and the sender's chapter and stage follow their chapter
-- audience (signed out: only when it's Everyone).
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
    case when (select auth.uid()) is not null then i.sender_id end,
    p.first_name,
    p.avatar_url,
    case when shown.ok then i.chapter_slug end,
    case when shown.ok then uc.phase end,
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
  cross join lateral (
    select case
      when (select auth.uid()) is null then coalesce(
        (select d.chapter_audience from public.profile_details d where d.user_id = i.sender_id),
        'everyone'::public.log_visibility
      ) = 'everyone'
      else private.chapter_visible_to(i.sender_id, (select auth.uid()))
    end as ok
  ) shown
  where i.token = p_token
    and i.revoked_at is null
    -- A block hides the card from either side.
    and not (
      (select auth.uid()) is not null
      and private.blocked_between(i.sender_id, (select auth.uid()))
    );
$$;

-- ---------------------------------------------------------------------------
-- Group membership is for the group (audit L4)
-- ---------------------------------------------------------------------------

drop policy "Group membership is visible to signed-in users" on public.group_members;

create policy "Members see who else is in their group"
  on public.group_members for select
  to authenticated
  using (user_id = (select auth.uid()) or private.is_group_member(group_id));
