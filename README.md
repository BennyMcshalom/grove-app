# Grouv

Next.js 16 app on **Railway**, with **Supabase** for Postgres, Auth, Storage
and Realtime. **Resend** sends email, **RevenueCat** handles billing, **LiveKit**
carries voice and video calls, and **OpenStreetMap** geocodes places.

```
Browser ──► Next.js on Railway ──► Supabase (Postgres + RLS, Auth, Storage, Realtime)
   │           │  Server Actions / Route Handlers
   │           ├─► Resend (app email)      Supabase Auth ──► Resend SMTP (sign-up codes)
   │           ├─► RevenueCat (reads the plan) ◄── webhook
   │           └─► Nominatim (geocoding)
   ├─► RevenueCat Web Billing (checkout, over the page)
   └─► LiveKit (call audio/video, with a token from the app) ──► webhook
```

RevenueCat, LiveKit and Resend are optional while developing. Without their keys
the Subscribe, call and email features stay hidden or skip quietly.

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
| `20260913…0300_billing_calls_places` | RevenueCat columns on `subscriptions` with `sync_billing()`, `calls` with `start_call()` / `answer_call()` / `end_call()`, private `user_regions` with `set_my_region()`, distance-aware `feed_posts()` and `event_cards()` |

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

The migrations schedule eleven `pg_cron` jobs inside the database. Six of
them are the back engine (migration `20260923000200_back_engine.sql`), whose
state lives in the `private` schema and is never readable by users:

- `grouv-bond-engine` runs Sundays at 02:00 UTC. It adds the week's
  interaction points to every pair, applies the multipliers (capped at ×2),
  the reciprocity penalty and the 3%-a-week decay after 30 silent days, then
  assigns and reshuffles everyone's five Bond slots and ranks. Tunable numbers
  live in the single row of `private.engine_rules`; point values live in
  `private.interaction_weights`.
- `grouv-stage-drift` runs Mondays at 03:00 UTC and acts every other week:
  one in-app prompt per pair whose stage overlap fell by more than half.
- `grouv-dormancy` runs Mondays at 03:30 UTC: one in-app nudge per pair
  silent for 30 days, never repeated.
- `grouv-introductions` runs Thursdays at 11:00 UTC: at most one "want to
  introduce them?" suggestion per person, never the same pair twice.
- `grouv-daily-cards` runs hourly at :45. Whoever's local time is 05:xx gets
  one Curio card per open space and one Wander card, expiring at noon local.
- `grouv-reciprocity-health` runs on the 1st of the month. It sets the
  internal flag matching uses to weigh down people with mostly one-sided
  connections.

The rest:

- `grouv-cleanup` runs every 5 minutes. It removes Meet & Greet presence from
  tabs that closed without leaving, ends empty rooms, deletes expired proximity
  sessions, and drops read notifications older than 90 days.
- `grouv-chapter-prompts` runs Mondays at 09:00 UTC. It sends the "Chapter
  prompt" weekly nudge to people who kept it switched on.
- `grouv-connection-suggestions` runs Wednesdays at 10:00 UTC. It gives each
  person one "someone you might connect with" notification: the person outside
  their circle who shares the most open spaces with them. Nobody is suggested
  to the same person twice within 60 days.
- `grouv-expire-calls` runs every minute. A call nobody answered for 45 seconds
  becomes missed, and one left open for 6 hours is ended.
- `grouv-expire-trials` runs hourly. An in-app trial that ran out without a
  paid plan becomes expired.

`pg_cron` ships with Supabase. If `db push` reports it missing, enable it under
Database → Extensions and push again.

### Realtime and presence

These update live, over Supabase Realtime:

- Bond chats, group conversations and event chats
- Read receipts
- The notification badge
- Meet & Greet rooms and waves
- Incoming calls ringing, and calls ending

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

On Railway, that's the `cron` service described under [Railway](#railway). Any
external scheduler works too. A notification still unsent after a day is dropped, not sent late.

## RevenueCat (billing)

RevenueCat holds the plan. The web app sells it through RevenueCat **Web
Billing**, which charges through a Stripe account connected to RevenueCat. The
RevenueCat customer id is the Supabase user id, so a future iOS or Android app
can sell the same entitlement and the plan follows the person. People can
still start the free 14-day in-app trial without a card.

1. Create a RevenueCat project. Under **Apps**, add a **Web Billing** app and
   connect your Stripe account to it.
2. Under **Product catalog**:
   - Create a product, for example a monthly "Grouv Full access".
   - Create the entitlement `full_access` (or set `REVENUECAT_ENTITLEMENT_ID`
     to yours) and attach the product to it.
   - Make an offering marked **Current**, with a Monthly package holding the
     product. Settings sells that package, or the offering's first package if
     there's no monthly one.
3. Under **Project settings → API keys**:
   - Copy the Web Billing public key (`rcb_…`) into
     `NEXT_PUBLIC_REVENUECAT_WEB_API_KEY`.
   - Create a secret key with API version **V1** (`sk_…`) and put it in
     `REVENUECAT_SECRET_API_KEY`.
4. Under **Integrations → Webhooks**:
   - Add `https://<railway-domain>/api/revenuecat/webhook`.
   - Set its Authorization header to a long random string, and put the same
     string in `REVENUECAT_WEBHOOK_AUTH`.
   - If you switch on signing, put the signing secret in
     `REVENUECAT_WEBHOOK_SIGNING_SECRET`.

A webhook event only triggers a re-read of that customer from RevenueCat, so
retries and out-of-order events can't leave a stale status. Settings also
re-reads the plan as soon as checkout closes. "Manage billing" opens
RevenueCat's link for wherever the plan was bought. Anyone with a plan that
will renew has to cancel it before they can delete their account.

To test purchases, use the Web Billing **sandbox** key and set
`REVENUECAT_ALLOW_SANDBOX=true`. Without that flag, sandbox purchases are
ignored. Never set it in production.

The deployed app is on the sandbox key with `REVENUECAT_ALLOW_SANDBOX=true`
right now, so test purchases grant real access. Before real customers arrive,
swap in the production Web Billing key and set the flag back to `false`. The
server logs a warning on every boot while the flag is on.

The app doesn't lock any feature behind the plan yet. When that's decided,
check `subscriptions.status` for `trialing` or `active`.

## LiveKit (calls)

Voice and video calls work between people in each other's circle, from the
phone and video icons in a bond chat. Supabase does the ringing and keeps the
call history; each call's audio and video runs in its own LiveKit room.

LiveKit Cloud's free **Build** plan needs no card. It includes 5,000 WebRTC
minutes and 100 concurrent connections a month. LiveKit is open source, so the
same code works against a self-hosted server if usage outgrows that.

1. Create a project at cloud.livekit.io. Under **Settings → Keys**, create a
   key and copy the WebSocket URL, API key and secret into `LIVEKIT_URL`,
   `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`.
2. Under **Settings → Webhooks**, add
   `https://<railway-domain>/api/livekit/webhook`, signed with the same key.
   It marks a call over when its room empties, for example when someone closes
   the tab instead of hanging up.

Calls need HTTPS for camera and microphone access. Railway domains and
`localhost` both qualify. Each finished, missed or declined call leaves a line
in the chat, such as "Video call · 12 min".

## Places

Geocoding uses OpenStreetMap's public Nominatim, which is free. It's called
only from the server, at most once a second per instance, with results cached
in memory. Nominatim's policy allows this light, user-triggered use, but it
forbids type-ahead search. If traffic grows, set `LOCATIONIQ_API_KEY`: its API
is compatible, and its free tier allows 5,000 lookups a day.

- **Events:** the venue is geocoded when the event is created. Events within
  100 km of you list first, show "12 km away", and link to OpenStreetMap. An
  event whose venue can't be found is still created, just without those.
- **Your region:** saving a location in Edit Profile stores a point rounded to
  about 11 km, in `private.user_regions`. The Data API can't reach that table,
  so other people only ever get a distance, never the coordinates.
- **The space Open tab** shows people within 100 km first. "Search across
  regions" widens it to everyone.

## Railway

The project is **Grouv**, with two services in the `production` environment:
`web` (the app) and `cron` (notification emails). The app is at
<https://web-production-a8471.up.railway.app>.

Railway no longer reads `railway.json` — config-as-code is deprecated in
favour of `.railway/railway.ts`, which can't describe these two services
without also taking over every variable. Both services are therefore
configured in Railway itself, under **Settings → Build / Deploy**:

| Setting | `web` | `cron` |
| --- | --- | --- |
| Build command | `npm run build` | `echo no build needed` |
| Start command | `npm run start` | `node scripts/cron/notification-emails.mjs` |
| Health check | `/api/health`, 120s | — |
| Cron schedule | — | `*/10 * * * *` |
| Restart policy | On failure, 5 retries | Never |

Railpack picks Node 22 from `engines`.

### Variables

`web` holds every name in `.env.example`. `cron` needs only two, and takes
them from `web`:

- `NEXT_PUBLIC_SITE_URL=${{web.NEXT_PUBLIC_SITE_URL}}`
- `CRON_SECRET=${{web.CRON_SECRET}}`

`NEXT_PUBLIC_*` values are baked in at build time, so redeploy after changing
one. Secrets are stored literally here: don't escape a `$` as `\$` the way
`.env` files need.

### Deploying

This app lives on the `backend` branch. The repo's `main` branch holds a
different app with its own history, so never deploy `main`.

Both services are connected to the repo and deploy on every push to
`backend`. To deploy uncommitted work from this machine instead:

```bash
railway up --service web
railway up --service cron
```

If Railway ever answers "no one in the project has access to it", the Railway
**account** has lost its GitHub link — connect it again under Account Settings
(installing the GitHub App at <https://github.com/apps/railway-app> is a
separate step, and both are needed).

### After the domain changes

Under **Settings → Networking**, a generated domain already exists. If it
changes, update all of these:

- `NEXT_PUBLIC_SITE_URL` on the `web` service.
- `site_url` and `additional_redirect_urls` in `supabase/config.toml`, then
  `npx supabase config push`.
- The RevenueCat and LiveKit webhook URLs.

## Before launch

What's deliberately unfinished, and what has to change before real people use
this. Roughly in the order it will bite.

### Billing is in sandbox

The deployed app uses RevenueCat's **sandbox** Web Billing key with
`REVENUECAT_ALLOW_SANDBOX=true`, so a test purchase grants real access. The
server logs a warning on every boot while that flag is on.

- [ ] Put the **production** Web Billing key in `NEXT_PUBLIC_REVENUECAT_WEB_API_KEY`
      (needs Stripe connected and live in RevenueCat), then redeploy — it's a
      `NEXT_PUBLIC_*` value, so it's baked in at build time.
- [ ] Set `REVENUECAT_ALLOW_SANDBOX=false`.
- [ ] `REVENUECAT_SECRET_API_KEY` must be a **V1** secret key (`sk_…`). A V2 key
      answers 403 and a webhook signing secret answers 401.

### Nothing is behind the plan

`subscriptions.status` is written correctly (`trialing`, `active`, `past_due`,
`canceled`, `expired`) and nothing reads it. Decide what full access unlocks,
then gate those features on it.

### Google sign-in is off

`auth.external.google` is disabled in `supabase/config.toml` because the OAuth
client doesn't exist yet. The sign-in screens still show the button. Create the
client (see [Google sign-in](#3-google-sign-in)), fill in
`SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `_SECRET`, set `enabled = true`,
and `npx supabase config push`.

### Moderation has no staff

Reports pile up in `public.reports` and `/moderation` is only linked for staff.
Nobody is staff yet — add yourself with the SQL under
[Moderation](#moderation).

### Email

- [ ] Check the sending domain in `EMAIL_FROM` is verified in Resend, or every
      app email silently fails.
- [ ] Supabase Auth's SMTP uses the same Resend key. Sign-up codes stop
      arriving if that key is rotated in one place only.

### Domains

The app is on a generated `*.up.railway.app` domain. Moving to a real domain
means updating `NEXT_PUBLIC_SITE_URL`, `supabase/config.toml`, and the
RevenueCat and LiveKit webhook URLs — the list is under
[After the domain changes](#after-the-domain-changes).
