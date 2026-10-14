import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * The splash screen's background: chapters of life (learning, savings, the
 * road, love, a new job…) in slowly drifting photo columns under a soft
 * dark-to-warm overlay, in place of the flat orange. To use different
 * pictures, replace the files in /public/images/splash or edit TILES.
 */
const TILES = [
  "adventure",
  "learning",
  "relationships",
  "wealth",
  "career",
  "portrait",
  "health",
  "creative",
  "ideas",
  "bond",
] as const;

/** Five columns on desktop, three on phones; each starts at a different tile. */
const COLUMNS = [0, 3, 6, 1, 4].map((offset) => [...TILES.slice(offset), ...TILES.slice(0, offset)].slice(0, 5));

export function SplashBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden bg-black">
      <div className="absolute -inset-x-[10%] -top-[20%] -bottom-[20%] flex -rotate-6 justify-center gap-3 sm:gap-4">
        {COLUMNS.map((tiles, column) => (
          <div
            key={column}
            className={cn(
              "flex w-1/3 shrink-0 flex-col gap-3 sm:w-1/5 sm:gap-4",
              column % 2 === 0 ? "splash-drift-up" : "splash-drift-down",
              column > 2 && "hidden sm:flex",
            )}
          >
            {/* Twice over, so the drift loops without a seam. */}
            {[...tiles, ...tiles].map((name, i) => (
              <div key={`${name}-${i}`} className="relative aspect-square w-full overflow-hidden rounded-2xl">
                <Image
                  src={`/images/splash/${name}.webp`}
                  alt=""
                  fill
                  sizes="(min-width: 640px) 20vw, 34vw"
                  className="object-cover"
                  priority={i < 2}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      {/* The soft overlay: dark enough for white words, warming to Grouv's
          orange at the foot so the brand still leads. */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-primary-600/80" />
    </div>
  );
}
