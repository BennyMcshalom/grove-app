-- Files a deleted account leaves outside its own folders (2026-10-22).
--
-- purgeAccount() empties `<user id>/` in the avatars and media buckets, but two
-- kinds of upload live elsewhere and outlived the account:
--   * chat attachments, at `chat/<conversation>/<sender>/…`, which the other
--     members of the chat could still open;
--   * anonymous post photos and question-reply recordings, moved to
--     `media/anon/…` (20261018100100), whose owner is only known through
--     private.content_owners.
-- This lists them so the purge can remove them through the Storage API before
-- the cascade forgets who owned what. Only the service role can call it.

create or replace function public.files_left_by(p_user uuid)
returns table (bucket text, path text)
language sql
stable
security definer
set search_path = ''
as $$
  select 'chat'::text, o.name
  from storage.objects o
  where o.bucket_id = 'chat'
    and (storage.foldername(o.name))[2] = p_user::text
  union all
  select 'media', pm.storage_path
  from private.content_owners co
  join public.post_media pm on pm.post_id = co.content_id
  where co.content_type = 'posts' and co.owner_id = p_user and pm.storage_path like 'anon/%'
  union all
  select 'media', r.audio_path
  from private.content_owners co
  join public.space_question_replies r on r.id = co.content_id
  where co.content_type = 'space_question_replies' and co.owner_id = p_user and r.audio_path like 'anon/%'
$$;

revoke all on function public.files_left_by(uuid) from public, anon, authenticated;
grant execute on function public.files_left_by(uuid) to service_role;
