-- Older posts reach the whole Space too (2026-10-24).
--
-- 20261024100000 kept posts shared before it circle-only. The team decided
-- they should reach everyone in their Space as well, like new ones.
-- Anonymous posts still stay with the circle (the read policy checks that).

update public.posts set space_wide = true where not space_wide;
