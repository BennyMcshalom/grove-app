"use client";

import Image from "next/image";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "@/components/ui/ArrowRight";

/** Onboarding 3 — "Your Grouv is ready." (Figma 56:1791). */
export default function ReadyPage() {
  return (
    <OnboardingShell step={3} totalSteps={3}>
      <div className="m-auto flex w-full max-w-[646px] flex-col items-center gap-5 lg:gap-8">
        <PhotoCluster />

        <header className="flex flex-col gap-2 text-center">
          <h1 className="font-display text-2xl leading-[1.04] font-semibold text-[#1F2937] sm:text-3xl lg:text-4xl xl:text-5xl">
            Your Grouv is ready.
          </h1>
          <p className="font-sans text-sm text-ink-300 lg:text-base xl:text-lg">
            We&rsquo;ve matched your chapters, interests, and what you&rsquo;re
            looking for with people who are on a similar path. Your people are
            waiting. Come find your Grouv.
          </p>
        </header>

        <Button size="md" className="w-[228px]" iconRight={<ArrowRight />} href="/">
          Enter Grouv
        </Button>
      </div>
    </OnboardingShell>
  );
}

/**
 * Three glowing portraits — Figma 56:1855, a 418x376 stage with the 180px
 * bubble at (20, 176), the 140px at (258, 151) and the 120px at (139, 20).
 * Percentages so it scales down on short screens.
 */
function PhotoCluster() {
  return (
    <div className="relative aspect-[418/376] w-full max-w-[200px] shrink-0 sm:max-w-[260px] lg:max-w-[330px] xl:max-w-[418px]">
      <div className="absolute top-[46.8%] left-[4.8%] aspect-square w-[43.06%] overflow-hidden rounded-pill shadow-[0px_0px_15px_15px_rgba(245,126,22,0.3)]">
        <Image
          src="/images/splash-bubble-b-5c8e1f.png"
          alt=""
          fill
          sizes="180px"
          className="object-cover"
        />
      </div>

      <div className="absolute top-[40.2%] left-[61.7%] aspect-square w-[33.49%] overflow-hidden rounded-pill shadow-[0px_0px_15px_15px_rgba(16,146,48,0.3)]">
        <Image
          src="/images/splash-bubble-a-74fb0f.png"
          alt=""
          fill
          sizes="140px"
          className="object-cover"
        />
      </div>

      <div className="absolute top-[5.3%] left-[33.3%] aspect-square w-[28.71%] overflow-hidden rounded-pill shadow-[0px_0px_15px_15px_rgba(245,193,22,0.3)]">
        <Image
          src="/images/ready-bubble-c-4002b3.png"
          alt=""
          fill
          sizes="120px"
          className="object-cover"
        />
      </div>
    </div>
  );
}
