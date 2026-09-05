/**
 * Chapter data — Figma "Onboarding 1" (36:858) for the cards, and
 * "Onboarding 1-1" … "1-8" (48:945 … 52:1412) for each chapter's options.
 *
 * Those eight Figma frames are one screen with different content, so they are
 * one route here (/onboarding/spaces/[chapter]) driven by this table.
 */
export interface Chapter {
  slug: string;
  name: string;
  tagline: string;
  /** Pastel circle behind the icon, straight from the Figma fill. */
  tint: string;
  icon: string;
  /** Options for the "<Chapter>, where are you?" step. */
  options: string[];
}

export const CHAPTERS: Chapter[] = [
  {
    slug: "career",
    name: "Career",
    tagline: "Work, ambition, pivots",
    tint: "#FBD3B9",
    icon: "/icons/chapters/career.svg",
    options: [
      "First job, figuring it out",
      "Side hustle, building something",
      "Career pivot in progress",
      "Building a business (early)",
      "Freelance / consulting",
      "Growing a team",
      "Burned out, searching",
      "Starting over",
    ],
  },
  {
    slug: "spiritual",
    name: "Spiritual",
    tagline: "Faith, purpose, inner growth",
    tint: "#E2F6F9",
    icon: "/icons/chapters/spiritual.svg",
    options: [
      "Newly questioning",
      "Deepening a practice",
      "In a dry season",
      "Returning after a while",
      "Building a discipline",
      "Holding doubt and faith",
    ],
  },
  {
    slug: "wealth",
    name: "Wealth",
    tagline: "Money, freedom, financial growth",
    tint: "#DCFCE7",
    icon: "/icons/chapters/wealth.svg",
    options: [
      "Getting out of debt",
      "Building a first cushion",
      "Investing seriously",
      "Saving for something big",
      "Rebuilding after a loss",
      "Learning the basics",
    ],
  },
  {
    slug: "adventure",
    name: "Adventure",
    tagline: "Travel, risk, new experiences",
    tint: "#B9E5FB",
    icon: "/icons/chapters/adventure.svg",
    options: [
      "Planning the leap",
      "On the road now",
      "Back, integrating it",
      "Saving for the next one",
      "First solo trip",
      "Relocating somewhere new",
    ],
  },
  {
    slug: "health",
    name: "Health",
    tagline: "Body, mind, wellbeing",
    tint: "#FBF3B9",
    icon: "/icons/chapters/health.svg",
    options: [
      "Starting over",
      "Deep in recovery",
      "Building a habit",
      "Managing something chronic",
      "Training for something",
      "Listening to my body",
    ],
  },
  {
    slug: "creative",
    name: "Creative",
    tagline: "Making, expressing, building",
    tint: "#E9D4FB",
    icon: "/icons/chapters/creative.svg",
    options: [
      "Finding the spark",
      "Mid-project",
      "Sharing for the first time",
      "Creative block",
      "Going pro",
      "Making just for me",
    ],
  },
  {
    slug: "learning",
    name: "Learning",
    tagline: "Study, growth, new skills",
    tint: "#E6FAE6",
    icon: "/icons/chapters/learning.svg",
    options: [
      "Day one",
      "In the thick of study",
      "Almost certified",
      "Self-teaching",
      "Changing fields",
      "Relearning the basics",
    ],
  },
  {
    slug: "relationships",
    name: "Relationships",
    tagline: "Love, friendship, family",
    tint: "#FCD8EA",
    icon: "/icons/chapters/relationships.svg",
    options: [
      "Newly single",
      "Building something new",
      "Working on it",
      "Early parenthood",
      "Caring for family",
      "Learning to be alone",
    ],
  },
];

/** Figma's "You can only hold 4 chapters at once". */
export const MAX_CHAPTERS = 4;

export function getChapter(slug: string): Chapter | undefined {
  return CHAPTERS.find((c) => c.slug === slug);
}
