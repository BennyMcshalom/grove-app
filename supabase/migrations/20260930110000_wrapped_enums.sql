-- Enum values Life Wrapped (next migration) needs. Kept in their own file
-- because Postgres won't let a transaction use an enum value it just added.

-- "Your weekly Wrapped is ready" / a closed chapter's wrap has finished.
alter type public.notification_kind add value if not exists 'wrapped_ready';

-- What a wrap covers: this week, the past month, or one closed chapter.
create type public.wrap_range as enum ('week', 'month', 'chapter');
