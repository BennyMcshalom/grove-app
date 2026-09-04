import Image from "next/image";

/**
 * Today's prompt card — Figma frame 249:12723.
 *
 * White card, 24px radius, a low centred shadow: chapter + day meta, the
 * 32px prompt in primary-600, a tappable input pill, and a primary-600 footer
 * strip flush to the card's bottom edge.
 */
export function LogPrompt({
  chapter = "Career",
  prompt = "What did you build today, even a little",
}: {
  chapter?: string;
  prompt?: string;
}) {
  return (
    <section className="flex w-full flex-col items-center gap-6 overflow-hidden rounded-3xl bg-white pt-6 shadow-[0px_0px_16px_0px_rgba(0,0,0,0.1)]">
      <div className="flex items-center gap-2 px-4">
        <span className="flex items-center gap-1">
          <BriefcaseIcon className="size-4 text-primary-500" />
          <span className="font-sans text-sm text-ink-800">
            {chapter.toUpperCase()}
          </span>
        </span>
        <span className="size-2 rounded-full bg-[#D9D9D9]" />
        <span className="font-sans text-sm text-ink-800">TODAY</span>
      </div>

      <h2 className="max-w-[501px] px-4 text-center font-sans text-2xl leading-[1.2] font-bold text-primary-600 lg:text-[2rem]">
        {prompt}
      </h2>

      <button
        type="button"
        className="mx-4 flex w-full max-w-[515px] items-center gap-2 rounded-lg bg-ivory-100 px-3.5 py-4 text-left shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-ivory-200"
      >
        <PlusIcon className="size-5 shrink-0 text-primary-500" />
        <span className="font-sans text-base text-ink-500">
          Write today&rsquo;s moment
        </span>
      </button>

      <div className="flex w-full flex-col bg-primary-600 p-4">
        <span className="font-sans text-base font-medium text-ink-0">
          New Entry
        </span>
        <span className="font-sans text-xs text-ink-50">
          The story of your life
        </span>
      </div>
    </section>
  );
}

/**
 * The memories collage — Figma frame 249:12246. Scattered, rotated photo
 * cards on a warm gradient, each captioned.
 *
 * Figma positions five cards absolutely at odd sizes; the same staggering is
 * reproduced with percentage offsets and small rotations so it scales.
 */
/**
 * Figma places five cards at x = 130 / 147 / 184 / 241 / 318 in a 708px panel
 * with widths 140–240px, fanning left-to-right and growing as they go. Those
 * are converted to percentages so the fan scales with the container.
 */
const MEMORIES = [
  { src: "/images/log/memory-1.png", left: "10%", top: "26%", w: "18%", rotate: -7 },
  { src: "/images/log/memory-2.png", left: "22%", top: "22%", w: "20%", rotate: 4 },
  { src: "/images/log/memory-3.png", left: "35%", top: "18%", w: "22%", rotate: -4 },
  { src: "/images/log/memory-4.png", left: "48%", top: "14%", w: "24%", rotate: 6 },
  { src: "/images/log/memory-1.png", left: "62%", top: "10%", w: "26%", rotate: -3 },
];

export function LogMemories({ count = 4 }: { count?: number }) {
  return (
    <section className="flex w-full flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-semibold text-ink-800">
          Log Memories
        </h2>
        <p className="font-sans text-base text-ink-400">{count} moments</p>
      </header>

      <div
        className="relative h-[280px] w-full overflow-hidden rounded-2xl lg:h-[354px]"
        style={{
          backgroundImage:
            "linear-gradient(195deg, rgba(232,163,118,0.8) 0%, rgba(243,163,111,1) 36%)",
        }}
      >
        {MEMORIES.map((m, i) => (
          <figure
            key={`${m.src}-${i}`}
            className="absolute overflow-hidden rounded-[20px] border border-ink-100 bg-white shadow-md"
            style={{
              left: m.left,
              top: m.top,
              width: m.w,
              transform: `rotate(${m.rotate}deg)`,
              zIndex: i,
            }}
          >
            <div className="relative aspect-[3/4] w-full">
              <Image
                src={m.src}
                alt=""
                fill
                sizes="200px"
                className="object-cover"
              />
            </div>
            <figcaption className="px-2 py-1.5 text-center font-sans text-[10px] font-medium text-ink-700">
              Shipped the ugly version. It&rsquo;s out
            </figcaption>
          </figure>
        ))}

        <NavArrow side="left" />
        <NavArrow side="right" />
      </div>
    </section>
  );
}

/** The 40px glassy scrubbers at each end of the collage (Figma 249:12327/8). */
function NavArrow({ side }: { side: "left" | "right" }) {
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Previous memory" : "Next memory"}
      className="absolute top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/40 text-ink-700 backdrop-blur-[20px]"
      style={{
        [side]: "32px",
        backgroundImage:
          "linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.2) 100%)",
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
        <path
          d={side === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect
        x="2"
        y="5"
        width="12"
        height="8"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M6 5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M10 4v12M4 10h12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
