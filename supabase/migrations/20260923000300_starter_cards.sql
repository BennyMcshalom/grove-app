-- A STARTER set of Curio and Wander cards and the Wander adjacency graph, so
-- the morning slot isn't empty on day one. Placeholder editorial: replace and
-- grow it (content_cards rows, private.wander_adjacency rows) as the real
-- catalogue lands. With four Curio cards per space and the 60-day rule, a
-- person sees each space's set within four days and then gets an empty slot
-- until more are added — by design, the engine never repeats early.

insert into public.content_cards (kind, chapter_slug, topic_cluster, title, body) values
  ('curio', 'career', 'career-small-bets', 'Small bets', 'Most career pivots start as side experiments, not leaps. What''s the smallest version of the next thing you could try this week?'),
  ('curio', 'career', 'career-weak-ties', 'Weak ties', 'People often hear about new work through acquaintances rather than close friends, because acquaintances move in different circles.'),
  ('curio', 'career', 'career-deep-work', 'One protected hour', 'An hour with notifications off tends to produce more than a scattered afternoon. Where could yours go tomorrow?'),
  ('curio', 'career', 'career-rest', 'Rest is part of the work', 'Burnout usually comes from long stretches without recovery, not from one hard week. Recovery is worth scheduling like a meeting.'),

  ('curio', 'spiritual', 'spiritual-attention', 'Attention as practice', 'Many traditions treat simple attention — to breath, to a word, to a moment — as the heart of practice rather than a step toward it.'),
  ('curio', 'spiritual', 'spiritual-dry-seasons', 'Dry seasons', 'Writers across traditions describe long stretches where practice feels empty, and treat them as part of the path rather than a failure.'),
  ('curio', 'spiritual', 'spiritual-gratitude', 'Three things', 'Naming three specific things you''re grateful for, a few evenings a week, is one of the most studied small practices there is.'),
  ('curio', 'spiritual', 'spiritual-silence', 'A little silence', 'Even a few minutes without input — no music, no scrolling — gives the mind room to settle. Try it before your first message today.'),

  ('curio', 'wealth', 'wealth-emergency-fund', 'The first cushion', 'A small emergency fund, even one month of essentials, changes how every other money decision feels.'),
  ('curio', 'wealth', 'wealth-compounding', 'Slow and boring', 'Compound growth is mostly time. Starting small and early usually beats starting large and late.'),
  ('curio', 'wealth', 'wealth-spending-values', 'Spend on purpose', 'Looking at a month of spending and asking "did this matter to me?" often finds money faster than a strict budget.'),
  ('curio', 'wealth', 'wealth-debt-order', 'Which debt first', 'Paying the highest-interest debt first saves the most; paying the smallest first builds momentum. Both work if you keep going.'),

  ('curio', 'adventure', 'adventure-slow-travel', 'Stay longer', 'Staying longer in fewer places tends to cost less and let you meet more people than moving every day or two.'),
  ('curio', 'adventure', 'adventure-local', 'Adventure nearby', 'There is usually somewhere within a day''s reach you''ve never been. Novelty doesn''t need a passport.'),
  ('curio', 'adventure', 'adventure-coming-home', 'Coming back', 'Returning from a long trip can feel stranger than leaving. Many travellers find it helps to keep one new habit from the road.'),
  ('curio', 'adventure', 'adventure-packing', 'Pack half', 'A common travel rule: lay out what you''ll bring, then take half. You rarely miss what you left.'),

  ('curio', 'health', 'health-sleep', 'Same time, most days', 'A steady wake-up time does more for sleep than almost anything else, weekends included.'),
  ('curio', 'health', 'health-walking', 'Walk after eating', 'A short walk after a meal is one of the simplest habits linked to steadier energy through the day.'),
  ('curio', 'health', 'health-habits', 'Make it tiny', 'New habits stick better when they''re almost too small to skip. Two push-ups counts. So does one glass of water.'),
  ('curio', 'health', 'health-recovery', 'Recovery isn''t a line', 'Recovery of almost any kind tends to go forward, back, and forward again. A bad week isn''t a reset.'),

  ('curio', 'creative', 'creative-quantity', 'Make more, judge later', 'Many artists find quality comes out of quantity. Finishing lots of small things teaches more than polishing one.'),
  ('curio', 'creative', 'creative-block', 'When it''s stuck', 'Changing the medium, the place or the time of day is a classic way through a creative block.'),
  ('curio', 'creative', 'creative-constraints', 'Limits help', 'A constraint — one colour, ten minutes, a hundred words — often makes starting easier, not harder.'),
  ('curio', 'creative', 'creative-sharing', 'Show your work', 'Sharing something unfinished with one person you trust is often gentler than waiting for it to be perfect.'),

  ('curio', 'learning', 'learning-spacing', 'Spaced repetition', 'Reviewing something just before you''d forget it — a day later, then a few days, then a week — makes it last far longer.'),
  ('curio', 'learning', 'learning-retrieval', 'Test yourself', 'Trying to recall something from memory strengthens it more than re-reading it does.'),
  ('curio', 'learning', 'learning-teaching', 'Teach it back', 'Explaining an idea to someone else quickly shows you which parts you actually understand.'),
  ('curio', 'learning', 'learning-plateaus', 'Plateaus are normal', 'Progress in a new skill often comes in steps with flat stretches between. The flat part is where it settles in.'),

  ('curio', 'relationships', 'relationships-listening', 'Listen to understand', 'Repeating back what you heard before you respond is a small habit that changes a lot of conversations.'),
  ('curio', 'relationships', 'relationships-repair', 'Repair matters most', 'Close relationships aren''t the ones without conflict; they''re the ones where people come back and repair.'),
  ('curio', 'relationships', 'relationships-alone', 'Alone isn''t lonely', 'Time alone, chosen, can be restoring. Loneliness is about connection you want and don''t have.'),
  ('curio', 'relationships', 'relationships-rituals', 'Small rituals', 'Tiny shared rituals — a weekly call, a morning message — keep people close more than rare big gestures.'),

  ('wander', null, 'birdsong', 'The dawn chorus', 'Birds sing most at first light, partly because sound carries further in the cool, still air of early morning.'),
  ('wander', null, 'mycelium', 'Underground networks', 'Fungal threads in the soil link the roots of many plants, moving water and nutrients between them.'),
  ('wander', null, 'maps', 'Every map leaves things out', 'Every map is a choice about what to leave out. A subway map ignores distance so you can see the connections.'),
  ('wander', null, 'tides', 'Why tides', 'Most coasts get two high tides a day, pulled by the Moon and, a little less, by the Sun.'),
  ('wander', null, 'kintsugi', 'Kintsugi', 'In the Japanese craft of kintsugi, broken pottery is mended with gold, so the repair becomes part of its story.'),
  ('wander', null, 'languages', 'Untranslatable words', 'Many languages have a word for a feeling other languages need a whole sentence to explain.'),
  ('wander', null, 'stars', 'Old light', 'The light from many stars you can see tonight left them hundreds of years ago.'),
  ('wander', null, 'bread', 'Sourdough starters', 'A sourdough starter is a living culture of wild yeast and bacteria; some bakeries keep theirs going for decades.'),
  ('wander', null, 'octopus', 'A distributed mind', 'Most of an octopus''s neurons are in its arms, which can respond to touch and taste on their own.'),
  ('wander', null, 'architecture', 'Desire paths', 'The worn trails people make across grass, where no path was planned, are called desire paths.'),
  ('wander', null, 'music', 'Why songs get stuck', 'Songs that get stuck in your head often have simple, repetitive melodies with a small surprise.'),
  ('wander', null, 'forests', 'Forest bathing', 'Time spent slowly among trees — shinrin-yoku in Japan — is linked to lower stress in several studies.');

-- One step sideways from each space.
insert into private.wander_adjacency (chapter_slug, topic_cluster) values
  ('career', 'maps'), ('career', 'architecture'), ('career', 'octopus'),
  ('spiritual', 'stars'), ('spiritual', 'forests'), ('spiritual', 'birdsong'),
  ('wealth', 'bread'), ('wealth', 'mycelium'), ('wealth', 'tides'),
  ('adventure', 'maps'), ('adventure', 'tides'), ('adventure', 'languages'),
  ('health', 'forests'), ('health', 'birdsong'), ('health', 'bread'),
  ('creative', 'kintsugi'), ('creative', 'music'), ('creative', 'architecture'),
  ('learning', 'octopus'), ('learning', 'languages'), ('learning', 'stars'),
  ('relationships', 'mycelium'), ('relationships', 'kintsugi'), ('relationships', 'music');
