-- Chapter Companions ("Walk alongside a chapter"): the notification kinds.
-- On their own so the next migration can use them (a new enum value can't be
-- used in the transaction that adds it).

-- "John invited you to walk alongside his Career chapter".
alter type public.notification_kind add value if not exists 'companion_invite';
-- "Victor is walking with you".
alter type public.notification_kind add value if not exists 'companion_accepted';
-- "John shared an update in his Career chapter".
alter type public.notification_kind add value if not exists 'companion_update';
-- A check-in from a companion, or the owner's reply.
alter type public.notification_kind add value if not exists 'companion_checkin';
