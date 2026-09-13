-- Storage buckets and Realtime publication.
--
-- Object paths start with a folder that the policies key on:
--   avatars/<user id>/<file>                public read
--   media/<user id>/<file>                  posts, log photos, truths, replies
--   chat/<conversation id>/<user id>/<file> voice notes, videos, images in chats

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 5242880, array['image/png', 'image/jpeg', 'image/webp']),
  ('media', 'media', false, 104857600, array['image/*', 'video/*', 'audio/*']),
  ('chat', 'chat', false, 52428800, array['image/*', 'video/*', 'audio/*'])
on conflict (id) do nothing;

create or replace function private.folder_is_uuid(folder text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select folder ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
$$;

grant execute on function private.folder_is_uuid(text) to authenticated;

-- avatars ------------------------------------------------------------------

create policy "Users upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users replace their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- media --------------------------------------------------------------------
-- Readable by any signed-in user who has the path (served via signed URLs).
-- Paths are random and only reach people who can read the row that holds
-- them; tighten per-object if media ever needs stronger isolation.

create policy "Signed-in users read media"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'media');

create policy "Users upload media into their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete media from their own folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- chat ---------------------------------------------------------------------

create policy "Conversation members read chat media"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'chat'
    and private.folder_is_uuid((storage.foldername(name))[1])
    and private.is_conversation_member(((storage.foldername(name))[1])::uuid)
  );

create policy "Conversation members upload chat media as themselves"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and private.folder_is_uuid((storage.foldername(name))[1])
    and private.is_conversation_member(((storage.foldername(name))[1])::uuid)
  );

create policy "Senders delete their own chat media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'chat'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

-- Realtime -----------------------------------------------------------------
-- postgres_changes respects RLS, so subscribers only receive rows they can
-- select. Presence ("online" dots, typing) uses Realtime channels, not tables.

alter publication supabase_realtime add table
  public.messages,
  public.conversation_members,
  public.notifications,
  public.live_room_presence,
  public.waves;
