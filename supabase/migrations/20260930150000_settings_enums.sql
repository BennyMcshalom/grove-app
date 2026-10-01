-- Settings and safety (workstream F): enum values used by
-- 20260930150100_settings_safety.sql. A new enum value can't be used in the
-- transaction that adds it, so they live on their own.

-- "Update on your report — We've reviewed your report about Jalen — tap to
-- see the outcome." Sent to the reporter when staff resolve it.
alter type public.notification_kind add value if not exists 'report_reviewed';
