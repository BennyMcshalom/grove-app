-- New enum values for 20261008110100_event_chat.sql (they must commit before
-- they are used).

-- "Delete Event": everyone who was going hears about it.
alter type public.notification_kind add value if not exists 'event_cancelled';
