-- Enum values the back engine (next migration) needs. Kept in their own file
-- because Postgres won't let a transaction use an enum value it just added.

-- Bonds are assigned by the engine now, not invited.
alter type public.notification_kind add value if not exists 'bond_formed';
alter type public.notification_kind add value if not exists 'bond_shifted';
-- A bond opened a new chapter; acknowledging it counts as an interaction.
alter type public.notification_kind add value if not exists 'bond_chapter_opened';
-- In-app only prompts from the weekly and bi-weekly jobs.
alter type public.notification_kind add value if not exists 'stage_drift';
alter type public.notification_kind add value if not exists 'dormancy_nudge';
alter type public.notification_kind add value if not exists 'chapter_closing_suggested';
alter type public.notification_kind add value if not exists 'introduction_suggested';
alter type public.notification_kind add value if not exists 'introduction_received';

-- A Curio or Wander card sent privately in a chat.
alter type public.message_kind add value if not exists 'card';
