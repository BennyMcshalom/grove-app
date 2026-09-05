"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import {
  HomeIcon,
  SpacesIcon,
  LogIcon,
  BondsIcon,
  EventsIcon,
  NearbyIcon,
  ArchiveIcon,
  FocusIcon,
  SettingsIcon,
} from "@/components/icons/nav";

/**
 * Sidebar — Figma component 59:7471 (instance 65:1853).
 *
 * 272px column: logo, the signed-in user, a 7-item primary menu, the trial
 * promo card, then a 3-item secondary menu pinned to the bottom.
 */
const PRIMARY = [
  { href: "/home", label: "Home", Icon: HomeIcon, outline: "home" },
  { href: "/spaces", label: "My Spaces", Icon: SpacesIcon, outline: "spaces" },
  { href: "/log", label: "Grouv Log", Icon: LogIcon, outline: "log" },
  { href: "/bonds", label: "Bonds", Icon: BondsIcon, outline: "bonds" },
  { href: "/events", label: "Events", Icon: EventsIcon, outline: "events" },
  { href: "/nearby", label: "Nearby", Icon: NearbyIcon, outline: "nearby" },
  { href: "/archive", label: "Archive", Icon: ArchiveIcon, outline: "archive" },
];

// "Dark mode" is rendered separately below: the theme switch lives in Settings.
const SECONDARY = [
  {
    href: "/deep-focus",
    label: "Deep Focus",
    Icon: FocusIcon,
    outline: "deep-focus",
  },
  {
    href: "/settings",
    label: "Settings",
    Icon: SettingsIcon,
    outline: "settings",
  },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full w-[272px] shrink-0 flex-col gap-5 overflow-y-auto bg-white py-10 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)]",
        className,
      )}
    >
      <div className="px-4 py-2">
        <Link href="/home" aria-label="Grouv home">
          <Logo className="h-10" />
        </Link>
      </div>

      <CurrentUser />

      <nav className="flex flex-1 flex-col justify-between gap-8 px-4">
        <ul className="flex flex-col gap-1">
          {PRIMARY.map((item) => (
            <MenuItem key={item.href} {...item} pathname={pathname} />
          ))}
        </ul>

        <div className="flex flex-col gap-2">
          <TrialCard />
          <ul className="flex flex-col px-2">
            <li>
              {/* The theme switch itself lives in Settings > Appearance. */}
              <Link
                href="/settings"
                className="flex w-full items-center gap-3 rounded px-4 py-3 font-sans text-sm text-ink-600 transition-colors hover:bg-ivory-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              >
                <span
                  className="size-5 shrink-0 bg-current"
                  style={{
                    maskImage: "url(/icons/nav-outline/dark-mode.svg)",
                    WebkitMaskImage: "url(/icons/nav-outline/dark-mode.svg)",
                    maskSize: "contain",
                    WebkitMaskSize: "contain",
                    maskRepeat: "no-repeat",
                    WebkitMaskRepeat: "no-repeat",
                    maskPosition: "center",
                    WebkitMaskPosition: "center",
                  }}
                />
                Dark mode
              </Link>
            </li>
            {SECONDARY.map((item) => (
              <MenuItem key={item.href} {...item} pathname={pathname} />
            ))}
          </ul>
        </div>
      </nav>
    </aside>
  );
}

function MenuItem({
  href,
  label,
  Icon,
  outline,
  pathname,
}: {
  href: string;
  label: string;
  Icon: (p: { className?: string }) => React.ReactElement;
  /** Figma's Regular (outline) glyph, used until the item is active. */
  outline: string;
  pathname: string;
}) {
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded px-4 py-3 font-sans text-sm transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
          active
            ? "bg-primary-50 font-medium text-primary-600"
            : "text-ink-600 hover:bg-ivory-200",
        )}
      >
        {active ? (
          <Icon className="size-5 shrink-0" />
        ) : (
          <span
            className="size-5 shrink-0 bg-current"
            style={{
              maskImage: `url(/icons/nav-outline/${outline}.svg)`,
              WebkitMaskImage: `url(/icons/nav-outline/${outline}.svg)`,
              maskSize: "contain",
              WebkitMaskSize: "contain",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskPosition: "center",
              WebkitMaskPosition: "center",
            }}
          />
        )}
        {label}
      </Link>
    </li>
  );
}

/** Figma 60:2550 — avatar with online dot, name and current chapter. */
function CurrentUser() {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <span className="relative size-10 shrink-0">
        <Image
          src="/images/avatar-oreoluwa.png"
          alt=""
          fill
          sizes="40px"
          className="rounded-full border-[1.5px] border-white object-cover"
        />
        <span className="absolute right-0 bottom-0 size-2.5 rounded-full border border-white bg-[#04802E]" />
      </span>
      <span className="flex flex-col">
        <span className="font-sans text-base font-bold text-[#101928]">
          Oreoluwa
        </span>
        <span className="font-sans text-sm text-ink-300">
          Building a business (early)
        </span>
      </span>
    </div>
  );
}

/** Figma 65:1729 — the primary-500 trial promo. */
function TrialCard() {
  return (
    <Link
      href="/settings"
      className="flex items-center gap-3 rounded-2xl bg-primary-500 px-4 py-3 transition-opacity hover:opacity-90"
    >
      <svg viewBox="0 0 16 16" className="size-4 shrink-0" aria-hidden="true">
        <path
          d="M8 1.5v13M1.5 8h13"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="flex flex-col">
        <span className="font-sans text-sm font-semibold text-ink-0">
          Start 14-day trial
        </span>
        <span className="font-sans text-xs text-ink-50">Full access, free</span>
      </span>
    </Link>
  );
}
