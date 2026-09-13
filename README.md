# Grouv

Next.js 16 app on **Railway**, with **Supabase** for Postgres, Auth, Storage
and Realtime, and **Resend** for email.

```
Browser ──► Next.js on Railway ──► Supabase (Postgres + RLS, Auth, Storage, Realtime)
               │  Server Actions / Route Handlers
               └─► Resend (app email)      Supabase Auth ──► Resend SMTP (sign-up codes)
```

## Local development

Requires **Node 22+** (`@supabase/supabase-js` no longer supports Node 20).

```bash
npm install
cp .env.example .env.local   # then fill it in (see below)
npm run dev
```

There's no local Supabase stack (it needs Docker), so development points at a
hosted Supabase project.

## Supabase

### 1. Create the project and apply the schema

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npm run db:push     # applies supabase/migrations
npm run db:types    # replaces the hand-written src/lib/supabase/database.types.ts
```

Put the project URL, **publishable key** and **secret key** (Project Settings →
API Keys) into `.env.local`.

### 2. Auth settings

`supabase/config.toml` holds these settings. Either push them with
`npx supabase config push`, or set them by hand in the dashboard:

| Setting | Value |
| --- | --- |
| Sign In / Providers → Email → Confirm email | On |
| Email OTP length / expiration | `6` digits / `480` seconds |
| Minimum password length / requirements | `8` / letters and digits |
| URL Configuration → Site URL | your Railway URL |
| URL Configuration → Redirect URLs | `http://localhost:3000/auth/callback`, `https://<railway-domain>/auth/callback` |
| Emails → SMTP | host `smtp.resend.com`, port `465`, user `resend`, password = Resend API key |
| Emails → Templates → Confirm signup | subject "Your Grouv code", body from `supabase/templates/confirmation.html` |

The template has to use `{{ .Token }}`. That's what turns the email into the
6-digit code the verify screen expects, instead of a link.

### 3. Google sign-in

1. In Google Cloud → APIs & Services → Credentials, create an **OAuth client ID**
   (Web application).
2. Add the authorised redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`.
3. In Supabase → Sign In / Providers → Google, paste the client ID and secret.

### Schema map

| Migration | Tables |
| --- | --- |
| `…0100_foundation` | `chapters`, `chapter_phases` (seeded from `src/lib/chapters.ts`) |
| `…0200_identity` | `profiles`, `profile_prompts`, `user_chapters` (max 4 open), phase history, `chapter_closures`, `notification_preferences`, `subscriptions`, `focus_sessions` |
| `…0300_social_graph` | `connections` (Circle), `bonds` |
| `…0400_messaging` | `conversations`, `conversation_members`, `messages` (Bond, group and event chats) |
| `…0500_posts_and_spaces` | `posts`, `post_media`, `post_roots`, `comments`, `reports`, `space_questions`, replies |
| `…0600_groups` | `groups`, `group_members`, `group_join_requests`, `truths`, `truth_felt`, `video_truths` |
| `…0700_events_and_live_rooms` | `events`, `event_attendees`, `live_rooms`, `live_room_presence`, `waves` |
| `…0800_grouv_log` | `log_prompts`, `log_entries` |
| `…0900_notifications_and_proximity` | `notifications` (trigger-written), `proximity_sessions`, `nearby_people()` |
| `…1000_storage_and_realtime` | `avatars` / `media` / `chat` buckets and their policies, Realtime publication |
| `…1100_space_and_archive_reads` | `space_summaries()` (member counts per space), `chapter_tallies()` (a closed chapter's posts and log moments) |
| `…1200_feed_reads` | `feed_posts()` (paged feed: all / roots / open / mine), `space_members()`, `live_space_questions()` |
| `…1300_bonds_reads` | `bonds_overview()` (bonds + circle with their chat), `pending_requests()`, `people_you_may_know()` |
| `20260913…0100_log_groups_events_reads` | Log prompts and `circle_logs()`, `group_cards()` / `group_truths()`, `event_cards()`, Meet & Greet (`start_live_room()`, `live_room_cards()`, `live_room_people()`, presence heartbeat), `my_notifications()`, `question_replies()`, `search_everything()`, scheduled jobs |
| `20260913…0200_trust_and_delivery` | Rate limits on writes, `staff` with `moderation_queue()` / `moderate_target()`, the notification email queue (`claim_notification_emails()`), weekly connection suggestions |

Every table has row-level security. Content that can be anonymous (posts,
space questions, truths) keeps its real author in `private.content_owners`,
which the Data API can't reach. The public row only names the author when they
chose to be named.

### Testing the database

```bash
npm run db:test
```

This loads every migration into PGlite (Postgres compiled to WASM), with small
stand-ins for Supabase's `auth` and `storage` schemas. It then runs scenarios as
real users: RLS visibility, anonymous authorship, the 4-chapter limit, event
capacity, notifications and account deletion.

### Scheduled jobs

The migrations schedule three `pg_cron` jobs inside the database:

- `grouv-cleanup` runs every 5 minutes. It removes Meet & Greet presence from
  tabs that closed without leaving, ends empty rooms, deletes expired proximity
  sessions, and drops read notifications older than 90 days.
- `grouv-chapter-prompts` runs Mondays at 09:00 UTC. It sends the "Chapter
  prompt" weekly nudge to people who kept it switched on.
- `grouv-connection-suggestions` runs Wednesdays at 10:00 UTC. It gives each
  person one "someone you might connect with" notification: the person outside
  their circle who shares the most open spaces with them. Nobody is suggested
  to the same person twice within 60 days.

`pg_cron` ships with Supabase. If `db push` reports it missing, enable it under
Database → Extensions and push again.

### Realtime and presence

These update live, over Supabase Realtime:

- Bond chats, group conversations and event chats
- Read receipts
- The notification badge
- Meet & Greet rooms and waves

Online dots use a presence channel. Realtime is on by default for new projects,
and the tables are added to its publication by the storage-and-realtime
migration.

### Rate limits

Triggers cap how fast one person can write:

- 20 posts or truths an hour
- 60 comments an hour
- 120 messages every 5 minutes
- daily caps on requests, reports, groups, events, questions and log entries

The numbers live in `…0200_trust_and_delivery.sql`. A blocked write fails with
the hint `rate_limited`, and the app shows the "take a breather" message
instead of a generic error.

### Moderation

Reports land in `public.reports`. Staff review them at `/moderation`, which
Settings links to only for staff. Reports are grouped by what they point at:

- **Keep it** closes the reports.
- **Remove it** deletes the post, comment, group, truth or question, hides a
  message, or cancels an event.

Profiles can only be kept. To remove an account, delete the user in the
Supabase dashboard.

To make someone staff, run this in the SQL editor:

```sql
insert into public.staff (user_id)
select id from auth.users where email = 'you@example.com';
```

## Resend

1. Verify your sending domain in Resend.
2. Create an API key.
3. Set `RESEND_API_KEY` and `EMAIL_FROM` (an address on the verified domain).

The same key is the SMTP password in the Supabase settings above.

App email goes through `src/lib/email/send.ts`. Without a key it logs and
skips instead of failing. It sends:

- the welcome email after onboarding
- notification emails for connection requests, bond invitations, group join
  requests and their outcomes, and weekly suggestions. People can switch these
  off under Settings → Email updates.

Notification emails are claimed in the database before they're sent, so none
goes out twice. Most are sent right after the action that created them.
Suggestions come from `pg_cron`, though, so something has to call the sender on
a schedule:

```bash
curl -X POST https://<railway-domain>/api/cron/notification-emails \
  -H "Authorization: Bearer $CRON_SECRET"
```

On Railway, add a second service from the same repo. Give it a Cron Schedule of
`*/10 * * * *` and a start command that runs that curl. Any external scheduler
works too. A notification still unsent after a day is dropped, not sent late.

## Railway

1. New project → Deploy from GitHub repo. `railway.json` sets the build and
   start commands and a health check on `/api/health`. Railpack picks Node 22
   from `engines`.
2. Add every variable from `.env.example` to the service, including a long
   random `CRON_SECRET`. `NEXT_PUBLIC_*`
   values are baked in at build time, so redeploy after changing them.
3. Generate a domain. Then set `NEXT_PUBLIC_SITE_URL` to it and add
   `https://<domain>/auth/callback` to Supabase's redirect URLs.
