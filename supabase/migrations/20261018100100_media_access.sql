-- Security hardening 1/5: who can read the private `media` bucket, and what
-- file types the buckets take (audit 2026-10-18, C1 and L8).
--
-- Until now any signed-in member could list and download every object in
-- `media` ("Signed-in users read media", 20260911001000): Grouv Log photos
-- set to Only me, Bond Log drafts, Only-me posts, voice replies... and,
-- because every upload sits under <uploader id>/, the path of an anonymous
-- post's photo or an anonymous voice reply named its author.
--
-- Now an object is readable by:
--   * its uploader (the first folder is their id), and
--   * anyone who can read a row that points at it — decided by the RLS of
--     that row's table (private.can_read_media is SECURITY INVOKER), plus the
--     companion reads that only exist through SECURITY DEFINER functions.
--
-- Anonymous posts and anonymous replies: the app moves their files (service
-- role) under an `anon/` prefix with a random name (src/lib/anon-media.ts)
-- and stores that path, so the path
-- no longer names anyone. Those objects are under nobody's folder; they stay
-- readable to the right people through the row checks below, which never
-- look at the folder.

-- ---------------------------------------------------------------------------
-- Companion reads (the companion can't read the owner's rows directly)
-- ---------------------------------------------------------------------------

-- A live companion may read a photo the owner shared with them: a picked
-- moment (log photo or the post's photos) while the story is shared, or an
-- update they received while future updates are shared.
create or replace function private.companion_can_read_media(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.chapter_companions c
    join public.chapter_invites i on i.id = c.invite_id and i.share_story
    join public.chapter_invite_moments m on m.invite_id = i.id
    left join public.log_entries le on le.id = m.log_entry_id
    where c.companion_id = (select auth.uid())
      and c.ended_at is null
      and not private.blocked_between(c.owner_id, c.companion_id)
      and (
        le.photo_path = p_path
        or exists (select 1 from public.post_media pm where pm.post_id = m.post_id and pm.storage_path = p_path)
      )
  ) or exists (
    select 1
    from public.companion_updates u
    join public.companion_update_recipients ur on ur.update_id = u.id
    join public.chapter_companions c on c.id = ur.companion_id
    join public.chapter_invites i on i.id = c.invite_id and i.share_future
    where u.photo_path = p_path
      and c.companion_id = (select auth.uid())
      and c.ended_at is null
      and not private.blocked_between(c.owner_id, c.companion_id)
  );
$$;

revoke execute on function private.companion_can_read_media(text) from public, anon;
grant execute on function private.companion_can_read_media(text) to authenticated;

-- Every column that holds a `media` path. Runs as the caller, so each table's
-- own RLS decides (post audience, log visibility, Bond Log sharing, group
-- membership, the asker of a question...). messages.media_path is the `chat`
-- bucket and avatars are public, so neither is here.
create or replace function private.can_read_media(p_path text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select p_path is not null and (
    exists (select 1 from public.post_media where storage_path = p_path)
    or exists (select 1 from public.log_entries where photo_path = p_path)
    or exists (select 1 from public.comments where media_path = p_path)
    or exists (select 1 from public.video_truths where storage_path = p_path)
    or exists (select 1 from public.video_truths where thumbnail_path = p_path)
    or exists (select 1 from public.space_question_replies where audio_path = p_path)
    or exists (select 1 from public.bond_log_responses where photo_path = p_path)
    or exists (select 1 from public.wrap_moments where photo_path = p_path)
    or exists (select 1 from public.wrap_shares where photo_path = p_path)
    or exists (select 1 from public.companion_updates where photo_path = p_path)
    or exists (select 1 from public.chapter_invites where photo_paths @> array[p_path])
    or private.companion_can_read_media(p_path)
  );
$$;

revoke execute on function private.can_read_media(text) from public, anon;
grant execute on function private.can_read_media(text) to authenticated;

-- Each check above is an index lookup.
create index if not exists post_media_by_path on public.post_media (storage_path);
create index if not exists log_entries_by_photo on public.log_entries (photo_path) where photo_path is not null;
create index if not exists comments_by_media on public.comments (media_path) where media_path is not null;
create index if not exists video_truths_by_path on public.video_truths (storage_path);
create index if not exists video_truths_by_thumbnail on public.video_truths (thumbnail_path) where thumbnail_path is not null;
create index if not exists space_question_replies_by_audio on public.space_question_replies (audio_path) where audio_path is not null;
create index if not exists bond_log_responses_by_photo on public.bond_log_responses (photo_path) where photo_path is not null;
create index if not exists wrap_moments_by_photo on public.wrap_moments (photo_path) where photo_path is not null;
create index if not exists wrap_shares_by_photo on public.wrap_shares (photo_path) where photo_path is not null;
create index if not exists companion_updates_by_photo on public.companion_updates (photo_path) where photo_path is not null;
create index if not exists chapter_invites_by_photos on public.chapter_invites using gin (photo_paths);

-- ---------------------------------------------------------------------------
-- The policies
-- ---------------------------------------------------------------------------

drop policy if exists "Signed-in users read media" on storage.objects;

create policy "Uploaders read their own media"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Readers of the row that holds a media path read it"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'media' and private.can_read_media(name));

-- ---------------------------------------------------------------------------
-- File types: explicit lists, no SVG or HTML (script on the storage origin)
-- ---------------------------------------------------------------------------

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'image/avif',
  'video/mp4', 'video/quicktime', 'video/webm',
  'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/aac', 'audio/wav'
]
where id = 'media';

-- The same media, plus the documents 20260924000200 allowed in chat.
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'image/avif',
  'video/mp4', 'video/quicktime', 'video/webm',
  'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/aac', 'audio/wav',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv'
]
where id = 'chat';
