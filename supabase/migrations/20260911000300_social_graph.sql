-- Social graph: Circle connections and Bonds.
--
-- Circle = accepted connections ("Connect" on Nearby, Open tab, Suggested).
-- Bond   = a deeper, invited 1:1 tie with a depth score, usually formed inside
--          a chapter and released when that chapter closes.

create type public.connection_status as enum ('pending', 'accepted', 'declined');
create type public.bond_status as enum ('pending', 'active', 'declined', 'released');

-- ---------------------------------------------------------------------------
-- Connections (Circle)
-- ---------------------------------------------------------------------------

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status public.connection_status not null default 'pending',
  -- The space they found each other in, when there was one.
  chapter_slug text references public.chapters (slug) on update cascade,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  user_low uuid generated always as (least(requester_id, addressee_id)) stored,
  user_high uuid generated always as (greatest(requester_id, addressee_id)) stored,
  check (requester_id <> addressee_id)
);

-- One row per pair, whichever direction it was requested in.
create unique index connections_one_per_pair on public.connections (user_low, user_high);
create index connections_pending_for_addressee
  on public.connections (addressee_id)
  where status = 'pending';

alter table public.connections enable row level security;

create policy "Both people can see their connection"
  on public.connections for select
  to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

-- Either side can withdraw a request or leave the other's circle.
create policy "Either person can remove a connection"
  on public.connections for delete
  to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

-- ---------------------------------------------------------------------------
-- Bonds
-- ---------------------------------------------------------------------------

create table public.bonds (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  invitee_id uuid not null references public.profiles (id) on delete cascade,
  status public.bond_status not null default 'pending',
  chapter_slug text references public.chapters (slug) on update cascade,
  depth smallint not null default 0 check (depth between 0 and 100),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  released_at timestamptz,
  user_low uuid generated always as (least(inviter_id, invitee_id)) stored,
  user_high uuid generated always as (greatest(inviter_id, invitee_id)) stored,
  check (inviter_id <> invitee_id)
);

-- Past bonds stay for the archive ("Bond with Jesse was released"); only one
-- live bond per pair.
create unique index bonds_one_live_per_pair
  on public.bonds (user_low, user_high)
  where status in ('pending', 'active');

create index bonds_pending_for_invitee
  on public.bonds (invitee_id)
  where status = 'pending';

alter table public.bonds enable row level security;

create policy "Both people can see their bond"
  on public.bonds for select
  to authenticated
  using ((select auth.uid()) in (inviter_id, invitee_id));

-- ---------------------------------------------------------------------------
-- Helpers for policies elsewhere. Security definer so they can read the graph
-- without tripping RLS recursion; each only answers about the caller.
-- ---------------------------------------------------------------------------

create or replace function private.in_circle(other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.connections c
    where c.status = 'accepted'
      and c.user_low = least((select auth.uid()), other)
      and c.user_high = greatest((select auth.uid()), other)
  );
$$;

create or replace function private.is_bonded(other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bonds b
    where b.status = 'active'
      and b.user_low = least((select auth.uid()), other)
      and b.user_high = greatest((select auth.uid()), other)
  );
$$;

create or replace function private.holds_chapter(slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_chapters uc
    where uc.user_id = (select auth.uid())
      and uc.chapter_slug = slug
      and uc.status = 'open'
  );
$$;

grant execute on function private.in_circle(uuid) to authenticated;
grant execute on function private.is_bonded(uuid) to authenticated;
grant execute on function private.holds_chapter(text) to authenticated;

create policy "Bonds can read each other's prompts"
  on public.profile_prompts for select
  to authenticated
  using (private.is_bonded(user_id));

-- ---------------------------------------------------------------------------
-- RPCs. Writes to connections and bonds go through these so a request can't
-- be forged as already accepted, and crossing requests resolve cleanly.
-- ---------------------------------------------------------------------------

-- "Connect". If the other person already asked you, this accepts their request.
create or replace function public.request_connection(
  p_other uuid,
  p_chapter_slug text default null
)
returns public.connections
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  result public.connections;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;
  if p_other = uid then
    raise exception 'You cannot connect with yourself' using errcode = 'check_violation';
  end if;

  select * into result from public.connections
  where user_low = least(uid, p_other) and user_high = greatest(uid, p_other)
  for update;

  if not found then
    insert into public.connections (requester_id, addressee_id, chapter_slug)
    values (uid, p_other, p_chapter_slug)
    returning * into result;
  elsif result.status = 'pending' and result.addressee_id = uid then
    update public.connections
    set status = 'accepted', responded_at = now()
    where id = result.id
    returning * into result;
  end if;

  return result;
end;
$$;

create or replace function public.respond_to_connection(
  p_connection_id uuid,
  p_accept boolean
)
returns public.connections
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.connections;
begin
  update public.connections
  set status = case when p_accept then 'accepted' else 'declined' end::public.connection_status,
      responded_at = now()
  where id = p_connection_id
    and addressee_id = (select auth.uid())
    and status = 'pending'
  returning * into result;

  if not found then
    raise exception 'That request is no longer pending' using errcode = 'no_data_found';
  end if;

  return result;
end;
$$;

create or replace function public.invite_bond(
  p_other uuid,
  p_chapter_slug text default null
)
returns public.bonds
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  result public.bonds;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;
  if p_other = uid then
    raise exception 'You cannot bond with yourself' using errcode = 'check_violation';
  end if;

  select * into result from public.bonds
  where user_low = least(uid, p_other)
    and user_high = greatest(uid, p_other)
    and status in ('pending', 'active')
  for update;

  if not found then
    insert into public.bonds (inviter_id, invitee_id, chapter_slug)
    values (uid, p_other, p_chapter_slug)
    returning * into result;
  elsif result.status = 'pending' and result.invitee_id = uid then
    update public.bonds
    set status = 'active', accepted_at = now()
    where id = result.id
    returning * into result;
  end if;

  return result;
end;
$$;

create or replace function public.respond_to_bond(
  p_bond_id uuid,
  p_accept boolean
)
returns public.bonds
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.bonds;
begin
  update public.bonds
  set status = case when p_accept then 'active' else 'declined' end::public.bond_status,
      accepted_at = case when p_accept then now() end
  where id = p_bond_id
    and invitee_id = (select auth.uid())
    and status = 'pending'
  returning * into result;

  if not found then
    raise exception 'That invitation is no longer pending' using errcode = 'no_data_found';
  end if;

  return result;
end;
$$;

create or replace function public.release_bond(p_bond_id uuid)
returns public.bonds
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.bonds;
begin
  update public.bonds
  set status = 'released', released_at = now()
  where id = p_bond_id
    and (select auth.uid()) in (inviter_id, invitee_id)
    and status = 'active'
  returning * into result;

  if not found then
    raise exception 'That bond is not active' using errcode = 'no_data_found';
  end if;

  return result;
end;
$$;

-- "Close this Chapter": archives the chapter, records the wizard's answers and
-- releases any bond that was formed inside it.
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

  update public.bonds
  set status = 'released', released_at = now()
  where chapter_slug = closed.chapter_slug
    and uid in (inviter_id, invitee_id)
    and status = 'active';
end;
$$;

revoke execute on function public.request_connection(uuid, text) from public, anon;
revoke execute on function public.respond_to_connection(uuid, boolean) from public, anon;
revoke execute on function public.invite_bond(uuid, text) from public, anon;
revoke execute on function public.respond_to_bond(uuid, boolean) from public, anon;
revoke execute on function public.release_bond(uuid) from public, anon;
revoke execute on function public.close_chapter(uuid, text, text, text, text[]) from public, anon;

grant execute on function public.request_connection(uuid, text) to authenticated;
grant execute on function public.respond_to_connection(uuid, boolean) to authenticated;
grant execute on function public.invite_bond(uuid, text) to authenticated;
grant execute on function public.respond_to_bond(uuid, boolean) to authenticated;
grant execute on function public.release_bond(uuid) to authenticated;
grant execute on function public.close_chapter(uuid, text, text, text, text[]) to authenticated;
