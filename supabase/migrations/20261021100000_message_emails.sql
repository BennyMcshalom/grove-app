-- Emails for unread messages (2026-10-21).
--
-- Grouv is a website: there are no push notifications, so someone who isn't
-- on the site never learns they've been messaged. Now, when a chat has
-- messages a member hasn't read for a couple of minutes, they get one email
-- about it ("Amara sent you a message", "3 new messages in Hiking Lagos").
--
-- Rules, all in claim_message_emails():
--   * At most one email per chat until they've opened it again: an email
--     sets conversation_members.emailed_until, and that chat is skipped until
--     last_read_at passes it. Only messages after last_read_at count.
--   * Messages need to have sat unread for 2 minutes, so someone chatting
--     live (who reads them as they arrive) isn't emailed.
--   * Not for muted chats, not for people who turned message emails off,
--     not about messages from someone either person has blocked, and not
--     about one's own, deleted or system messages.
--   * At most 10 message emails per person per hour, across all chats.
--
-- The app's /api/cron/message-emails sends what this returns; pg_cron calls
-- it every minute (below).

alter table public.notification_preferences
  add column if not exists message_emails boolean not null default true;

-- Settings → Notifications → "Message emails".
grant update (message_emails) on public.notification_preferences to authenticated;

-- Up to when this member has been emailed about this chat. Only the claimer
-- writes it (members can update last_read_at only).
alter table public.conversation_members
  add column if not exists emailed_until timestamptz;

create index if not exists conversation_members_emailed_recently
  on public.conversation_members (user_id, emailed_until)
  where emailed_until is not null;

create or replace function public.claim_message_emails(p_limit integer default 50)
returns table (
  conversation_id uuid,
  conversation_kind public.conversation_kind,
  recipient_email text,
  recipient_name text,
  unread_count integer,
  sender_count integer,
  latest_sender_id uuid,
  latest_sender_name text,
  latest_kind public.message_kind,
  latest_preview text,
  group_slug text,
  group_title text,
  event_id uuid,
  event_title text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- One claimer at a time, so overlapping runs never email twice.
  perform pg_advisory_xact_lock(hashtext('grouv-claim-message-emails'));

  return query
  with candidates as (
    -- Chats with something newer than what this member last read, and no
    -- email about this chat since they last opened it.
    select
      cm.conversation_id,
      cm.user_id,
      greatest(
        coalesce(cm.last_read_at, '-infinity'::timestamptz),
        coalesce(cm.cleared_at, '-infinity'::timestamptz),
        cm.joined_at
      ) as since
    from public.conversation_members cm
    join public.conversations c on c.id = cm.conversation_id
    join public.notification_preferences np on np.user_id = cm.user_id
    where not cm.muted
      and np.message_emails
      -- Already emailed about this chat and not opened it since: wait.
      and (cm.emailed_until is null or coalesce(cm.last_read_at, '-infinity'::timestamptz) >= cm.emailed_until)
      and c.last_message_at is not null
      and c.last_message_at > greatest(
        coalesce(cm.last_read_at, '-infinity'::timestamptz),
        coalesce(cm.cleared_at, '-infinity'::timestamptz),
        cm.joined_at
      )
      -- At most 10 message emails an hour per person.
      and (
        select count(*) from public.conversation_members recent
        where recent.user_id = cm.user_id and recent.emailed_until > now() - interval '1 hour'
      ) < 10
  ),
  unread as (
    select
      cand.conversation_id,
      cand.user_id,
      count(*)::integer as unread_count,
      count(distinct m.sender_id)::integer as sender_count,
      min(m.created_at) as first_at,
      (array_agg(m.id order by m.created_at desc))[1] as latest_id
    from candidates cand
    join public.messages m
      on m.conversation_id = cand.conversation_id
     and m.created_at > cand.since
     and m.sender_id is not null
     and m.sender_id <> cand.user_id
     and m.deleted_at is null
     and not private.blocked_between(cand.user_id, m.sender_id)
    group by cand.conversation_id, cand.user_id
    -- Unread for at least 2 minutes: live chatters read them before this.
    having min(m.created_at) < now() - interval '2 minutes'
  ),
  picked as (
    select u.* from unread u
    order by u.first_at
    limit least(greatest(p_limit, 1), 200)
  ),
  claimed as (
    update public.conversation_members cm
    set emailed_until = now()
    from picked p
    where cm.conversation_id = p.conversation_id and cm.user_id = p.user_id
    returning cm.conversation_id, cm.user_id
  )
  select
    p.conversation_id,
    c.kind,
    au.email::text,
    recipient.first_name,
    p.unread_count,
    p.sender_count,
    latest.sender_id,
    sender.first_name,
    latest.kind,
    -- A short preview of text only; other kinds are described in the email.
    case when latest.kind in ('text', 'link') then left(latest.body, 140) end,
    g.slug,
    g.title,
    e.id,
    e.title
  from picked p
  join claimed cl on cl.conversation_id = p.conversation_id and cl.user_id = p.user_id
  join public.conversations c on c.id = p.conversation_id
  join auth.users au on au.id = p.user_id and au.email is not null and au.email_confirmed_at is not null
  join public.profiles recipient on recipient.id = p.user_id
  join public.messages latest on latest.id = p.latest_id
  left join public.profiles sender on sender.id = latest.sender_id
  left join public.groups g on g.conversation_id = p.conversation_id
  left join public.events e on e.conversation_id = p.conversation_id;
end;
$$;

revoke all on function public.claim_message_emails(integer) from public, anon, authenticated;
grant execute on function public.claim_message_emails(integer) to service_role;

-- Every minute: the 2-minute wait plus at most a minute until the next run.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    execute $job$select cron.schedule('grouv-message-emails', '* * * * *', $cmd$select private.call_app_cron('message-emails')$cmd$)$job$;
  end if;
end;
$$;
