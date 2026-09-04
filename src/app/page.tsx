import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { ArrowRight } from "@/components/ui/ArrowRight";

/**
 * Splash screen — Figma 31:551 (desktop 1440x1024) / 585:19636 (mobile 440x956).
 *
 * Figma's 72px headline and 384px cluster are its 1440x1024 artboard sizes, so
 * they only apply from `xl` up. Below that everything steps down so the screen
 * fits a real laptop (1280x800) without scrolling.
 */
export default function SplashPage() {
  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-primary-600">
      <div className="shrink-0 px-6 pt-8 sm:px-10 lg:px-30 lg:pt-16">
        <Logo priority tone="onDark" className="h-12 lg:h-20" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6 pb-10 sm:gap-8 lg:gap-12 xl:gap-16">
        <PhotoCluster />

        {/* Figma 32:703 — column, centred, 48px gap. */}
        <div className="flex w-full max-w-[603px] flex-col items-center gap-6 lg:gap-8 xl:gap-12">
          {/* Figma 31:653 — 16px gap between headline and body. */}
          <div className="flex flex-col items-center gap-3 text-center lg:gap-4">
            <h1 className="font-display text-3xl leading-[1.1111] font-bold tracking-[-0.02em] text-ink-0 sm:text-4xl lg:text-5xl xl:text-[4.5rem]">
              Depth, on purpose.
            </h1>
            <p className="font-sans text-sm leading-[1.5] text-ink-50 sm:text-base lg:text-lg xl:text-xl">
              It&rsquo;s a small circle of people in the same chapter as you. No
              audience. No performance. Just depth.
            </p>
          </div>

          <Button
            variant="secondary"
            size="lg"
            iconRight={<ArrowRight />}
            href="/sign-up"
          >
            Begin your chapter
          </Button>
        </div>
      </div>
    </main>
  );
}

/**
 * Figma 35:754 — a 384x250 stage: a 180px portrait at (0, 70), a 140px one at
 * (244, 31) and a 32px ringed dot at (202, 106). Positions are percentages so
 * the cluster scales; `max-h` keeps it from eating a short viewport.
 */
function PhotoCluster() {
  return (
    <div className="relative aspect-[384/250] w-full max-w-[220px] shrink-0 sm:max-w-[280px] lg:max-w-[320px] xl:max-w-[384px]">
      <div className="absolute top-[28%] left-0 aspect-square w-[46.875%] overflow-hidden rounded-pill shadow-[0px_0px_15px_15px_rgba(239,236,230,0.3)]">
        <Image
          src="/images/splash-bubble-b-5c8e1f.png"
          alt=""
          fill
          sizes="180px"
          className="object-cover"
          priority
        />
      </div>

      <div className="absolute top-[12.4%] left-[63.5%] aspect-square w-[36.46%] overflow-hidden rounded-pill shadow-[0px_0px_15px_15px_rgba(16,146,48,0.3)]">
        <Image
          src="/images/splash-bubble-a-74fb0f.png"
          alt=""
          fill
          sizes="140px"
          className="object-cover"
          priority
        />
      </div>

      <div className="absolute top-[42.4%] left-[52.6%] aspect-square w-[8.33%] rounded-pill border-2 border-ivory-500">
        <div className="absolute inset-[18.75%] rounded-pill border-2 border-ivory-500 bg-ivory-600" />
      </div>
    </div>
  );
}
