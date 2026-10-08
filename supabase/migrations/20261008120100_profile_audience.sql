-- Per-field profile audience (Figma "Audience — Bio / Location / Current
-- chapter / Birthday", 1587:23049…): each of the four fields is visible to
-- Everyone, My circle, Bonds only or Private (just you). The levels reuse
-- public.log_visibility (everyone / circle / bonds / only_me).
--
-- Bio and birthday are new and live here, readable only by their owner; other
-- people get them through profile_for(), which blanks whatever the audience
-- doesn't allow. Location stays on profiles (other features read the row) and
-- the current chapter on user_chapters (Spaces depend on it); profile_for()
-- and search_everything() apply their audiences where someone's profile is
-- shown.
--
-- Also: a scheduled account deletion ("Account deletion requested",
-- 1593:23224) — deleted for good after seven days unless they sign back in.

create table public.profile_details (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  bio text check (bio is null or char_length(bio) <= 300),
  birthday date check (birthday is null or birthday >= date '1900-01-01'),
  bio_audience public.log_visibility not null default 'everyone',
  location_audience public.log_visibility not null default 'everyone',
  chapter_audience public.log_visibility not null default 'everyone',
  birthday_audience public.log_visibility not null default 'bonds',
  updated_at timestamptz not null default now()
);

alter table public.profile_details enable row level security;

create policy "Members read their own details"
  on public.profile_details for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Members add their own details"
  on public.profile_details for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Members change their own details"
  on public.profile_details for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update on public.profile_details to authenticated;

-- May `viewer` see a field of `owner`'s set to `audience`? You always see your
-- own; a block either way hides everything; "circle" includes Bonds.
create or replace function private.audience_allows(owner uuid, viewer uuid, audience public.log_visibility)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when viewer is null then false
    when owner = viewer then true
    when private.blocked_between(owner, viewer) then false
    when audience = 'everyone' then true
    when audience = 'circle' then private.are_connected(owner, viewer)
    when audience = 'bonds' then exists (
      select 1 from public.bonds b
      where b.status = 'active' and b.user_low = least(owner, viewer) and b.user_high = greatest(owner, viewer)
    )
    else false
  end;
$$;

-- One field's audience for the caller: 'bio' | 'location' | 'chapter' | 'birthday'.
-- No row yet means the defaults above.
create or replace function private.field_visible(owner uuid, field text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.audience_allows(
    owner,
    (select auth.uid()),
    coalesce(
      (select case field
                when 'bio' then d.bio_audience
                when 'location' then d.location_audience
                when 'chapter' then d.chapter_audience
                when 'birthday' then d.birthday_audience
              end
       from public.profile_details d where d.user_id = owner),
      case when field = 'birthday' then 'bonds' else 'everyone' end::public.log_visibility
    )
  );
$$;

grant execute on function private.field_visible(uuid, text) to authenticated;

-- Someone's profile fields as the caller may see them: a field they may not
-- see comes back null (show_chapter false hides their Spaces · stage chips).
create or replace function public.profile_for(p_user_id uuid)
returns table (bio text, birthday date, location_label text, show_chapter boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case when private.field_visible(p.id, 'bio') then d.bio end,
    case when private.field_visible(p.id, 'birthday') then d.birthday end,
    case when private.field_visible(p.id, 'location') then p.location_label end,
    private.field_visible(p.id, 'chapter')
  from public.profiles p
  left join public.profile_details d on d.user_id = p.id
  where p.id = p_user_id
    and (select auth.uid()) is not null;
$$;

revoke execute on function public.profile_for(uuid) from public, anon;
grant execute on function public.profile_for(uuid) to authenticated;

-- Search shows a person's current stage under their name; it now respects
-- their current-chapter audience. Otherwise unchanged from 20260913000100.
create or replace function public.search_everything(p_query text, p_limit integer default 8)
returns table (
  kind text,
  id text,
  title text,
  subtitle text,
  image text,
  chapter_slug text
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select lower(trim(p_query)) as term, least(greatest(p_limit, 1), 20) as n
  )
  select * from (
    (
      select
        'person'::text,
        p.id::text,
        p.first_name,
        case when private.field_visible(p.id, 'chapter') then held.phase end,
        p.avatar_url,
        case when private.field_visible(p.id, 'chapter') then held.chapter_slug end
      from public.profiles p
      cross join q
      left join lateral (
        select uc.chapter_slug, uc.phase from public.user_chapters uc
        where uc.user_id = p.id and uc.status = 'open'
        order by uc.opened_at
        limit 1
      ) held on true
      where char_length(q.term) >= 2
        and p.id <> (select auth.uid())
        and p.onboarded_at is not null
        and strpos(lower(p.first_name), q.term) > 0
      order by strpos(lower(p.first_name), q.term), p.first_name
      limit (select n from q)
    )
    union all
    (
      select
        'post'::text,
        po.id::text,
        coalesce(po.title, left(po.body, 120), 'A post'),
        case when po.is_anonymous then 'Anonymous' else author.first_name end,
        null,
        po.chapter_slug
      from public.posts po
      cross join q
      left join public.profiles author on author.id = po.author_id
      where char_length(q.term) >= 2
        and strpos(lower(coalesce(po.title, '') || ' ' || coalesce(po.body, '')), q.term) > 0
      order by po.created_at desc
      limit (select n from q)
    )
    union all
    (
      select
        'group'::text,
        g.slug,
        g.title,
        g.label,
        null,
        g.chapter_slug
      from public.groups g
      cross join q
      where char_length(q.term) >= 2
        and strpos(lower(g.title || ' ' || coalesce(g.label, '') || ' ' || coalesce(g.description, '')), q.term) > 0
      order by g.member_count desc
      limit (select n from q)
    )
    union all
    (
      select distinct on (c.slug)
        'space'::text,
        c.slug,
        c.name,
        case when strpos(lower(c.name || ' ' || c.tagline), q.term) > 0 then c.tagline else ph.label end,
        c.icon,
        c.slug
      from public.chapters c
      cross join q
      left join public.chapter_phases ph
        on ph.chapter_slug = c.slug and strpos(lower(ph.label), q.term) > 0
      where char_length(q.term) >= 2
        and (strpos(lower(c.name || ' ' || c.tagline), q.term) > 0 or ph.label is not null)
      order by c.slug, ph.sort_order
    )
  ) results (kind, id, title, subtitle, image, chapter_slug);
$$;

revoke execute on function public.search_everything(text, integer) from public, anon;
grant execute on function public.search_everything(text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Scheduled account deletion
-- ---------------------------------------------------------------------------

create table public.account_deletions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  requested_at timestamptz not null default now(),
  delete_after timestamptz not null
);

alter table public.account_deletions enable row level security;

create policy "Members see their own pending deletion"
  on public.account_deletions for select
  to authenticated
  using (user_id = (select auth.uid()));

grant select on public.account_deletions to authenticated;

-- Schedules the caller's account for deletion in seven days and returns when.
-- Asking again keeps the first date.
create or replace function public.request_account_deletion()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  due timestamptz;
begin
  if uid is null then
    raise exception 'Sign in first' using errcode = 'insufficient_privilege';
  end if;
  insert into public.account_deletions (user_id, delete_after)
  values (uid, now() + interval '7 days')
  on conflict (user_id) do nothing;
  select delete_after into due from public.account_deletions where user_id = uid;
  return due;
end;
$$;

revoke execute on function public.request_account_deletion() from public, anon;
grant execute on function public.request_account_deletion() to authenticated;

-- Signing back in calls this: the deletion is called off. True if one was.
create or replace function public.cancel_account_deletion()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  delete from public.account_deletions where user_id = (select auth.uid());
  get diagnostics removed = row_count;
  return removed > 0;
end;
$$;

revoke execute on function public.cancel_account_deletion() from public, anon;
grant execute on function public.cancel_account_deletion() to authenticated;
