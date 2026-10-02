import { freshDb } from "./run.mjs";

const db = await freshDb();
let passed = 0;
const failures = [];

function check(name, cond, detail) {
  if (cond) passed++;
  else failures.push(`${name}${detail === undefined ? "" : ` → ${JSON.stringify(detail)}`}`);
}

async function su(sql, params) {
  return (await db.query(sql, params)).rows;
}

async function as(uid, fn) {
  return db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [uid ?? ""]);
    return fn(async (sql, params) => (await tx.query(sql, params)).rows);
  });
}

async function q(uid, sql, params) {
  return as(uid, (run) => run(sql, params));
}

async function fails(name, uid, sql, params, match) {
  try {
    await q(uid, sql, params);
  } catch (e) {
    check(name, !match || e.message.includes(match), e.message);
    return;
  }
  check(name, false, "expected an error");
}

async function step(name, fn) {
  try {
    await fn();
  } catch (e) {
    failures.push(`${name} threw: ${e.message}`);
  }
}

// --- users ------------------------------------------------------------------
const [{ id: A }] = await su(
  `insert into auth.users (email, raw_user_meta_data) values ('ada@x.com', '{"first_name":"Ada","terms_accepted":true}') returning id`,
);
const [{ id: B }] = await su(`insert into auth.users (email, raw_user_meta_data) values ('bo@x.com', '{"first_name":"Bo"}') returning id`);
const [{ id: C }] = await su(
  `insert into auth.users (email, raw_user_meta_data) values ('cy@x.com', '{"full_name":"Cy Lane","picture":"https://img/cy.png"}') returning id`,
);
const [{ id: D }] = await su(`insert into auth.users (email) values ('dee@x.com') returning id`);

await step("new user trigger", async () => {
  const p = await su(`select * from public.profiles order by first_name`);
  check("4 profiles", p.length === 4, p.length);
  const a = p.find((r) => r.id === A);
  const c = p.find((r) => r.id === C);
  const d = p.find((r) => r.id === D);
  check("first_name from metadata", a.first_name === "Ada");
  check("terms accepted recorded", a.terms_accepted_at !== null);
  check("google name split", c.first_name === "Cy" && c.avatar_url === "https://img/cy.png", c);
  check("email fallback name", d.first_name === "dee", d.first_name);
  const subs = await su(`select count(*)::int n from public.subscriptions`);
  check("subscription rows", subs[0].n === 4);
});

await step("anon reads", async () => {
  const rows = await db.transaction(async (tx) => {
    await tx.exec("set local role anon");
    return (await tx.query("select * from public.profiles")).rows;
  });
  check("anon sees no profiles", rows.length === 0, rows.length);
  const chapters = await db.transaction(async (tx) => {
    await tx.exec("set local role anon");
    return (await tx.query("select * from public.chapters")).rows;
  });
  check("anon sees chapters", chapters.length === 8);
});

// --- onboarding ---------------------------------------------------------------
await step("onboarding", async () => {
  await q(A, `select public.complete_onboarding($1::jsonb, 'mind', 'working', 'looking')`, [
    JSON.stringify([
      { slug: "career", phase: "Growing a team" },
      { slug: "health", phase: "Building a habit" },
    ]),
  ]);
  await q(B, `select public.complete_onboarding($1::jsonb)`, [JSON.stringify([{ slug: "career", phase: "Starting over" }])]);
  await q(C, `select public.complete_onboarding($1::jsonb)`, [JSON.stringify([{ slug: "spiritual", phase: "Newly questioning" }])]);
  const chapters = await q(A, `select chapter_slug, phase from public.user_chapters where user_id = $1`, [A]);
  check("A holds 2 chapters", chapters.length === 2, chapters);
  const prompts = await q(A, `select * from public.profile_prompts where user_id = $1`, [A]);
  check("A prompts saved", prompts[0]?.sitting_with === "mind", prompts);
  const prof = await q(A, `select onboarded_at from public.profiles where id = $1`, [A]);
  check("A onboarded", prof[0].onboarded_at !== null);
  const history = await su(`select count(*)::int n from public.user_chapter_phases`);
  check("phase history recorded", history[0].n === 4, history[0].n);
  // Retry is a no-op.
  await q(A, `select public.complete_onboarding($1::jsonb)`, [JSON.stringify([{ slug: "wealth", phase: "Investing seriously" }])]);
  const again = await su(`select count(*)::int n from public.user_chapters where user_id = $1`, [A]);
  check("onboarding retry no-op", again[0].n === 2, again[0].n);
});

await fails(
  "phase must belong to chapter",
  D,
  `select public.complete_onboarding($1::jsonb)`,
  [JSON.stringify([{ slug: "career", phase: "Deep in recovery" }])],
  "foreign key",
);
await fails("onboarding needs 1-8 chapters", D, `select public.complete_onboarding('[]'::jsonb)`, [], "between 1 and 8");

await step("chapter limit", async () => {
  await q(A, `insert into public.user_chapters (user_id, chapter_slug, phase) values ($1, 'wealth', 'Investing seriously')`, [A]);
  await q(A, `insert into public.user_chapters (user_id, chapter_slug, phase) values ($1, 'creative', 'Mid-project')`, [A]);
});
await fails(
  "5th open chapter rejected",
  A,
  `insert into public.user_chapters (user_id, chapter_slug, phase) values ($1, 'learning', 'Day one')`,
  [A],
  "4 chapters",
);
await fails(
  "can't open chapter for someone else",
  A,
  `insert into public.user_chapters (user_id, chapter_slug, phase) values ($1, 'learning', 'Day one')`,
  [D],
  "row-level security",
);

// --- posts ---------------------------------------------------------------------
let anonPost, namedHealthPost;
await step("posts", async () => {
  [{ id: anonPost }] = await q(
    A,
    `insert into public.posts (chapter_slug, kind, title, progress, body, is_anonymous, author_id)
     values ('career', 'root', 'Doing', 'in_progress', 'Honest', true, $1) returning id`,
    [B],
  );
  [{ id: namedHealthPost }] = await q(
    A,
    `insert into public.posts (chapter_slug, body) values ('health', 'Named in health') returning id`,
  );
  const bSees = await q(B, `select id, author_id from public.posts`);
  check("sharing a space without a connection shows nothing", bSees.length === 0, bSees);
  const [{ author_id: forged }] = await su(`select author_id from public.posts where id = $1`, [anonPost]);
  check("anon author hidden even if client forged it", forged === null, forged);
  const cSees = await q(C, `select id from public.posts`);
  check("C (no shared space, no circle) sees nothing", cSees.length === 0, cSees);
  const aSees = await q(A, `select id from public.posts`);
  check("A sees own posts", aSees.length === 2);
  const bEdit = await q(B, `update public.posts set body = 'hacked' where id = $1 returning id`, [anonPost]);
  check("B can't edit A's post", bEdit.length === 0);
  const aEdit = await q(A, `update public.posts set body = 'edited' where id = $1 returning id`, [anonPost]);
  check("A edits own anon post", aEdit.length === 1);
});
await fails("can't post into unheld space", B, `insert into public.posts (chapter_slug, body) values ('health', 'x')`, [], "row-level security");
await fails("can't change post chapter", A, `update public.posts set chapter_slug = 'wealth' where id = $1`, [namedHealthPost], "permission denied");

// --- circle & bonds ---------------------------------------------------------------
await step("connections", async () => {
  const [req] = await q(C, `select * from public.request_connection($1)`, [A]);
  check("request pending", req.status === "pending");
  const aNotes = await q(A, `select kind from public.notifications where kind = 'connection_request'`);
  check("A notified of request", aNotes.length === 1);
  // A "connects" back → accepts the crossing request.
  const [acc] = await q(A, `select * from public.request_connection($1)`, [C]);
  check("crossing request accepts", acc.status === "accepted", acc);
  const cSees = await q(C, `select id from public.posts`);
  check("circle outside the space sees nothing (space-locked)", cSees.length === 0, cSees);
  await q(C, `insert into public.user_chapters (user_id, chapter_slug, phase) values ($1, 'health', 'Starting over')`, [C]);
  const cInHealth = await q(C, `select id from public.posts`);
  check(
    "circle in the space sees the named post, not the other space's",
    cInHealth.length === 1 && cInHealth[0].id === namedHealthPost,
    cInHealth,
  );
  const prompts = await q(C, `select * from public.profile_prompts where user_id = $1`, [A]);
  check("circle can't read bond-only prompts", prompts.length === 0);
});
await fails("can't forge accepted connection", B, `insert into public.connections (requester_id, addressee_id, status) values ($1, $2, 'accepted')`, [B, A], "row-level security");

await step("i see you and comments", async () => {
  await q(C, `insert into public.post_roots (post_id, user_id) values ($1, $2)`, [namedHealthPost, C]);
  await q(C, `delete from public.post_roots where post_id = $1 and user_id = $2`, [namedHealthPost, C]);
  await q(C, `insert into public.post_roots (post_id, user_id) values ($1, $2)`, [namedHealthPost, C]);
  await q(C, `insert into public.comments (post_id, body) values ($1, 'hi')`, [namedHealthPost]);
  const [p] = await su(`select comments_count from public.posts where id = $1`, [namedHealthPost]);
  check("comment count bumped", p.comments_count === 1, p);
  const notes = await q(A, `select kind from public.notifications where kind in ('post_rooted', 'post_commented') order by created_at`);
  check("A notified of I see you + comment", notes.map((n) => n.kind).join() === "post_rooted,post_rooted,post_commented", notes);
  const bNotes = await q(B, `select * from public.notifications`);
  check("B can't see A's notifications", bNotes.length === 0);
  const logged = await su(`select type::text, weight::float as weight from private.interactions where user_a = $1 order by id`, [C]);
  check(
    "I see you counts once per post; a comment is a response",
    logged.map((i) => `${i.type}:${i.weight}`).join() === "i_see_you:0.02,post_response:0.02",
    logged,
  );
  const seen = await q(C, `select * from private.interactions`).catch((e) => e.message);
  check("the interaction log isn't readable", typeof seen === "string" && seen.includes("permission denied"), seen);
});

let bondId;
await step("bonds", async () => {
  await su(
    `insert into private.interactions (user_a, user_b, type, weight, created_at)
     select case when g % 2 = 0 then $1::uuid else $2::uuid end, case when g % 2 = 0 then $2::uuid else $1::uuid end,
            'message_reply', 5, now() - interval '1 day'
     from generate_series(1, 120) g`,
    [A, C],
  );
  await su(`select private.run_bond_engine()`);
  [{ id: bondId }] = await su(
    `select id from public.bonds where status = 'active' and user_low = least($1::uuid, $2::uuid) and user_high = greatest($1::uuid, $2::uuid)`,
    [A, C],
  );
  check("the engine forms the bond past 500 points", Boolean(bondId));
  const taken = await q(C, `select actor_id from public.notifications where kind = 'bond_formed'`);
  check("both get the taken-root note", taken.length === 1 && taken[0].actor_id === A, taken);
  const [rank] = await q(A, `select rank from public.bond_ranks where bond_id = $1`, [bondId]);
  check("bond ranked 1", rank?.rank === 1, rank);
  const depth = await q(A, `select * from private.bond_depth`).catch((e) => e.message);
  check("scores aren't readable", typeof depth === "string" && depth.includes("permission denied"), depth);
  const prompts = await q(C, `select * from public.profile_prompts where user_id = $1`, [A]);
  check("bond reads prompts", prompts.length === 1);
});

// --- messaging -----------------------------------------------------------------
await step("feed reads", async () => {
  await q(
    A,
    `insert into public.posts (chapter_slug, title, body, progress) values ('career', 'Named in career', 'Honest', 'almost_done') returning id`,
  );
  const bHome = await q(B, `select id from public.feed_posts('home')`);
  check("home: a shared space alone brings nothing", bHome.length === 0, bHome);
  const bRoots = await q(B, `select id from public.feed_posts('roots', 'career')`);
  check("roots: non-connections stay out, anonymous or not", bRoots.length === 0, bRoots);

  // Open Grouv: posts that reach past your connections, as often as you like
  // (no longer once a month — see 20261002100100).
  const [{ open_grove_available: before }] = await q(A, `select public.open_grove_available('career')`);
  check("open grove available at first", before === true, before);
  const [{ id: openPost }] = await q(
    A,
    `insert into public.posts (chapter_slug, body, open_grove) values ('career', 'Open to anyone at my stage', true) returning id`,
  );
  const [{ open_grove_available: after }] = await q(A, `select public.open_grove_available('career')`);
  check("open grouv still available after sharing", after === true, after);
  await fails(
    "open grove posts are named",
    A,
    `insert into public.posts (chapter_slug, body, open_grove, is_anonymous) values ('wealth', 'x', true, true)`,
    [],
    "posts_open_grove_is_named",
  );

  const openBefore = await q(B, `select id from public.feed_posts('open', 'career')`);
  check("open: other stages hidden", openBefore.length === 0, openBefore);
  await q(B, `update public.user_chapters set phase = 'Growing a team' where user_id = $1 and chapter_slug = 'career'`, [B]);
  const openAfter = await q(B, `select id, author_phase, open_grove from public.feed_posts('open', 'career')`);
  check(
    "open: only Open Grove posts, at the same stage",
    openAfter.length === 1 && openAfter[0].id === openPost && openAfter[0].author_phase === "Growing a team",
    openAfter,
  );

  const mine = await q(A, `select id, is_mine, created_at from public.feed_posts('mine')`);
  check("mine includes anonymous posts", mine.length === 4 && mine.every((p) => p.is_mine), mine);

  const cHome = await q(C, `select id, author_name from public.feed_posts('home')`);
  check(
    "a bond sees named posts across every space",
    cHome.length === 3 && cHome.every((p) => p.author_name === "Ada") && !cHome.some((p) => p.id === anonPost),
    cHome,
  );
  const cRoots = await q(C, `select id from public.feed_posts('roots', 'health')`);
  check("a space tab stays in its space", cRoots.length === 1 && cRoots[0].id === namedHealthPost, cRoots);

  const [newest] = mine;
  const page2 = await q(A, `select id from public.feed_posts('mine', null, null, null, $1, $2)`, [newest.created_at, newest.id]);
  check("your own history still pages", page2.length === 3 && !page2.some((p) => p.id === newest.id), page2);

  const [{ created_at: postedAt }] = await su(`select created_at from public.posts where id = $1`, [namedHealthPost]);
  await su(`update public.posts set created_at = now() - interval '49 hours' where id = $1`, [namedHealthPost]);
  const cLater = await q(C, `select id from public.feed_posts('home')`);
  check("the feed ends at 48 hours", !cLater.some((p) => p.id === namedHealthPost), cLater);
  await su(`update public.posts set created_at = $2 where id = $1`, [namedHealthPost, postedAt]);

  const members = await q(B, `select * from public.space_members('career')`);
  check(
    "space members list others with circle flag",
    members.length === 1 && members[0].user_id === A && members[0].in_circle === false,
    members,
  );

  await q(A, `insert into public.space_questions (chapter_slug, body) values ('career', 'How do you keep going?')`);
  const bq = await q(B, `select * from public.live_space_questions('career')`);
  const [aq] = await q(A, `select * from public.live_space_questions('career')`);
  check("an ask never reaches people who aren't connected", bq.length === 0, bq);
  check("the asker sees their own", aq?.is_mine === true && aq?.created_at !== null, aq);
});

let dm;
await step("direct messages", async () => {
  [{ open_direct_conversation: dm }] = await q(C, `select public.open_direct_conversation($1)`, [A]);
  const [{ open_direct_conversation: again }] = await q(A, `select public.open_direct_conversation($1)`, [C]);
  check("same direct conversation both ways", dm === again);
  await q(C, `insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'hey')`, [dm, C]);
  const bRead = await q(B, `select * from public.messages where conversation_id = $1`, [dm]);
  check("outsider can't read DM", bRead.length === 0);
  const aRead = await q(A, `select * from public.messages where conversation_id = $1`, [dm]);
  check("member reads DM", aRead.length === 1);
});
await fails("can't DM outside circle", B, `select public.open_direct_conversation($1)`, [A], "circle");
await fails("can't post into foreign conversation", B, `insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'x')`, [dm, B], "row-level security");
await fails("can't send system message", C, `insert into public.messages (conversation_id, sender_id, kind, body) values ($1, $2, 'system', 'x')`, [dm, C], "row-level security");
await fails("can't impersonate sender", C, `insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'x')`, [dm, A], "row-level security");

// --- groups --------------------------------------------------------------------
await step("bonds overview, requests and suggestions", async () => {
  const [row] = await q(A, `select * from public.bonds_overview()`);
  check(
    "bond row carries the shared conversation",
    row?.user_id === C && row?.relationship === "bond" && row?.conversation_id === dm,
    row,
  );
  check(
    "last message and unread count are the reader's",
    row?.last_message_body === "hey" && row?.last_message_from_me === false && row?.unread_count === 1,
    row,
  );
  check("bond carries the viewer's rank, and no depth", row?.bond_rank === 1 && !("depth" in row), row);

  await q(A, `update public.conversation_members set last_read_at = now() where conversation_id = $1 and user_id = $2`, [dm, A]);
  const [afterRead] = await q(A, `select unread_count from public.bonds_overview()`);
  check("reading clears unread", afterRead?.unread_count === 0, afterRead);

  const [cRow] = await q(C, `select * from public.bonds_overview()`);
  check("sender sees their own last message", cRow?.user_id === A && cRow?.last_message_from_me === true, cRow);

  // D joins A in Wealth and connects with C, so C is a mutual for A.
  await q(D, `insert into public.user_chapters (user_id, chapter_slug, phase) values ($1, 'wealth', 'Learning the basics')`, [D]);
  await su(`update public.profiles set onboarded_at = now() where id = $1`, [D]);
  await q(D, `select public.request_connection($1)`, [C]);
  await q(C, `select public.request_connection($1)`, [D]);

  const suggestions = await q(A, `select * from public.people_you_may_know()`);
  const bSuggestion = suggestions.find((s) => s.user_id === B);
  const dSuggestion = suggestions.find((s) => s.user_id === D);
  check(
    "suggests people sharing a chapter",
    bSuggestion?.shared_chapter === "career" && dSuggestion?.shared_chapter === "wealth",
    suggestions,
  );
  check(
    "counts mutual connections",
    dSuggestion?.mutual_count === 1 && bSuggestion?.mutual_count === 0,
    { bSuggestion, dSuggestion },
  );
  check("circle members aren't suggested", !suggestions.some((s) => s.user_id === C), suggestions);

  await q(B, `select public.request_connection($1)`, [A]);
  const pending = await q(A, `select kind, user_id from public.pending_requests()`);
  check(
    "pending lists connection requests only",
    pending.length === 1 && pending[0].kind === "connection" && pending[0].user_id === B,
    pending,
  );
  const afterRequests = await q(A, `select user_id from public.people_you_may_know()`);
  check(
    "people with pending requests drop out of suggestions",
    !afterRequests.some((s) => s.user_id === B) && afterRequests.some((s) => s.user_id === D),
    afterRequests,
  );
});

// Starting a group needs the Season Pass; lend it for the insert only.
async function withPass(uid, fn) {
  const [prev] = await su(`select status from public.subscriptions where user_id = $1`, [uid]);
  await su(`update public.subscriptions set status = 'active' where user_id = $1`, [uid]);
  try {
    return await fn();
  } finally {
    await su(`update public.subscriptions set status = $2 where user_id = $1`, [uid, prev.status]);
  }
}

let group, groupConv;
await step("groups", async () => {
  [{ id: group, conversation_id: groupConv }] = await withPass(A, () =>
    q(
      A,
      `insert into public.groups (title, label, description, icon, color, chapter_slug) values ('First-time Founder!', 'First 1000 days', 'desc', 'suitcase', '#FED1DD', 'career') returning id, conversation_id, slug`,
    ),
  );
  const [g] = await su(`select slug, member_count, created_by from public.groups where id = $1`, [group]);
  check("slug generated", /^first-time-founder-[0-9a-f]{6}$/.test(g.slug), g.slug);
  check("creator counted + recorded", g.member_count === 1 && g.created_by === A, g);
  const [{ id: reqId }] = await q(B, `insert into public.group_join_requests (group_id) values ($1) returning id`, [group]);
  const aNotes = await q(A, `select * from public.notifications where kind = 'group_join_request'`);
  check("admin notified of join request", aNotes.length === 1);
  await fails("non-admin can't review", C, `select public.review_join_request($1, true)`, [reqId], "admins");
  await q(A, `select public.review_join_request($1, true)`, [reqId]);
  const [g2] = await su(`select member_count from public.groups where id = $1`, [group]);
  check("approved member counted", g2.member_count === 2);
  await q(B, `insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'hello group')`, [groupConv, B]);
  await q(B, `insert into public.truths (group_id, body) values ($1, 'you are not behind')`, [group]);
  const aTruths = await q(A, `select * from public.truths`);
  check("member reads truths", aTruths.length === 1);
  const cTruths = await q(C, `select * from public.truths`);
  check("non-member can't read truths", cTruths.length === 0);
  await q(A, `insert into public.truth_felt (truth_id, user_id) values ($1, $2)`, [aTruths[0].id, A]);
  const [t] = await su(`select felt_count from public.truths`);
  check("felt counted", t.felt_count === 1);
  const bNotes = await q(B, `select data from public.notifications where kind = 'group_join_reviewed'`);
  check("requester notified of approval", bNotes[0]?.data?.approved === true, bNotes);
});
await fails("can't self-join approval group", C, `insert into public.group_members (group_id, user_id) values ($1, $2)`, [group, C], "row-level security");
await withPass(A, () =>
  fails("bad group color rejected", A, `insert into public.groups (title, color) values ('x', 'pink')`, [], "check"),
);

// --- events --------------------------------------------------------------------
let event;
await step("events", async () => {
  [{ id: event }] = await q(
    A,
    `insert into public.events (chapter_slug, title, venue_name, starts_at, capacity) values ('career', 'First Down Walk', 'Tafawa Balewa Square', now() + interval '3 days', 2) returning id`,
  );
  const [e] = await su(`select going_count, conversation_id from public.events where id = $1`, [event]);
  check("host auto-attends", e.going_count === 1, e);
  const sys = await q(A, `select body from public.messages where conversation_id = $1`, [e.conversation_id]);
  check("system notice posted", sys[0]?.body === "Group created for First Down Walk.", sys);
  await q(B, `insert into public.event_attendees (event_id, user_id) values ($1, $2)`, [event, B]);
  const cAttendees = await q(C, `select user_id from public.event_attendees where event_id = $1`, [event]);
  check("C sees only circle attendees (A)", cAttendees.length === 1 && cAttendees[0].user_id === A, cAttendees);
});
await fails("event capacity enforced", C, `insert into public.event_attendees (event_id, user_id) values ($1, $2)`, [event, C], "full");

// --- live rooms ------------------------------------------------------------------
await step("live rooms", async () => {
  const [{ id: room }] = await q(A, `insert into public.live_rooms (title) values ('Creators Summit') returning id`);
  await q(A, `select public.join_live_room($1)`, [room]);
  await q(B, `select public.join_live_room($1)`, [room]);
  const cPresence = await q(C, `select * from public.live_room_presence`);
  check("outsider can't see who is in a room", cPresence.length === 0);
  await q(B, `insert into public.waves (room_id, to_user) values ($1, $2)`, [room, A]);
  const waves = await q(A, `select * from public.notifications where kind = 'wave_received'`);
  check("wave notifies", waves.length === 1);
  await fails("can't wave from outside room", C, `insert into public.waves (room_id, to_user) values ($1, $2)`, [room, A], "row-level security");
  await q(A, `delete from public.live_room_presence where user_id = $1`, [A]);
  await q(B, `delete from public.live_room_presence where user_id = $1`, [B]);
  const [r] = await su(`select here_count, ended_at from public.live_rooms where id = $1`, [room]);
  check("room ends when empty", r.here_count === 0 && r.ended_at !== null, r);
});

// --- log -----------------------------------------------------------------------
await step("log", async () => {
  const [{ id: uc }] = await su(`select id from public.user_chapters where user_id = $1 and chapter_slug = 'career'`, [A]);
  await q(A, `insert into public.log_entries (user_chapter_id, body) values ($1, 'Shipped the ugly version')`, [uc]);
  const cSees = await q(C, `select * from public.log_entries`);
  check("circle sees solo log", cSees.length === 1);
  const bSees = await q(B, `select * from public.log_entries`);
  check("non-circle can't see log", bSees.length === 0);
  await q(A, `update public.profiles set log_visibility = 'only_me' where id = $1`, [A]);
  const cAfter = await q(C, `select * from public.log_entries`);
  check("only_me hides log", cAfter.length === 0);
});

// --- nearby ----------------------------------------------------------------------
await step("nearby", async () => {
  await q(A, `insert into public.proximity_sessions (user_id, latitude, longitude) values ($1, 6.45431, 3.39581)`, [A]);
  await q(B, `insert into public.proximity_sessions (user_id, latitude, longitude) values ($1, 6.46631, 3.39581)`, [B]);
  await q(C, `insert into public.proximity_sessions (user_id, latitude, longitude) values ($1, 6.45531, 3.39581)`, [C]);
  const near = await q(A, `select * from public.nearby_people(5)`);
  check("A sees B (shared career), not C (no shared chapter)", near.length === 1 && near[0].user_id === B, near);
  check("distance rounded", String(near[0]?.distance_km) === "1.3", near[0]?.distance_km);
  const [raw] = await su(`select latitude from public.proximity_sessions where user_id = $1`, [A]);
  check("location coarsened", raw.latitude === 6.454, raw.latitude);
  const peek = await q(B, `select * from public.proximity_sessions`);
  check("can't read others' sessions", peek.length === 1 && peek[0].user_id === B);
});
await fails("nearby requires own session", D, `select * from public.nearby_people(5)`, [], "Proximity");

// --- storage -------------------------------------------------------------------
await step("storage", async () => {
  await q(A, `insert into storage.objects (bucket_id, name) values ('avatars', $1)`, [`${A}/me.png`]);
  await q(C, `insert into storage.objects (bucket_id, name) values ('chat', $1)`, [`${dm}/${C}/voice.m4a`]);
  const bChat = await q(B, `select * from storage.objects where bucket_id = 'chat'`);
  check("chat media hidden from non-members", bChat.length === 0);
});
await fails("can't upload into someone else's avatar folder", B, `insert into storage.objects (bucket_id, name) values ('avatars', $1)`, [`${A}/x.png`], "row-level security");

// --- closing a chapter & deleting an account ------------------------------------
await step("close chapter", async () => {
  const [{ id: uc }] = await su(`select id from public.user_chapters where user_id = $1 and chapter_slug = 'career' and status = 'open'`, [A]);
  await q(A, `select public.close_chapter($1, 'taught', '', 'carry', array['one', '  ', 'two'])`, [uc]);
  const [closure] = await q(A, `select * from public.chapter_closures where user_chapter_id = $1`, [uc]);
  check("closure recorded, blanks dropped", closure.advice === null && closure.reflections.length === 2, closure);
  const [bond] = await su(`select status from public.bonds where id = $1`, [bondId]);
  check("closing a chapter leaves bonds alone", bond.status === "active", bond);
  const others = await q(C, `select * from public.user_chapters where id = $1`, [uc]);
  check("closed chapter private", others.length === 0);
});
await fails("can't close someone else's chapter", B, `select public.close_chapter((select id from public.user_chapters where user_id = '${A}' limit 1))`, [], "not open");

await step("space summaries and chapter tallies", async () => {
  await su(`update public.profiles set avatar_url = 'https://x/ada.png' where id = $1`, [A]);
  const sums = await q(B, `select * from public.space_summaries(array['career', 'health'])`);
  const career = sums.find((s) => s.chapter_slug === "career");
  const health = sums.find((s) => s.chapter_slug === "health");
  check("closed chapters leave the member count", career?.member_count === 1, career);
  check("member faces come from profiles", health?.member_avatars?.includes("https://x/ada.png"), health);
  const [{ id: uc }] = await su(
    `select id from public.user_chapters where user_id = $1 and chapter_slug = 'career' and status = 'closed'`,
    [A],
  );
  const [t] = await q(A, `select * from public.chapter_tallies($1)`, [uc]);
  check("tallies count anonymous posts and log moments", t.post_count === 3 && t.log_count === 1, t);
  await fails("tallies are owner-only", B, `select * from public.chapter_tallies($1)`, [uc], "not found");
});

await step("post permalinks", async () => {
  const one = await q(A, `select id from public.feed_posts('all', null, null, null, null, null, 20, $1)`, [anonPost]);
  check("feed_posts narrows to one post", one.length === 1 && one[0].id === anonPost, one);
  const hidden = await q(B, `select id from public.feed_posts('all', null, null, null, null, null, 20, $1)`, [anonPost]);
  check("a permalink still respects visibility", hidden.length === 0, hidden);
});

await fails(
  "chat media must sit in the sender's folder",
  C,
  `insert into public.messages (conversation_id, sender_id, kind, media_path) values ($1, $2, 'voice', $3)`,
  [dm, C, `${dm}/${A}/voice.webm`],
  "row-level security",
);

await step("circle logs", async () => {
  const [{ id: cChapter }] = await su(
    `select id from public.user_chapters where user_id = $1 and chapter_slug = 'spiritual' and status = 'open'`,
    [C],
  );
  await q(C, `insert into public.log_entries (user_chapter_id, body) values ($1, 'Sat with it')`, [cChapter]);
  const [row] = await q(A, `select * from public.circle_logs('solo')`);
  check(
    "circle member's moments come back with day numbers",
    row?.user_id === C && row?.entries?.[0]?.body === "Sat with it" && row?.entries?.[0]?.day_number === 1,
    row,
  );
  const outsider = await q(B, `select * from public.circle_logs('solo')`);
  check("non-circle sees no logs", outsider.length === 0, outsider);
});

await step("group cards, truths and admins", async () => {
  const [card] = await q(C, `select * from public.group_cards('founder')`);
  check("search finds the group with no role", card?.my_role === null && card?.member_count === 2, card);
  const [bCard] = await q(B, `select * from public.group_cards(null, $1)`, [card.slug]);
  check("slug lookup shows the member's role", bCard?.my_role === "member", bCard);

  const [{ id: healthGroup }] = await withPass(C, () =>
    q(C, `insert into public.groups (title, chapter_slug) values ('Recovery circle', 'health') returning id`),
  );
  const suggested = await q(A, `select id from public.group_cards(null, null, true)`);
  check("suggests groups in the viewer's chapters, unjoined first", suggested[0]?.id === healthGroup, suggested);

  await q(C, `update public.groups set join_policy = 'open' where id = $1`, [healthGroup]);
  await q(A, `insert into public.group_members (group_id, user_id) values ($1, $2)`, [healthGroup, A]);
  await q(C, `delete from public.group_members where group_id = $1 and user_id = $2`, [healthGroup, C]);
  const [{ role }] = await su(`select role from public.group_members where group_id = $1 and user_id = $2`, [healthGroup, A]);
  check("last admin leaving promotes the next member", role === "admin", role);

  const [truth] = await q(B, `select * from public.group_truths($1)`, [group]);
  check("truths mark the author and felt state", truth?.is_mine === true && truth?.felt_by_me === false, truth);
});

await step("event cards", async () => {
  const [card] = await q(C, `select * from public.event_cards($1)`, [event]);
  check(
    "circle count and RSVP state are the viewer's",
    card?.circle_going === 1 && card?.i_am_going === false && card?.host_name === "Ada",
    card,
  );
  const mine = await q(B, `select id from public.event_cards(null, null, true)`);
  check("my events lists RSVPs", mine.length === 1 && mine[0].id === event, mine);
});

let summit;
await step("live rooms", async () => {
  summit = (await q(A, `select public.start_live_room('Creators Summit')`))[0].start_live_room;
  const [{ start_live_room: again }] = await q(B, `select public.start_live_room('creators summit')`);
  check("same name joins the live room", again === summit, { summit, again });
  const [room] = await q(C, `select * from public.live_room_cards() where id = $1`, [summit]);
  check("room card counts people", room?.here_count === 2 && room?.i_am_here === false, room);

  await q(B, `insert into public.waves (room_id, to_user) values ($1, $2)`, [summit, A]);
  const people = await q(A, `select * from public.live_room_people($1)`, [summit]);
  const bRow = people.find((p) => p.user_id === B);
  check("people list shows waves both ways", people[0]?.is_me === true && bRow?.waved_at_me === true, people);

  await su(`update public.live_room_presence set seen_at = now() - interval '1 hour' where user_id = $1`, [B]);
  await su(`select private.cleanup_stale()`);
  const [{ here_count }] = await su(`select here_count from public.live_rooms where id = $1`, [summit]);
  check("cleanup removes stale presence", here_count === 1, here_count);
});

await step("notifications inbox and chapter prompts", async () => {
  const inbox = await q(B, `select kind, group_slug from public.my_notifications()`);
  const reviewed = inbox.find((n) => n.kind === "group_join_reviewed");
  check("inbox resolves the group", reviewed?.group_slug?.startsWith("first-time-founder"), inbox);
  await su(`select private.send_chapter_prompts()`);
  await su(`select private.send_chapter_prompts()`);
  const [{ n }] = await su(`select count(*)::int n from public.notifications where kind = 'chapter_prompt' and user_id = $1`, [B]);
  check("chapter prompts go out once a week", n === 1, n);
});

await step("anonymous replies", async () => {
  const [{ id: question }] = await su(`select id from public.space_questions limit 1`);
  await fails(
    "only routed people can answer an ask",
    B,
    `insert into public.space_question_replies (question_id, body) values ($1, 'One day at a time')`,
    [question],
    "row-level security",
  );
  // Routing is tested with its own people in "anonymous ask routing" below.
  await su(`insert into private.space_question_recipients (question_id, user_id) values ($1, $2)`, [question, B]);
  await q(B, `insert into public.space_question_replies (question_id, body) values ($1, 'One day at a time')`, [question]);
  const [reply] = await q(A, `select * from public.question_replies($1)`, [question]);
  check("asker reads the reply without a name", reply?.body === "One day at a time" && reply?.is_mine === false, reply);
  const [own] = await q(B, `select * from public.question_replies($1)`, [question]);
  check("replier sees their own reply", own?.is_mine === true, own);
  const [delivered] = await q(B, `select * from public.live_space_questions('career')`);
  check("recipients get no times with the question", delivered?.created_at === null && delivered?.expires_at === null, delivered);
});

await step("search", async () => {
  const people = await q(B, `select * from public.search_everything('ada')`);
  check("finds people by name", people.some((r) => r.kind === "person" && r.id === A), people);
  const groups = await q(B, `select * from public.search_everything('founder')`);
  check("finds groups", groups.some((r) => r.kind === "group"), groups);
  const spaces = await q(B, `select * from public.search_everything('recovery')`);
  check(
    "finds spaces by phase",
    spaces.some((r) => r.kind === "space" && r.id === "health" && r.subtitle === "Deep in recovery"),
    spaces,
  );
  const posts = await q(C, `select * from public.search_everything('honest')`);
  check("post search respects visibility", !posts.some((r) => r.kind === "post" && r.id === anonPost), posts);
});

await step("rate limits", async () => {
  let blockedAt = null;
  for (let i = 0; i < 25 && blockedAt === null; i++) {
    try {
      await q(A, `insert into public.posts (chapter_slug, body, is_anonymous) values ('health', $1, true)`, [`burst ${i}`]);
    } catch (e) {
      if (e.message.includes("breather")) blockedAt = i;
      else throw e;
    }
  }
  check("anonymous posting is limited per hour", blockedAt !== null && blockedAt <= 20, blockedAt);
  const [{ n }] = await su(`select count(*)::int n from public.posts where author_id is null and body like 'burst %'`);
  check("posts under the limit went through", n === blockedAt, n);
  await su(`delete from public.posts where body like 'burst %'`);
});

await step("moderation", async () => {
  const [{ id: flagged }] = await q(
    A,
    `insert into public.posts (chapter_slug, body) values ('health', 'Moderate me') returning id`,
  );
  await q(B, `insert into public.reports (target_type, target_id, reason, details) values ('post', $1, 'spam', 'selling things')`, [flagged]);
  await q(C, `insert into public.reports (target_type, target_id, reason) values ('post', $1, 'inappropriate')`, [flagged]);
  const [{ id: message }] = await su(`select id from public.messages where conversation_id = $1 and body = 'hey'`, [dm]);
  await q(A, `insert into public.reports (target_type, target_id, reason) values ('message', $1, 'harassment')`, [message]);

  await fails("non-staff can't read the queue", B, `select * from public.moderation_queue()`, [], "Staff only");
  const staffRows = await q(B, `select * from public.staff`);
  check("non-staff see no staff rows", staffRows.length === 0, staffRows);

  await su(`insert into public.staff (user_id) values ($1)`, [D]);
  const [{ am_i_staff }] = await q(D, `select public.am_i_staff()`);
  check("staff know they're staff", am_i_staff === true);
  const queue = await q(D, `select * from public.moderation_queue()`);
  const post = queue.find((r) => r.target_id === flagged);
  check(
    "queue groups reports on a target",
    post?.report_count === 2 && post.preview === "Moderate me" && post.target_author_name === "Ada" && post.details.length === 1,
    post,
  );

  const [{ moderate_target: removed }] = await q(D, `select public.moderate_target('post', $1, 'remove', 'spam')`, [flagged]);
  check("removing resolves every report", removed === 2, removed);
  const gone = await su(`select 1 from public.posts where id = $1`, [flagged]);
  check("removed post is deleted", gone.length === 0);
  const statuses = await su(`select distinct status, reviewed_by from public.reports where target_id = $1`, [flagged]);
  check("reports marked actioned by the reviewer", statuses.length === 1 && statuses[0].status === "actioned" && statuses[0].reviewed_by === D, statuses);

  await q(D, `select public.moderate_target('message', $1, 'remove')`, [message]);
  const [msg] = await su(`select body, deleted_at from public.messages where id = $1`, [message]);
  check("removed message is blanked", msg.body === "" && msg.deleted_at !== null, msg);
  await fails("profiles can't be removed", D, `select public.moderate_target('profile', $1, 'remove')`, [A], "can't be removed");
  await su(`delete from public.staff where user_id = $1`, [D]);
});

await step("notification emails", async () => {
  await fails("clients can't claim emails", A, `select * from public.claim_notification_emails()`, [], "permission denied");
  // Put everyone somewhere it's the middle of the day, whenever this runs.
  const [{ name: daytime }] = await su(
    `select name from pg_timezone_names where extract(hour from now() at time zone name) between 10 and 17 order by name limit 1`,
  );
  await su(`update public.notification_preferences set timezone = $1`, [daytime]);
  await su(`insert into public.notifications (user_id, kind, actor_id) values ($1, 'connection_request', $2)`, [A, B]);
  await su(`insert into public.notifications (user_id, kind, actor_id) values ($1, 'post_rooted', $2)`, [A, B]);
  await su(`update public.notification_preferences set email_updates = false where user_id = $1`, [C]);
  await su(`insert into public.notifications (user_id, kind, actor_id) values ($1, 'bond_invitation', $2)`, [C, B]);

  const claimed = await su(`select * from public.claim_notification_emails(200)`);
  const request = claimed.find((r) => r.kind === "connection_request" && r.recipient_email === "ada@x.com" && r.actor_name === "Bo");
  check("claims emailable notifications with the address", request?.actor_name === "Bo", claimed);
  check("skips kinds that don't email", !claimed.some((r) => r.kind === "post_rooted"), claimed);
  check("respects email_updates off", !claimed.some((r) => r.recipient_email === "cy@x.com"), claimed);
  const again = await su(`select * from public.claim_notification_emails(200)`);
  check("never claims twice", again.length === 0, again);
});

await step("connection suggestions", async () => {
  await su(`select private.send_connection_suggestions()`);
  const first = await su(`select user_id, actor_id, entity_id from public.notifications where kind = 'connection_suggested'`);
  check("suggestions point at the person", first.every((s) => s.entity_id === s.actor_id), first);
  const connected = await su(`select user_low, user_high from public.connections`);
  check(
    "never suggests someone already connected",
    first.every((s) => !connected.some((c) => [c.user_low, c.user_high].includes(s.user_id) && [c.user_low, c.user_high].includes(s.actor_id))),
    { first, connected },
  );
  check("at most one suggestion each", new Set(first.map((s) => s.user_id)).size === first.length, first);
  await su(`select private.send_connection_suggestions()`);
  const [{ n }] = await su(`select count(*)::int n from public.notifications where kind = 'connection_suggested'`);
  check("suggestions wait a week", n === first.length, n);
});

await step("billing", async () => {
  const sync = (user, status, store, cancel = false) =>
    su(
      `select public.sync_billing($1, $2, $3, now() + interval '30 days', null, $4, 'https://pay.rev.cat/manage')`,
      [user, status, store, cancel],
    );

  await fails(
    "clients can't sync billing",
    A,
    `select public.sync_billing($1, 'active', 'rc_billing', now(), null, false, null)`,
    [A],
    "permission denied",
  );

  // D has never had a trial or a plan.
  await su(`update public.subscriptions set status = 'none', trial_started_at = null, billing_store = null where user_id = $1`, [D]);
  await sync(D, null, null);
  let [sub] = await su(`select * from public.subscriptions where user_id = $1`, [D]);
  check("no RevenueCat plan leaves a new account alone", sub.status === "none" && sub.billing_store === null, sub);

  await sync(D, "active", "rc_billing");
  [sub] = await su(`select * from public.subscriptions where user_id = $1`, [D]);
  check(
    "webhook activates the plan",
    sub.status === "active" && sub.billing_store === "rc_billing" && sub.management_url && sub.billing_synced_at,
    sub,
  );
  await fails("no app trial on a paid plan", D, `select public.start_trial()`, [], "already been used");

  await sync(D, "active", "rc_billing", true);
  [sub] = await su(`select status, cancel_at_period_end from public.subscriptions where user_id = $1`, [D]);
  check("cancelling keeps access until the period ends", sub.status === "active" && sub.cancel_at_period_end === true, sub);

  await sync(D, null, null);
  [sub] = await su(`select status, management_url from public.subscriptions where user_id = $1`, [D]);
  check("a plan RevenueCat no longer has ends", sub.status === "canceled" && sub.management_url === null, sub);

  let rejected = false;
  try {
    await su(`select public.sync_billing($1, 'unpaid', 'rc_billing', null, null, false, null)`, [D]);
  } catch (e) {
    rejected = e.message.includes("Unknown billing status");
  }
  check("unknown statuses are rejected", rejected);

  // B is on the in-app trial; RevenueCat knowing nothing about them mustn't end it.
  await su(
    `update public.subscriptions set status = 'trialing', billing_store = null, trial_started_at = now(), trial_ends_at = now() + interval '3 days' where user_id = $1`,
    [B],
  );
  await sync(B, null, null);
  [sub] = await su(`select status from public.subscriptions where user_id = $1`, [B]);
  check("an in-app trial survives an empty RevenueCat sync", sub.status === "trialing", sub);

  await sync(B, "trialing", "rc_billing");
  await su(`update public.subscriptions set trial_ends_at = now() - interval '1 minute' where user_id = $1`, [B]);
  await su(`select private.expire_trials()`);
  [sub] = await su(`select status from public.subscriptions where user_id = $1`, [B]);
  check("RevenueCat trials aren't expired by the app", sub.status === "trialing", sub);

  await su(`update public.subscriptions set billing_store = null where user_id = $1`, [B]);
  await su(`select private.expire_trials()`);
  [sub] = await su(`select status from public.subscriptions where user_id = $1`, [B]);
  check("finished app trials expire", sub.status === "expired", sub);
});

await step("calls", async () => {
  const [call] = await q(C, `select * from public.start_call($1, 'video')`, [dm]);
  check("caller rings", call.status === "ringing" && call.caller_id === C, call);
  const seen = await q(A, `select id from public.calls where conversation_id = $1`, [dm]);
  check("callee sees the ring", seen.length === 1);
  const outsider = await q(B, `select id from public.calls`);
  check("outsiders don't see calls", outsider.length === 0, outsider);
  await fails("outsiders can't answer", B, `select public.answer_call($1)`, [call.id], "not found");
  await fails("can't insert calls directly", C, `insert into public.calls (conversation_id, caller_id, kind) values ($1, $2, 'audio')`, [dm, C], "row-level security");

  const [again] = await q(A, `select * from public.start_call($1, 'audio')`, [dm]);
  check("calling back while it rings answers it", again.id === call.id && again.status === "active", again);
  await su(`update public.calls set answered_at = now() - interval '125 seconds' where id = $1`, [call.id]);
  const [ended] = await q(C, `select * from public.end_call($1)`, [call.id]);
  check("hanging up ends it", ended.status === "ended", ended);
  const [line] = await su(`select body from public.messages where conversation_id = $1 and kind = 'system' order by created_at desc limit 1`, [dm]);
  check("chat logs the call", line?.body === "Video call · 2 min", line);

  const [ring] = await q(A, `select * from public.start_call($1, 'audio')`, [dm]);
  const [declined] = await q(C, `select * from public.end_call($1)`, [ring.id]);
  check("callee hanging up declines", declined.status === "declined", declined);
  await fails("can't answer a declined call", C, `select public.answer_call($1)`, [ring.id], "has ended");

  const [stale] = await q(A, `select * from public.start_call($1, 'audio')`, [dm]);
  await su(`update public.calls set created_at = now() - interval '1 minute' where id = $1`, [stale.id]);
  await su(`select private.expire_calls()`);
  const [missed] = await su(`select status from public.calls where id = $1`, [stale.id]);
  check("unanswered rings become missed", missed.status === "missed", missed);
  const [{ body }] = await su(`select body from public.messages where conversation_id = $1 and kind = 'system' order by created_at desc limit 1`, [dm]);
  check("missed calls are logged", body === "Missed voice call", body);

  const [webhook] = await q(C, `select * from public.start_call($1, 'audio')`, [dm]);
  await fails("clients can't finish calls", C, `select public.finish_call($1)`, [webhook.id], "permission denied");
  await su(`select public.finish_call($1)`, [webhook.id]);
  const [finished] = await su(`select status from public.calls where id = $1`, [webhook.id]);
  check("webhook finishes the call", finished.status === "missed", finished);

  const [{ id: groupConv }] = await su(`select conversation_id as id from public.groups limit 1`);
  await fails("no calls in group chats", B, `select public.start_call($1, 'audio')`, [groupConv], "bond and circle");
});

await step("places", async () => {
  // Lagos and Ikeja (~12 km apart), London far away.
  await q(A, `select public.set_my_region(6.4541, 3.3947)`);
  await q(B, `select public.set_my_region(6.6018, 3.3515)`);
  await q(C, `select public.set_my_region(51.5072, -0.1276)`);
  const [{ has_region }] = await q(A, `select public.has_region()`);
  check("region saved", has_region === true);
  const regions = await q(A, `select * from private.user_regions`).catch((e) => e.message);
  check("regions aren't readable", typeof regions === "string" && regions.includes("permission denied"), regions);
  const [{ latitude }] = await su(`select latitude from private.user_regions where user_id = $1`, [A]);
  check("regions are rounded", latitude === 6.5, latitude);

  const [{ km }] = await q(A, `select private.km_from_me($1) as km`, [B]);
  check("distance between regions", km > 5 && km < 30, km);
  const [{ far }] = await q(A, `select private.km_from_me($1) as far`, [C]);
  check("far regions are far", far > 4000, far);

  // Open tab near-you filter: B posts in career where A shares B's phase.
  await su(`update public.user_chapters set phase = 'Starting over' where user_id = $1 and chapter_slug = 'career' and status = 'open'`, [B]);
  const aCareer = await su(`select 1 from public.user_chapters where user_id = $1 and chapter_slug = 'career' and status = 'open'`, [A]);
  if (aCareer.length === 0) {
    await q(A, `insert into public.user_chapters (user_id, chapter_slug, phase) values ($1, 'career', 'Starting over')`, [A]).catch(async () => {
      await su(`update public.user_chapters set status = 'closed', closed_at = now() where user_id = $1 and chapter_slug = 'creative'`, [A]);
      await q(A, `insert into public.user_chapters (user_id, chapter_slug, phase) values ($1, 'career', 'Starting over')`, [A]);
    });
  }
  await su(`delete from public.connections where user_low = least($1::uuid, $2::uuid) and user_high = greatest($1::uuid, $2::uuid)`, [A, B]);
  await su(`delete from public.bonds where user_low = least($1::uuid, $2::uuid) and user_high = greatest($1::uuid, $2::uuid)`, [A, B]);
  const [{ id: nearPost }] = await q(B, `insert into public.posts (chapter_slug, body, open_grove) values ('career', 'Near you', true) returning id`);
  const near = await q(A, `select id from public.feed_posts('open', 'career', p_within_km => 50)`);
  check("open tab finds people nearby", near.some((p) => p.id === nearPost), near);
  await q(B, `select public.set_my_region(51.5, -0.1)`);
  const away = await q(A, `select id from public.feed_posts('open', 'career', p_within_km => 50)`);
  check("open tab hides people far away", !away.some((p) => p.id === nearPost), away);
  const everywhere = await q(A, `select id from public.feed_posts('open', 'career')`);
  check("search across regions shows them", everywhere.some((p) => p.id === nearPost), everywhere);
  await su(`delete from public.posts where id = $1`, [nearPost]);
  await q(B, `select public.set_my_region(6.6018, 3.3515)`);

  const [{ id: nearEvent }] = await q(
    B,
    `insert into public.events (chapter_slug, title, venue_name, starts_at, capacity, latitude, longitude)
     values ('career', 'Founders dinner', 'Ikeja City Mall', now() + interval '3 days', 20, 6.614, 3.358) returning id`,
  );
  const cards = await q(A, `select id, distance_km from public.event_cards()`);
  check("events near you come first with a distance", cards[0]?.id === nearEvent && cards[0].distance_km < 30, cards);
});

// --- the back engine ----------------------------------------------------------
async function person(name, chapters) {
  const [{ id }] = await su(`insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`, [
    `${name.toLowerCase()}@x.com`,
    JSON.stringify({ first_name: name }),
  ]);
  await q(id, `select public.complete_onboarding($1::jsonb)`, [JSON.stringify(chapters)]);
  return id;
}
async function connect(a, b) {
  await q(a, `select public.request_connection($1)`, [b]);
  await q(b, `select public.request_connection($1)`, [a]);
}
const learning = [{ slug: "learning", phase: "Self-teaching" }];
const E = await person("Eve", learning);
const F = await person("Fin", learning);
const G = await person("Gus", learning);
const H = await person("Hal", [{ slug: "learning", phase: "Changing fields" }]);
await connect(E, F);
await connect(E, H);

await step("interaction logger: chat and calls", async () => {
  const [{ open_direct_conversation: ef }] = await q(E, `select public.open_direct_conversation($1)`, [F]);
  const send = (from, body) =>
    q(from, `insert into public.messages (conversation_id, sender_id, body) values ($1, $2, $3)`, [ef, from, body]);
  await send(E, "hi");
  await send(E, "you there?");
  await send(F, "yes");
  for (let i = 0; i < 10; i++) await send(i % 2 ? F : E, `turn ${i}`);
  const types = await su(`select type::text from private.interactions where user_low = least($1::uuid, $2::uuid) and user_high = greatest($1::uuid, $2::uuid) order by id`, [E, F]);
  const list = types.map((t) => t.type);
  check("first messages are sent, answers are replies", list.slice(0, 3).join() === "message_sent,message_sent,message_reply", list);
  check("a long back-and-forth becomes an active session", list.at(-1) === "chat_session_exchange", list);

  const [call] = await q(E, `select * from public.start_call($1, 'video')`, [ef]);
  await q(F, `select public.answer_call($1)`, [call.id]);
  await su(`update public.calls set answered_at = now() - interval '25 minutes' where id = $1`, [call.id]);
  await q(E, `select public.end_call($1)`, [call.id]);
  const [logged] = await su(`select type::text, weight::float as weight, duration_minutes from private.interactions where ref_id = $1`, [call.id]);
  check("a 25-minute video call logs its band and minutes only", logged?.type === "video_call" && logged.weight === 0.1 && logged.duration_minutes === 25, logged);
});

await step("anonymous ask routing", async () => {
  await q(E, `insert into public.space_questions (chapter_slug, body) values ('learning', 'How do you stay with it?')`);
  const f = await q(F, `select id, body from public.live_space_questions('learning')`);
  const g = await q(G, `select id from public.live_space_questions('learning')`);
  const h = await q(H, `select id from public.live_space_questions('learning')`);
  check("routed to connections at the same stage", f.length === 1, f);
  check("not to strangers at the same stage", g.length === 0, g);
  check("not to connections in another stage", h.length === 0, h);
  await fails("one ask per space per week", E, `insert into public.space_questions (chapter_slug, body) values ('learning', 'Again?')`, [], "once a week");
  await q(F, `insert into public.space_question_replies (question_id, body) values ($1, 'Small steps')`, [f[0].id]);
  const [{ n }] = await su(`select count(*)::int n from private.interactions where type = 'anonymous_ask_response' and user_a = $1 and user_b = $2`, [F, E]);
  check("answering an ask is logged privately", n === 1, n);
});

await step("bond scoring, cap and reshuffle", async () => {
  const [{ id: X }] = await su(`insert into auth.users (email) values ('x@x.com') returning id`);
  const friends = [];
  for (let i = 0; i < 6; i++) {
    const [{ id }] = await su(`insert into auth.users (email) values ($1) returning id`, [`f${i}@x.com`]);
    await connect(X, id);
    friends.push(id);
  }
  // One-sided: the friend never answers. Big raw score, but a penalty.
  const talk = (a, b, n, both) =>
    su(
      `insert into private.interactions (user_a, user_b, type, weight, created_at)
       select case when $4 and g % 2 = 0 then $2::uuid else $1::uuid end,
              case when $4 and g % 2 = 0 then $1::uuid else $2::uuid end,
              'message_reply', 1, now() - interval '2 days'
       from generate_series(1, $3::int) g`,
      [a, b, n, both],
    );
  for (let i = 0; i < 5; i++) await talk(X, friends[i], 600 + i * 10, true);
  await talk(X, friends[5], 2000, false);
  await su(`select private.run_bond_engine()`);
  const [{ n: bonds }] = await su(`select count(*)::int n from public.bonds where status = 'active' and $1 in (inviter_id, invitee_id)`, [X]);
  check("five bonds at most", bonds === 5, bonds);
  const [lopsided] = await su(`select reciprocity_ratio::float as r, threshold_met from private.bond_depth where user_low = least($1::uuid, $2::uuid) and user_high = greatest($1::uuid, $2::uuid)`, [X, friends[5]]);
  check("a one-sided pair never crosses", lopsided.r === 0 && lopsided.threshold_met === false, lopsided);
  const ranks = await su(`select r.rank, case when b.inviter_id = $1 then b.invitee_id else b.inviter_id end as other from public.bond_ranks r join public.bonds b on b.id = r.bond_id where r.user_id = $1 order by r.rank`, [X]);
  check("strongest bond ranks first", ranks[0]?.other === friends[4] && ranks.length === 5, ranks);

  await fails(
    "the database refuses a sixth bond",
    null,
    `insert into public.bonds (inviter_id, invitee_id, status) values ('${X}', '${friends[5]}', 'active')`,
    [],
  );
  const sixth = await db.query(`insert into public.bonds (inviter_id, invitee_id, status) values ($1, $2, 'active')`, [X, friends[5]]).catch((e) => e.message);
  check("the cap holds even for the server", typeof sixth === "string" && sixth.includes("more than 5 bonds"), sixth);

  // A newcomer outscores Bond 5 and takes the slot.
  const [{ id: Y }] = await su(`insert into auth.users (email) values ('y@x.com') returning id`);
  await connect(X, Y);
  await talk(X, Y, 1400, true);
  await su(`select private.run_bond_engine()`);
  const [weakest] = await su(`select status from public.bonds where user_low = least($1::uuid, $2::uuid) and user_high = greatest($1::uuid, $2::uuid) order by created_at desc limit 1`, [X, friends[0]]);
  check("bond 5 is displaced by a stronger pair", weakest?.status === "released", weakest);
  const shifted = await su(`select user_id from public.notifications where kind = 'bond_shifted' and entity_id is not null and $1 in (user_id, actor_id)`, [friends[0]]);
  check("both hear it quietly", shifted.length === 2, shifted);
  const [{ email_sent }] = await su(`select bool_or(email_sent) as email_sent from public.notifications where kind = 'bond_shifted'`);
  check("a shift is never emailed", !email_sent);

  // Silence: 30+ days decays 3% a week.
  await su(`update private.bond_depth set last_interaction_at = now() - interval '40 days', raw_score = 100, weighted_score = 100 where user_low = least($1::uuid, $2::uuid) and user_high = greatest($1::uuid, $2::uuid)`, [X, friends[1]]);
  await su(`select private.score_bond_depth()`);
  const [decayed] = await su(`select raw_score::float as raw from private.bond_depth where user_low = least($1::uuid, $2::uuid) and user_high = greatest($1::uuid, $2::uuid)`, [X, friends[1]]);
  check("silent pairs decay 3%", decayed.raw === 97, decayed);
});

await step("matching engine", async () => {
  const picks = await q(E, `select * from public.match_candidates()`);
  check("strangers at the same stage are candidates", picks.some((p) => p.user_id === G), picks);
  check("connections are never candidates", !picks.some((p) => [F, H].includes(p.user_id)), picks);
  check("no score leaves the function", picks.length > 0 && !("score" in picks[0]), picks[0]);
  await q(E, `select public.set_my_region(6.45, 3.39)`);
  await q(G, `select public.set_my_region(51.5, -0.12)`);
  const local = await q(E, `select user_id from public.match_candidates()`);
  check("local mode stays within 100 km", !local.some((p) => p.user_id === G), local);
  const global = await q(E, `select user_id from public.match_candidates(null, true)`);
  check("global drops geography", global.some((p) => p.user_id === G), global);
  const [{ geo_hash }] = await su(`select geo_hash from private.user_regions where user_id = $1`, [E]);
  check("regions carry a city-level geohash", geo_hash?.length === 4, geo_hash);
});

await step("nearby modes and waves", async () => {
  await q(E, `insert into public.proximity_sessions (user_id, latitude, longitude, mode) values ($1, 6.45, 3.39, 'stage_only')`, [E]);
  await q(G, `insert into public.proximity_sessions (user_id, latitude, longitude, mode) values ($1, 6.451, 3.39, 'stage_only')`, [G]);
  await q(H, `insert into public.proximity_sessions (user_id, latitude, longitude, mode) values ($1, 6.452, 3.39, 'open')`, [H]);
  const stageOnly = await q(E, `select user_id, same_stage from public.nearby_people(1)`);
  check("stage-only sees only the same stage", stageOnly.length === 1 && stageOnly[0].user_id === G, stageOnly);
  await q(E, `update public.proximity_sessions set mode = 'open' where user_id = $1`, [E]);
  const open = await q(E, `select user_id from public.nearby_people(1)`);
  check("open sees open people nearby too", open.length === 2, open);
  const fromH = await q(H, `select user_id from public.nearby_people(1)`);
  check("stage-only people stay hidden from other stages", !fromH.some((p) => p.user_id === G), fromH);
  await q(E, `select public.wave_nearby($1)`, [G]);
  await q(E, `select public.wave_nearby($1)`, [G]);
  const [seen] = await q(G, `select waved_at_me from public.nearby_people(1) where user_id = $1`, [E]);
  check("a wave shows up nearby", seen?.waved_at_me === true, seen);
  const notes = await q(G, `select * from public.notifications where kind = 'wave_received'`);
  check("a nearby wave sends no notification", notes.length === 0, notes);
  const [{ n }] = await su(`select count(*)::int n from private.interactions where type = 'nearby_wave' and user_a = $1`, [E]);
  check("a wave is logged once", n === 1, n);
});

await step("event attendance by proximity", async () => {
  const [{ id: walk }] = await q(
    E,
    `insert into public.events (chapter_slug, title, venue_name, starts_at, capacity, latitude, longitude)
     values ('learning', 'Study walk', 'Park', now() + interval '10 minutes', 10, 6.45, 3.39) returning id`,
  );
  for (const who of [F, G]) await q(who, `insert into public.event_attendees (event_id, user_id) values ($1, $2)`, [walk, who]);
  await q(E, `update public.proximity_sessions set expires_at = now() + interval '2 minutes' where user_id = $1`, [E]);
  await q(G, `update public.proximity_sessions set expires_at = now() + interval '2 minutes' where user_id = $1`, [G]);
  const [{ n }] = await su(`select count(*)::int n from private.interactions where type = 'event_attended_together' and ref_id = $1`, [walk]);
  check("only the pair actually there gets the points", n === 1, n);
});

await step("introductions, drift and dormancy", async () => {
  await fails("only your own circle", G, `select public.introduce($1, $2)`, [F, H], "your circle");
  const [intro] = await q(E, `select * from public.introduce($1, $2, 'You two should talk')`, [F, H]);
  check("introduction recorded", Boolean(intro?.id), intro);
  const got = await q(H, `select entity_id from public.notifications where kind = 'introduction_received'`);
  check("both hear who they're being introduced to", got[0]?.entity_id === F, got);
  await connect(F, H);
  const credit = await su(`select user_b from private.interactions where type = 'introduction_accepted' and user_a = $1`, [E]);
  check("the introducer gets credit with each", credit.length === 2, credit);

  await su(`select private.send_introduction_suggestions()`);

  await su(
    `update public.connections set responded_at = now() - interval '60 days' where user_low = least($1::uuid, $2::uuid) and user_high = greatest($1::uuid, $2::uuid)`,
    [E, F],
  );
  await su(`update private.connection_signals set stage_overlap_at_connect = 1 where user_low = least($1::uuid, $2::uuid) and user_high = greatest($1::uuid, $2::uuid)`, [E, F]);
  await q(F, `update public.user_chapters set phase = 'Relearning the basics' where user_id = $1`, [F]);
  await su(`select private.send_stage_drift_prompts(true)`);
  await su(`select private.send_stage_drift_prompts(true)`);
  const drift = await q(E, `select actor_id from public.notifications where kind = 'stage_drift'`);
  check("drift is noticed once", drift.length === 1 && drift[0].actor_id === F, drift);

  await su(`delete from private.interactions where user_low = least($1::uuid, $2::uuid) and user_high = greatest($1::uuid, $2::uuid)`, [E, F]);
  await su(`select private.send_dormancy_nudges()`);
  await su(`select private.send_dormancy_nudges()`);
  const nudges = await q(E, `select id from public.notifications where kind = 'dormancy_nudge'`);
  check("one dormancy nudge per pair, ever", nudges.length === 1, nudges);
  await q(E, `delete from public.notifications where id = $1`, [nudges[0]?.id]);
  const [{ nudge_dismissed }] = await su(`select nudge_dismissed from private.connection_signals where user_low = least($1::uuid, $2::uuid) and user_high = greatest($1::uuid, $2::uuid)`, [E, F]);
  check("clearing it dismisses it", nudge_dismissed === true);
});

await step("stage edits and chapter news", async () => {
  for (const phase of ["Day one", "In the thick of study", "Almost certified"]) {
    await q(G, `update public.user_chapters set phase = $2 where user_id = $1`, [G, phase]);
  }
  const ritual = await q(G, `select * from public.notifications where kind = 'chapter_closing_suggested'`);
  check("three stage edits in a month suggest closing the chapter", ritual.length === 1, ritual);

  const [{ id: bond }] = await su(`insert into public.bonds (inviter_id, invitee_id, status) values ($1, $2, 'active') returning id`, [E, H]);
  await q(H, `insert into public.user_chapters (user_id, chapter_slug, phase) values ($1, 'creative', 'Finding the spark')`, [H]);
  const [news] = await q(E, `select id from public.notifications where kind = 'bond_chapter_opened'`);
  check("bonds hear about a new chapter", Boolean(news), news);
  await q(E, `select public.acknowledge_chapter($1)`, [news.id]);
  const [{ n }] = await su(`select count(*)::int n from private.interactions where type = 'chapter_acknowledged' and user_a = $1`, [E]);
  check("acknowledging it counts", n === 1, n);
  await su(`delete from public.bonds where id = $1`, [bond]);
});

await step("morning cards", async () => {
  // Only this step's cards, not the starter catalogue.
  await su(`update public.content_cards set active = false`);
  const [{ id: curio }] = await su(
    `insert into public.content_cards (kind, chapter_slug, topic_cluster, title, body) values ('curio', 'learning', 'spaced-repetition', 'Forgetting curve', 'Review just before you forget.') returning id`,
  );
  await su(`insert into public.content_cards (kind, chapter_slug, topic_cluster, title, body) values ('curio', 'learning', 'spaced-repetition', 'Same cluster', 'Never the same week.')`);
  await su(`insert into public.content_cards (kind, topic_cluster, title, body) values ('wander', 'birdsong', 'Dawn chorus', 'Why birds sing early.')`);
  await su(`insert into private.wander_adjacency (chapter_slug, topic_cluster) values ('learning', 'birdsong') on conflict do nothing`);
  await su(`update public.notification_preferences set timezone = 'UTC' where user_id = $1`, [F]);
  // Tomorrow 05:00 UTC, so the cards are still live when read.
  const dawn = "(date_trunc('day', now() at time zone 'UTC') + interval '1 day 5 hours') at time zone 'UTC'";
  await su(`select private.deliver_daily_cards(${dawn})`);
  const cards = await q(F, `select * from public.my_daily_cards()`);
  check("one curio per space and one wander", cards.length === 2 && cards.some((c) => c.kind === "wander"), cards);
  await su(`delete from public.user_daily_curio where user_id = $1`, [F]);
  await su(`select private.deliver_daily_cards(${dawn})`);
  const again = await q(F, `select * from public.my_daily_cards()`);
  check("never the same topic cluster twice in a week", again.length === 0, again);

  const [{ open_direct_conversation: ef }] = await q(F, `select public.open_direct_conversation($1)`, [E]);
  await q(F, `insert into public.messages (conversation_id, sender_id, kind, card_id) values ($1, $2, 'card', $3)`, [ef, F, curio]);
  const [sent] = await su(`select type::text, weight::float as weight from private.interactions where ref_id = $1`, [curio]);
  check("sending a curio card is logged", sent?.type === "curio_card_sent" && sent.weight === 0.02, sent);
  const columns = await su(`select column_name from information_schema.columns where table_schema = 'private' and table_name = 'cards_served'`);
  check("serving history has no engagement columns", columns.map((c) => c.column_name).sort().join() === "card_id,served_at,topic_cluster,user_id", columns);
});

await step("notification budget", async () => {
  const [{ name: night }] = await su(
    `select name from pg_timezone_names where extract(hour from now() at time zone name) between 22 and 23 order by name limit 1`,
  );
  const [{ name: day }] = await su(
    `select name from pg_timezone_names where extract(hour from now() at time zone name) between 10 and 17 order by name limit 1`,
  );
  await su(`update public.notification_preferences set timezone = $2 where user_id = $1`, [G, night]);
  await su(`update public.notification_preferences set timezone = $2 where user_id = $1`, [H, day]);
  for (let i = 0; i < 5; i++) {
    await su(`insert into public.notifications (user_id, kind, actor_id) values ($1, 'connection_request', $2)`, [H, E]);
  }
  await su(`insert into public.notifications (user_id, kind, actor_id) values ($1, 'bond_formed', $2)`, [H, E]);
  await su(`insert into public.notifications (user_id, kind, actor_id) values ($1, 'connection_request', $2)`, [G, E]);
  const [{ n: waiting }] = await su(
    `select count(*)::int n from public.notifications
     where user_id = $1 and emailed_at is null
       and kind in ('bond_formed', 'connection_request', 'introduction_received')`,
    [H],
  );
  const claimed = await su(`select * from public.claim_notification_emails(200)`);
  const toH = claimed.filter((c) => c.recipient_email === "hal@x.com");
  check("three emails a day at most", toH.length === 3, toH.length);
  check("bond news goes first", toH.some((c) => c.kind === "bond_formed"), toH.map((c) => c.kind));
  check("nothing sent at night", !claimed.some((c) => c.recipient_email === "gus@x.com"), claimed);
  const [{ n }] = await su(`select count(*)::int n from public.notifications where user_id = $1 and emailed_at is null`, [H]);
  check("the rest wait for tomorrow", n === waiting - 3, { n, waiting });
});

await step("comment replies and roots", async () => {
  const [{ id: post }] = await q(E, `insert into public.posts (chapter_slug, body) values ('learning', 'Day 3') returning id`);
  const [{ id: top }] = await q(F, `insert into public.comments (post_id, body) values ($1, 'Keep going') returning id`, [post]);
  const [{ id: reply }] = await q(E, `insert into public.comments (post_id, body, parent_id) values ($1, 'Thank you', $2) returning id`, [post, top]);
  check("a reply hangs off its comment", Boolean(reply));
  await fails("replies don't nest", F, `insert into public.comments (post_id, body, parent_id) values ($1, 'x', $2)`, [post, reply], "same post");
  await fails("clients can't set a comment's count", F, `insert into public.comments (post_id, body, roots_count) values ($1, 'x', 99)`, [post], "permission denied");
  await q(E, `insert into public.comment_roots (comment_id, user_id) values ($1, $2)`, [top, E]);
  const [{ roots_count }] = await su(`select roots_count from public.comments where id = $1`, [top]);
  check("rooting a comment counts", roots_count === 1, roots_count);
  const [{ n }] = await su(`select count(*)::int n from private.interactions where ref_id = $1 and user_a = $2`, [top, E]);
  check("reply and root on a comment are logged once each", n === 2, n);
  await su(`delete from public.posts where id = $1`, [post]);
});

await step("unread messages badge", async () => {
  const [{ open_direct_conversation: ef }] = await q(E, `select public.open_direct_conversation($1)`, [F]);
  await q(F, `update public.conversation_members set last_read_at = now() where conversation_id = $1 and user_id = $2`, [ef, F]);
  await q(E, `insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'you around?')`, [ef, E]);
  const [before] = await q(F, `select * from public.my_unread_messages()`);
  check("new messages count as unread, with who sent the latest", before?.unread === 1 && before?.latest_sender === "Eve", before);
  await q(F, `update public.conversation_members set last_read_at = now() where conversation_id = $1 and user_id = $2`, [ef, F]);
  const [after] = await q(F, `select * from public.my_unread_messages()`);
  check("reading the chat clears it", after?.unread === 0, after);
});

await step("primary space and a stable order", async () => {
  const [{ id: I }] = await su(`insert into auth.users (email, raw_user_meta_data) values ('ivy@x.com', '{"first_name":"Ivy"}') returning id`);
  await q(I, `select public.complete_onboarding($1::jsonb)`, [
    JSON.stringify([
      { slug: "health", phase: "Building a habit" },
      { slug: "career", phase: "Growing a team" },
      { slug: "wealth", phase: "Investing seriously" },
    ]),
  ]);
  const order = await su(`select chapter_slug, is_primary from public.user_chapters where user_id = $1 order by opened_at`, [I]);
  check("spaces opened together get distinct, stable times", new Set(order.map((o) => o.chapter_slug)).size === 3, order);
  check("exactly one primary", order.filter((o) => o.is_primary).length === 1, order);
  const [wealth] = await su(`select id from public.user_chapters where user_id = $1 and chapter_slug = 'wealth'`, [I]);
  await q(I, `select public.set_primary_chapter($1)`, [wealth.id]);
  const [{ chapter_slug }] = await su(`select chapter_slug from public.user_chapters where user_id = $1 and is_primary`, [I]);
  check("any open space can be made primary", chapter_slug === "wealth", chapter_slug);
  await fails("clients can't set primary directly", I, `update public.user_chapters set is_primary = true where user_id = $1`, [I], "permission denied");
  await q(I, `select public.close_chapter($1)`, [wealth.id]);
  const primaries = await su(`select chapter_slug from public.user_chapters where user_id = $1 and status = 'open' and is_primary`, [I]);
  check("closing the primary hands it on", primaries.length === 1 && primaries[0].chapter_slug !== "wealth", primaries);
});

await step("remove, mute and block", async () => {
  const [{ open_direct_conversation: ef }] = await q(E, `select public.open_direct_conversation($1)`, [F]);
  await q(F, `select public.set_chat_muted($1, true)`, [ef]);
  await q(E, `insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'muted?')`, [ef, E]);
  const [muted] = await q(F, `select unread from public.my_unread_messages()`);
  check("a muted chat adds nothing to the badge", muted?.unread === 0, muted);
  await q(F, `select public.set_chat_muted($1, false)`, [ef]);

  await q(F, `select public.block_user($1)`, [E]);
  const conn = await su(`select 1 from public.connections where user_low = least($1::uuid, $2::uuid) and user_high = greatest($1::uuid, $2::uuid)`, [E, F]);
  check("blocking ends the connection", conn.length === 0, conn);
  await fails("blocked people can't message", E, `insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'hello?')`, [ef, E], "can't message");
  await fails("or reconnect", E, `select public.request_connection($1)`, [F], "can't connect");
  const seen = await q(F, `select * from public.blocks`);
  const hidden = await q(E, `select * from public.blocks`);
  check("only the blocker sees the block", seen.length === 1 && hidden.length === 0, { seen, hidden });
  await q(F, `select public.unblock_user($1)`, [E]);
  await fails("unblocking doesn't reconnect: the old chat stays read-only", E, `insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'hi')`, [ef, E], "no longer connected");
  await connect(E, F);
});

await step("circle log chips follow the moment", async () => {
  const [{ id: uc }] = await su(`select id from public.user_chapters where user_id = $1 and chapter_slug = 'learning'`, [F]);
  await q(F, `insert into public.log_entries (user_chapter_id, body) values ($1, 'Read a chapter')`, [uc]);
  const [row] = await q(E, `select entries from public.circle_logs('solo') where user_id = $1`, [F]);
  check("each moment carries its space's stage", row?.entries?.[0]?.phase === "Relearning the basics", row);
});

// --- Season Pass: trial at activation, paused Spaces, referrals ---------------
let passT, passN;
await step("season pass trial at activation", async () => {
  [{ id: passT }] = await su(
    `insert into auth.users (email, raw_user_meta_data, email_confirmed_at) values ('tomi@x.com', '{"first_name":"Tomi"}', now()) returning id`,
  );
  const [t] = await su(`select status, trial_ends_at - trial_started_at as span from public.subscriptions where user_id = $1`, [passT]);
  check("a verified sign-up starts the 14-day trial", t.status === "trialing" && /14 days/.test(JSON.stringify(t.span)), t);
  const [{ has_pass }] = await q(passT, `select public.has_pass()`);
  check("the trial is Season Pass", has_pass === true);

  const [{ id: U }] = await su(`insert into auth.users (email) values ('uma@x.com') returning id`);
  const [before] = await su(`select status from public.subscriptions where user_id = $1`, [U]);
  check("no trial before the email is verified", before.status === "none", before);
  await su(`update auth.users set email_confirmed_at = now() where id = $1`, [U]);
  const [after] = await su(`select status, trial_started_at from public.subscriptions where user_id = $1`, [U]);
  check("verifying the email starts it", after.status === "trialing", after);
  await su(`update auth.users set email_confirmed_at = now() + interval '1 second' where id = $1`, [U]);
  const [again] = await su(`select trial_started_at from public.subscriptions where user_id = $1`, [U]);
  check("one trial per account", String(again.trial_started_at) === String(after.trial_started_at), again);
  await fails("no second trial through start_trial", U, `select public.start_trial()`, [], "already been used");

  const [{ id: V }] = await su(`insert into auth.users (email) values ('vic@x.com') returning id`);
  const [{ status }] = await q(V, `select (public.start_trial()).status`);
  check("an existing member who never started can still start one", status === "trialing", status);
});

await step("season pass holds eight spaces, free keeps four", async () => {
  await q(passT, `select public.complete_onboarding($1::jsonb)`, [
    JSON.stringify([
      { slug: "career", phase: "Growing a team" },
      { slug: "health", phase: "Building a habit" },
      { slug: "wealth", phase: "Investing seriously" },
      { slug: "creative", phase: "Mid-project" },
      { slug: "learning", phase: "Day one" },
      { slug: "spiritual", phase: "Newly questioning" },
    ]),
  ]);
  const held = await su(`select count(*)::int n from public.user_chapters where user_id = $1 and status = 'open' and paused_at is null`, [passT]);
  check("onboarding takes six Spaces on the trial", held[0].n === 6, held[0].n);

  // The two used most recently survive the downgrade even though they were
  // opened first.
  await q(passT, `insert into public.posts (chapter_slug, kind, body) values ('career', 'grouv', 'still here')`);
  const [health] = await su(`select id from public.user_chapters where user_id = $1 and chapter_slug = 'health'`, [passT]);
  await q(passT, `insert into public.log_entries (user_chapter_id, body) values ($1, 'walked')`, [health.id]);

  await su(`update public.subscriptions set trial_ends_at = now() - interval '1 minute' where user_id = $1`, [passT]);
  await su(`select private.expire_trials()`);
  const rows = await su(
    `select chapter_slug, paused_at is not null as paused from public.user_chapters where user_id = $1 and status = 'open'`,
    [passT],
  );
  const active = rows.filter((r) => !r.paused).map((r) => r.chapter_slug);
  check("trial end keeps four active", active.length === 4 && rows.length === 6, rows);
  check("the last used stay active", active.includes("career") && active.includes("health"), active);
  const [{ status, spaces_review_due, spaces_locked_at }] = await su(
    `select status, spaces_review_due, spaces_locked_at from public.subscriptions where user_id = $1`,
    [passT],
  );
  check(
    "trial expired and the default four are locked in",
    status === "expired" && spaces_review_due === false && spaces_locked_at !== null,
    { status, spaces_review_due, spaces_locked_at },
  );
  const note = await su(`select 1 from public.notifications where user_id = $1 and kind = 'spaces_paused'`, [passT]);
  check("the member is told Spaces paused", note.length === 1, note.length);

  const pausedSlug = rows.find((r) => r.paused).chapter_slug;
  await fails("no posts into a paused Space", passT, `insert into public.posts (chapter_slug, kind, body) values ($1, 'grouv', 'x')`, [pausedSlug], "paused");
  const [pausedRow] = await su(`select id from public.user_chapters where user_id = $1 and chapter_slug = $2 and status = 'open'`, [passT, pausedSlug]);
  await fails("no log entries into a paused Space", passT, `insert into public.log_entries (user_chapter_id, body) values ($1, 'x')`, [pausedRow.id], "paused");
  const visible = await q(passT, `select 1 from public.user_chapters where id = $1`, [pausedRow.id]);
  check("a paused Space stays visible", visible.length === 1);
  await fails("a locked choice can't reactivate on Free", passT, `select public.resume_space($1)`, [pausedRow.id], "locked in");
  await fails(
    "a fifth active Space on Free is refused",
    passT,
    `insert into public.user_chapters (user_id, chapter_slug, phase) values ($1, 'adventure', 'Planning the leap')`,
    [passT],
    "4 chapters",
  );

  const ids = (await su(`select id, chapter_slug from public.user_chapters where user_id = $1 and status = 'open' order by chapter_slug`, [passT]));
  const pick = ids.filter((r) => ["creative", "learning", "spiritual", "wealth"].includes(r.chapter_slug)).map((r) => r.id);
  await fails("the locked default can't be swapped on Free", passT, `select public.choose_active_spaces($1::uuid[])`, [pick], "locked in");
  const kept = await su(`select chapter_slug from public.user_chapters where user_id = $1 and status = 'open' and paused_at is null`, [passT]);
  check("the default four stay active", kept.length === 4 && kept.some((r) => r.chapter_slug === "career"), kept);

  await su(
    `select public.sync_billing($1, 'active', 'rc_billing', now() + interval '1 year', null, false, null, 'grouv_founding_annual')`,
    [passT],
  );
  const all = await su(`select count(*)::int n from public.user_chapters where user_id = $1 and status = 'open' and paused_at is null`, [passT]);
  check("subscribing restores every paused Space", all[0].n === 6, all[0].n);
  const [{ spaces_locked_at: unlocked }] = await su(`select spaces_locked_at from public.subscriptions where user_id = $1`, [passT]);
  check("subscribing clears the lock", unlocked === null, unlocked);
  const [{ plan }] = await su(`select plan from public.subscriptions where user_id = $1`, [passT]);
  check("the plan's product is recorded", plan === "grouv_founding_annual", plan);
  await q(passT, `insert into public.user_chapters (user_id, chapter_slug, phase) values ($1, 'adventure', 'Planning the leap')`, [passT]);

  // Canceled: access runs to the period end, then the sweep pauses.
  await su(`update public.subscriptions set status = 'canceled', current_period_end = now() + interval '1 day' where user_id = $1`, [passT]);
  const still = await su(`select count(*)::int n from public.user_chapters where user_id = $1 and status = 'open' and paused_at is null`, [passT]);
  check("canceled keeps access until the period ends", still[0].n === 7, still[0].n);
  await su(`update public.subscriptions set current_period_end = now() - interval '1 minute' where user_id = $1`, [passT]);
  const ended = await su(`select count(*)::int n from public.user_chapters where user_id = $1 and status = 'open' and paused_at is null`, [passT]);
  check("then Free's four apply", ended[0].n === 4, ended[0].n);
  // Leave the post counts the later steps check as they were.
  await su(`delete from public.posts where author_id = $1`, [passT]);
});

await step("choosing four before the trial ends locks them in", async () => {
  const [{ id: L }] = await su(
    `insert into auth.users (email, raw_user_meta_data, email_confirmed_at) values ('lola@x.com', '{"first_name":"Lola"}', now()) returning id`,
  );
  await q(L, `select public.complete_onboarding($1::jsonb)`, [
    JSON.stringify([
      { slug: "career", phase: "Growing a team" },
      { slug: "health", phase: "Building a habit" },
      { slug: "wealth", phase: "Investing seriously" },
      { slug: "creative", phase: "Mid-project" },
      { slug: "learning", phase: "Day one" },
      { slug: "spiritual", phase: "Newly questioning" },
    ]),
  ]);
  await su(`update public.subscriptions set trial_ends_at = now() + interval '2 days' where user_id = $1`, [L]);
  const rows = await su(`select id, chapter_slug from public.user_chapters where user_id = $1 and status = 'open'`, [L]);
  const pick = rows.filter((r) => ["creative", "learning", "spiritual", "wealth"].includes(r.chapter_slug)).map((r) => r.id);
  await fails("choose at most four", L, `select public.choose_active_spaces($1::uuid[])`, [rows.slice(0, 5).map((r) => r.id)], "four");
  await q(L, `select public.choose_active_spaces($1::uuid[])`, [pick]);
  const open = await su(`select count(*)::int n from public.user_chapters where user_id = $1 and status = 'open' and paused_at is null`, [L]);
  check("the trial keeps all six open after choosing", open[0].n === 6, open[0].n);
  const [sub] = await su(`select spaces_locked_at, locked_space_ids from public.subscriptions where user_id = $1`, [L]);
  check("the choice is recorded and locked", sub.spaces_locked_at !== null && sub.locked_space_ids.length === 4, sub);
  await q(L, `select public.sync_my_spaces()`);
  const [still] = await su(`select spaces_locked_at from public.subscriptions where user_id = $1`, [L]);
  check("a trial-time lock survives a sync", still.spaces_locked_at !== null, still);
  const other = rows.filter((r) => ["career", "health", "wealth", "creative"].includes(r.chapter_slug)).map((r) => r.id);
  await fails("a locked choice can't be changed", L, `select public.choose_active_spaces($1::uuid[])`, [other], "locked in");

  await su(`update public.subscriptions set trial_ends_at = now() - interval '1 minute' where user_id = $1`, [L]);
  await su(`select private.expire_trials()`);
  const active = await su(
    `select chapter_slug from public.user_chapters where user_id = $1 and status = 'open' and paused_at is null order by 1`,
    [L],
  );
  check("at expiry the chosen four stay active", active.map((r) => r.chapter_slug).join() === "creative,learning,spiritual,wealth", active);
  const [paused] = await su(`select id from public.user_chapters where user_id = $1 and chapter_slug = 'career'`, [L]);
  await fails("Reactivate is refused once locked", L, `select public.resume_space($1)`, [paused.id], "locked in");
  await fails(
    "a fifth active Space still needs Season Pass",
    L,
    `insert into public.user_chapters (user_id, chapter_slug, phase) values ($1, 'adventure', 'Planning the leap')`,
    [L],
    "4 chapters",
  );

  await su(`update public.subscriptions set bonus_until = now() + interval '30 days' where user_id = $1`, [L]);
  const back = await su(`select count(*)::int n from public.user_chapters where user_id = $1 and status = 'open' and paused_at is null`, [L]);
  const [cleared] = await su(`select spaces_locked_at from public.subscriptions where user_id = $1`, [L]);
  check("a bonus month reactivates all and clears the lock", back[0].n === 6 && cleared.spaces_locked_at === null, { n: back[0].n, cleared });
});

await step("trial reminder", async () => {
  const [{ id: W }] = await su(
    `insert into auth.users (email, email_confirmed_at) values ('wen@x.com', now()) returning id`,
  );
  await su(`update public.subscriptions set trial_ends_at = now() + interval '2 days' where user_id = $1`, [W]);
  await su(`select private.expire_trials()`);
  await su(`select private.expire_trials()`);
  const notes = await su(`select count(*)::int n from public.notifications where user_id = $1 and kind = 'trial_ending'`, [W]);
  check("one reminder before the trial ends", notes[0].n === 1, notes[0].n);
});

await step("referrals", async () => {
  const [{ code, invites_sent }] = await q(passT, `select * from public.my_referral()`);
  check("a code from the first name", /^tomi\d+$/.test(code) && invites_sent === 0, code);
  const [{ code: same }] = await q(passT, `select code from public.my_referral()`);
  check("the code is stable", same === code, same);
  const inviter = await db.transaction(async (tx) => {
    await tx.exec("set local role anon");
    return (await tx.query("select * from public.referral_inviter($1)", [code.toUpperCase()])).rows;
  });
  check("the landing page can name the inviter", inviter[0]?.first_name === "Tomi", inviter);

  [{ id: passN }] = await su(
    `insert into auth.users (email, raw_user_meta_data, email_confirmed_at) values ('nia@x.com', '{"first_name":"Nia"}', now()) returning id`,
  );
  const [{ claim_referral: claimed }] = await q(passN, `select public.claim_referral($1)`, [code]);
  check("a new account attaches to the link", claimed === true);
  const [{ claim_referral: twice }] = await q(passN, `select public.claim_referral($1)`, [code]);
  check("only once", twice === false);
  const [{ claim_referral: self }] = await q(passT, `select public.claim_referral($1)`, [code]);
  check("not your own, nor after onboarding", self === false);
  const joined = await su(`select 1 from public.notifications where user_id = $1 and kind = 'referral_joined' and actor_id = $2`, [passT, passN]);
  check("the referrer hears they joined", joined.length === 1);

  await q(passT, `select public.record_referral_invite('email')`);
  const [stats] = await q(passT, `select * from public.my_referral()`);
  check("counters", stats.invites_sent === 1 && stats.friends_joined === 1 && stats.rewards_earned === 0, stats);
  const hidden = await q(passN, `select * from public.referrals`);
  check("the invitee can't read the referral row", hidden.length === 0);

  const [ref] = await q(passT, `select * from public.my_referrals()`);
  check("the list names the friend", ref?.first_name === "Nia" && ref.status === "joined", ref);
  await q(passT, `select public.nudge_referral($1)`, [ref.id]);
  const nudge = await su(`select 1 from public.notifications where user_id = $1 and kind = 'referral_nudge'`, [passN]);
  check("a nudge reaches the friend", nudge.length === 1);
  await fails("one nudge every few days", passT, `select public.nudge_referral($1)`, [ref.id], "recently");
  await fails("no reward before they qualify", passT, `select public.claim_referral_reward($1)`, [ref.id], "isn't ready");

  await q(passN, `select public.complete_onboarding($1::jsonb)`, [JSON.stringify([{ slug: "career", phase: "Starting over" }])]);
  const [{ id: nChapter }] = await su(`select id from public.user_chapters where user_id = $1`, [passN]);
  await q(passN, `select public.close_chapter($1)`, [nChapter]);
  const [qualified] = await q(passT, `select status from public.my_referrals()`);
  check("closing a first chapter qualifies the referral", qualified.status === "qualified", qualified);
  const earned = await su(`select 1 from public.notifications where user_id = $1 and kind = 'referral_reward_earned'`, [passT]);
  check("the referrer hears a reward is ready", earned.length === 1);

  const [{ has_pass: beforeReward }] = await q(passT, `select public.has_pass()`);
  const [{ claim_referral_reward: until }] = await q(passT, `select public.claim_referral_reward($1)`, [ref.id]);
  const days = (new Date(until) - Date.now()) / 86_400_000;
  check("the reward is a month of Season Pass", days > 27 && days < 32, days);
  const [{ has_pass: afterReward }] = await q(passT, `select public.has_pass()`);
  check("and it unlocks access", beforeReward === false && afterReward === true, { beforeReward, afterReward });
  const back = await su(`select count(*)::int n from public.user_chapters where user_id = $1 and status = 'open' and paused_at is null`, [passT]);
  check("the reward restores paused Spaces", back[0].n === 7, back[0].n);
  await fails("a reward is claimed once", passT, `select public.claim_referral_reward($1)`, [ref.id], "isn't ready");
});

// --- settings and safety (usernames, privacy, report outcomes, export, Deep Focus)
const J = await person("Jalen", learning);
const K = await person("Kemi", learning);
await connect(J, K);

await step("usernames", async () => {
  await q(J, `update public.profiles set username = 'jalen.c' where id = $1`, [J]);
  const [{ username_available: taken }] = await q(K, `select public.username_available('Jalen.C')`);
  check("a taken username isn't available, whatever the case", taken === false);
  const [{ username_available: mine }] = await q(J, `select public.username_available('jalen.c')`);
  check("your own username counts as available to you", mine === true);
  await fails("usernames are unique", K, `update public.profiles set username = 'jalen.c' where id = $1`, [K], "duplicate");
  await fails("usernames are lowercase", K, `update public.profiles set username = 'Kemi' where id = $1`, [K], "check");
  await fails("and at least 3 characters", K, `update public.profiles set username = 'ke' where id = $1`, [K], "check");
  await fails("reserved names are refused", K, `update public.profiles set username = 'admin' where id = $1`, [K], "check");
});

await step("privacy: suggestions and activity matching", async () => {
  const L = await person("Lola", learning);
  const before = await q(L, `select user_id from public.match_candidates(null, true)`);
  check("people show up in suggestions by default", before.some((r) => r.user_id === G), before);
  await q(G, `insert into public.privacy_settings (user_id, discoverable) values ($1, false)`, [G]);
  const after = await q(L, `select user_id from public.match_candidates(null, true)`);
  check("'Show me in suggestions' off hides them", !after.some((r) => r.user_id === G), after);
  const others = await q(L, `select privacy_settings.* from public.privacy_settings`);
  check("privacy settings are private", others.length === 0, others);

  await q(K, `insert into public.privacy_settings (user_id, activity_matching) values ($1, false)`, [K]);
  const [{ open_direct_conversation: jk }] = await q(J, `select public.open_direct_conversation($1)`, [K]);
  await q(J, `insert into public.messages (conversation_id, sender_id, body) values ($1, $2, 'hey')`, [jk, J]);
  const logged = await su(`select 1 from private.interactions where user_low = least($1::uuid, $2::uuid) and user_high = greatest($1::uuid, $2::uuid)`, [J, K]);
  check("activity matching off: nothing is learned from the chat", logged.length === 0, logged.length);
  await q(K, `update public.privacy_settings set activity_matching = true where user_id = $1`, [K]);
});

await step("report outcome reaches the reporter, never the reviewer", async () => {
  await q(K, `insert into public.reports (target_type, target_id, reason) values ('profile', $1, 'harassment')`, [J]);
  const [{ id: report }] = await su(`select id from public.reports where reporter_id = $1`, [K]);
  await su(`insert into public.staff (user_id) values ($1)`, [G]);
  await q(G, `select public.moderate_target('profile', $1, 'dismiss', 'reviewer-only note')`, [J]);
  await su(`delete from public.staff where user_id = $1`, [G]);
  const notes = await q(K, `select kind::text, actor_id, entity_id, data from public.notifications where kind = 'report_reviewed'`);
  check(
    "the reporter hears their report was reviewed, about Jalen, with no actor",
    notes.length === 1 && notes[0].actor_id === null && notes[0].entity_id === report && notes[0].data.subject === "Jalen",
    notes,
  );
  await fails("reporters can't read who reviewed", K, `select reviewed_by from public.reports`, [], "permission denied");
  await fails("or the reviewer's note", K, `select resolution_note from public.reports`, [], "permission denied");
  const own = await q(K, `select id, status from public.reports`);
  check("but can read their report's status", own.length === 1 && own[0].status === "dismissed", own);
  const [outcome] = await q(K, `select * from public.my_report($1)`, [report]);
  check("the outcome page has the status and subject", outcome?.status === "dismissed" && outcome.subject === "Jalen" && !("reviewed_by" in outcome), outcome);
  const stranger = await q(J, `select * from public.my_report($1)`, [report]);
  check("nobody else can open it", stranger.length === 0, stranger);
});

await step("data export", async () => {
  await q(J, `insert into public.posts (chapter_slug, body, is_anonymous) values ('learning', 'quiet one', true)`);
  await q(J, `insert into public.posts (chapter_slug, body) values ('learning', 'loud one')`);
  const [{ export_my_data: data }] = await q(J, `select public.export_my_data()`);
  check("export has the profile with username", data.profile?.username === "jalen.c", data.profile);
  check("export has named and anonymous posts", data.posts.length === 2, data.posts.length);
  check("export has the messages they sent", data.messages_sent.some((m) => m.body === "hey"), data.messages_sent);
  check("and connections by first name", data.connections.some((c) => c.with === "Kemi"), data.connections);
  check("and chapters", data.chapters.length === 1, data.chapters.length);
  const [{ export_my_data: theirs }] = await q(K, `select public.export_my_data()`);
  check("nobody else's messages or posts leak in", theirs.messages_sent.length === 0 && theirs.posts.length === 0, theirs.messages_sent);
  check("reports filed carry no reviewer", theirs.reports_filed.length === 1 && !("reviewed_by" in theirs.reports_filed[0]), theirs.reports_filed);
  await fails("export needs a signed-in member", null, `select public.export_my_data()`, [], "");
  // Leave the post count as the account-deletion check expects it.
  await q(J, `delete from public.posts`);
});

await step("deep focus digest", async () => {
  const [{ id: session }] = await su(
    `insert into public.focus_sessions (user_id, duration, started_at, ends_at)
     values ($1, 'until_evening', now() - interval '3 hours', now() - interval '1 hour') returning id`,
    [K],
  );
  const [{ open_direct_conversation: jk }] = await q(J, `select public.open_direct_conversation($1)`, [K]);
  await su(
    `insert into public.messages (conversation_id, sender_id, body, created_at) values ($1, $2, 'while away', now() - interval '2 hours')`,
    [jk, J],
  );
  await su(`insert into public.messages (conversation_id, sender_id, body, created_at) values ($1, $2, 'after', now())`, [jk, J]);
  const [digest] = await q(K, `select * from public.focus_digest()`);
  check("the digest counts messages from while you were away only", digest?.other_messages === 1 && digest.other_sender === "Jalen", digest);
  const [pending] = await q(K, `select digest_seen_at from public.focus_sessions where id = $1`, [session]);
  check("a new ended session still owes its welcome back", pending.digest_seen_at === null, pending);
  await q(K, `update public.focus_sessions set digest_seen_at = now() where id = $1`, [session]);
  const empty = await q(D, `select * from public.focus_digest()`);
  check("no session, no digest", empty.length === 0, empty);
});

await step("life wrapped", async () => {
  const W = await person("Wren", [{ slug: "career", phase: "Starting over" }]);
  const V = await person("Vale", [{ slug: "career", phase: "Growing a team" }]);
  await connect(W, V);
  const [{ id: uc }] = await su(
    `update public.user_chapters set opened_at = now() - interval '30 days' where user_id = $1 and chapter_slug = 'career' returning id`,
    [W],
  );
  const setPlan = (uid, status) =>
    su(`update public.subscriptions set status = $2, trial_ends_at = null, current_period_end = null where user_id = $1`, [uid, status]);
  await setPlan(V, "active");

  await setPlan(W, "none");
  await fails("Free can't generate a wrap", W, `select public.generate_wrap('month', array[$1]::uuid[])`, [uc], "Season Pass");
  await setPlan(W, "active");

  await su(
    `insert into public.log_entries (user_id, user_chapter_id, body, entry_date)
     values ($1, $2, 'Said yes to a coffee with Vale today', current_date - 9), ($1, $2, 'ok', current_date - 9)`,
    [W, uc],
  );
  await fails("fewer than three moments isn't enough", W, `select public.generate_wrap('month', array[$1]::uuid[])`, [uc], "Not enough");

  await su(
    `insert into public.log_entries (user_id, user_chapter_id, body, photo_path, entry_date) values
       ($1, $2, 'Called it home out loud for the first time', null, current_date - 7),
       ($1, $2, null, $1 || '/view.jpg', current_date - 5),
       ($1, $2, 'Career felt steady for once this week', null, current_date - 3),
       ($1, $2, 'Grateful for a felt sense of steadiness', null, current_date - 1),
       ($1, $2, 'A quiet one', null, current_date)`,
    [W, uc],
  );
  const [{ generate_wrap: wrap }] = await q(W, `select public.generate_wrap('month', array[$1]::uuid[], null, current_date)`, [uc]);
  const moments = await q(W, `select * from public.wrap_moments where wrap_id = $1 order by position`, [wrap]);
  check("a wrap holds five moments", moments.length === 5, moments.length);
  check("moments run in date order", moments.every((m, i) => i === 0 || m.moment_date >= moments[i - 1].moment_date), moments);
  check("the photo moment is picked", moments.some((m) => m.photo_path), moments);
  check("one moment per day while there are enough days", new Set(moments.map((m) => String(m.moment_date))).size === 5, moments);
  const [{ title }] = await q(W, `select title from public.wraps where id = $1`, [wrap]);
  check("titled with the chapter's stage", title === "Starting over", title);
  const [{ generate_wrap: again }] = await q(W, `select public.generate_wrap('month', array[$1]::uuid[], null, current_date)`, [uc]);
  check("the same window returns the same wrap", again === wrap, { again, wrap });

  const peek = await q(V, `select * from public.wraps`);
  check("wraps are private", peek.length === 0, peek);
  const vale = moments.find((m) => m.body?.includes("Vale"));
  await fails("others can't edit your wrap", V, `select public.update_wrap_moment($1, 'mine now')`, [vale.id], "isn't in your wraps");

  const [{ update_wrap_moment: wrapOnly }] = await q(W, `select public.update_wrap_moment($1, 'Coffee with Vale, and Career talk')`, [vale.id]);
  const [kept] = await su(`select body from public.log_entries where id = $1`, [vale.log_entry_id]);
  check("editing the wrap leaves the Log alone", wrapOnly === false && kept.body === "Said yes to a coffee with Vale today", kept);
  const [{ update_wrap_moment: synced }] = await q(W, `select public.update_wrap_moment($1, 'Coffee with Vale, and Career talk', true)`, [vale.id]);
  const [source] = await su(`select body from public.log_entries where id = $1`, [vale.log_entry_id]);
  check("asked to, it updates the memory too", synced === true && source.body === "Coffee with Vale, and Career talk", source);

  const [{ wrap_share_preview: preview }] = await q(W, `select public.wrap_share_preview($1, true)`, [vale.id]);
  check("the preview shows what will leave", preview === "Coffee with someone, and this chapter talk", preview);
  await fails("previews are the owner's", V, `select public.wrap_share_preview($1, true)`, [vale.id], "isn't in your wraps");
  const [share] = await q(W, `select * from public.create_wrap_share($1, true, true)`, [vale.id]);
  check("links get a token", typeof share?.token === "string" && share.token.length === 16, share);
  const card = await db.transaction(async (tx) => {
    await tx.exec("set local role anon");
    return (await tx.query(`select * from public.shared_wrap_card($1)`, [share.token])).rows;
  });
  check("the card opens signed out", card.length === 1, card);
  check("hide names swaps people and chapters", card[0]?.body === "Coffee with someone, and this chapter talk" && card[0]?.sharer_name === null, card[0]);
  const direct = await db.transaction(async (tx) => {
    await tx.exec("set local role anon");
    return (await tx.query(`select * from public.wrap_shares`)).rows;
  });
  check("signed out, only the card function reads links", direct.length === 0, direct.length);
  const photoMoment = moments.find((m) => m.photo_path);
  await fails("a photo-only moment can't share with photos hidden", W, `select * from public.create_wrap_share($1, false, true)`, [photoMoment.id], "only a photo");
  const [named] = await q(W, `select * from public.create_wrap_share($1, false, false)`, [photoMoment.id]);
  const [namedCard] = await q(V, `select * from public.shared_wrap_card($1)`, [named.token]);
  check("shown names and photos stay", namedCard?.sharer_name === "Wren" && namedCard?.photo_path === `${W}/view.jpg`, namedCard);

  await fails("only the sharer revokes", V, `select public.revoke_wrap_share($1)`, [share.id], "already off");
  await setPlan(W, "none");
  const stillMine = await q(W, `select * from public.wrap_moments where wrap_id = $1`, [wrap]);
  check("wraps stay readable on Free", stillMine.length === 5, stillMine.length);
  const [{ generate_wrap: reopenedOnFree }] = await q(W, `select public.generate_wrap('month', array[$1]::uuid[], null, current_date)`, [uc]);
  check("and an existing wrap still opens", reopenedOnFree === wrap);
  await fails("Free can't share", W, `select * from public.create_wrap_share($1)`, [vale.id], "Season Pass");
  await fails("or edit", W, `select public.update_wrap_moment($1, 'x')`, [vale.id], "Season Pass");
  await q(W, `select public.revoke_wrap_share($1)`, [share.id]);
  const gone = await q(V, `select * from public.shared_wrap_card($1)`, [share.token]);
  check("a revoked link shows nothing", gone.length === 0, gone);
  await setPlan(W, "active");

  await q(W, `select public.close_chapter($1)`, [uc]);
  const [{ generate_wrap: chapterWrap }] = await q(W, `select public.generate_wrap('chapter', '{}', $1)`, [uc]);
  const [cw] = await q(W, `select range, starts_on, user_chapter_id from public.wraps where id = $1`, [chapterWrap]);
  check("a closed chapter gets its own wrap", cw?.range === "chapter" && cw.user_chapter_id === uc, cw);
  const ready = await su(`select * from public.notifications where user_id = $1 and kind = 'wrapped_ready'`, [W]);
  check("and a wrapped_ready notification", ready.length === 1 && ready[0].entity_id === chapterWrap, ready);
  const [{ generate_wrap: sameChapter }] = await q(W, `select public.generate_wrap('chapter', '{}', $1)`, [uc]);
  check("one wrap per closed chapter", sameChapter === chapterWrap);
  await fails("open chapters have no chapter wrap", V, `select public.generate_wrap('chapter', '{}', $1)`, [uc], "isn't closed");

  await q(W, `select public.reopen_chapter($1)`, [uc]);
  const [reopened] = await su(`select status, closed_at from public.user_chapters where id = $1`, [uc]);
  const leftovers = await su(
    `select (select count(*)::int from public.wraps where user_chapter_id = $1) wraps,
            (select count(*)::int from public.chapter_closures where user_chapter_id = $1) closures,
            (select count(*)::int from public.notifications where user_id = $2 and kind = 'wrapped_ready') notes`,
    [uc, W],
  );
  check("undo reopens the chapter", reopened.status === "open" && reopened.closed_at === null, reopened);
  check("and clears its reflection, wrap and notice", leftovers[0].wraps === 0 && leftovers[0].closures === 0 && leftovers[0].notes === 0, leftovers[0]);
  await q(W, `select public.close_chapter($1)`, [uc]);
  await su(`update public.user_chapters set closed_at = now() - interval '1 hour' where id = $1`, [uc]);
  await fails("undo only right after closing", W, `select public.reopen_chapter($1)`, [uc], "Life Archive now");

  const [{ id: uc2 }] = await su(
    `insert into public.user_chapters (user_id, chapter_slug, phase) values ($1, 'health', 'Starting over') returning id`,
    [W],
  );
  await su(
    `insert into public.log_entries (user_id, user_chapter_id, body, entry_date) values ($1, $2, 'one', current_date), ($1, $2, 'two', current_date), ($1, $2, 'three', current_date)`,
    [W, uc2],
  );
  const [{ generate_weekly_wraps: made }] = await su(`select private.generate_weekly_wraps()`);
  const weekly = await su(`select id from public.wraps where user_id = $1 and range = 'week'`, [W]);
  check("the weekly job wraps an active week", made >= 1 && weekly.length === 1, { made, weekly });
  const notes = await su(`select * from public.notifications where user_id = $1 and kind = 'wrapped_ready' and entity_id = $2`, [W, weekly[0]?.id]);
  check("and says it's ready", notes.length === 1, notes.length);
  await su(`select private.generate_weekly_wraps()`);
  const weeklyAgain = await su(`select id from public.wraps where user_id = $1 and range = 'week'`, [W]);
  check("once a week", weeklyAgain.length === 1, weeklyAgain.length);
});

await step("home: matches, introductions and post audience", async () => {
  const people = [];
  for (const name of ["Hana", "Ivo", "Jae", "Kit", "Lu"]) {
    const [{ id }] = await su(
      `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
      [`${name.toLowerCase()}@home.x`, JSON.stringify({ first_name: name })],
    );
    people.push(id);
  }
  const [H, I, J, K, L] = people;
  const phases = (await su(`select label from public.chapter_phases where chapter_slug = 'career' order by sort_order`)).map((r) => r.label);
  for (const [who, phase] of [[H, phases[0]], [I, phases[0]], [J, phases[1]], [K, phases[0]]]) {
    await q(who, `select public.complete_onboarding($1::jsonb)`, [JSON.stringify([{ slug: "career", phase }])]);
  }

  // Matching
  const matches = await q(H, `select * from public.potential_matches(12)`);
  const ids = matches.map((m) => m.user_id);
  check("matches share a space", [I, J, K].every((id) => ids.includes(id)) && !ids.includes(H), matches.length);
  check("same stage ranks first", matches[0]?.same_phase === true, matches[0]);
  await q(H, `select public.dismiss_match($1)`, [K]);
  const afterDismiss = (await q(H, `select user_id from public.potential_matches(12)`)).map((m) => m.user_id);
  check("Not relevant is never shown again", !afterDismiss.includes(K), afterDismiss);
  check("dismissals are private", (await q(I, `select * from public.match_dismissals`)).length === 0);

  // Preferences: filters are Season Pass, notifications are Free.
  await su(`update public.subscriptions set status = 'none', trial_ends_at = null where user_id = any($1)`, [people]);
  await fails(
    "Free can't set match filters",
    H,
    `select public.save_match_preferences(array['career_pivot'], '{}', null, false)`,
    [],
    "Season Pass",
  );
  const [free] = await q(H, `select * from public.save_match_preferences('{}', '{}', null, true)`);
  check("Free can turn on match notifications", free.notify_new_matches === true, free);
  await su(`update public.subscriptions set status = 'active' where user_id = any($1)`, [[H, I]]);
  await q(I, `select public.save_match_preferences('{}', array['accountability'], null, false)`);
  await q(H, `select public.save_match_preferences(array['career_pivot'], array['accountability', 'quiet_checkins'], null, true)`);
  const [ivo] = await q(H, `select * from public.potential_matches(12) where user_id = $1`, [I]);
  check("shared looking-for explains the match", ivo?.shared_looking_for?.join() === "accountability", ivo);
  await q(H, `select public.save_match_preferences(array['career_pivot'], array['accountability'], 25, true)`);
  const far = await q(H, `select * from public.potential_matches(12)`);
  check("a distance cap leaves out people with no region", far.length === 0, far.length);
  await fails("unknown chips are refused", H, `select public.save_match_preferences(array['astronaut'], '{}', 25, true)`, [], "check");
  await q(H, `select public.save_match_preferences(array['career_pivot'], array['accountability'], null, true)`);

  // New-match notifications
  await su(`update public.match_preferences set last_match_notified_at = now() - interval '4 days' where user_id = $1`, [H]);
  await q(L, `select public.complete_onboarding($1::jsonb)`, [JSON.stringify([{ slug: "career", phase: phases[0] }])]);
  await su(`update public.user_chapters set opened_at = now() + interval '1 minute' where user_id = $1`, [L]);
  await su(`select private.send_match_notifications()`);
  await su(`select private.send_match_notifications()`);
  const told = await su(`select actor_id from public.notifications where user_id = $1 and kind = 'match_available'`, [H]);
  check("someone new sends one match notification, unnamed", told.length === 1 && told[0].actor_id === null, told);

  // Introductions
  await fails("an introduction needs a note", H, `select public.introduce_yourself($1, '  ')`, [I], "note");
  const [intro] = await q(H, `select * from public.introduce_yourself($1, 'Hi Ivo, saw we''re both pivoting', 'Share something similar')`, [I]);
  check("an introduction is a pending request with its note", intro.status === "pending" && intro.intro_message.startsWith("Hi Ivo"), intro);
  await fails("one introduction at a time", H, `select public.introduce_yourself($1, 'again')`, [I], "on its way");
  const heard = await su(`select kind, actor_id from public.notifications where user_id = $1 and entity_id = $2`, [I, intro.id]);
  check("the recipient hears about it", heard.length === 1 && heard[0].kind === "introduction_request", heard);
  const [received] = await q(I, `select * from public.my_introductions()`);
  check("the recipient reads the note", received?.direction === "received" && received.message.startsWith("Hi Ivo") && received.first_name === "Hana", received);
  await fails("no chat before they accept", H, `select public.open_direct_conversation($1)`, [I], "circle");
  check("no longer a match once introduced", !(await q(H, `select user_id from public.potential_matches(12)`)).some((m) => m.user_id === I));
  await q(I, `select public.mark_introductions_seen()`);
  const [sent] = await q(H, `select * from public.my_introductions()`);
  check("the sender sees it was seen", sent?.direction === "sent" && sent.seen_at !== null, sent);
  await q(I, `select public.respond_to_connection($1, true)`, [intro.id]);
  const yes = await su(`select 1 from public.notifications where user_id = $1 and kind = 'introduction_accepted' and actor_id = $2`, [H, I]);
  check("the sender hears yes", yes.length === 1);
  const [{ open_direct_conversation: chat }] = await q(H, `select public.open_direct_conversation($1)`, [I]);
  check("chat unlocks after acceptance", Boolean(chat));

  const [second] = await q(H, `select * from public.introduce_yourself($1, 'Hello Jae')`, [J]);
  await q(J, `select public.respond_to_connection($1, false)`, [second.id]);
  const no = await su(`select 1 from public.notifications where user_id = $1 and kind = 'introduction_declined'`, [H]);
  check("the sender hears not this time", no.length === 1);
  await fails("a declined pair can't be re-introduced", H, `select public.introduce_yourself($1, 'Please?')`, [J], "not able");
  const plain = await q(K, `select * from public.request_connection($1)`, [L]);
  const plainNote = await su(`select kind from public.notifications where entity_id = $1`, [plain[0].id]);
  check("a plain Connect is still a connection request", plainNote[0]?.kind === "connection_request", plainNote);

  // Post audience. Hana and Ivo are bonded; Hana and Lu are only in each other's circle.
  await su(`insert into public.bonds (inviter_id, invitee_id, status, accepted_at) values ($1, $2, 'active', now())`, [H, I]);
  const [toLu] = await q(H, `select * from public.request_connection($1)`, [L]);
  await q(L, `select public.respond_to_connection($1, true)`, [toLu.id]);

  const [mine] = await q(H, `insert into public.posts (chapter_slug, kind, body, audience) values ('career', 'root', 'just for me', 'only_me') returning id`);
  const [picked] = await q(H, `insert into public.posts (chapter_slug, kind, body, audience) values ('career', 'root', 'for Ivo', 'selected_bonds') returning id`);
  const [open] = await q(H, `insert into public.posts (chapter_slug, kind, body) values ('career', 'root', 'for everyone') returning id`);
  await fails("only bonds can be chosen", H, `select public.set_post_audience($1, array[$2]::uuid[])`, [picked.id, L], "bonds");
  await fails("only the author chooses", I, `select public.set_post_audience($1, array[$2]::uuid[])`, [picked.id, I], "own posts");
  const [{ set_post_audience: added }] = await q(H, `select public.set_post_audience($1, array[$2]::uuid[])`, [picked.id, I]);
  check("the chosen bond is recorded", added === 1);

  const ivoSees = (await q(I, `select id, audience from public.feed_posts('home')`)).map((r) => r.id);
  const luSees = (await q(L, `select id from public.feed_posts('home')`)).map((r) => r.id);
  const hanaSees = await q(H, `select id, audience from public.feed_posts('mine')`);
  check("only me stays with its author", !ivoSees.includes(mine.id) && !luSees.includes(mine.id), { ivoSees, luSees });
  check("selected bonds reach exactly them", ivoSees.includes(picked.id) && !luSees.includes(picked.id), { ivoSees, luSees });
  check("everyone reaches the circle", ivoSees.includes(open.id) && luSees.includes(open.id));
  check("the author sees all three with their audience", hanaSees.filter((r) => [mine.id, picked.id, open.id].includes(r.id)).length === 3 && hanaSees.find((r) => r.id === mine.id)?.audience === "only_me", hanaSees);
  const direct = await q(L, `select id from public.posts where id = $1`, [mine.id]);
  check("RLS hides a private post outright", direct.length === 0);
  const audienceRows = await q(L, `select * from public.post_audience`);
  check("the audience list isn't public", audienceRows.length === 0);
  await fails(
    "Open Grove is only for everyone",
    H,
    `insert into public.posts (chapter_slug, kind, body, audience, open_grove) values ('career', 'root', 'x', 'only_me', true)`,
    [],
    "posts_open_grove_is_public",
  );

  // Leave the later steps' counts as they were.
  await su(`delete from auth.users where id = any($1)`, [people]);
});

await step("delete account", async () => {
  await su(`delete from auth.users where id = $1`, [A]);
  const posts = await su(`select count(*)::int n from public.posts`);
  check("anonymous and named posts removed with account", posts[0].n === 0, posts[0].n);
  const owners = await su(`select count(*)::int n from private.content_owners where content_type = 'posts'`);
  check("ownership rows removed", owners[0].n === 0);
  const groups = await su(`select created_by from public.groups where id = $1`, [group]);
  check("group survives creator deletion", groups.length === 1 && groups[0].created_by === null);
});

// --- Bonds: invites, check-ins, release, Bond Log (workstream C) --------------
{
  const makeUser = async (email, name, verified) =>
    (
      await su(
        `insert into auth.users (email, raw_user_meta_data, email_confirmed_at) values ($1, $2, $3) returning id`,
        [email, JSON.stringify({ first_name: name }), verified ? new Date().toISOString() : null],
      )
    )[0].id;
  const K1 = await makeUser("kai@x.com", "Kai", true);
  const K2 = await makeUser("lu@x.com", "Lu", true);
  const K3 = await makeUser("mo@x.com", "Mo", false);
  const K4 = await makeUser("ned@x.com", "Ned", true);
  await connect(K1, K2);
  await connect(K1, K3);
  let invite;

  await step("bond invites need the pass, a goal and a circle", async () => {
    await fails("free members can't invite", K3, `select public.invite_to_bond($1, 'Go')`, [K1], "Season Pass");
    await fails("an invite needs a goal", K1, `select public.invite_to_bond($1, '  ')`, [K2], "working toward");
    await fails("only people in your circle", K1, `select public.invite_to_bond($1, 'Go')`, [K4], "circle");
    [{ invite_to_bond: invite }] = await q(K1, `select public.invite_to_bond($1, 'New city, together')`, [K2]);
    const [row] = await su(`select status, origin, shared_goal from public.bonds where id = $1`, [invite]);
    check("the invite is pending with its goal", row.status === "pending" && row.origin === "invite" && row.shared_goal === "New city, together", row);
    await fails("one invite at a time", K1, `select public.invite_to_bond($1, 'Again')`, [K2], "already");
    const incoming = await q(K2, `select * from public.bond_invites()`);
    check("YOUR BOND INVITES lists it with the goal", incoming.length === 1 && incoming[0].shared_goal === "New city, together", incoming);
    const note = await q(K2, `select data from public.notifications where kind = 'bond_invitation'`);
    check("the invitee is notified", note.length === 1, note);
    const [circleRow] = await q(K1, `select invite_id, invite_from_me from public.bonds_overview() where user_id = $1`, [K2]);
    check("the circle row carries the invite in flight", circleRow?.invite_id === invite && circleRow?.invite_from_me === true, circleRow);
  });

  await step("accepting needs the pass on both sides; declining doesn't", async () => {
    const [{ invite_to_bond: toFree }] = await q(K1, `select public.invite_to_bond($1, 'Weekly accountability')`, [K3]);
    await fails("a free invitee can't accept", K3, `select public.respond_to_bond_invite($1, true)`, [toFree], "Season Pass");
    await q(K3, `select public.respond_to_bond_invite($1, false)`, [toFree]);
    const declined = await q(K1, `select 1 from public.notifications where kind = 'bond_declined'`);
    check("the inviter hears it was declined", declined.length === 1, declined);

    await q(K2, `select public.respond_to_bond_invite($1, true)`, [invite]);
    const [row] = await su(`select status, accepted_at is not null as accepted from public.bonds where id = $1`, [invite]);
    check("accepted invite is an active Bond", row.status === "active" && row.accepted, row);
    const ranks = await su(`select user_id from public.bond_ranks where bond_id = $1`, [invite]);
    check("both sides get a rank straight away", ranks.length === 2, ranks);
    const accepted = await q(K1, `select 1 from public.notifications where kind = 'bond_accepted' and entity_id = $1`, [invite]);
    check("the inviter hears it was accepted", accepted.length === 1, accepted);
    const [overview] = await q(K1, `select relationship, bond_origin, shared_goal, depth_level from public.bonds_overview() where user_id = $1`, [K2]);
    check(
      "the Bonds screen shows the goal and a coarse depth",
      overview?.relationship === "bond" && overview?.bond_origin === "invite" && overview?.shared_goal === "New city, together" && overview?.depth_level === 10,
      overview,
    );
    await su(`select private.run_bond_engine()`);
    const [still] = await su(`select status from public.bonds where id = $1`, [invite]);
    check("the engine never releases an invited Bond", still.status === "active", still);
  });

  await step("goal, check-ins and details", async () => {
    await q(K2, `select public.set_bond_goal($1, 'First year in a new city', 7::smallint)`, [invite]);
    await q(K2, `select public.log_bond_checkin($1, 'in_person', 'Dinner downtown', current_date)`, [invite]);
    await fails("check-ins need words", K1, `select public.log_bond_checkin($1, 'in_app', ' ', current_date)`, [invite], "what happened");
    const seen = await q(K3, `select * from public.bond_checkins`);
    check("nobody outside the Bond reads its check-ins", seen.length === 0, seen);
    const [details] = await q(K1, `select * from public.bond_details($1)`, [invite]);
    check(
      "details carry goal, horizon and check-ins",
      details?.shared_goal === "First year in a new city" && details?.goal_horizon_months === 7 && details?.checkin_count === 1,
      details,
    );
    const outsider = await q(K3, `select * from public.bond_details($1)`, [invite]);
    check("details are only for the pair", outsider.length === 0, outsider);
  });

  await step("bond log drafts stay private until shared", async () => {
    const [weekly] = await su(`select id from public.bond_activities where bond_id = $1 and kind = 'weekly'`, [invite]);
    check("every Bond opens with the weekly prompt", Boolean(weekly), weekly);
    await q(K1, `select public.save_bond_response($1, 1, 'Unpacked the last box', false)`, [weekly.id]);
    let [round] = await q(K2, `select * from public.bond_log($1)`, [invite]);
    check("a draft is invisible to the other person", round?.their_body === null && round?.their_shared === false && round?.title, round);
    const drafts = await q(K2, `select * from public.bond_log_responses`);
    check("the table hides drafts too", drafts.length === 0, drafts);
    await q(K1, `select public.save_bond_response($1, 1, 'Unpacked the last box', true)`, [weekly.id]);
    [round] = await q(K2, `select * from public.bond_log($1)`, [invite]);
    check("a shared answer reaches them", round?.their_body === "Unpacked the last box", round);
    const [list] = await q(K2, `select * from public.my_bond_logs()`);
    check("their list says there's something new", list?.waiting_on_me === true && list?.shared_count === 1, list);
    await fails("shared answers are final", K1, `select public.save_bond_response($1, 1, 'Edit', false)`, [weekly.id], "already shared");
    await fails("next week's prompt isn't open", K1, `select public.save_bond_response($1, 2, 'Early', false)`, [weekly.id], "isn't open");
    await fails("free members can't write in a Bond Log", K3, `select public.save_bond_response($1, 1, 'x', true)`, [weekly.id], "Season Pass");

    const [{ start_bond_activity: gratitude }] = await q(K2, `select public.start_bond_activity($1, 'gratitude')`, [invite]);
    await fails("one challenge of a kind at a time", K1, `select public.start_bond_activity($1, 'gratitude')`, [invite], "already running");
    await q(K2, `select public.save_bond_response($1, 1, 'Slow coffee', true)`, [gratitude]);
    await q(K1, `select public.end_bond_activity($1)`, [gratitude]);
    await fails("an ended challenge is read-only", K2, `select public.save_bond_response($1, 1, 'Again', true)`, [gratitude], "read-only");
  });

  await step("end bond: read-only record, and the engine stands back", async () => {
    await fails("outsiders can't end it", K3, `select public.end_bond($1)`, [invite], "not active");
    await q(K2, `select public.end_bond($1)`, [invite]);
    const [row] = await su(`select status, ended_by from public.bonds where id = $1`, [invite]);
    check("ending releases it and remembers who", row.status === "released" && row.ended_by === K2, row);
    const told = await q(K1, `select 1 from public.notifications where kind = 'bond_released'`);
    check("the other person is told", told.length === 1, told);
    const log = await q(K1, `select * from public.bond_log($1)`, [invite]);
    check("the log stays readable", log.some((r) => r.their_body === "Slow coffee"), log);
    const [weekly] = await su(`select id from public.bond_activities where bond_id = $1 and kind = 'weekly'`, [invite]);
    await fails("but nothing new can be added", K2, `select public.save_bond_response($1, 1, 'Late', true)`, [weekly.id], "read-only");

    await su(
      `insert into private.interactions (user_a, user_b, type, weight, created_at)
       select case when g % 2 = 0 then $1::uuid else $2::uuid end, case when g % 2 = 0 then $2::uuid else $1::uuid end,
              'message_reply', 5, now() - interval '1 day'
       from generate_series(1, 120) g`,
      [K1, K2],
    );
    await su(`select private.run_bond_engine()`);
    const reformed = await su(
      `select 1 from public.bonds where status = 'active' and user_low = least($1::uuid, $2::uuid) and user_high = greatest($1::uuid, $2::uuid)`,
      [K1, K2],
    );
    check("the engine doesn't re-form a Bond someone just ended", reformed.length === 0, reformed);
  });

  await step("a moment's own audience, and Everyone", async () => {
    const [{ id: kc }] = await su(
      `insert into public.user_chapters (user_id, chapter_slug, phase) values ($1, 'career', 'Growing a team') returning id`,
      [K1],
    );
    await su(`insert into public.user_chapters (user_id, chapter_slug, phase) values ($1, 'career', 'Starting over')`, [K4]);
    const [{ id: entry }] = await q(K1, `insert into public.log_entries (user_chapter_id, body) values ($1, 'Shipped it') returning id`, [kc]);
    let seen = await q(K4, `select id from public.log_entries where id = $1`, [entry]);
    check("a stranger in the space can't see a circle log", seen.length === 0, seen);
    await q(K1, `update public.log_entries set visibility = 'everyone' where id = $1`, [entry]);
    seen = await q(K4, `select id from public.log_entries where id = $1`, [entry]);
    check("Everyone opens it to people in the same space", seen.length === 1, seen);
    await q(K1, `update public.log_entries set visibility = 'only_me' where id = $1`, [entry]);
    seen = await q(K2, `select id from public.log_entries where id = $1`, [entry]);
    check("a private moment stays private from the circle", seen.length === 0, seen);
  });
}

// --- Spaces: chapter invitations; Chapter Groups: pass gate and outcomes ------
await step("chapter invitations", async () => {
  const Am = await person("Amara", [{ slug: "career", phase: "Starting over" }]);
  const Za = await person("Zainab", [{ slug: "health", phase: "Building a habit" }]);
  const St = await person("Stranger", [{ slug: "wealth", phase: "Learning the basics" }]);
  const Li = await person("Linky", [{ slug: "health", phase: "Starting over" }]);
  await connect(Am, Za);
  const [{ id: uc }] = await su(`select id from public.user_chapters where user_id = $1 and chapter_slug = 'career'`, [Am]);

  await fails("strangers can't be invited directly", Am, `select * from public.create_chapter_invite($1, 'New City', null, '{}', array[$2]::uuid[])`, [uc, St], "circle or this Space");
  await fails("photos must be yours", Am, `select * from public.create_chapter_invite($1, 'New City', null, array['someone/x.jpg'], '{}')`, [uc], "uploading");
  await fails("only chapters you hold", Za, `select * from public.create_chapter_invite($1, 'New City')`, [uc], "chapter you hold");
  const [invite] = await q(
    Am,
    `select * from public.create_chapter_invite($1, ' New City ', 'Come along', array[$2 || '/c.jpg'], array[$3]::uuid[])`,
    [uc, Am, Za],
  );
  check("an invitation gets a link token", typeof invite?.token === "string" && invite.token.length === 20, invite);
  const notes = await q(Za, `select * from public.notifications where kind = 'chapter_invite'`);
  check("the recipient is notified", notes.length === 1 && notes[0].data.token === invite.token, notes);
  const [mine] = await q(Za, `select * from public.my_chapter_invitations()`);
  check("it waits in INVITATIONS", mine?.title === "New City" && mine.sender_name === "Amara", mine);
  const peek = await q(St, `select * from public.chapter_invites`);
  check("others can't read invitations", peek.length === 0, peek.length);

  const anonCard = await db.transaction(async (tx) => {
    await tx.exec("set local role anon");
    return (await tx.query(`select * from public.chapter_invite_card($1)`, [invite.token])).rows;
  });
  check("the link card opens signed out", anonCard.length === 1 && anonCard[0].note === "Come along", anonCard);

  await fails("the sender can't accept their own", Am, `select public.respond_chapter_invite($1, true, 'Starting over')`, [invite.token], "your own");
  await fails("joining a Space you don't hold needs a stage", Za, `select public.respond_chapter_invite($1, true)`, [invite.token], "Pick where");
  const [{ respond_chapter_invite: joined }] = await q(Za, `select public.respond_chapter_invite($1, true, 'Starting over')`, [invite.token]);
  const held = await su(`select 1 from public.user_chapters where user_id = $1 and chapter_slug = 'career' and status = 'open'`, [Za]);
  check("accepting opens the chapter's Space", joined === "joined" && held.length === 1, { joined, held });
  const accepted = await q(Am, `select * from public.notifications where kind = 'chapter_invite_accepted'`);
  check("the sender hears they joined", accepted.length === 1, accepted.length);
  const left = await q(Za, `select * from public.notifications where kind = 'chapter_invite'`);
  check("the invitation notice clears", left.length === 0, left.length);
  await fails("an answer is final", Za, `select public.respond_chapter_invite($1, false)`, [invite.token], "already answered");

  // A link recipient: not invited directly, arrives by the token.
  const [{ respond_chapter_invite: linkJoin }] = await q(Li, `select public.respond_chapter_invite($1, true, 'Growing a team')`, [invite.token]);
  const [conn] = await su(
    `select status from public.connections where user_low = least($1::uuid, $2::uuid) and user_high = greatest($1::uuid, $2::uuid)`,
    [Am, Li],
  );
  check("a link accept connects you with the sender", linkJoin === "joined" && conn?.status === "accepted", { linkJoin, conn });
  const stray = await q(Li, `select * from public.notifications where kind = 'connection_request'`);
  check("with no request left to answer", stray.length === 0, stray.length);

  const [second] = await q(Am, `select * from public.create_chapter_invite($1, 'Round two', null, '{}', array[$2]::uuid[])`, [uc, Za]);
  const [{ respond_chapter_invite: declined }] = await q(Za, `select public.respond_chapter_invite($1, false)`, [second.token]);
  const waiting = await q(Za, `select * from public.my_chapter_invitations()`);
  check("declining clears it quietly", declined === "declined" && waiting.length === 0, { declined, waiting });

  // Full on Free: the Space limit still applies to invitations.
  await su(`update public.subscriptions set status = 'none', trial_ends_at = null, current_period_end = null where user_id = $1`, [St]);
  for (const [slug, phase] of [
    ["health", "Starting over"],
    ["creative", "Mid-project"],
    ["learning", "Day one"],
  ]) {
    await su(`insert into public.user_chapters (user_id, chapter_slug, phase) values ($1, $2, $3)`, [St, slug, phase]);
  }
  await fails("a full Free member hits the Space limit", St, `select public.respond_chapter_invite($1, true, 'Starting over')`, [invite.token], "4 chapters");
});

await step("chapter groups: pass gate and outcomes", async () => {
  const Ad = await person("Adah", [{ slug: "career", phase: "Starting over" }]);
  const Rq = await person("Req", [{ slug: "career", phase: "Growing a team" }]);
  await su(`update public.subscriptions set status = 'none', trial_ends_at = null, current_period_end = null where user_id = any($1)`, [[Ad, Rq]]);
  await fails("Free can't start a group", Ad, `insert into public.groups (title) values ('Founders')`, [], "Season Pass");
  const [{ id: g }] = await withPass(Ad, () => q(Ad, `insert into public.groups (title) values ('Founders') returning id`));
  const [{ id: r1 }] = await q(Rq, `insert into public.group_join_requests (group_id) values ($1) returning id`, [g]);
  const [pending] = await q(Ad, `select * from public.admin_pending_requests()`);
  check("admin mode counts waiting requests", pending?.group_id === g && pending.pending === 1, pending);
  await q(Ad, `select public.review_join_request($1, false)`, [r1]);
  let [{ group_request_outcome: outcome }] = await q(Rq, `select public.group_request_outcome($1)`, [g]);
  check("a Free admin still reviews, and the requester learns it was declined", outcome === "declined", outcome);
  await q(Rq, `select public.acknowledge_group_request($1)`, [g]);
  [{ group_request_outcome: outcome }] = await q(Rq, `select public.group_request_outcome($1)`, [g]);
  check("once", outcome === null, outcome);
  const [{ id: r2 }] = await q(Rq, `insert into public.group_join_requests (group_id) values ($1) returning id`, [g]);
  await q(Ad, `select public.review_join_request($1, true)`, [r2]);
  [{ group_request_outcome: outcome }] = await q(Rq, `select public.group_request_outcome($1)`, [g]);
  check("and that a new request was accepted", outcome === "approved", outcome);
});

await step("open grouv: no monthly limit", async () => {
  const Og = await person("Ogo", [{ slug: "career", phase: "Starting over" }]);
  for (const body of ["First", "Second", "Third"]) {
    await q(Og, `insert into public.posts (chapter_slug, body, open_grove) values ('career', $1, true)`, [body]);
  }
  const [{ n }] = await q(Og, `select count(*)::int as n from public.posts where author_id = $1 and open_grove`, [Og]);
  check("open grouv on every post in the same space", n === 3, n);
  const [{ open_grove_available: still }] = await q(Og, `select public.open_grove_available('career')`);
  check("open grouv stays available", still === true, still);
  const [{ open_grove_available: other }] = await q(Og, `select public.open_grove_available('wealth')`);
  check("but only in spaces you hold", other === false, other);
  await fails(
    "open grouv posts are still named",
    Og,
    `insert into public.posts (chapter_slug, body, open_grove, is_anonymous) values ('career', 'x', true, true)`,
    [],
    "posts_open_grove_is_named",
  );
});

await step("chapter groups: everyone holding the Space sees the group", async () => {
  // Two accounts in Career + Wealth; one starts a Wealth group (approval, the default).
  const spaces = [
    { slug: "career", phase: "Starting over" },
    { slug: "wealth", phase: "Learning the basics" },
  ];
  const Ro = await person("Rox", spaces);
  const Sa = await person("Sal", spaces);
  const Ty = await person("Tyr", [{ slug: "health", phase: "Starting over" }]);
  const [{ id: g }] = await withPass(Ro, () =>
    q(Ro, `insert into public.groups (title, label, chapter_slug) values ('Rebuilding My Finances', 'The Reset', 'wealth') returning id`),
  );
  const ids = async (uid) => (await q(uid, `select id from public.group_cards(null, null, true, 20)`)).map((r) => r.id);
  check("the other account in the Space is offered it", (await ids(Sa)).includes(g), await ids(Sa));
  check("its creator still sees it in the rail", (await ids(Ro)).includes(g), await ids(Ro));
  await q(Sa, `insert into public.group_join_requests (group_id) values ($1)`, [g]);
  check("asking to join doesn't hide it", (await ids(Sa)).includes(g), await ids(Sa));
  check("someone outside the Space isn't offered it", !(await ids(Ty)).includes(g), await ids(Ty));
  const [{ id: anySpace }] = await withPass(Ro, () =>
    q(Ro, `insert into public.groups (title) values ('Any space circle') returning id`),
  );
  check("an Any-space group is offered to everyone", (await ids(Ty)).includes(anySpace), await ids(Ty));

  const [card] = await q(Sa, `select art, color from public.group_cards(null, null, true) where id = $1`, [g]);
  check("cards carry art and a solid colour", card?.art === "sprout" && /^#[0-9A-F]{6}$/i.test(card?.color), card);
  await q(Ro, `update public.groups set art = 'piggy-bank', color = '#2BB3A3' where id = $1`, [g]);
  const [after] = await su(`select art, color from public.groups where id = $1`, [g]);
  check("admins change the look", after.art === "piggy-bank" && after.color === "#2BB3A3", after);
  await q(Sa, `update public.groups set art = 'plane' where id = $1`, [g]);
  const [still] = await su(`select art from public.groups where id = $1`, [g]);
  check("non-admins can't", still.art === "piggy-bank", still);
  await withPass(Ro, () =>
    fails("unknown art rejected", Ro, `insert into public.groups (title, art) values ('x', 'unicorn')`, [], "check"),
  );
});

await step("profile banner", async () => {
  const Ub = await person("Ubi", [{ slug: "career", phase: "Starting over" }]);
  await q(Ub, `update public.profiles set banner = 'art:career-desk' where id = $1`, [Ub]);
  const [{ banner }] = await su(`select banner from public.profiles where id = $1`, [Ub]);
  check("banner saved", banner === "art:career-desk", banner);
  await fails("banner must be a key", Ub, `update public.profiles set banner = 'https://x/y.png' where id = $1`, [Ub], "check");
});

await step("pending requests carry the introduction; Bond Log photos", async () => {
  const career = [{ slug: "career", phase: "Side hustle, building something" }];
  const Pa = await person("Pia", career);
  const Pb = await person("Pax", career);
  const Pc = await person("Pru", career);
  await q(Pc, `select * from public.introduce_yourself($1, 'Hey Pia, I''m Pru. How''s it coming?', 'Ask how side hustle is going')`, [Pa]);
  await q(Pb, `select public.request_connection($1)`, [Pa]);
  const pending = await q(Pa, `select user_id, message, prompt from public.pending_requests()`);
  const fromPc = pending.find((p) => p.user_id === Pc);
  const fromPb = pending.find((p) => p.user_id === Pb);
  check(
    "a pending introduction shows its note and starter prompt",
    fromPc?.message?.startsWith("Hey Pia") && fromPc?.prompt === "Ask how side hustle is going",
    pending,
  );
  check("a plain request has no note", fromPb && fromPb.message === null && fromPb.prompt === null, pending);

  await q(Pa, `select public.request_connection($1)`, [Pb]);
  await su(`update public.subscriptions set status = 'active' where user_id in ($1, $2)`, [Pa, Pb]);
  const [{ invite_to_bond: bond }] = await q(Pa, `select public.invite_to_bond($1, 'Ship the thing')`, [Pb]);
  await q(Pb, `select public.respond_to_bond_invite($1, true)`, [bond]);
  const [weekly] = await su(`select id from public.bond_activities where bond_id = $1 and kind = 'weekly'`, [bond]);

  await fails("nothing to save", Pa, `select public.save_bond_response($1, 1, ' ', false, null)`, [weekly.id], "add a photo");
  await fails("only your own uploads", Pa, `select public.save_bond_response($1, 1, 'x', false, $2)`, [weekly.id, `${Pb}/log-a.jpg`], "can't be used");
  await q(Pa, `select public.save_bond_response($1, 1, 'Late night build', false, $2)`, [weekly.id, `${Pa}/log-a.jpg`]);
  let [mine] = await q(Pa, `select * from public.bond_log($1)`, [bond]);
  check("your draft keeps its photo", mine?.my_saved && mine.my_photo_path === `${Pa}/log-a.jpg` && !mine.my_shared, mine);
  let [theirs] = await q(Pb, `select * from public.bond_log($1)`, [bond]);
  check("a draft's photo stays private", theirs?.their_photo_path === null && theirs?.their_body === null, theirs);

  await q(Pa, `select public.save_bond_response($1, 1, '', true, $2)`, [weekly.id, `${Pa}/log-b.jpg`]);
  [theirs] = await q(Pb, `select * from public.bond_log($1)`, [bond]);
  check(
    "a photo-only response reaches them once shared",
    theirs?.their_shared && theirs.their_photo_path === `${Pa}/log-b.jpg` && theirs.their_body === null,
    theirs,
  );
  [mine] = await q(Pb, `select my_saved from public.bond_log($1)`, [bond]);
  check("nothing saved reads as nothing saved", mine?.my_saved === false, mine);
  const old = await q(Pb, `select public.save_bond_response($1, 1, 'Words only', true)`, [weekly.id]);
  check("words alone still work", old.length === 1);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log(`  ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
