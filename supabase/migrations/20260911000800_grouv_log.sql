-- Grouv Log: daily moments per held chapter, solo or shared with a bond.

create type public.log_scope as enum ('solo', 'bond');

-- "{CHAPTER} · TODAY" prompts. A null chapter means the prompt suits any.
create table public.log_prompts (
  id uuid primary key default gen_random_uuid(),
  chapter_slug text references public.chapters (slug) on update cascade,
  body text not null check (char_length(body) between 1 and 200),
  sort_order smallint not null default 0,
  active boolean not null default true
);

alter table public.log_prompts enable row level security;

create policy "Signed-in users read log prompts"
  on public.log_prompts for select
  to authenticated
  using (active);

-- The one prompt the design shows. Add the rest per chapter as copy lands.
insert into public.log_prompts (chapter_slug, body, sort_order) values
  ('career', 'What did you build today, even a little', 1);

create table public.log_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  user_chapter_id uuid not null references public.user_chapters (id) on delete cascade,
  prompt_id uuid references public.log_prompts (id) on delete set null,
  -- "Shipped the ugly version. It's out"
  body text check (char_length(body) <= 2000),
  -- Object path in the `media` bucket.
  photo_path text,
  -- The user's local calendar day; the app sends it. "Day 12" is derived from
  -- this and the chapter's opened_at.
  entry_date date not null default current_date,
  scope public.log_scope not null default 'solo',
  bond_id uuid references public.bonds (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (body is not null or photo_path is not null),
  check ((scope = 'bond') = (bond_id is not null))
);

create index log_entries_by_user on public.log_entries (user_id, entry_date desc);
create index log_entries_by_chapter on public.log_entries (user_chapter_id, entry_date desc);
create index log_entries_by_bond on public.log_entries (bond_id, entry_date desc) where bond_id is not null;

create trigger log_entries_set_updated_at
  before update on public.log_entries
  for each row execute function private.set_updated_at();

alter table public.log_entries enable row level security;

-- Solo entries follow the author's "Log visibility" setting: circle (which
-- includes bonds), bonds only, or only me. Bond Log entries are for the pair.
create policy "Log entries follow the author's visibility"
  on public.log_entries for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (
      scope = 'bond'
      and exists (
        select 1 from public.bonds b
        where b.id = bond_id and (select auth.uid()) in (b.inviter_id, b.invitee_id)
      )
    )
    or (
      scope = 'solo'
      and exists (
        select 1 from public.profiles p
        where p.id = user_id
          and (
            (p.log_visibility = 'circle' and (private.in_circle(user_id) or private.is_bonded(user_id)))
            or (p.log_visibility = 'bonds' and private.is_bonded(user_id))
          )
      )
    )
  );

create policy "Users log into their own open chapters"
  on public.log_entries for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.user_chapters uc
      where uc.id = user_chapter_id and uc.user_id = (select auth.uid()) and uc.status = 'open'
    )
    and (
      bond_id is null
      or exists (
        select 1 from public.bonds b
        where b.id = bond_id
          and b.status = 'active'
          and (select auth.uid()) in (b.inviter_id, b.invitee_id)
      )
    )
  );

revoke update on public.log_entries from authenticated;
grant update (body, photo_path) on public.log_entries to authenticated;

create policy "Users edit their own log entries"
  on public.log_entries for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users delete their own log entries"
  on public.log_entries for delete
  to authenticated
  using (user_id = (select auth.uid()));
