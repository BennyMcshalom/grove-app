-- Chapter groups: membership, join requests, the group conversation, the
-- anonymous Truth Board and Video Truths.

create type public.group_role as enum ('admin', 'member');
create type public.join_policy as enum ('open', 'approval');
create type public.request_status as enum ('pending', 'approved', 'declined');

-- IconPicker glyphs (public/icons/events/<name>.svg), shared with events.
create domain public.picker_icon as text
  check (value in (
    'fire', 'plant', 'suitcase', 'planet', 'target', 'cursor-click', 'palette',
    'yin-yang', 'hand-peace', 'flower-lotus', 'atom', 'sparkle', 'baby',
    'barricade', 'hourglass'
  ));

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  chapter_slug text references public.chapters (slug) on update cascade,
  -- "Chapter Name", e.g. "Grieving a parent".
  title text not null check (char_length(title) between 1 and 80),
  -- "Label", the badge, e.g. "The first year".
  label text check (char_length(label) <= 60),
  -- "What's this Chapter for?"
  description text check (char_length(description) <= 1000),
  icon public.picker_icon not null default 'fire',
  color text not null default '#FAF8CA'
    check (color in ('#FAF8CA', '#E9FEF8', '#CFF7FA', '#D6E1FC', '#BDE3EE', '#FED1FA', '#FED1DD', '#FEF1E9')),
  join_policy public.join_policy not null default 'approval',
  created_by uuid references public.profiles (id) on delete set null,
  conversation_id uuid not null unique references public.conversations (id),
  member_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index groups_by_chapter on public.groups (chapter_slug);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.group_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index group_members_by_user on public.group_members (user_id);

create table public.group_join_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  status public.request_status not null default 'pending',
  message text check (char_length(message) <= 500),
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz
);

create unique index group_join_requests_one_pending
  on public.group_join_requests (group_id, user_id)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function private.is_group_member(p_group uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = p_group and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_group_admin(p_group uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = p_group and m.user_id = (select auth.uid()) and m.role = 'admin'
  );
$$;

grant execute on function private.is_group_member(uuid) to authenticated;
grant execute on function private.is_group_admin(uuid) to authenticated;

-- "first-time-founder-3f9a1c": readable, and unique without a round trip.
create or replace function private.slugify(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    nullif(trim(both '-' from regexp_replace(lower(input), '[^a-z0-9]+', '-', 'g')), ''),
    'group'
  );
$$;

-- ---------------------------------------------------------------------------
-- Triggers: creator becomes admin, the group gets a conversation, membership
-- mirrors into it, and member_count stays right.
-- ---------------------------------------------------------------------------

create or replace function private.prepare_group()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.created_by := (select auth.uid());
  new.member_count := 0;
  new.slug := left(private.slugify(new.title), 60) || '-' || substr(md5(gen_random_uuid()::text), 1, 6);

  insert into public.conversations (kind) values ('group')
  returning id into new.conversation_id;

  return new;
end;
$$;

create trigger groups_prepare
  before insert on public.groups
  for each row execute function private.prepare_group();

create trigger groups_set_updated_at
  before update on public.groups
  for each row execute function private.set_updated_at();

create or replace function private.add_group_creator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.group_members (group_id, user_id, role)
    values (new.id, new.created_by, 'admin');
  end if;
  return new;
end;
$$;

create trigger groups_add_creator
  after insert on public.groups
  for each row execute function private.add_group_creator();

create or replace function private.sync_group_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation uuid;
begin
  if tg_op = 'INSERT' then
    select conversation_id into conversation from public.groups where id = new.group_id;
    insert into public.conversation_members (conversation_id, user_id)
    values (conversation, new.user_id)
    on conflict do nothing;
    update public.groups set member_count = member_count + 1 where id = new.group_id;
    return new;
  end if;

  select conversation_id into conversation from public.groups where id = old.group_id;
  delete from public.conversation_members
  where conversation_id = conversation and user_id = old.user_id;
  update public.groups set member_count = greatest(member_count - 1, 0) where id = old.group_id;
  return old;
end;
$$;

create trigger group_members_sync
  after insert or delete on public.group_members
  for each row execute function private.sync_group_membership();

-- Deleting a group removes its conversation too.
create or replace function private.drop_group_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.conversations where id = old.conversation_id;
  return old;
end;
$$;

create trigger groups_drop_conversation
  after delete on public.groups
  for each row execute function private.drop_group_conversation();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_join_requests enable row level security;

create policy "Signed-in users can browse groups"
  on public.groups for select
  to authenticated
  using (true);

create policy "Signed-in users can start groups"
  on public.groups for insert
  to authenticated
  with check (created_by = (select auth.uid()));

revoke update on public.groups from authenticated;
grant update (title, label, description, icon, color, join_policy, chapter_slug)
  on public.groups to authenticated;

create policy "Admins edit their groups"
  on public.groups for update
  to authenticated
  using (private.is_group_admin(id))
  with check (private.is_group_admin(id));

create policy "Admins delete their groups"
  on public.groups for delete
  to authenticated
  using (private.is_group_admin(id));

create policy "Group membership is visible to signed-in users"
  on public.group_members for select
  to authenticated
  using (true);

create policy "Users join open groups as members"
  on public.group_members for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'member'
    and exists (select 1 from public.groups g where g.id = group_id and g.join_policy = 'open')
  );

create policy "Members leave and admins remove"
  on public.group_members for delete
  to authenticated
  using (user_id = (select auth.uid()) or private.is_group_admin(group_id));

create policy "Requesters and admins see join requests"
  on public.group_join_requests for select
  to authenticated
  using (user_id = (select auth.uid()) or private.is_group_admin(group_id));

create policy "Users request to join groups they are not in"
  on public.group_join_requests for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null
    and not private.is_group_member(group_id)
  );

create policy "Requesters withdraw pending requests"
  on public.group_join_requests for delete
  to authenticated
  using (user_id = (select auth.uid()) and status = 'pending');

create or replace function public.review_join_request(
  p_request_id uuid,
  p_approve boolean
)
returns public.group_join_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.group_join_requests;
begin
  select * into result from public.group_join_requests
  where id = p_request_id and status = 'pending'
  for update;

  if not found then
    raise exception 'That request is no longer pending' using errcode = 'no_data_found';
  end if;
  if not private.is_group_admin(result.group_id) then
    raise exception 'Only group admins can review requests' using errcode = 'insufficient_privilege';
  end if;

  update public.group_join_requests
  set status = case when p_approve then 'approved' else 'declined' end::public.request_status,
      reviewed_by = (select auth.uid()),
      reviewed_at = now()
  where id = p_request_id
  returning * into result;

  if p_approve then
    insert into public.group_members (group_id, user_id)
    values (result.group_id, result.user_id)
    on conflict do nothing;
  end if;

  return result;
end;
$$;

revoke execute on function public.review_join_request(uuid, boolean) from public, anon;
grant execute on function public.review_join_request(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Truth Board (always anonymous) and Video Truths (named)
-- ---------------------------------------------------------------------------

create table public.truths (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  -- "Finish this sentence anonymously".
  body text not null check (char_length(body) between 1 and 1000),
  -- "22 people felt this".
  felt_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index truths_by_group on public.truths (group_id, created_at desc);

create trigger truths_record_owner
  after insert on public.truths
  for each row execute function private.record_content_owner('truths');

create trigger truths_forget_owner
  after delete on public.truths
  for each row execute function private.forget_content_owner('truths');

create table public.truth_felt (
  truth_id uuid not null references public.truths (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (truth_id, user_id)
);

create or replace function private.bump_felt_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.truths set felt_count = felt_count + 1 where id = new.truth_id;
  else
    update public.truths set felt_count = greatest(felt_count - 1, 0) where id = old.truth_id;
  end if;
  return null;
end;
$$;

create trigger truth_felt_bump_count
  after insert or delete on public.truth_felt
  for each row execute function private.bump_felt_count();

create table public.video_truths (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- Object paths in the `media` bucket.
  storage_path text not null,
  thumbnail_path text,
  duration_seconds integer check (duration_seconds >= 0),
  created_at timestamptz not null default now()
);

create index video_truths_by_group on public.video_truths (group_id, created_at desc);

alter table public.truths enable row level security;
alter table public.truth_felt enable row level security;
alter table public.video_truths enable row level security;

create policy "Members read the Truth Board"
  on public.truths for select
  to authenticated
  using (private.is_group_member(group_id) or private.owns('truths', id));

create policy "Members post truths"
  on public.truths for insert
  to authenticated
  with check (private.is_group_member(group_id) and felt_count = 0);

revoke update on public.truths from authenticated;

create policy "Authors and admins remove truths"
  on public.truths for delete
  to authenticated
  using (private.owns('truths', id) or private.is_group_admin(group_id));

create policy "Felt marks are visible with their truth"
  on public.truth_felt for select
  to authenticated
  using (exists (select 1 from public.truths t where t.id = truth_id));

create policy "Members mark truths they felt"
  on public.truth_felt for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.truths t where t.id = truth_id)
  );

create policy "Users unmark their own felt"
  on public.truth_felt for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Members watch video truths"
  on public.video_truths for select
  to authenticated
  using (private.is_group_member(group_id));

create policy "Members record video truths"
  on public.video_truths for insert
  to authenticated
  with check (author_id = (select auth.uid()) and private.is_group_member(group_id));

create policy "Authors and admins remove video truths"
  on public.video_truths for delete
  to authenticated
  using (author_id = (select auth.uid()) or private.is_group_admin(group_id));
