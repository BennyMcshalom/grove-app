-- Trust and delivery: rate limits, moderation, notification emails and the
-- weekly "someone you might connect with" suggestions.

-- ---------------------------------------------------------------------------
-- Rate limits
-- ---------------------------------------------------------------------------

-- BEFORE INSERT. TG_ARGV: [0] how to find the actor — a column name, or
-- 'owner' for content whose author is hidden in private.content_owners;
-- [1] the most rows allowed; [2] the window, e.g. '1 hour'.
-- Rows written by the server itself (no signed-in user) aren't limited.
create or replace function private.enforce_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  recent integer;
  max_rows integer := tg_argv[1]::integer;
  time_window interval := tg_argv[2]::interval;
begin
  if actor is null then
    return new;
  end if;

  if tg_argv[0] = 'owner' then
    execute format(
      'select count(*) from private.content_owners o
         join %I.%I t on t.id = o.content_id
        where o.content_type = $1 and o.owner_id = $2 and t.created_at > now() - $3',
      tg_table_schema, tg_table_name
    ) into recent using tg_table_name, actor, time_window;
  else
    execute format(
      'select count(*) from %I.%I where %I = $1 and created_at > now() - $2',
      tg_table_schema, tg_table_name, tg_argv[0]
    ) into recent using actor, time_window;
  end if;

  if recent >= max_rows then
    raise exception 'You''re doing that a lot. Take a breather and try again soon.'
      using errcode = 'check_violation', hint = 'rate_limited';
  end if;

  return new;
end;
$$;

create trigger posts_rate_limit before insert on public.posts
  for each row execute function private.enforce_rate_limit('owner', '20', '1 hour');
create trigger comments_rate_limit before insert on public.comments
  for each row execute function private.enforce_rate_limit('author_id', '60', '1 hour');
create trigger messages_rate_limit before insert on public.messages
  for each row execute function private.enforce_rate_limit('sender_id', '120', '5 minutes');
create trigger reports_rate_limit before insert on public.reports
  for each row execute function private.enforce_rate_limit('reporter_id', '20', '1 day');
create trigger connections_rate_limit before insert on public.connections
  for each row execute function private.enforce_rate_limit('requester_id', '50', '1 day');
create trigger bonds_rate_limit before insert on public.bonds
  for each row execute function private.enforce_rate_limit('inviter_id', '20', '1 day');
create trigger space_questions_rate_limit before insert on public.space_questions
  for each row execute function private.enforce_rate_limit('owner', '10', '1 day');
create trigger space_question_replies_rate_limit before insert on public.space_question_replies
  for each row execute function private.enforce_rate_limit('owner', '50', '1 day');
create trigger truths_rate_limit before insert on public.truths
  for each row execute function private.enforce_rate_limit('owner', '20', '1 hour');
create trigger groups_rate_limit before insert on public.groups
  for each row execute function private.enforce_rate_limit('created_by', '5', '1 day');
create trigger events_rate_limit before insert on public.events
  for each row execute function private.enforce_rate_limit('host_id', '10', '1 day');
create trigger log_entries_rate_limit before insert on public.log_entries
  for each row execute function private.enforce_rate_limit('user_id', '30', '1 day');

-- Counting by actor needs these; the others already lead with the actor column.
create index messages_by_sender on public.messages (sender_id, created_at desc);
create index comments_by_author on public.comments (author_id, created_at desc);
create index connections_by_requester on public.connections (requester_id, created_at desc);
create index bonds_by_inviter on public.bonds (inviter_id, created_at desc);
create index groups_by_creator on public.groups (created_by, created_at desc);
create index events_by_host on public.events (host_id, created_at desc);

-- The ownership rows for posts, questions, replies and truths are written
-- AFTER INSERT, so the limit above sees earlier rows only — which is what a
-- limit should count. The actor columns on groups and events are filled by
-- BEFORE triggers that run first alphabetically ("groups_prepare" <
-- "groups_rate_limit", "events_prepare" < "events_rate_limit").

-- ---------------------------------------------------------------------------
-- Moderation
-- ---------------------------------------------------------------------------

-- People who review reports. Added by hand (SQL editor / service role).
create table public.staff (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  added_at timestamptz not null default now()
);

alter table public.staff enable row level security;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.staff s where s.user_id = (select auth.uid()));
$$;

grant execute on function private.is_staff() to authenticated;

create policy "Staff can see who else is staff"
  on public.staff for select
  to authenticated
  using (private.is_staff());

create or replace function public.am_i_staff()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_staff();
$$;

revoke execute on function public.am_i_staff() from public, anon;
grant execute on function public.am_i_staff() to authenticated;

alter table public.reports
  add column reviewed_by uuid references public.profiles (id) on delete set null,
  add column reviewed_at timestamptz,
  add column resolution_note text check (char_length(resolution_note) <= 1000);

create policy "Staff see every report"
  on public.reports for select
  to authenticated
  using (private.is_staff());

-- Open reports grouped by what they point at, with enough of the content to
-- judge it. Staff only.
create or replace function public.moderation_queue(p_limit integer default 50)
returns table (
  target_type public.report_target,
  target_id uuid,
  report_count integer,
  reasons public.report_reason[],
  details text[],
  first_reported_at timestamptz,
  preview text,
  target_author_id uuid,
  target_author_name text,
  target_gone boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_staff() then
    raise exception 'Staff only' using errcode = 'insufficient_privilege';
  end if;

  return query
  with open_reports as (
    select
      r.target_type,
      r.target_id,
      count(*)::integer as report_count,
      array_agg(distinct r.reason) as reasons,
      array_remove(array_agg(r.details order by r.created_at), null) as details,
      min(r.created_at) as first_reported_at
    from public.reports r
    where r.status = 'open'
    group by r.target_type, r.target_id
  ),
  previews as (
    select
      o.*,
      case o.target_type
        when 'post' then (select coalesce(p.title || E'\n', '') || coalesce(p.body, '') from public.posts p where p.id = o.target_id)
        when 'comment' then (select c.body from public.comments c where c.id = o.target_id)
        when 'message' then (select coalesce(m.body, '[' || m.kind || ']') from public.messages m where m.id = o.target_id and m.deleted_at is null)
        when 'group' then (select g.title || coalesce(E'\n' || g.description, '') from public.groups g where g.id = o.target_id)
        when 'event' then (select e.title || coalesce(E'\n' || e.description, '') from public.events e where e.id = o.target_id)
        when 'profile' then (select pr.first_name from public.profiles pr where pr.id = o.target_id)
        when 'truth' then (select t.body from public.truths t where t.id = o.target_id)
        when 'space_question' then (select q.body from public.space_questions q where q.id = o.target_id)
      end as preview,
      case o.target_type
        when 'post' then (select ow.owner_id from private.content_owners ow where ow.content_type = 'posts' and ow.content_id = o.target_id)
        when 'comment' then (select c.author_id from public.comments c where c.id = o.target_id)
        when 'message' then (select m.sender_id from public.messages m where m.id = o.target_id)
        when 'group' then (select g.created_by from public.groups g where g.id = o.target_id)
        when 'event' then (select e.host_id from public.events e where e.id = o.target_id)
        when 'profile' then o.target_id
        when 'truth' then (select ow.owner_id from private.content_owners ow where ow.content_type = 'truths' and ow.content_id = o.target_id)
        when 'space_question' then (select ow.owner_id from private.content_owners ow where ow.content_type = 'space_questions' and ow.content_id = o.target_id)
      end as author_id
    from open_reports o
  )
  select
    pv.target_type,
    pv.target_id,
    pv.report_count,
    pv.reasons,
    pv.details,
    pv.first_reported_at,
    pv.preview,
    pv.author_id,
    author.first_name,
    pv.preview is null
  from previews pv
  left join public.profiles author on author.id = pv.author_id
  order by pv.report_count desc, pv.first_reported_at
  limit least(greatest(p_limit, 1), 200);
end;
$$;

revoke execute on function public.moderation_queue(integer) from public, anon;
grant execute on function public.moderation_queue(integer) to authenticated;

-- Resolve every open report on a target: 'dismiss' leaves the content,
-- 'remove' takes it down (profiles can't be removed here — dismiss, or delete
-- the account from the dashboard).
create or replace function public.moderate_target(
  p_target_type public.report_target,
  p_target_id uuid,
  p_action text,
  p_note text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved integer;
begin
  if not private.is_staff() then
    raise exception 'Staff only' using errcode = 'insufficient_privilege';
  end if;
  if p_action not in ('dismiss', 'remove') then
    raise exception 'Unknown action' using errcode = 'check_violation';
  end if;
  if p_action = 'remove' and p_target_type = 'profile' then
    raise exception 'Profiles can''t be removed from the queue' using errcode = 'check_violation';
  end if;

  if p_action = 'remove' then
    case p_target_type
      when 'post' then delete from public.posts where id = p_target_id;
      when 'comment' then delete from public.comments where id = p_target_id;
      -- The kind checks need the body or media path to stay, so a removed
      -- message is blanked and marked deleted instead.
      when 'message' then
        update public.messages
        set deleted_at = now(), body = case when kind in ('text', 'system') then '' else null end
        where id = p_target_id;
      when 'group' then delete from public.groups where id = p_target_id;
      when 'event' then update public.events set status = 'cancelled' where id = p_target_id;
      when 'truth' then delete from public.truths where id = p_target_id;
      when 'space_question' then delete from public.space_questions where id = p_target_id;
      else null;
    end case;
  end if;

  update public.reports
  set status = case when p_action = 'remove' then 'actioned' else 'dismissed' end::public.report_status,
      reviewed_by = (select auth.uid()),
      reviewed_at = now(),
      resolution_note = nullif(trim(p_note), '')
  where target_type = p_target_type and target_id = p_target_id and status = 'open';

  get diagnostics resolved = row_count;
  return resolved;
end;
$$;

revoke execute on function public.moderate_target(public.report_target, uuid, text, text) from public, anon;
grant execute on function public.moderate_target(public.report_target, uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Notification emails
-- ---------------------------------------------------------------------------

alter table public.notification_preferences
  add column email_updates boolean not null default true;

alter table public.notifications
  add column emailed_at timestamptz;

create index notifications_email_pending on public.notifications (created_at)
  where emailed_at is null;

-- Claims up to p_limit notifications worth an email and returns what the
-- sender needs, including the recipient's address. Claiming marks them, so two
-- workers never send the same one; kinds that don't email, and people who
-- switched email off, are marked without being returned. Server only.
create or replace function public.claim_notification_emails(p_limit integer default 50)
returns table (
  notification_id uuid,
  kind public.notification_kind,
  recipient_email text,
  recipient_name text,
  actor_name text,
  entity_id uuid,
  data jsonb,
  group_slug text,
  group_title text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Nothing to email for these, or too stale to be useful.
  update public.notifications n
  set emailed_at = now()
  where n.emailed_at is null
    and (
      n.kind not in ('connection_request', 'bond_invitation', 'group_join_request', 'group_join_reviewed', 'connection_suggested')
      or n.created_at < now() - interval '1 day'
      or exists (
        select 1 from public.notification_preferences np
        where np.user_id = n.user_id and not np.email_updates
      )
    );

  return query
  with claimed as (
    update public.notifications n
    set emailed_at = now()
    where n.id in (
      select pending.id from public.notifications pending
      where pending.emailed_at is null
      order by pending.created_at
      limit least(greatest(p_limit, 1), 200)
      for update skip locked
    )
    returning n.*
  )
  select
    c.id,
    c.kind,
    u.email::text,
    recipient.first_name,
    actor.first_name,
    c.entity_id,
    c.data,
    g.slug,
    g.title
  from claimed c
  join auth.users u on u.id = c.user_id
  join public.profiles recipient on recipient.id = c.user_id
  left join public.profiles actor on actor.id = c.actor_id
  left join public.groups g on g.id = nullif(c.data ->> 'group_id', '')::uuid
  where u.email is not null;
end;
$$;

revoke execute on function public.claim_notification_emails(integer) from public, anon, authenticated;
grant execute on function public.claim_notification_emails(integer) to service_role;

-- ---------------------------------------------------------------------------
-- "We found someone you might connect with"
-- ---------------------------------------------------------------------------

-- Once a week, one suggestion per person: the not-yet-connected person who
-- shares the most open chapters with them. Nobody is suggested to the same
-- person twice within 60 days.
create or replace function private.send_connection_suggestions()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, kind, actor_id, entity_id, data)
  select distinct on (pairs.viewer)
    pairs.viewer,
    'connection_suggested',
    pairs.candidate,
    pairs.candidate,
    jsonb_build_object('shared_spaces', pairs.shared)
  from (
    select
      mine.user_id as viewer,
      theirs.user_id as candidate,
      count(*)::integer as shared
    from public.user_chapters mine
    join public.user_chapters theirs
      on theirs.chapter_slug = mine.chapter_slug
      and theirs.status = 'open'
      and theirs.user_id <> mine.user_id
    where mine.status = 'open'
    group by mine.user_id, theirs.user_id
  ) pairs
  join public.profiles candidate_profile
    on candidate_profile.id = pairs.candidate and candidate_profile.onboarded_at is not null
  where not exists (
      select 1 from public.connections c
      where c.user_low = least(pairs.viewer, pairs.candidate)
        and c.user_high = greatest(pairs.viewer, pairs.candidate)
    )
    and not exists (
      select 1 from public.bonds b
      where b.status in ('pending', 'active')
        and b.user_low = least(pairs.viewer, pairs.candidate)
        and b.user_high = greatest(pairs.viewer, pairs.candidate)
    )
    and not exists (
      select 1 from public.notifications n
      where n.user_id = pairs.viewer
        and n.kind = 'connection_suggested'
        and (n.actor_id = pairs.candidate or n.created_at > now() - interval '6 days')
        and n.created_at > now() - interval '60 days'
    )
  order by pairs.viewer, pairs.shared desc, pairs.candidate;
end;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $job$select cron.schedule('grouv-connection-suggestions', '0 10 * * 3', 'select private.send_connection_suggestions()')$job$;
  end if;
end;
$$;
