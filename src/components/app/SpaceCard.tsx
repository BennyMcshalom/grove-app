import Image from "next/image";
import { Button } from "@/components/ui/Button";
import type { Chapter } from "@/lib/chapters";

/** The four overlapping members shown on an open chapter card. */
const MEMBERS = [
  "/images/people/m1.png",
  "/images/people/m2.png",
  "/images/people/m3.png",
  "/images/people/m4.png",
];

/**
 * Open chapter card — Figma component 169:2314.
 *
 * Icon + chapter name, current status, an overlapping avatar group with the
 * member count, an "In progress" dot badge, then Open feed / Close chapter.
 */
export function OpenSpaceCard({
  chapter,
  status,
  members = 4,
  onClose,
}: {
  chapter: Chapter;
  status: string;
  members?: number;
  onClose?: () => void;
}) {
  return (
    <article className="flex flex-col justify-between gap-4 rounded-lg bg-white p-4 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)]">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ChapterIcon chapter={chapter} />
          <div className="flex flex-col">
            <span className="font-sans text-lg font-semibold text-ink-800">
              {chapter.name}
            </span>
            <span className="font-sans text-xs text-ink-400">{status}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="flex">
            {MEMBERS.map((src, i) => (
              <span
                key={src}
                className="relative size-6 overflow-hidden rounded-full border-2 border-white"
                style={{ marginLeft: i === 0 ? 0 : -6 }}
              >
                <Image src={src} alt="" fill sizes="24px" className="object-cover" />
              </span>
            ))}
          </span>
          <span className="font-sans text-xs text-ink-400">
            {members} in this space
          </span>
        </div>

        <span className="flex w-fit items-center gap-1 rounded-full bg-ivory-500 px-2 py-1">
          <span className="size-1.5 rounded-full bg-primary-600" />
          <span className="font-sans text-xs font-medium text-ink-400">
            In progress
          </span>
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <Button size="sm" fullWidth className="px-3 py-1.5 text-xs">
          Open feed
        </Button>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-full px-3 py-1.5 font-ui text-xs text-destructive-60 transition-colors hover:bg-destructive-5"
        >
          Close chapter
        </button>
      </div>
    </article>
  );
}

/**
 * Directory card — Figma frame 169:2081. Same shell, but a single "Join"
 * secondary button and no member row.
 */
export function DirectorySpaceCard({ chapter }: { chapter: Chapter }) {
  return (
    <article className="flex h-[142px] flex-col justify-between rounded-lg bg-white p-4 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)]">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ChapterIcon chapter={chapter} />
          <div className="flex flex-col">
            <span className="font-sans text-lg font-semibold text-ink-800">
              {chapter.name}
            </span>
            <span className="font-sans text-xs text-ink-400">
              {chapter.tagline}
            </span>
          </div>
        </div>
      </div>

      <Button variant="secondary" size="sm" fullWidth className="px-3 py-1.5 text-xs">
        Join
      </Button>
    </article>
  );
}

/** The tinted circle + chapter glyph used on both card types. */
function ChapterIcon({ chapter }: { chapter: Chapter }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full">
      <Image
        src={chapter.icon}
        alt=""
        width={56}
        height={56}
        className="size-9"
      />
    </span>
  );
}
