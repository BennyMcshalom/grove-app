-- Security hardening 5/5: least privilege by default (audit 2026-10-18, L10).
--
-- Supabase's defaults give `anon` every privilege on new tables and give
-- PUBLIC (so `anon`) EXECUTE on new functions; until now only RLS policies
-- and per-function revokes kept signed-out callers out. From here on:
--   * new functions in public are not executable by PUBLIC/anon unless a
--     migration grants it (every function already granted keeps its grants);
--   * new tables in public grant nothing to anon;
--   * anon loses its table privileges on existing tables, except the two
--     catalogues the signed-out pages read.
-- The three signed-out RPCs (companion_invite_card, referral_inviter,
-- shared_wrap_card) are SECURITY DEFINER and keep their explicit grants.
--
-- Default privileges apply to objects created by the role that runs the
-- migrations (postgres on hosted Supabase).

alter default privileges in schema public revoke execute on functions from public, anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select on public.chapters, public.chapter_phases to anon;
