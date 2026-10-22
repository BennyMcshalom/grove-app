-- Realtime DELETE events no longer name people (2026-10-22).
--
-- Row security can't apply to a row that's gone, so Realtime sends every
-- DELETE on a published table to anyone subscribed to it, carrying the old
-- row's replica identity — by default its primary key. For two tables that
-- key is (thing, person):
--   live_room_presence (room_id, user_id): who left which live meet;
--   conversation_members (conversation_id, user_id): who left which chat.
-- Any signed-in member could subscribe to DELETEs and watch both. Each now
-- gets a random id used only as its replica identity, so a DELETE event says
-- nothing. The app only reloads on these events and never reads the old row.

alter table public.live_room_presence
  add column if not exists realtime_id uuid not null default gen_random_uuid();
create unique index if not exists live_room_presence_realtime_id on public.live_room_presence (realtime_id);
alter table public.live_room_presence replica identity using index live_room_presence_realtime_id;

alter table public.conversation_members
  add column if not exists realtime_id uuid not null default gen_random_uuid();
create unique index if not exists conversation_members_realtime_id on public.conversation_members (realtime_id);
alter table public.conversation_members replica identity using index conversation_members_realtime_id;
