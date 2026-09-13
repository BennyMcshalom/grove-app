-- Read helpers for My Spaces and the Archive.

-- Member counts and a few faces per space, for the open chapter cards.
create or replace function public.space_summaries(p_slugs text[])
returns table (chapter_slug text, member_count integer, member_avatars text[])
language sql
stable
security invoker
set search_path = ''
as $$
  select
    uc.chapter_slug,
    count(*)::integer,
    coalesce(
      (array_agg(p.avatar_url order by uc.opened_at desc) filter (where p.avatar_url is not null))[1:4],
      '{}'
    )
  from public.user_chapters uc
  join public.profiles p on p.id = uc.user_id
  where uc.status = 'open' and uc.chapter_slug = any (p_slugs)
  group by uc.chapter_slug;
$$;

revoke execute on function public.space_summaries(text[]) from public, anon;
grant execute on function public.space_summaries(text[]) to authenticated;

-- "34 posts" on a chapter's reflection: the owner's posts in that space while
-- the chapter was open (anonymous ones included, which only the owner may
-- count), and its log moments.
create or replace function public.chapter_tallies(p_user_chapter_id uuid)
returns table (post_count integer, log_count integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target public.user_chapters;
begin
  select * into target from public.user_chapters
  where id = p_user_chapter_id and user_id = (select auth.uid());

  if not found then
    raise exception 'Chapter not found' using errcode = 'no_data_found';
  end if;

  return query
  select
    (
      select count(*)::integer
      from public.posts po
      join private.content_owners o on o.content_type = 'posts' and o.content_id = po.id
      where o.owner_id = target.user_id
        and po.chapter_slug = target.chapter_slug
        and po.created_at between target.opened_at and coalesce(target.closed_at, now())
    ),
    (
      select count(*)::integer
      from public.log_entries le
      where le.user_chapter_id = target.id
    );
end;
$$;

revoke execute on function public.chapter_tallies(uuid) from public, anon;
grant execute on function public.chapter_tallies(uuid) to authenticated;
