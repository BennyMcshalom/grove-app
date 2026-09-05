"use client";

import Image from "next/image";
import { ChapterGroupCard } from "@/components/app/ChapterGroupCard";
import { ArrowRight } from "@/components/ui/ArrowRight";
import Link from "next/link";
import { useState } from "react";

/**
 * Right rail — Figma frame 94:2684. 396px column, 332px content, scrolls on
 * its own: Your Circle, Active Bonds, Chapter Groups and Suggested for you.
 */
const CIRCLE = [
  {
    name: "Jalen Crestwood",
    status: "Mid-project",
    src: "/images/people/jalen.png",
    aura: "#F0B231",
    glow: "0px 2px 9px 9px rgba(251, 148, 31, 0.45)",
    icon: "suitcase",
  },
  {
    name: "Mira Langston",
    status: "Building a business",
    src: "/images/people/m2.png",
    // Figma draws Mira's aura as a dashed 1px #6C35D1 ring (100:1124).
    dashed: "#6C35D1",
    glow: "0px 4px 5px 15px rgba(108, 2, 238, 0.3)",
    icon: "suitcase",
  },
  {
    name: "Evan Thorne",
    status: "Mid-project",
    src: "/images/people/m4.png",
    aura: "#C0CA1E",
    glow: "0px 2px 9px 9px rgba(120, 238, 2, 0.45)",
    icon: "palette",
  },
  {
    name: "Lena Voss",
    status: "Mid-project",
    src: "/images/people/lena.png",
    aura: "#F0B231",
    glow: "0px 2px 9px 9px rgba(251, 148, 31, 0.45)",
    icon: "suitcase",
  },
];

const BONDS = [
  { name: "Nina Harper", preview: "Hi Angelina! How are You?", src: "/images/people/nina.png" },
  { name: "John Doe", preview: "Hi Angelina! How are You?", src: "/images/people/john.png" },
  { name: "Dominion Jayden", preview: "Hi Angelina! How are You?", src: "/images/people/dominion.png" },
];

const GROUPS = [
  {
    title: "Relocating solo",
    blurb: "Starting fresh somewhere new",
    // Figma "orange" gradient fill.
    gradient: "linear-gradient(-7deg, #FEE6D7 0%, #FEFBF9 100%)",
  },
  {
    title: "First tech Job",
    blurb: "Starting with no blueprint",
    // Figma "pink grad" fill.
    gradient: "linear-gradient(135deg, #FAE7ED 0%, #F0DDDD 100%)",
  },
];

const SUGGESTED = Array.from({ length: 3 }, () => ({
  name: "Cris Morich",
  reason: "Also in Health",
}));

export function RightRail({
  variant = "feed",
}: {
  /**
   * The space detail rail (172:6133) swaps "Your circle" for "IN THIS SPACE"
   * and drops Active bonds.
   */
  variant?: "feed" | "space";
} = {}) {
  return (
    <aside className="hidden w-[396px] shrink-0 overflow-y-auto bg-white shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)] xl:block">
      <div className="flex w-full flex-col gap-7 px-8 pt-6 pb-10">
        <Section
          title={variant === "space" ? "In this space" : "Your circle"}
          action="View all"
          href="/spaces"
        >
          <ul className="flex flex-col gap-4">
            {CIRCLE.map((p) => (
              <li key={p.name} className="flex items-center gap-6 p-2">
                <AuraAvatar
                  src={p.src}
                  aura={p.aura}
                  dashed={p.dashed}
                  glow={p.glow}
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-sans text-base font-medium text-ink-700">
                    {p.name}
                  </span>
                  <StatusBadge icon={p.icon}>{p.status}</StatusBadge>
                </span>
              </li>
            ))}
          </ul>
        </Section>

        {variant === "feed" && <Divider />}

        {variant === "feed" && (
        <Section title="Active bonds" action="View all" href="/bonds">
          <ul className="flex flex-col gap-5">
            {BONDS.map((p) => (
              <li key={p.name} className="flex items-center gap-4">
                <Avatar src={p.src} ring />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-sans text-base font-medium text-ink-700">
                    {p.name}
                  </span>
                  <span className="truncate font-sans text-sm text-ink-200">
                    {p.preview}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Section>
        )}

        <Divider />

        <Section title="Chapter groups" action="Browse" href="/groups">
          <ul className="flex flex-col gap-2">
            {GROUPS.map((g) => (
              <li key={g.title}>
                <ChapterGroupCard
                  title={g.title}
                  blurb={g.blurb}
                  gradient={g.gradient}
                />
              </li>
            ))}
          </ul>
        </Section>

        <Divider />

        <Section title="Suggested for you" action="View all" href="/nearby">
          <ul
            className="flex flex-col gap-4 rounded-2xl p-4"
            style={{ backgroundImage: GROUPS[0].gradient }}
          >
            {SUGGESTED.map((p, i) => (
              <li key={i} className="flex flex-col gap-4">
                {i > 0 && <hr className="border-[#E8EDF1]" />}
                <div className="flex items-center justify-between gap-4">
                  <span className="flex min-w-0 items-center gap-4">
                    {/* Avatar 5 (94:3417) — 40px, primary-50 on a 5px white ring. */}
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-50 font-ui text-base font-extrabold text-primary-600 ring-[5px] ring-white">
                      K
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate font-sans text-base font-medium text-ink-700">
                        {p.name}
                      </span>
                      <span className="truncate font-sans text-sm font-medium text-primary-700">
                        {p.reason}
                      </span>
                    </span>
                  </span>
                  <InviteButton />
                </div>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </aside>
  );
}

function Section({
  title,
  action,
  href,
  children,
}: {
  title: string;
  action: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-sans text-base font-medium tracking-wide text-ink-700 uppercase">
          {title}
        </h2>
        <Link
          href={href}
          className="font-sans text-sm font-medium text-primary-500 hover:underline"
        >
          {action}
        </Link>
      </div>
      {children}
    </section>
  );
}

/**
 * Invite flips to "Invited" — Figma's alert for this action is
 * "Connection request sent" (285:9289), so the button reflects that state.
 */
function InviteButton() {
  const [invited, setInvited] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setInvited(true)}
      disabled={invited}
      className="flex shrink-0 items-center gap-2 rounded-full px-3 py-2.5 font-ui text-sm font-medium text-primary-500 transition-colors hover:bg-primary-50 disabled:text-ink-300 disabled:hover:bg-transparent"
    >
      {invited ? "Invited" : "Invite"}
      {!invited && <ArrowRight className="size-4" />}
    </button>
  );
}

function Avatar({ src, ring = false }: { src: string; ring?: boolean }) {
  return (
    <span className="relative size-12 shrink-0">
      <Image
        src={src}
        alt=""
        fill
        sizes="48px"
        className="rounded-full object-cover"
      />
      {ring && (
        <>
          <span className="pointer-events-none absolute inset-0 rounded-full ring-[6px] ring-white ring-inset" />
          {/* _AvatarIndicator 94:2873 — Success/50 at 36,36. */}
          <span className="absolute right-0 bottom-0 size-3 rounded-full border-[1.5px] border-white bg-success-50" />
        </>
      )}
    </span>
  );
}

/** Frames 100:1117 … — a 48px portrait over its owner's coloured aura. */
function AuraAvatar({
  src,
  aura,
  dashed,
  glow,
}: {
  src: string;
  aura?: string;
  dashed?: string;
  glow: string;
}) {
  return (
    <span className="relative size-12 shrink-0">
      {dashed ? (
        <span
          className="absolute -inset-1 rounded-full border border-dashed"
          style={{ borderColor: dashed, boxShadow: glow }}
        />
      ) : (
        <span
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: aura, boxShadow: glow }}
        />
      )}
      <Image
        src={src}
        alt=""
        fill
        sizes="48px"
        className="rounded-full object-cover"
      />
    </span>
  );
}

/** Badge Text 97:4010 — ivory-200 pill, 4px/12px, with the chapter glyph. */
function StatusBadge({
  icon,
  children,
}: {
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <span className="flex w-fit items-center gap-2 rounded-full bg-ivory-200 px-3 py-1">
      <span
        className="size-4 shrink-0 bg-primary-600"
        style={{
          maskImage: `url(/icons/events/${icon}.svg)`,
          WebkitMaskImage: `url(/icons/events/${icon}.svg)`,
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
        }}
      />
      <span className="truncate font-sans text-xs font-medium text-ink-400">
        {children}
      </span>
    </span>
  );
}

function Divider() {
  return <hr className="border-[#E8EDF1]" />;
}
