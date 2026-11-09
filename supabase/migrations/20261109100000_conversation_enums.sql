-- Conversation types (2026-11-09), part 1: enum values.
--
-- A new enum value can't be used in the transaction that adds it, so the
-- notification kind is added here and used in 20261109100100.

-- "Follow story": the author of an Unfinished post added an update.
alter type public.notification_kind add value if not exists 'story_update';
