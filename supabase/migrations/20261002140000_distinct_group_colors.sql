-- Groups sit side by side across Spaces (the rail, Browse), but the first
-- colour backfill only kept colours distinct within a Space, so two groups
-- in different Spaces could wear the same one. Re-deal the palette across
-- all groups, oldest first, so no two match until there are more groups than
-- colours. Same sixteen colours as GROUP_PALETTE in src/lib/group-look.ts.
with palette as (
  select hex, n
  from unnest(array[
    '#F28C78', '#2BB3A3', '#E9B949', '#F49AC1', '#8E9BF0', '#7CC47F', '#F2A65A', '#5DADE2',
    '#C39BD3', '#E8E36B', '#4A7C8C', '#D9534F', '#3D5A98', '#A3C9A8', '#F7C8A0', '#8D6E63'
  ]) with ordinality as p (hex, n)
),
ranked as (
  select id, (row_number() over (order by created_at, id) - 1) % 16 + 1 as n
  from public.groups
)
update public.groups g
set color = palette.hex
from ranked
join palette on palette.n = ranked.n
where ranked.id = g.id;
