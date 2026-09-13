-- Foundation: schemas, shared helpers, enums and the chapter catalogue.
--
-- `private` holds security-definer helpers and hidden tables. It is not in the
-- Data API's exposed schemas (config.toml [api].schemas), so nothing in it is
-- reachable over REST; RLS policies call into it instead.

create schema if not exists private;
grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Shared trigger helpers
-- ---------------------------------------------------------------------------

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Enums. Values mirror the literal option lists in the UI; the label text the
-- UI shows lives in TypeScript (src/lib/*) next to the components that use it.
-- ---------------------------------------------------------------------------

-- Edit Profile → "Your aura, how your circle reads you".
create type public.aura as enum (
  'reflective',
  'open_to_connect',
  'deep_focus',
  'in_transition',
  'active_nearby'
);

create type public.theme_preference as enum ('light', 'dark');

-- Settings → Privacy → "Log visibility".
create type public.log_visibility as enum ('circle', 'bonds', 'only_me');

create type public.chapter_status as enum ('open', 'closed');

-- Deep Focus durations.
create type public.focus_duration as enum (
  'until_evening',
  'until_tomorrow_morning',
  'three_days',
  'one_week'
);

create type public.subscription_status as enum (
  'none',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'expired'
);

-- ---------------------------------------------------------------------------
-- Chapter catalogue. Static reference data mirrored from src/lib/chapters.ts;
-- keep the two in sync (the seed below is the source for the database).
-- ---------------------------------------------------------------------------

create table public.chapters (
  slug text primary key check (slug ~ '^[a-z][a-z-]*$'),
  name text not null,
  tagline text not null,
  tint text not null check (tint ~ '^#[0-9A-Fa-f]{6}$'),
  icon text not null,
  sort_order smallint not null
);

-- A chapter's "<Chapter>, where are you?" options. Labels are only unique
-- within a chapter ("Starting over" is in both Career and Health).
create table public.chapter_phases (
  chapter_slug text not null references public.chapters (slug) on update cascade,
  label text not null,
  sort_order smallint not null,
  primary key (chapter_slug, label)
);

alter table public.chapters enable row level security;
alter table public.chapter_phases enable row level security;

create policy "Chapters are readable by everyone"
  on public.chapters for select
  to anon, authenticated
  using (true);

create policy "Chapter phases are readable by everyone"
  on public.chapter_phases for select
  to anon, authenticated
  using (true);

insert into public.chapters (slug, name, tagline, tint, icon, sort_order) values
  ('career',        'Career',        'Work, ambition, pivots',                '#FBD3B9', '/icons/chapters/career.svg',        1),
  ('spiritual',     'Spiritual',     'Faith, purpose, inner growth',          '#E2F6F9', '/icons/chapters/spiritual.svg',     2),
  ('wealth',        'Wealth',        'Money, freedom, financial growth',      '#DCFCE7', '/icons/chapters/wealth.svg',        3),
  ('adventure',     'Adventure',     'Travel, exploration, new experiences',  '#B9E5FB', '/icons/chapters/adventure.svg',     4),
  ('health',        'Health',        'Body, mind, wellbeing',                 '#FBF3B9', '/icons/chapters/health.svg',        5),
  ('creative',      'Creative',      'Making, expressing, creating',          '#E9D4FB', '/icons/chapters/creative.svg',      6),
  ('learning',      'Learning',      'Study, skills, personal growth',        '#E6FAE6', '/icons/chapters/learning.svg',      7),
  ('relationships', 'Relationships', 'Love, friendship, family',              '#FCD8EA', '/icons/chapters/relationships.svg', 8);

insert into public.chapter_phases (chapter_slug, label, sort_order) values
  ('career', 'First job, figuring it out', 1),
  ('career', 'Side hustle, building something', 2),
  ('career', 'Career pivot in progress', 3),
  ('career', 'Building a business (early)', 4),
  ('career', 'Freelance / consulting', 5),
  ('career', 'Growing a team', 6),
  ('career', 'Burned out, searching', 7),
  ('career', 'Starting over', 8),
  ('spiritual', 'Newly questioning', 1),
  ('spiritual', 'Deepening a practice', 2),
  ('spiritual', 'In a dry season', 3),
  ('spiritual', 'Returning after a while', 4),
  ('spiritual', 'Building a discipline', 5),
  ('spiritual', 'Holding doubt and faith', 6),
  ('wealth', 'Getting out of debt', 1),
  ('wealth', 'Building a first cushion', 2),
  ('wealth', 'Investing seriously', 3),
  ('wealth', 'Saving for something big', 4),
  ('wealth', 'Rebuilding after a loss', 5),
  ('wealth', 'Learning the basics', 6),
  ('adventure', 'Planning the leap', 1),
  ('adventure', 'On the road now', 2),
  ('adventure', 'Back, integrating it', 3),
  ('adventure', 'Saving for the next one', 4),
  ('adventure', 'First solo trip', 5),
  ('adventure', 'Relocating somewhere new', 6),
  ('health', 'Starting over', 1),
  ('health', 'Deep in recovery', 2),
  ('health', 'Building a habit', 3),
  ('health', 'Managing something chronic', 4),
  ('health', 'Training for something', 5),
  ('health', 'Listening to my body', 6),
  ('creative', 'Finding the spark', 1),
  ('creative', 'Mid-project', 2),
  ('creative', 'Sharing for the first time', 3),
  ('creative', 'Creative block', 4),
  ('creative', 'Going pro', 5),
  ('creative', 'Making just for me', 6),
  ('learning', 'Day one', 1),
  ('learning', 'In the thick of study', 2),
  ('learning', 'Almost certified', 3),
  ('learning', 'Self-teaching', 4),
  ('learning', 'Changing fields', 5),
  ('learning', 'Relearning the basics', 6),
  ('relationships', 'Newly single', 1),
  ('relationships', 'Building something new', 2),
  ('relationships', 'Working on it', 3),
  ('relationships', 'Early parenthood', 4),
  ('relationships', 'Caring for family', 5),
  ('relationships', 'Learning to be alone', 6);
