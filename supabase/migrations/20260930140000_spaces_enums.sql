-- Chapter invitations: the notification kinds they send and the answer a
-- recipient gives. On their own so the next migration can use them (a new
-- enum value can't be used in the transaction that adds it).

-- "Amara invited you to join 'New City'".
alter type public.notification_kind add value if not exists 'chapter_invite';
-- "Zainab joined your chapter".
alter type public.notification_kind add value if not exists 'chapter_invite_accepted';

create type public.invite_response as enum ('pending', 'accepted', 'declined');
