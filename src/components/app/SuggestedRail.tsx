import Link from "next/link";
import {
  ChapterGroupCard,
  GROUP_GRADIENT,
} from "@/components/app/ChapterGroupCard";

/**
 * SUGGESTED FOR YOUR CHAPTER — Figma frame 575:17911 (the My Group right rail).
 *
 * A 396px column of gradient cards: the first takes the warm orange wash, the
 * rest the pink one. Titles and blurbs are Figma's.
 */
const SUGGESTED = [
  { title: "Relocating solo", blurb: "Starting fresh somewhere new" },
  { title: "First tech Job", blurb: "Starting with no blueprint" },
  { title: "First tech Job", blurb: "Starting with no blueprint" },
  { title: "First tech Job", blurb: "Starting with no blueprint" },
  { title: "First tech Job", blurb: "Starting with no blueprint" },
  { title: "First tech Job", blurb: "Starting with no blueprint" },
];

export function SuggestedRail() {
  return (
    <aside className="hidden w-[396px] shrink-0 overflow-y-auto bg-white px-8 py-6 xl:block">
      <div className="flex flex-col gap-5">
        <header className="flex items-center justify-between gap-4">
          <h2 className="font-sans text-base font-medium text-ink-600">
            SUGGESTED FOR YOUR CHAPTER
          </h2>
          <Link
            href="/groups"
            className="shrink-0 font-sans text-sm font-medium text-primary-500 hover:underline"
          >
            See all
          </Link>
        </header>

        <ul className="flex flex-col gap-4">
          {SUGGESTED.map((item, i) => (
            <li key={`${item.title}-${i}`}>
              <ChapterGroupCard
                title={item.title}
                blurb={item.blurb}
                gradient={i === 0 ? GROUP_GRADIENT.orange : GROUP_GRADIENT.pink}
              />
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
