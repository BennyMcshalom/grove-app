# Legacy Home + Spaces (frozen 2026-11-19)

Phase 1 of "Grouv New Direction" builds a new Home, Spaces directory, Space page and
composer. The screens they replace stay in the code and can be switched back at any time.

## Snapshot

- Git tag: `legacy-home-spaces-2026-11-19`, at commit `66659fa`. That is the last commit before
  any new-screen work.
- Database: every Phase 1 change is additive (migration `20261119100000_new_home_feed.sql`):
  - a new `conversation_feed()` function;
  - a `post_hides` table;
  - three ranking helpers;
  - the "subhub needs a format" rule relaxed.

  `feed_posts()`, which the legacy screens use, is unchanged. No data is moved or deleted. The
  full schema is in `supabase/migrations/`, and Supabase keeps daily backups of the live
  project.

## Legacy routes and behaviour

| Route | Component | Behaviour |
| --- | --- | --- |
| `/home` | `HomeFeed` | Ranked feed (`feed_posts` scope `home`): 7 days of public posts plus 48 hours from your circle, one page of up to 100. Chapter tabs, type chips, Chapter Today, Curio cards, right rail, "Root a thought" bar. |
| `/spaces` | `app/(app)/spaces/page.tsx` | "Your open chapters" cards with members, plus the Spaces Directory with Join. |
| `/spaces/[chapter]` | `SpaceView` | Only for people holding the Space. Tabs for Roots, Open, Anonymous and Ask Members, plus the members list and companions. |
| composer | `Composer` | Root a thought (doing + honest) or Just Grouv (media), with format, topic and stage. |

## Switching between new and legacy

- **For everyone:** set `GROUV_NEW_HOME=off` on Railway (web service) and redeploy. Home, Spaces
  and Space pages render the legacy components again.
- **For one person (QA):** open `/view/classic` to see the legacy screens in that browser, and
  `/view/new` to go back to the new ones. This is stored in a cookie.
- **One Space, legacy tabs:** `/spaces/<slug>?view=classic`. The new Space page links to it as
  "Members & questions".

## Full rollback drill

1. Set `GROUV_NEW_HOME=off` and redeploy. This takes effect immediately with no data change.
2. If code must go back too, run `git checkout legacy-home-spaces-2026-11-19 -- src/` on a
   branch, then build and deploy. The new database objects can stay: nothing in the legacy code
   reads them.
3. Nothing needs restoring in the database. Hides and the new feed function are simply unused by
   the legacy screens.
