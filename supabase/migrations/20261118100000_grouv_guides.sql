-- Grouv guides: a small set of house accounts that keep the feed alive while
-- Grouv is young. They're labelled — public.guides is readable by everyone
-- signed in and the app shows a "Guide" tag next to their names.
--
-- What they do, all from the database (pg_cron), no app service needed:
--   * post from a written library (private.guide_posts), a few times a day,
--     each post followed over the next hours by replies and roots from other
--     guides, so threads read like conversations;
--   * root new public posts from real people, and give someone's first ever
--     post a short welcome reply.
--
-- They never post anonymously, never act on anonymous or narrower posts, skip
-- anyone who blocked them, receive no email (no address), and are kept out of
-- suggestions, matching and auto-Bonds (privacy_settings off).
--
-- Turn them off:  update private.guide_config set enabled = false;

create table public.guides (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  added_at timestamptz not null default now()
);

alter table public.guides enable row level security;

create policy "Everyone signed in can see who the guides are"
  on public.guides for select
  to authenticated
  using (true);

revoke all on public.guides from anon, authenticated;
grant select on public.guides to authenticated;

create table private.guide_config (
  id boolean primary key default true check (id),
  enabled boolean not null default true
);
insert into private.guide_config default values;

-- The library. replies are written by other guides, in order, after it's posted.
create table private.guide_posts (
  id serial primary key,
  chapter_slug text not null,
  conversation public.post_conversation,
  topic text,
  progress public.post_progress,
  title text not null,
  body text,
  replies text[] not null default '{}',
  used_at timestamptz
);

-- A first post's welcome, by kind of conversation (null: no kind chosen).
create table private.guide_welcomes (
  id serial primary key,
  conversation public.post_conversation,
  body text not null
);

create table private.guide_queue (
  id bigserial primary key,
  due_at timestamptz not null,
  guide_id uuid not null references public.guides (user_id) on delete cascade,
  action text not null check (action in ('root', 'comment')),
  post_id uuid not null references public.posts (id) on delete cascade,
  body text,
  done_at timestamptz,
  error text
);

create index guide_queue_due on private.guide_queue (due_at) where done_at is null;
create index guide_queue_by_post on private.guide_queue (post_id);

-- ---------------------------------------------------------------------------
-- Acting as a guide: the triggers read auth.uid() (author, rate limits).
-- ---------------------------------------------------------------------------

create or replace function private.act_as(p_user uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  perform set_config(
    'request.jwt.claims',
    case when p_user is null then '' else json_build_object('sub', p_user, 'role', 'authenticated')::text end,
    true
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- The accounts
-- ---------------------------------------------------------------------------

create or replace function private.enlist_guides()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  g record;
  uid uuid;
  full_auth boolean := exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'instance_id'
  );
  space text;
  phase text;
  i integer;
begin
  if exists (select 1 from public.guides) then
    return;
  end if;

  for g in
    select * from (values
      ('Amara',  'amara.guide',  'London',     array['career', 'relationships', 'creative'],
                                               array['Career pivot in progress', 'Working on it', 'Finding the spark']),
      ('Tolu',   'tolu.guide',   'Lagos',      array['wealth', 'career', 'spiritual'],
                                               array['Getting out of debt', 'Side hustle, building something', 'Holding doubt and faith']),
      ('Daniel', 'daniel.guide', 'Manchester', array['health', 'learning', 'adventure'],
                                               array['Training for something', 'Changing fields', 'Planning the leap']),
      ('Zainab', 'zainab.guide', 'Abuja',      array['spiritual', 'relationships', 'wealth'],
                                               array['Returning after a while', 'Caring for family', 'Building a first cushion']),
      ('Chidi',  'chidi.guide',  'Toronto',    array['career', 'wealth', 'health'],
                                               array['Building a business (early)', 'Investing seriously', 'Building a habit']),
      ('Sophie', 'sophie.guide', 'Bristol',    array['adventure', 'creative', 'learning'],
                                               array['Relocating somewhere new', 'Mid-project', 'Self-teaching']),
      ('Kemi',   'kemi.guide',   'Birmingham', array['relationships', 'health', 'career'],
                                               array['Early parenthood', 'Listening to my body', 'Burned out, searching']),
      ('Marcus', 'marcus.guide', 'Leeds',      array['creative', 'learning', 'spiritual'],
                                               array['Sharing for the first time', 'Day one', 'Deepening a practice']),
      ('Priya',  'priya.guide',  'Leicester',  array['learning', 'career', 'adventure'],
                                               array['In the thick of study', 'First job, figuring it out', 'First solo trip']),
      ('Jide',   'jide.guide',   'Houston',    array['relationships', 'health', 'wealth'],
                                               array['Newly single', 'Starting over', 'Saving for something big'])
    ) as t (first_name, username, place, spaces, phases)
  loop
    uid := gen_random_uuid();
    -- No email: no sign-in, and nothing is ever emailed to a guide.
    if full_auth then
      execute $sql$
        insert into auth.users (
          id, instance_id, aud, role, encrypted_password, raw_app_meta_data, raw_user_meta_data,
          created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
        ) values (
          $1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '',
          '{"provider":"grouv_guide","providers":[]}'::jsonb, $2, now(), now(), '', '', '', ''
        )
      $sql$ using uid, jsonb_build_object('first_name', g.first_name, 'terms_accepted', true, 'grouv_guide', true);
    else
      insert into auth.users (id, raw_user_meta_data)
      values (uid, jsonb_build_object('first_name', g.first_name, 'terms_accepted', true, 'grouv_guide', true));
    end if;

    update public.profiles
    set onboarded_at = now(),
        location_label = g.place,
        username = case
          when exists (select 1 from public.profiles p where p.username = g.username) then null
          else g.username
        end
    where id = uid;

    insert into public.guides (user_id) values (uid);

    insert into public.privacy_settings (user_id, discoverable, activity_matching)
    values (uid, false, false)
    on conflict (user_id) do update set discoverable = false, activity_matching = false;

    update public.notification_preferences
    set email_updates = false, message_emails = false
    where user_id = uid;

    for i in 1 .. array_length(g.spaces, 1) loop
      space := g.spaces[i];
      phase := g.phases[i];
      insert into public.user_chapters (user_id, chapter_slug, phase) values (uid, space, phase);
    end loop;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Doing things
-- ---------------------------------------------------------------------------

-- Runs what's due. Each item stands alone: one failure doesn't stop the rest.
create or replace function private.guide_run_queue()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  item private.guide_queue;
  post_author uuid;
  done integer := 0;
begin
  for item in
    select * from private.guide_queue
    where done_at is null and due_at <= now()
    order by due_at
    limit 200
    for update skip locked
  loop
    begin
      select p.author_id into post_author from public.posts p where p.id = item.post_id;
      if post_author is not null and not private.blocked_between(item.guide_id, post_author) then
        perform private.act_as(item.guide_id);
        if item.action = 'root' then
          insert into public.post_roots (post_id, user_id, created_at)
          values (item.post_id, item.guide_id, item.due_at)
          on conflict do nothing;
        else
          insert into public.comments (post_id, author_id, body, created_at)
          values (item.post_id, item.guide_id, item.body, item.due_at);
        end if;
        done := done + 1;
      end if;
      update private.guide_queue set done_at = now() where id = item.id;
    exception when others then
      update private.guide_queue set done_at = now(), error = sqlerrm where id = item.id;
    end;
  end loop;

  perform private.act_as(null);
  return done;
end;
$$;

-- One post from the library by a guide who holds its Space, with replies and
-- roots from the others queued over the following hours. p_at backdates it
-- (the first few, so the feed doesn't all say "just now").
create or replace function private.guide_post(p_at timestamptz default now())
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  line private.guide_posts;
  author uuid;
  pid uuid;
  t timestamptz := p_at;
  i integer;
begin
  if not (select c.enabled from private.guide_config c) then
    return null;
  end if;

  select * into line from private.guide_posts gp
  where gp.used_at is null or gp.used_at < now() - interval '60 days'
  order by gp.used_at is not null, gp.used_at, random()
  limit 1;
  if not found then
    return null;
  end if;

  -- Whoever has gone longest without posting.
  select g.user_id into author
  from public.guides g
  join public.user_chapters uc
    on uc.user_id = g.user_id and uc.chapter_slug = line.chapter_slug and uc.status = 'open'
  order by (select max(p.created_at) from public.posts p where p.author_id = g.user_id) nulls first, random()
  limit 1;
  if author is null then
    return null;
  end if;

  perform private.act_as(author);
  insert into public.posts (chapter_slug, kind, title, body, conversation, topic, progress, audience, public_reach)
  values (line.chapter_slug, 'root', line.title, line.body, line.conversation, line.topic, line.progress, 'everyone', true)
  returning id into pid;
  perform private.act_as(null);

  if p_at < now() then
    update public.posts set created_at = p_at where id = pid;
  end if;
  update private.guide_posts set used_at = now() where id = line.id;

  for i in 1 .. coalesce(array_length(line.replies, 1), 0) loop
    t := t + make_interval(mins => 12 + floor(random() * 80)::integer);
    insert into private.guide_queue (due_at, guide_id, action, post_id, body)
    select t, g.user_id, 'comment', pid, line.replies[i]
    from public.guides g
    where g.user_id <> author
      and not exists (
        select 1 from private.guide_queue q
        where q.post_id = pid and q.guide_id = g.user_id and q.action = 'comment'
      )
    order by random()
    limit 1;
  end loop;

  insert into private.guide_queue (due_at, guide_id, action, post_id)
  select p_at + make_interval(mins => 4 + floor(random() * 420)::integer), g.user_id, 'root', pid
  from public.guides g
  where g.user_id <> author
  order by random()
  limit 2 + floor(random() * 5)::integer;

  return pid;
end;
$$;

-- Every ten minutes: notice new public posts from real people (a few roots
-- over the next hours; a welcome on someone's first post), then run the queue.
create or replace function private.guide_tend()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  p record;
  welcome text;
  welcomer uuid;
begin
  if not (select c.enabled from private.guide_config c) or not exists (select 1 from public.guides) then
    return 0;
  end if;

  for p in
    select po.id, po.author_id, po.chapter_slug, po.conversation, po.created_at
    from public.posts po
    where po.created_at > now() - interval '1 day'
      and po.created_at < now() - interval '3 minutes'
      and po.public_reach
      and po.audience = 'everyone'
      and not po.is_anonymous
      and po.author_id is not null
      and not exists (select 1 from public.guides g where g.user_id = po.author_id)
      and not exists (select 1 from private.guide_queue q where q.post_id = po.id)
    order by po.created_at
    limit 100
  loop
    insert into private.guide_queue (due_at, guide_id, action, post_id)
    select now() + make_interval(mins => 2 + floor(random() * 240)::integer), g.user_id, 'root', p.id
    from public.guides g
    where not private.blocked_between(g.user_id, p.author_id)
    order by random()
    limit 1 + floor(random() * 3)::integer;

    if (select count(*) from public.posts mine where mine.author_id = p.author_id) = 1 then
      select w.body into welcome
      from private.guide_welcomes w
      where w.conversation is not distinct from p.conversation
      order by random()
      limit 1;

      -- Someone from the same Space if there is one.
      select g.user_id into welcomer
      from public.guides g
      left join public.user_chapters uc
        on uc.user_id = g.user_id and uc.chapter_slug = p.chapter_slug and uc.status = 'open'
      where not private.blocked_between(g.user_id, p.author_id)
      order by uc.id is null, random()
      limit 1;

      if welcome is not null and welcomer is not null then
        insert into private.guide_queue (due_at, guide_id, action, post_id, body)
        values (now() + make_interval(mins => 8 + floor(random() * 40)::integer), welcomer, 'comment', p.id, welcome);
      end if;
    end if;
  end loop;

  return private.guide_run_queue();
end;
$$;

revoke execute on function private.act_as(uuid) from public, anon, authenticated;
revoke execute on function private.enlist_guides() from public, anon, authenticated;
revoke execute on function private.guide_run_queue() from public, anon, authenticated;
revoke execute on function private.guide_post(timestamptz) from public, anon, authenticated;
revoke execute on function private.guide_tend() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Welcomes
-- ---------------------------------------------------------------------------

insert into private.guide_welcomes (conversation, body) values
  (null, $t$Welcome to Grouv, and thank you for sharing this. Really glad you're here.$t$),
  (null, $t$Glad you posted this. Welcome in, it's good to have you.$t$),
  (null, $t$Thank you for being one of the people who goes first. Welcome to Grouv.$t$),
  ('unspoken', $t$Thank you for putting this into words. More people feel it than say it. Welcome to Grouv.$t$),
  ('unspoken', $t$This can't have been easy to write. I'm glad you're here.$t$),
  ('unspoken', $t$Reading this and nodding. Welcome to Grouv, and thank you for saying it.$t$),
  ('unfiltered', $t$Love that you said it plainly. Curious where people land on this one. Welcome to Grouv.$t$),
  ('unfiltered', $t$Strong first post. Welcome in, and thanks for starting the conversation.$t$),
  ('unfinished', $t$Rooting for you with this. Come back and tell us how it goes. Welcome to Grouv.$t$),
  ('unfinished', $t$Glad you're sharing it while it's still in the middle. That's the best part to share. Welcome in.$t$);

-- ---------------------------------------------------------------------------
-- The library
-- ---------------------------------------------------------------------------

insert into private.guide_posts (chapter_slug, conversation, topic, progress, title, body, replies) values
-- Career
('career', 'unspoken', 'burnout', null,
 $t$I'm good at my job and I don't like who I am when I'm doing it.$t$,
 $t$Everyone at work thinks I'm calm. I sit in the car for twenty minutes before I can walk in.$t$,
 array[$t$The car thing. I genuinely thought that was just me.$t$,
       $t$Being good at something you don't enjoy is its own kind of tired. Hope you find a version of work that gives some of it back.$t$,
       $t$Mine is taking the long way round the block. Same ritual, different route.$t$]),
('career', 'unfiltered', 'work', null,
 $t$Unlimited annual leave is a trick if nobody ever takes it.$t$,
 $t$We have it and the most anyone on my team took last year was eight days. A fixed number at least gives you permission.$t$,
 array[$t$Agree. A number makes it a right, not a favour.$t$,
       $t$Ours only started working once the managers took two weeks off and said so out loud.$t$,
       $t$Slight counterpoint: it's been great for me, but honestly that's my manager, not the policy.$t$]),
('career', 'unfinished', 'job-search', 'in_progress',
 $t$41 applications since August. Two interviews, no offers yet.$t$,
 $t$Final round on Thursday. Trying not to plan my whole life around it.$t$,
 array[$t$Thursday is coming either way. Rooting for you.$t$,
       $t$41 is a lot of getting back up. A final round means they can see it too.$t$,
       $t$Come back and tell us how it went, whatever happens.$t$]),
('career', 'unspoken', 'side-hustle', null,
 $t$My side hustle makes more than my salary and I still can't bring myself to quit.$t$,
 $t$The salary feels like a floor. The business feels like weather.$t$,
 array[$t$"The business feels like weather" is the best description of this I've heard.$t$,
       $t$I was exactly here two years ago. What moved me was six months of expenses saved. After that I stopped needing permission.$t$,
       $t$Keeping the floor while you build isn't fear. It's sense.$t$]),
('career', 'unfiltered', 'work', null,
 $t$Being "always online" isn't commitment. It's bad boundaries we got praised for.$t$,
 null,
 array[$t$Took me a burnout to learn this one.$t$,
       $t$I agree, but it's hard when the person replying at 11pm is the one who gets promoted.$t$,
       $t$Turned off notifications after 6pm. Nobody noticed. That told me everything.$t$]),
('career', 'unfinished', 'business', 'just_started',
 $t$Registered my business this morning. It has a name, a bank account and zero customers.$t$,
 $t$Small-batch pepper sauce. First market stall is in two weeks.$t$,
 array[$t$Zero customers is where everyone starts. Which market?$t$,
       $t$Pepper sauce is a brilliant first product. People come back for things that taste like home.$t$,
       $t$Bring a tasting tray. People buy what they've tried.$t$]),
('career', 'unspoken', 'work', null,
 $t$I took the promotion because I didn't know how to say no to it.$t$,
 $t$Now I manage the team I used to love being part of.$t$,
 array[$t$This is so common and nobody talks about it. Being good at the job doesn't mean wanting the next one.$t$,
       $t$Is stepping back an option where you are? I've seen people do it and be happier for it.$t$]),
-- Relationships
('relationships', 'unspoken', 'family', null,
 $t$I love my parents and I still need an hour alone after every phone call with them.$t$,
 null,
 array[$t$An hour is generous. I need the whole evening.$t$,
       $t$Both things can be true. Love and recovery time.$t$,
       $t$Thank you for saying it without it being a complaint. That's exactly how it feels.$t$]),
('relationships', 'unfiltered', 'friendship', null,
 $t$You don't have to stay friends with someone just because you've known them since school.$t$,
 $t$History isn't the same thing as closeness.$t$,
 array[$t$"History isn't the same thing as closeness." Writing that down.$t$,
       $t$Mostly agree, though a couple of mine came back around once we'd both grown up a bit.$t$,
       $t$Letting one go quietly was one of the kindest things I've done, for both of us.$t$]),
('relationships', 'unfinished', 'dating', 'in_progress',
 $t$Third date tomorrow with someone I actually like, which is somehow scarier than the ones I didn't.$t$,
 null,
 array[$t$Liking them is the scary part and the good part. Enjoy it.$t$,
       $t$The nerves mean it matters. Hope it's a lovely evening.$t$]),
('relationships', 'unspoken', 'marriage', null,
 $t$Some days marriage feels like being flatmates who share a calendar.$t$,
 $t$Nothing is wrong. That's almost the hard part.$t$,
 array[$t$"Nothing is wrong" is so much harder to name than something being wrong.$t$,
       $t$We had a long stretch like that after our second. A standing Friday walk helped more than anything big.$t$,
       $t$Thank you for being honest about the quiet seasons. People only ever post the anniversaries.$t$]),
('relationships', 'unfiltered', 'parenting', null,
 $t$Kids don't need a perfect parent. They need one who apologises.$t$,
 null,
 array[$t$My dad never once said sorry. I say it to my son all the time and I can see what it does.$t$,
       $t$Agree. Repair matters more than never getting it wrong.$t$]),
('relationships', 'unfinished', 'heartbreak', 'in_the_thick_of_it',
 $t$Four months since the breakup. I've stopped checking their page. Mostly.$t$,
 null,
 array[$t$"Mostly" is real progress. Be kind to yourself on the other days.$t$,
       $t$Month four was when it started to turn for me. Not gone, just quieter.$t$,
       $t$Proud of you for the mostly.$t$]),
('relationships', 'unspoken', 'family', null,
 $t$Being the first in my family to "make it" means I'm also the family bank.$t$,
 $t$I want to help. I also want to stop feeling guilty every time I save.$t$,
 array[$t$Felt this in my chest. Saving isn't selfish, it's how you keep being able to help.$t$,
       $t$Someone told me to pick a fixed monthly amount and stick to it. It took the guilt out of every single request.$t$,
       $t$You're allowed to build your own future too.$t$]),
-- Wealth
('wealth', 'unfinished', 'debt', 'in_progress',
 $t$£6,240 of credit card debt left. It was £11,800 in January.$t$,
 null,
 array[$t$That's almost half gone in under a year. Huge.$t$,
       $t$Seeing the number go down is the best motivation there is. Keep going.$t$,
       $t$Rooting for the day you post £0.$t$]),
('wealth', 'unfiltered', 'money', null,
 $t$Talking about salaries with your friends is good for all of you.$t$,
 null,
 array[$t$A friend told me what she earned and I asked for a raise the next week. Got it.$t$,
       $t$Agree, but it takes friends who won't make it weird.$t$,
       $t$The secrecy only ever helps employers.$t$]),
('wealth', 'unspoken', 'spending', null,
 $t$I earn decent money now and I still check my balance before I buy lunch.$t$,
 null,
 array[$t$Growing up counting coins never fully leaves you.$t$,
       $t$Same. I've stopped trying to fix it and started seeing it as being careful.$t$]),
('wealth', 'unfiltered', 'saving', null,
 $t$An emergency fund matters more than investing when you're starting out.$t$,
 $t$Investing feels exciting. Not panicking when the boiler breaks feels better.$t$,
 array[$t$Learned this the hard way when my car died the same month the market dropped.$t$,
       $t$Mostly agree, but I'd still put a little into a pension early if your employer matches it. Free money.$t$,
       $t$Peace of mind is a return too.$t$]),
('wealth', 'unspoken', 'family-money', null,
 $t$I send money home every month and I've never said out loud how much it stretches me.$t$,
 null,
 array[$t$So many of us carry this quietly. Thank you for saying it.$t$,
       $t$It's love and it's pressure at the same time. Both are real.$t$,
       $t$I hope someone at home knows what it costs you. You deserve that.$t$]),
('wealth', 'unfinished', 'saving', 'just_started',
 $t$Saving for a house deposit. Month one: £300 put away, and I'm ridiculously proud.$t$,
 null,
 array[$t$You should be proud. Month one is the hardest one.$t$,
       $t$£300 more than last month. That's how every deposit starts.$t$]),
-- Spiritual
('spiritual', 'unspoken', 'doubt', null,
 $t$I still go to church most Sundays and I'm not sure what I believe anymore.$t$,
 null,
 array[$t$You're not the only one in those pews feeling this. Thank you for saying it.$t$,
       $t$Doubt and showing up can sit together. For me they did for years.$t$,
       $t$There's room here for wherever you land.$t$]),
('spiritual', 'unfiltered', 'purpose', null,
 $t$Not everyone has one big purpose, and that's fine.$t$,
 $t$Some of us have a lot of small ones.$t$,
 array[$t$"A lot of small ones" is such a relief to read.$t$,
       $t$The pressure to find The One Purpose made me miserable in my twenties.$t$,
       $t$Agree. Mine changes every few years and I think that's the point.$t$]),
('spiritual', 'unfinished', 'practice', 'in_progress',
 $t$Day 23 of sitting in silence for ten minutes before I open my phone.$t$,
 $t$Some mornings it's peaceful. Most mornings I'm just making a list in my head.$t$,
 array[$t$The list-making counts. You still sat down.$t$,
       $t$23 days is a real streak. Mine never made it past 9.$t$,
       $t$Try writing the list first, then sitting. Changed it for me.$t$]),
('spiritual', 'unspoken', 'community', null,
 $t$I miss the people from my old church more than I miss the services.$t$,
 null,
 array[$t$Community is the part people underestimate until it's gone.$t$,
       $t$Same. Sunday afternoons still feel empty.$t$]),
('spiritual', 'unfiltered', 'faith', null,
 $t$You can have faith and still go to therapy.$t$,
 null,
 array[$t$Said this to my mum last year. It took a while, but she gets it now.$t$,
       $t$Both have helped me in different ways. They aren't competing.$t$,
       $t$Agree completely. Getting help is not a lack of faith.$t$]),
-- Health
('health', 'unfinished', 'fitness', 'in_progress',
 $t$Couch to 5K, week 6. Ran 20 minutes without stopping yesterday.$t$,
 $t$In January I couldn't run for a bus.$t$,
 array[$t$From not catching a bus to 20 minutes straight. Brilliant.$t$,
       $t$Week 6 is where it clicked for me too. Keep going.$t$,
       $t$Find a local parkrun for when you finish. The atmosphere is lovely.$t$]),
('health', 'unspoken', 'mental-health', null,
 $t$Some weeks the most productive thing I do is shower and answer one email.$t$,
 null,
 array[$t$Those weeks count. Showering is a win when everything is heavy.$t$,
       $t$Thank you for saying this. I've had a lot of those weeks this year.$t$,
       $t$Gentle with yourself. Hope the lighter weeks come back soon.$t$]),
('health', 'unfiltered', 'sleep', null,
 $t$Sleep is the most underrated productivity tool and nobody wants to hear it.$t$,
 null,
 array[$t$I fixed my sleep and suddenly half my "motivation problems" went away.$t$,
       $t$Agree, though it's hard to hear when you've got a baby or a night shift.$t$]),
('health', 'unspoken', 'food', null,
 $t$I eat lunch at my desk every day and I can't remember the last time I actually tasted it.$t$,
 null,
 array[$t$Started eating outside on Fridays because of a post like this. It helps.$t$,
       $t$Twenty minutes away from the screen makes the whole afternoon better.$t$]),
('health', 'unfinished', 'recovery', 'in_progress',
 $t$Six weeks after knee surgery. Walked to the shop and back on my own today.$t$,
 null,
 array[$t$That walk is a big deal. Well done.$t$,
       $t$Recovery is so slow and then suddenly you can do things again. Keep going.$t$,
       $t$Celebrate that one properly.$t$]),
('health', 'unfiltered', 'fitness', null,
 $t$The best workout is the one you'll still be doing in a year.$t$,
 null,
 array[$t$I quit three gyms before finding swimming. A year later I'm still going.$t$,
       $t$Consistency beats intensity every time.$t$]),
-- Creative
('creative', 'unfinished', 'making', 'in_progress',
 $t$Writing a novel. 31,000 words in and the middle is a swamp.$t$,
 null,
 array[$t$Every middle is a swamp. You're exactly where you should be.$t$,
       $t$31,000 words is more than most people ever write. Keep wading.$t$,
       $t$Skip ahead and write a scene you're excited about. It pulled me out of mine.$t$]),
('creative', 'unspoken', 'sharing-work', null,
 $t$I've been drawing for ten years and I've never shown anyone outside my family.$t$,
 null,
 array[$t$Ten years is a lot of practice that deserves an audience. Whenever you're ready.$t$,
       $t$I was the same with my writing. The first share is the hardest. It gets easier.$t$,
       $t$Would love to see something one day.$t$]),
('creative', 'unfiltered', 'craft', null,
 $t$Making something bad is part of making something good. You can't skip it.$t$,
 null,
 array[$t$My first hundred photos were awful. Every one of them was necessary.$t$,
       $t$Agree. Perfectionism kept me from starting for years.$t$]),
('creative', 'unspoken', 'creative-block', null,
 $t$I haven't picked up my guitar in eight months and I still tell people I play.$t$,
 null,
 array[$t$You still play. You're just between songs.$t$,
       $t$Maybe pick it up for five minutes tonight. No pressure to be good.$t$,
       $t$Eight months is nothing in a lifetime of playing.$t$]),
('creative', 'unfinished', 'sharing-work', 'just_started',
 $t$Posted my first photo series online today. 14 likes, and one stranger said it made them homesick.$t$,
 null,
 array[$t$Making a stranger feel homesick is the whole point of photography.$t$,
       $t$That one comment is worth more than the likes. Keep posting.$t$]),
-- Learning
('learning', 'unfinished', 'languages', 'in_progress',
 $t$Learning Yoruba at 29 so I can talk to my grandmother properly.$t$,
 $t$She laughed at my pronunciation on Sunday and then hugged me for five minutes.$t$,
 array[$t$The hug says everything. Keep going.$t$,
       $t$This made my morning. She must be so proud.$t$,
       $t$Doing the same with Igbo. Laughing grandmas are the best teachers.$t$]),
('learning', 'unspoken', 'career-change', null,
 $t$Retraining at 34 and the youngest person in my class is 19.$t$,
 null,
 array[$t$You bring something they can't yet. Life experience is an advantage in that room.$t$,
       $t$Did the same at 37. Best decision I've made.$t$]),
('learning', 'unfiltered', 'study', null,
 $t$Most courses would be better at half the length and twice as practical.$t$,
 null,
 array[$t$Agree. I learned more in one month of doing than a year of lectures.$t$,
       $t$Depends on the subject, but for most skills, yes.$t$]),
('learning', 'unfinished', 'new-skills', 'just_started',
 $t$Started learning to code. Spent three hours yesterday on a missing comma.$t$,
 null,
 array[$t$Welcome to programming. That comma will haunt you less every week.$t$,
       $t$Everyone has their comma story. You're officially a developer now.$t$,
       $t$Three hours on a comma means you won't miss the next one.$t$]),
('learning', 'unspoken', 'study', null,
 $t$I passed the exam and I still feel like I somehow tricked everyone.$t$,
 null,
 array[$t$You didn't trick anyone. You prepared and it showed.$t$,
       $t$Imposter feelings are loudest right after a win. Congratulations though.$t$]),
-- Adventure
('adventure', 'unfinished', 'moving-abroad', 'in_progress',
 $t$Moved to Toronto six weeks ago. Found the good bread. Still looking for my people.$t$,
 null,
 array[$t$Bread first, people second. You're doing it in the right order.$t$,
       $t$Took me about four months to find mine. Run clubs and church helped.$t$,
       $t$Rooting for you. Six weeks is still so early.$t$]),
('adventure', 'unspoken', 'travel', null,
 $t$I love travelling alone, and I'm tired of people asking if I'm okay about it.$t$,
 null,
 array[$t$Solo travel is the most freeing thing I do all year.$t$,
       $t$People project their own fear onto it. You're more than okay.$t$]),
('adventure', 'unfiltered', 'new-experiences', null,
 $t$You don't need to go far to have an adventure. Take a different bus home.$t$,
 null,
 array[$t$Did this last week and found a market I'd never heard of. Five minutes from my flat.$t$,
       $t$Agree. Curiosity matters more than distance.$t$,
       $t$Love this. Adventure doesn't have to cost anything.$t$]),
('adventure', 'unfinished', 'solo-trips', 'just_started',
 $t$Booked my first solo trip. Lisbon, four days in March. Already nervous about eating alone.$t$,
 null,
 array[$t$Eating alone in Lisbon is a joy. Sit at the counter and talk to whoever's next to you.$t$,
       $t$Bring a book for the first dinner. By the second you won't need it.$t$,
       $t$Lisbon is perfect for a first solo trip. You'll love it.$t$]);

-- ---------------------------------------------------------------------------
-- Go: on the real project only (pg_cron there; the test database has none).
-- ---------------------------------------------------------------------------

do $$
declare
  i integer;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform private.enlist_guides();

    -- A first few, spread over the last two days.
    for i in 1 .. 8 loop
      perform private.guide_post(now() - make_interval(hours => i * 6, mins => floor(random() * 50)::integer));
    end loop;
    perform private.guide_run_queue();

    execute $job$select cron.schedule('grouv-guides-post', '23 7,10,13,16,19,21 * * *', $cmd$select private.guide_post()$cmd$)$job$;
    execute $job$select cron.schedule('grouv-guides-tend', '*/10 * * * *', $cmd$select private.guide_tend()$cmd$)$job$;
  end if;
end;
$$;
