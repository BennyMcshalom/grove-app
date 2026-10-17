-- Testing feedback, 17 October: a group's admins (its creator first) manage
-- it — details, members, co-admins — but deleting a group goes through
-- Grouv support, so a whole group's conversation can't vanish on one tap.

-- ---------------------------------------------------------------------------
-- Deleting is for support (staff) only.
-- ---------------------------------------------------------------------------

drop policy "Admins delete their groups" on public.groups;

-- Admins still remove members, but never the person who started the group.
drop policy "Members leave and admins remove" on public.group_members;
create policy "Members leave and admins remove, never the creator"
  on public.group_members for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or (
      private.is_group_admin(group_id)
      and user_id is distinct from (select g.created_by from public.groups g where g.id = group_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Co-admins
-- ---------------------------------------------------------------------------

create or replace function public.set_group_member_role(p_group uuid, p_user uuid, p_role public.group_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  creator uuid;
begin
  if not private.is_group_admin(p_group) then
    raise exception 'Only a group admin can do that' using errcode = 'insufficient_privilege', hint = 'not_admin';
  end if;
  if not exists (select 1 from public.group_members m where m.group_id = p_group and m.user_id = p_user) then
    raise exception 'They are not in this group' using errcode = 'check_violation', hint = 'not_member';
  end if;
  select g.created_by into creator from public.groups g where g.id = p_group;
  if p_role = 'member' and p_user = creator then
    raise exception 'The person who started the group stays an admin' using errcode = 'check_violation', hint = 'creator';
  end if;
  if p_role = 'member' and not exists (
    select 1 from public.group_members m
    where m.group_id = p_group and m.role = 'admin' and m.user_id <> p_user
  ) then
    raise exception 'A group needs at least one admin' using errcode = 'check_violation', hint = 'last_admin';
  end if;
  update public.group_members set role = p_role where group_id = p_group and user_id = p_user;
end;
$$;

-- ---------------------------------------------------------------------------
-- Asking support to delete a group
-- ---------------------------------------------------------------------------

create table public.group_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  requested_by uuid not null references public.profiles (id) on delete cascade,
  reason text check (reason is null or char_length(reason) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'declined')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null
);

-- One open request per group at a time.
create unique index group_deletion_requests_one_open
  on public.group_deletion_requests (group_id) where status = 'pending';

alter table public.group_deletion_requests enable row level security;

create policy "Group admins and staff see deletion requests"
  on public.group_deletion_requests for select
  to authenticated
  using (private.is_group_admin(group_id) or private.is_staff());

-- Writes go through the functions below.
revoke insert, update, delete on public.group_deletion_requests from authenticated, anon;

create or replace function public.request_group_deletion(p_group uuid, p_reason text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing uuid;
  made uuid;
begin
  if not private.is_group_admin(p_group) then
    raise exception 'Only a group admin can ask for that' using errcode = 'insufficient_privilege', hint = 'not_admin';
  end if;
  select r.id into existing from public.group_deletion_requests r where r.group_id = p_group and r.status = 'pending';
  if existing is not null then
    return existing;
  end if;
  insert into public.group_deletion_requests (group_id, requested_by, reason)
  values (p_group, (select auth.uid()), nullif(trim(p_reason), ''))
  returning id into made;
  return made;
end;
$$;

-- Staff: the open requests, newest first.
create or replace function public.group_deletion_queue()
returns table (
  request_id uuid,
  group_id uuid,
  group_title text,
  group_slug text,
  member_count integer,
  requested_by_name text,
  reason text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, g.id, g.title, g.slug, g.member_count, p.first_name, r.reason, r.created_at
  from public.group_deletion_requests r
  join public.groups g on g.id = r.group_id
  left join public.profiles p on p.id = r.requested_by
  where r.status = 'pending' and private.is_staff()
  order by r.created_at desc;
$$;

-- Staff: delete the group (its conversation goes with it) or decline.
create or replace function public.resolve_group_deletion(p_request uuid, p_delete boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  if not private.is_staff() then
    raise exception 'Staff only' using errcode = 'insufficient_privilege', hint = 'not_staff';
  end if;
  select r.group_id into target from public.group_deletion_requests r where r.id = p_request and r.status = 'pending';
  if target is null then
    raise exception 'That request is no longer open' using errcode = 'check_violation', hint = 'gone';
  end if;
  if p_delete then
    delete from public.groups where id = target;
  else
    update public.group_deletion_requests
    set status = 'declined', resolved_at = now(), resolved_by = (select auth.uid())
    where id = p_request;
  end if;
end;
$$;

revoke execute on function public.set_group_member_role(uuid, uuid, public.group_role) from public, anon;
revoke execute on function public.request_group_deletion(uuid, text) from public, anon;
revoke execute on function public.group_deletion_queue() from public, anon;
revoke execute on function public.resolve_group_deletion(uuid, boolean) from public, anon;
grant execute on function public.set_group_member_role(uuid, uuid, public.group_role) to authenticated;
grant execute on function public.request_group_deletion(uuid, text) to authenticated;
grant execute on function public.group_deletion_queue() to authenticated;
grant execute on function public.resolve_group_deletion(uuid, boolean) to authenticated;
