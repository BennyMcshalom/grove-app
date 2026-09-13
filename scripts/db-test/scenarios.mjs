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
await fails("onboarding needs 1-4 chapters", D, `select public.complete_onboarding('[]'::jsonb)`, [], "between 1 and 4");

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
  check("B (career) sees anon career post only", bSees.length === 1 && bSees[0].id === anonPost, bSees);
  check("anon author hidden even if client forged it", bSees[0]?.author_id === null, bSees[0]);
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

await step("roots and comments", async () => {
  await q(B, `insert into public.post_roots (post_id, user_id) values ($1, $2)`, [anonPost, B]);
  await q(B, `insert into public.comments (post_id, body) values ($1, 'hi')`, [anonPost]);
  const [p] = await su(`select roots_count, comments_count from public.posts where id = $1`, [anonPost]);
  check("counts bumped", p.roots_count === 1 && p.comments_count === 1, p);
  const notes = await q(A, `select kind, actor_id from public.notifications order by created_at`);
  check("A notified of root + comment", notes.map((n) => n.kind).join() === "post_rooted,post_commented", notes);
  const bNotes = await q(B, `select * from public.notifications`);
  check("B can't see A's notifications", bNotes.length === 0);
});

// --- circle & bonds ---------------------------------------------------------------
await step("connections", async () => {
  const [req] = await q(C, `select * from public.request_connection($1)`, [A]);
  check("request pending", req.status === "pending");
  const aNotes = await q(A, `select kind from public.notifications where kind = 'connection_request'`);
  check("A notified of request", aNotes.length === 1);
  // A "connects" back → accepts the crossing request.
  const [acc] = await q(A, `select * from public.request_connection($1)`, [C]);
  check("crossing request accepts", acc.status === "accepted", acc);
  const cSees = await q(C, `select id, author_id from public.posts`);
  check("circle sees named post but not anon one", cSees.length === 1 && cSees[0].id === namedHealthPost, cSees);
  const prompts = await q(C, `select * from public.profile_prompts where user_id = $1`, [A]);
  check("circle can't read bond-only prompts", prompts.length === 0);
});
await fails("can't forge accepted connection", B, `insert into public.connections (requester_id, addressee_id, status) values ($1, $2, 'accepted')`, [B, A], "row-level security");

let bondId;
await step("bonds", async () => {
  [{ id: bondId }] = await q(A, `select * from public.invite_bond($1, 'career')`, [C]);
  await q(C, `select public.respond_to_bond($1, true)`, [bondId]);
  const prompts = await q(C, `select * from public.profile_prompts where user_id = $1`, [A]);
  check("bond reads prompts", prompts.length === 1);
});

// --- messaging -----------------------------------------------------------------
let namedCareerPost;
await step("feed reads", async () => {
  [{ id: namedCareerPost }] = await q(
    A,
    `insert into public.posts (chapter_slug, title, body, progress) values ('career', 'Named in career', 'Honest', 'almost_done') returning id`,
  );
  const bAll = await q(B, `select * from public.feed_posts('all')`);
  check("B's feed has both career posts", bAll.length === 2, bAll.map((p) => p.title));
  const anonRow = bAll.find((p) => p.id === anonPost);
  check("anonymous rows carry no author", anonRow?.author_id === null && anonRow?.author_name === null, anonRow);
  check("rooted and is_mine are per viewer", anonRow?.rooted === true && anonRow?.is_mine === false, anonRow);

  const bRoots = await q(B, `select id from public.feed_posts('roots', 'career')`);
  check("roots: anonymous in, non-circle named out", bRoots.length === 1 && bRoots[0].id === anonPost, bRoots);

  const openBefore = await q(B, `select id from public.feed_posts('open', 'career')`);
  check("open: other stages hidden", openBefore.length === 0, openBefore);
  await q(B, `update public.user_chapters set phase = 'Growing a team' where user_id = $1 and chapter_slug = 'career'`, [B]);
  const openAfter = await q(B, `select id, author_phase from public.feed_posts('open', 'career')`);
  check(
    "open: same stage outside circle shown",
    openAfter.length === 1 && openAfter[0].id === namedCareerPost && openAfter[0].author_phase === "Growing a team",
    openAfter,
  );

  const mine = await q(A, `select id, is_mine from public.feed_posts('mine')`);
  check("mine includes anonymous posts", mine.length === 3 && mine.every((p) => p.is_mine), mine);

  const cAll = await q(C, `select id, author_name from public.feed_posts('all')`);
  check("circle sees named posts with their author", cAll.length === 2 && cAll.every((p) => p.author_name === "Ada"), cAll);

  const [newest] = bAll;
  const page2 = await q(B, `select id from public.feed_posts('all', null, null, null, $1, $2)`, [newest.created_at, newest.id]);
  check("cursor pages past the first row", page2.length === 1 && page2[0].id !== newest.id, page2);

  const members = await q(B, `select * from public.space_members('career')`);
  check(
    "space members list others with circle flag",
    members.length === 1 && members[0].user_id === A && members[0].in_circle === false,
    members,
  );

  await q(A, `insert into public.space_questions (chapter_slug, body) values ('career', 'How do you keep going?')`);
  const [bq] = await q(B, `select * from public.live_space_questions('career')`);
  const [aq] = await q(A, `select * from public.live_space_questions('career')`);
  check("questions mark the asker only", bq?.is_mine === false && aq?.is_mine === true, { bq, aq });
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
  check("depth stays between 0 and 100", row?.depth >= 0 && row?.depth <= 100, row?.depth);

  await q(A, `update public.conversation_members set last_read_at = now() where conversation_id = $1 and user_id = $2`, [dm, A]);
  const [afterRead] = await q(A, `select unread_count from public.bonds_overview()`);
  check("reading clears unread", afterRead?.unread_count === 0, afterRead);

  const [cRow] = await q(C, `select * from public.bonds_overview()`);
  check("sender sees their own last message", cRow?.user_id === A && cRow?.last_message_from_me === true, cRow);

  // D joins A in Wealth and connects with C, so C is a mutual for A.
  await q(D, `insert into public.user_chapters (user_id, chapter_slug, phase) values ($1, 'wealth', 'Learning the basics')`, [D]);
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
  await q(D, `select public.invite_bond($1)`, [A]);
  const pending = await q(A, `select kind, user_id from public.pending_requests()`);
  check(
    "pending lists connection requests and bond invites",
    pending.some((p) => p.kind === "connection" && p.user_id === B) &&
      pending.some((p) => p.kind === "bond" && p.user_id === D),
    pending,
  );
  const afterRequests = await q(A, `select user_id from public.people_you_may_know()`);
  check("people with pending requests drop out of suggestions", afterRequests.length === 0, afterRequests);
});

let group, groupConv;
await step("groups", async () => {
  [{ id: group, conversation_id: groupConv }] = await q(
    A,
    `insert into public.groups (title, label, description, icon, color, chapter_slug) values ('First-time Founder!', 'First 1000 days', 'desc', 'suitcase', '#FED1DD', 'career') returning id, conversation_id, slug`,
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
await fails("bad group color rejected", A, `insert into public.groups (title, color) values ('x', '#000000')`, [], "check");

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
  check("career bond released", bond.status === "released", bond);
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
  check("member faces come from profiles", health?.member_avatars?.[0] === "https://x/ada.png", health);
  const [{ id: uc }] = await su(
    `select id from public.user_chapters where user_id = $1 and chapter_slug = 'career' and status = 'closed'`,
    [A],
  );
  const [t] = await q(A, `select * from public.chapter_tallies($1)`, [uc]);
  check("tallies count anonymous posts and log moments", t.post_count === 2 && t.log_count === 1, t);
  await fails("tallies are owner-only", B, `select * from public.chapter_tallies($1)`, [uc], "not found");
});

await step("post permalinks", async () => {
  const one = await q(B, `select id from public.feed_posts('all', null, null, null, null, null, 20, $1)`, [anonPost]);
  check("feed_posts narrows to one post", one.length === 1 && one[0].id === anonPost, one);
  const hidden = await q(C, `select id from public.feed_posts('all', null, null, null, null, null, 20, $1)`, [anonPost]);
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

  const [{ id: healthGroup }] = await q(
    C,
    `insert into public.groups (title, chapter_slug) values ('Recovery circle', 'health') returning id`,
  );
  const suggested = await q(A, `select slug from public.group_cards(null, null, true)`);
  check("suggests groups in the viewer's chapters", suggested.length === 1, suggested);

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
  await q(B, `insert into public.space_question_replies (question_id, body) values ($1, 'One day at a time')`, [question]);
  const [reply] = await q(A, `select * from public.question_replies($1)`, [question]);
  check("asker reads the reply without a name", reply?.body === "One day at a time" && reply?.is_mine === false, reply);
  const [own] = await q(B, `select * from public.question_replies($1)`, [question]);
  check("replier sees their own reply", own?.is_mine === true, own);
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

await step("delete account", async () => {
  await su(`delete from auth.users where id = $1`, [A]);
  const posts = await su(`select count(*)::int n from public.posts`);
  check("anonymous and named posts removed with account", posts[0].n === 0, posts[0].n);
  const owners = await su(`select count(*)::int n from private.content_owners where content_type = 'posts'`);
  check("ownership rows removed", owners[0].n === 0);
  const groups = await su(`select created_by from public.groups where id = $1`, [group]);
  check("group survives creator deletion", groups.length === 1 && groups[0].created_by === null);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
for (const f of failures) console.log(`  ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
