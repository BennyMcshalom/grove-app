/**
 * Feature guides: one short explanation per place in the app, from the
 * product team's guide (Google Doc "Where it appears / What the modal should
 * clarify / Sample text", 2026-10-27). <FeatureGuide id=…> shows them.
 */
export const GUIDES = {
  "chapter-today": {
    place: "Your chapter today",
    title: "A little clarity for today",
    body: "See what’s happening in your chapter, who has reached out, and what you might want to do next. It’s a daily snapshot, not another place to post.",
  },
  "just-grouv": {
    place: "Just Grouv",
    title: "Share the moment you’re in",
    body: "Post a thought, photo or update without having to turn it into a big life story. Root a thought when it belongs to your chapter; Just Grouv is for the everyday.",
  },
  spaces: {
    place: "My Spaces",
    title: "Make room for every part of your life",
    body: "Career, relationships and the other Spaces help organize your journey. Start a chapter when there’s a specific story you want to follow.",
  },
  "chapter-invitation": {
    place: "Chapter invitations",
    title: "Walk alongside {name}’s chapter",
    body: "You’ll see what {name} chooses to share and can support their progress. Accepting won’t create a second chapter for you.",
  },
  "people-discovery": {
    place: "People suggestions",
    title: "Meet people who understand this season",
    body: "These suggestions are based on the chapter and intentions you’ve shared. You choose whom to approach.",
  },
  bonds: {
    place: "Bonds",
    title: "Make this connection more intentional",
    body: "If you both agree, you can check in and reflect together. Either person can end the Bond.",
  },
  log: {
    place: "Grouv Log",
    title: "Your story, your audience",
    body: "Keep an entry private, or choose whether your Bonds, your Circle or everyone can see it. Check the audience before you save.",
  },
  wrapped: {
    place: "Life Wrapped",
    title: "See the story taking shape",
    body: "Wrapped gathers moments you’ve saved into a recap. Review it first; sharing is always your choice.",
  },
  archive: {
    place: "Archive",
    title: "A chapter can end without disappearing",
    body: "Your finished chapters and the memories in them remain here for you to revisit.",
  },
  nearby: {
    place: "Nearby",
    title: "Be visible only when you choose",
    body: "Turn Nearby on to find people around you. It only runs while this page is open and turns off the moment you leave. People see a rough distance, never your exact location.",
  },
  "groups-events": {
    place: "Groups and events",
    title: "Find your people in different ways",
    body: "Join a chapter group for continuing conversation, or attend an event to meet around a particular moment or activity.",
  },
  "deep-focus": {
    place: "Deep Focus",
    title: "Take a break without losing your place",
    body: "Choose how long to step away from Grouv. You can return whenever you’re ready.",
  },
} as const satisfies Record<string, { place: string; title: string; body: string }>;

export type GuideId = keyof typeof GUIDES;

export const isGuideId = (value: unknown): value is GuideId => typeof value === "string" && value in GUIDES;
