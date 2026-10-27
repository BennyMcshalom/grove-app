-- Feature guides seen (2026-10-27).
--
-- Each main screen has a short guide (src/lib/guides.ts) that opens by
-- itself the first time someone visits and stays a tap away after that. A
-- row here means they've closed it, on any device. Only the person reads or
-- writes their own rows.

create table if not exists public.guide_views (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  guide text not null check (guide ~ '^[a-z][a-z-]{0,39}$'),
  seen_at timestamptz not null default now(),
  primary key (user_id, guide)
);

alter table public.guide_views enable row level security;

create policy "People see the guides they've closed"
  on public.guide_views for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "People mark their own guides closed"
  on public.guide_views for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy two_step on public.guide_views as restrictive for all to authenticated
  using ((select private.two_step_satisfied())) with check ((select private.two_step_satisfied()));

revoke all on public.guide_views from anon;
grant select, insert on public.guide_views to authenticated;
