-- Home, matching and the memory composer (PRD §5–6): the new notification
-- kinds and the post audience. Enum values are added here, apart from the
-- migration that uses them, because a new value can't be used in the
-- transaction that adds it.

-- "Introduce yourself": a connection request that carries a note, and the
-- decision it comes back with.
alter type public.notification_kind add value if not exists 'introduction_request';
alter type public.notification_kind add value if not exists 'introduction_accepted';
alter type public.notification_kind add value if not exists 'introduction_declined';
-- "Notify me when someone's around" / "Notify me about new matches".
alter type public.notification_kind add value if not exists 'match_available';

-- Who a post is for, chosen in the composer (Figma 1310:23137):
--   everyone        — the author's circle and bonds, as posts always were
--   selected_bonds  — exactly the bonds listed in post_audience
--   only_me         — saved privately; nobody else ever sees it
create type public.audience as enum ('everyone', 'selected_bonds', 'only_me');
