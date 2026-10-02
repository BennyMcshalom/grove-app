-- Open Grouv (the `open_grove` column keeps its name) is no longer limited to
-- one post a month per space: a member can share to it on every post. The
-- gate trigger and its bookkeeping table go; open_grove_available stays so
-- older clients keep working, and now only asks whether you hold the space.
-- Unchanged: Open Grouv posts are named and public (posts_open_grove_is_named,
-- posts_open_grove_is_public), and only reach people holding the space.

drop trigger if exists posts_gate_open_grove on public.posts;
drop function if exists private.gate_open_grove();
drop table if exists private.open_grove_gate;

create or replace function public.open_grove_available(p_chapter_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.holds_chapter(p_chapter_slug);
$$;

revoke execute on function public.open_grove_available(text) from public, anon;
grant execute on function public.open_grove_available(text) to authenticated;
