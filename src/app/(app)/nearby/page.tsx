import { TopBar } from "@/components/app/TopBar";
import { Button } from "@/components/ui/Button";

/**
 * Nearby — Figma frame 357:7651.
 *
 * A single white 24px-radius card filling the content area, with a centred
 * 556px column: the pulse graphic, the pitch, and the proximity opt-in.
 */
export default function NearbyPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title="Nearby" />

      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="flex min-h-full items-center justify-center rounded-3xl bg-white p-6">
          <div className="flex w-full max-w-[556px] flex-col items-stretch gap-10 lg:gap-12">
            <div className="flex flex-col items-center gap-4">
              <Pulse />
              <div className="flex flex-col gap-2 text-center">
                <h1 className="font-display text-2xl leading-[1.11] font-semibold text-ink-500 sm:text-3xl lg:text-4xl">
                  Grouv Nearby
                </h1>
                <p className="font-sans text-base text-ink-300 lg:text-lg">
                  See who&rsquo;s in your chapter, right here, right now. No
                  background tracking, ever.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <Button size="sm" className="h-10 w-[278px]" iconLeft={<MapPinIcon />}>
                Turn on Proximity
              </Button>
              <p className="text-center font-sans text-base text-ink-100">
                Turns off when you leave this page
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Figma 357:7657 — four concentric #727362 circles at decreasing opacity. */
function Pulse() {
  return (
    <svg
      viewBox="0 0 292 292"
      className="w-full max-w-[220px] lg:max-w-[292px]"
      aria-hidden="true"
    >
      <circle opacity="0.06" cx="144.5" cy="145" r="140" fill="#727362" />
      <circle opacity="0.1" cx="144.5" cy="146" r="105" fill="#727362" />
      <circle opacity="0.15" cx="144.5" cy="145" r="70" fill="#727362" />
      <circle opacity="0.5" cx="144.5" cy="145" r="35" fill="#727362" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
      <path
        d="M8 1.5a4.5 4.5 0 0 1 4.5 4.5c0 3.2-4.5 8.5-4.5 8.5S3.5 9.2 3.5 6A4.5 4.5 0 0 1 8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="6" r="1.6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
