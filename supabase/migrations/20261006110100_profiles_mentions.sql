-- @mentions ("callouts"), 6 Oct 2026.
--
-- Typing @ in a post, a comment or a chat picks a person; the words keep
-- "@Amara" and the row keeps who that was in `mentions` (messages already had
-- the column). The database decides who may be mentioned: only people who can
-- see that post or are in that conversation, never yourself, never across a
-- block. Everyone left gets a 'mentioned' notification.
--
-- Posts take their mentions through set_post_mentions() once the post exists
-- and its audience is set, since who can see it depends on both.

alter table public.posts add column if not exists mentions uuid[] not null default '{}';
alter table public.comments add column if not exists mentions uuid[] not null default '{}';

-- Comments only take the columns a client writes (20260924000100).
grant insert (mentions) on public.comments to authenticated;

-- ---------------------------------------------------------------------------
-- Who can see a post, asked about any person rather than the signed-in one.
-- The same rules as the policy "Posts reach the audience their author chose"
-- (20260930130100), spelled out with explicit users.
-- ---------------------------------------------------------------------------
create or replace function private.post_visible_to(p_post_id uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.posts po
    left join private.content_owners o on o.content_type = 'posts' and o.content_id = po.id
    where po.id = p_post_id
      and (
        o.owner_id = p_user
        or (
          po.audience = 'selected_bonds'
          and exists (select 1 from public.post_audience a where a.post_id = po.id and a.user_id = p_user)
        )
        or (
          po.audience = 'everyone'
          and (
            (
              po.author_id is not null
              and exists (
                select 1 from public.bonds b
                where b.status = 'active'
                  and b.user_low = least(po.author_id, p_user)
                  and b.user_high = greatest(po.author_id, p_user)
              )
            )
            or (
              po.created_at > now() - interval '48 hours'
              and exists (
                select 1 from public.user_chapters uc
                where uc.user_id = p_user and uc.chapter_slug = po.chapter_slug and uc.status = 'open'
              )
              and (
                exists (
                  select 1 from public.connections c
                  where c.status = 'accepted'
                    and c.user_low = least(coalesce(po.author_id, o.owner_id), p_user)
                    and c.user_high = greatest(coalesce(po.author_id, o.owner_id), p_user)
                )
                -- An anonymous post also reaches its hidden author's bonds.
                or (
                  po.author_id is null
                  and exists (
                    select 1 from public.bonds b
                    where b.status = 'active'
                      and b.user_low = least(o.owner_id, p_user)
                      and b.user_high = greatest(o.owner_id, p_user)
                  )
                )
              )
            )
            or (
              po.open_grove
              and po.created_at > now() - interval '31 days'
              and exists (
                select 1 from public.user_chapters uc
                where uc.user_id = p_user and uc.chapter_slug = po.chapter_slug and uc.status = 'open'
              )
            )
          )
        )
      )
  );
$$;

revoke execute on function private.post_visible_to(uuid, uuid) from public, anon;

-- Keeps the people `p_author` may mention: real, onboarded, not themselves,
-- no block either way, and able to see the post / in the conversation.
-- At most 20, each once.
create or replace function private.allowed_mentions(
  p_author uuid,
  p_wanted uuid[],
  p_post_id uuid default null,
  p_conversation_id uuid default null
)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(m order by m), '{}')
  from (
    select distinct w.m
    from unnest(coalesce(p_wanted, '{}'::uuid[])) as w (m)
    join public.profiles p on p.id = w.m and p.onboarded_at is not null
    where p_author is not null
      and w.m <> p_author
      and not private.blocked_between(p_author, w.m)
      and case
        when p_post_id is not null then private.post_visible_to(p_post_id, w.m)
        when p_conversation_id is not null then exists (
          select 1 from public.conversation_members cm
          where cm.conversation_id = p_conversation_id and cm.user_id = w.m
        )
        else false
      end
    limit 20
  ) s (m);
$$;

revoke execute on function private.allowed_mentions(uuid, uuid[], uuid, uuid) from public, anon;

-- ---------------------------------------------------------------------------
-- Before a row is written: keep only the mentions that are allowed.
-- ---------------------------------------------------------------------------
create or replace function private.sanitize_mentions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
begin
  if coalesce(cardinality(new.mentions), 0) = 0 then
    new.mentions := '{}';
    return new;
  end if;

  -- Separate branches: PL/pgSQL resolves every field in an expression, and
  -- each table names its author differently.
  if tg_table_name = 'posts' then
    -- A new post can't be checked yet (no audience rows); mentions arrive
    -- through set_post_mentions().
    if tg_op = 'INSERT' then
      new.mentions := '{}';
    else
      select o.owner_id into owner from private.content_owners o
      where o.content_type = 'posts' and o.content_id = new.id;
      new.mentions := private.allowed_mentions(owner, new.mentions, new.id, null);
    end if;
  elsif tg_table_name = 'comments' then
    new.mentions := private.allowed_mentions(new.author_id, new.mentions, new.post_id, null);
  else
    if new.kind = 'system' then
      new.mentions := '{}';
    else
      new.mentions := private.allowed_mentions(new.sender_id, new.mentions, null, new.conversation_id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists posts_sanitize_mentions on public.posts;
create trigger posts_sanitize_mentions
  before insert or update of mentions on public.posts
  for each row execute function private.sanitize_mentions();

drop trigger if exists comments_sanitize_mentions on public.comments;
create trigger comments_sanitize_mentions
  before insert or update of mentions on public.comments
  for each row execute function private.sanitize_mentions();

drop trigger if exists messages_sanitize_mentions on public.messages;
create trigger messages_sanitize_mentions
  before insert or update of mentions on public.messages
  for each row execute function private.sanitize_mentions();

-- ---------------------------------------------------------------------------
-- After: tell each newly mentioned person. An anonymous post stays anonymous
-- (no actor). The notification carries where to open it and a short excerpt.
-- ---------------------------------------------------------------------------
create or replace function private.notify_mentions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  fresh uuid[];
  target uuid;
  actor uuid;
  entity uuid;
  payload jsonb;
  convo public.conversation_kind;
begin
  select coalesce(array_agg(m), '{}') into fresh
  from unnest(new.mentions) m
  where tg_op = 'INSERT' or not (m = any (coalesce(old.mentions, '{}')));

  if cardinality(fresh) = 0 then
    return new;
  end if;

  if tg_table_name = 'posts' then
    actor := new.author_id;
    entity := new.id;
    payload := jsonb_build_object('source', 'post', 'excerpt', left(coalesce(new.title, new.body, ''), 140));
  elsif tg_table_name = 'comments' then
    actor := new.author_id;
    entity := new.post_id;
    payload := jsonb_build_object('source', 'comment', 'comment_id', new.id, 'excerpt', left(coalesce(new.body, ''), 140));
  else
    actor := new.sender_id;
    entity := new.conversation_id;
    select c.kind into convo from public.conversations c where c.id = new.conversation_id;
    payload := jsonb_build_object(
      'source', 'message',
      'message_id', new.id,
      'conversation_kind', convo,
      'excerpt', left(coalesce(new.body, ''), 140),
      'group_slug', (select g.slug from public.groups g where g.conversation_id = new.conversation_id),
      'event_id', (select e.id from public.events e where e.conversation_id = new.conversation_id)
    );
  end if;

  foreach target in array fresh loop
    -- Checked again here: a block can land between the two triggers' calls.
    if actor is null or not private.blocked_between(actor, target) then
      perform private.notify(target, 'mentioned', actor, entity, payload);
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists posts_notify_mentions on public.posts;
create trigger posts_notify_mentions
  after update of mentions on public.posts
  for each row execute function private.notify_mentions();

drop trigger if exists comments_notify_mentions on public.comments;
create trigger comments_notify_mentions
  after insert on public.comments
  for each row execute function private.notify_mentions();

drop trigger if exists messages_notify_mentions on public.messages;
create trigger messages_notify_mentions
  after insert on public.messages
  for each row execute function private.notify_mentions();

-- ---------------------------------------------------------------------------
-- Composer: the post's mentions, once it exists and its audience is set.
-- Only the post's real owner (anonymous posts too). Returns who was kept.
-- ---------------------------------------------------------------------------
create or replace function public.set_post_mentions(p_post_id uuid, p_user_ids uuid[])
returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  kept uuid[];
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;
  if not exists (
    select 1 from private.content_owners o
    where o.content_type = 'posts' and o.content_id = p_post_id and o.owner_id = uid
  ) then
    raise exception 'Only the author can tag people in a post' using errcode = 'insufficient_privilege';
  end if;

  update public.posts set mentions = coalesce(p_user_ids, '{}')
  where id = p_post_id
  returning mentions into kept;
  return coalesce(kept, '{}');
end;
$$;

revoke execute on function public.set_post_mentions(uuid, uuid[]) from public, anon;
grant execute on function public.set_post_mentions(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- The @ autocomplete: up to 8 people whose first name starts with p_query,
-- that the caller may mention in this context:
--   · a post (commenting): their circle and people holding the post's Space,
--     who can see the post;
--   · a Space (writing a new post): their circle and people holding it;
--   · a conversation: its other members.
-- Circle and bonds first. Blocks either way are left out.
-- ---------------------------------------------------------------------------
create or replace function public.mention_candidates(
  p_query text default '',
  p_post_id uuid default null,
  p_chapter_slug text default null,
  p_conversation_id uuid default null
)
returns table (user_id uuid, first_name text, avatar_url text, aura public.aura, is_close boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  slug text := p_chapter_slug;
  pattern text := replace(replace(replace(left(coalesce(trim(p_query), ''), 40), '\', '\\'), '%', '\%'), '_', '\_') || '%';
begin
  if uid is null then
    return;
  end if;

  if p_conversation_id is not null then
    if not exists (
      select 1 from public.conversation_members cm where cm.conversation_id = p_conversation_id and cm.user_id = uid
    ) then
      return;
    end if;
    return query
      select p.id, p.first_name, p.avatar_url, p.aura, true
      from public.conversation_members cm
      join public.profiles p on p.id = cm.user_id
      where cm.conversation_id = p_conversation_id
        and cm.user_id <> uid
        and p.first_name ilike pattern
        and not private.blocked_between(uid, p.id)
      order by p.first_name
      limit 8;
    return;
  end if;

  if p_post_id is not null then
    if not private.post_visible_to(p_post_id, uid) then
      return;
    end if;
    select po.chapter_slug into slug from public.posts po where po.id = p_post_id;
  end if;

  return query
    with circle as (
      select case when c.requester_id = uid then c.addressee_id else c.requester_id end as id
      from public.connections c
      where c.status = 'accepted' and (c.requester_id = uid or c.addressee_id = uid)
    ),
    space as (
      select uc.user_id as id from public.user_chapters uc
      where slug is not null and uc.chapter_slug = slug and uc.status = 'open'
    ),
    pool as (
      select id, true as is_close from circle
      union all
      select id, false from space where id not in (select id from circle)
    )
    select p.id, p.first_name, p.avatar_url, p.aura, pool.is_close
    from pool
    join public.profiles p on p.id = pool.id and p.onboarded_at is not null
    where pool.id <> uid
      and p.first_name ilike pattern
      and not private.blocked_between(uid, p.id)
      and (p_post_id is null or private.post_visible_to(p_post_id, p.id))
    order by pool.is_close desc, p.first_name
    limit 8;
end;
$$;

revoke execute on function public.mention_candidates(text, uuid, text, uuid) from public, anon;
grant execute on function public.mention_candidates(text, uuid, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Someone's Grouv: the faces on their rings. Only people the viewer already
-- knows are shown — the viewer themself when connected, and connections
-- they share — never anyone across a block. Bonds first; at most 4.
-- ---------------------------------------------------------------------------
create or replace function public.grouv_people(p_user_id uuid)
returns table (user_id uuid, first_name text, avatar_url text, aura public.aura, relationship text)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select (select auth.uid()) as id),
  theirs as (
    select case when c.requester_id = p_user_id then c.addressee_id else c.requester_id end as id,
      exists (
        select 1 from public.bonds b
        where b.status = 'active'
          and b.user_low = least(c.requester_id, c.addressee_id)
          and b.user_high = greatest(c.requester_id, c.addressee_id)
      ) as bonded
    from public.connections c
    where c.status = 'accepted' and p_user_id in (c.requester_id, c.addressee_id)
  )
  select p.id, p.first_name, p.avatar_url, p.aura, case when t.bonded then 'bond' else 'circle' end
  from theirs t
  cross join me
  join public.profiles p on p.id = t.id
  where me.id is not null
    and not private.blocked_between(me.id, p_user_id)
    and not private.blocked_between(me.id, t.id)
    and (
      t.id = me.id
      or exists (
        select 1 from public.connections c
        where c.status = 'accepted'
          and c.user_low = least(me.id, t.id)
          and c.user_high = greatest(me.id, t.id)
      )
    )
  order by t.bonded desc, (t.id = me.id) desc, p.first_name
  limit 4;
$$;

revoke execute on function public.grouv_people(uuid) from public, anon;
grant execute on function public.grouv_people(uuid) to authenticated;
