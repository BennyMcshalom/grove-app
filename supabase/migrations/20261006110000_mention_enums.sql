-- @mentions (callouts): the enum value used by 20261006110100_profiles_mentions.sql.
-- A new enum value can't be used in the transaction that adds it, so it lives
-- on its own.

-- "Amara mentioned you in a comment" — sent to the person tagged with @.
alter type public.notification_kind add value if not exists 'mentioned';
