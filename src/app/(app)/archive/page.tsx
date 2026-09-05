import Image from "next/image";
import Link from "next/link";
import { TopBar } from "@/components/app/TopBar";
import { RightRail } from "@/components/app/RightRail";
import { getChapter } from "@/lib/chapters";

/**
 * Archive — Figma frame 296:11158.
 *
 * Closed chapters as 190px cards: chapter icon and name, the span and its
 * duration, the phases you moved through as chips, the people who were there,
 * and a "Read Log" action. Copy is Figma's (frame 368:10539).
 */
const CLOSED = [
  {
    slug: "career",
    name: "Career",
    span: "March 2024 - November 2024",
    duration: "8 Months",
    phases: ["Side Hustle", "Career pivot in progress", "Starting over"],
  },
  {
    slug: "relationships",
    name: "Relationship",
    span: "March 2024 - November 2024",
    duration: "8 Months",
    phases: ["Growing together", "Learning to love differently"],
  },
];

const MEMBERS = [
  "/images/people/m1.png",
  "/images/people/m2.png",
  "/images/people/m3.png",
  "/images/people/m4.png",
];

export default function ArchivePage() {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar title="Archive" />

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8">
          <ul className="mx-auto flex w-full max-w-[724px] flex-col gap-4 pb-10">
            {CLOSED.map((chapter) => {
              const meta = getChapter(chapter.slug);
              return (
                <li
                  key={chapter.slug}
                  className="flex flex-col gap-4 rounded-lg bg-white p-4 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)]"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      {meta && (
                        <Image
                          src={meta.icon}
                          alt=""
                          width={56}
                          height={56}
                          className="size-9 shrink-0"
                        />
                      )}
                      <div className="flex flex-col">
                        <span className="font-sans text-lg font-semibold text-ink-800">
                          {chapter.name}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-sans text-xs text-ink-400">
                            {chapter.span}
                          </span>
                          <span className="size-1.5 rounded-full bg-primary-500" />
                          <span className="font-sans text-xs text-ink-400">
                            {chapter.duration}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {chapter.phases.map((phase) => (
                        <span
                          key={phase}
                          className="rounded-full bg-ivory-500 px-2 py-1 font-sans text-xs font-medium text-ink-400"
                        >
                          {phase}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="flex">
                        {MEMBERS.map((src, i) => (
                          <span
                            key={src}
                            className="relative size-6 overflow-hidden rounded-full border-2 border-white"
                            style={{ marginLeft: i === 0 ? 0 : -6 }}
                          >
                            <Image
                              src={src}
                              alt=""
                              fill
                              sizes="24px"
                              className="object-cover"
                            />
                          </span>
                        ))}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/archive/${chapter.slug}`}
                    className="flex w-full items-center gap-2 rounded-full px-3 py-1.5 font-ui text-xs text-primary-600 transition-colors hover:bg-primary-50"
                  >
                    Read Log
                    <ArrowIcon />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <RightRail />
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
      <path
        d="M3 8h9m0 0-3.5-3.5M12 8l-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
