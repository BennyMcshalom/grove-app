// ── Local content library ─────────────────────────────────────────
export type CurioEntry = {
  kind: 'Curio' | 'Wander';
  read: string;
  seed: string;
  body: string[];
  quote: string;
};

export const CURIO_LIBRARY: Record<string, CurioEntry> = {
  'On the unglamorous middle': {
    kind: 'Curio', read: '2 min read', seed: 'curioMid',
    body: [
      'Most of any meaningful chapter is the middle, the long, unphotographed stretch between the decision and the result.',
      "It rarely feels like progress while you're in it. The beginning had adrenaline. The end will have a story. The middle has neither, just the same desk, the same doubt, the same small unglamorous act repeated past the point where it feels meaningful.",
      "But the middle is not a delay before the real thing. It is the real thing. The people who finish are simply the ones who stayed in the middle a little longer than felt reasonable.",
      "So if you are in the middle of something right now and it feels like nothing is happening: that flatness is not failure. It is the texture of the work. Stay.",
    ],
    quote: 'The middle is not a delay before the real thing. It is the real thing.',
  },
  'A letter to the one who quit': {
    kind: 'Curio', read: '3 min read', seed: 'curioQuit',
    body: [
      "You left the thing everyone envied. For a week, the relief was enormous. Then the relief ran out, and underneath it was a question you hadn't expected: who am I, without the thing that broke me?",
      "Here is what no one tells you about leaving well: the bravery isn't in the exit. It's in the empty months afterward, when no title answers the question \"so what do you do?\"",
      "You don't owe anyone a fast second act. The pause is not wasted time. It is the soil.",
    ],
    quote: "The bravery isn't in the exit. It's in the empty months afterward.",
  },
  'A cabin on the cold coast': {
    kind: 'Wander', read: 'Saved place', seed: 'wanderCabin',
    body: [
      'Somewhere on a coast where the season has already turned, there is a small cabin with a wood stove and a window that faces only weather.',
      "You saved this not because you will go tomorrow, but because something in you needed to know the option exists, that there is a version of your life with more silence in it.",
      "Keep it on the shelf. Some doors are worth leaving open just to feel the draft.",
    ],
    quote: "Some doors are worth leaving open just to feel the draft.",
  },
  'How to finish things': {
    kind: 'Curio', read: '2 min read', seed: 'curioFinish',
    body: [
      "Finishing is a different skill from starting, and almost no one teaches it.",
      "Starting rewards optimism. Finishing rewards a kind of stubborn, unglamorous loyalty to a past version of yourself who made a promise. The work near the end is rarely fun. It is mostly cleanup, doubt, and the temptation to start something shinier.",
      "The trick is to make the finish small enough that you can't talk yourself out of it. Not \"finish the book.\" Just \"fix this page.\" Then the next one.",
    ],
    quote: "Make the finish small enough that you can't talk yourself out of it.",
  },
};

export const DEFAULT_TITLE = 'On the unglamorous middle';

export function coverBg(seed: string) {
  const map: Record<string, string> = {
    curioMid:    'linear-gradient(160deg, #E8DDD2, #C4B5A5)',
    curioQuit:   'linear-gradient(160deg, #D2D8E0, #A8B8C8)',
    wanderCabin: 'linear-gradient(160deg, #D0DDD4, #A5BFB0)',
    curioFinish: 'linear-gradient(160deg, #E2D5C8, #C9B090)',
  };
  return map[seed] ?? 'linear-gradient(160deg, var(--surf-high), var(--border))';
}
