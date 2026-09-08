"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { useSidebar } from "@/components/app/SidebarProvider";
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
  const { collapsed, toggle } = useSidebar();

  return (
    <aside
      className={cn(
        "relative flex h-full shrink-0 flex-col gap-5 overflow-y-auto overflow-x-hidden bg-white py-10 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)] transition-[width] duration-200",
        collapsed ? "w-[76px]" : "w-[272px]",
        className,
      )}
    >
      <div className={cn("py-2", collapsed ? "px-3" : "px-4")}>
        <Link href="/home" aria-label="Grouv home" className="block">
          {/* Collapsed, the rail is only 76px wide, so the 143px wordmark is
              cropped back to its leading "G" — Figma ships no separate mark.
              The G's ink ends 150/572 along, which is 38px at this height. */}
          <span
            className={cn(
              "block h-10 overflow-hidden",
              collapsed ? "mx-auto w-[38px]" : "w-[143px]",
            )}
          >
            <Logo className="h-10 max-w-none" />
          </span>
        </Link>
      </div>

      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!collapsed}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute top-2.5 right-2 grid size-7 place-items-center rounded-full border border-ink-50 bg-white text-ink-400 shadow-sm transition-colors hover:bg-ivory-200 hover:text-ink-600"
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={cn("size-4 transition-transform", collapsed && "rotate-180")}
          aria-hidden="true"
        >
          <path
            d="m10 3-5 5 5 5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <CurrentUser collapsed={collapsed} />

      <nav
        className={cn(
          "flex flex-1 flex-col justify-between gap-8",
          collapsed ? "px-3" : "px-4",
        )}
      >
        <ul className="flex flex-col gap-1">
          {PRIMARY.map((item) => (
            <MenuItem
              key={item.href}
              {...item}
              pathname={pathname}
              collapsed={collapsed}
            />
          ))}
        </ul>

        <div className="flex flex-col gap-2">
          {!collapsed && <TrialCard />}
          <ul className={cn("flex flex-col", collapsed ? "px-0" : "px-2")}>
            <li>
              {/* The theme switch itself lives in Settings > Appearance. */}
              <Link
                href="/settings"
                title={collapsed ? "Dark mode" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded py-3 font-sans text-sm text-ink-600 transition-colors hover:bg-ivory-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
                  collapsed ? "justify-center px-3" : "px-4",
                )}
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
                {collapsed ? (
                  <span className="sr-only">Dark mode</span>
                ) : (
                  "Dark mode"
                )}
              </Link>
            </li>
            {SECONDARY.map((item) => (
              <MenuItem
                key={item.href}
                {...item}
                pathname={pathname}
                collapsed={collapsed}
              />
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
  collapsed = false,
}: {
  href: string;
  label: string;
  Icon: (p: { className?: string }) => React.ReactElement;
  /** Figma's Regular (outline) glyph, used until the item is active. */
  outline: string;
  pathname: string;
  collapsed?: boolean;
}) {
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        title={collapsed ? label : undefined}
        className={cn(
          "flex items-center gap-3 rounded py-3 font-sans text-sm transition-colors",
          collapsed ? "justify-center px-3" : "px-4",
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
        {collapsed ? <span className="sr-only">{label}</span> : label}
      </Link>
    </li>
  );
}

/** Figma 60:2550 — avatar with online dot, name and current chapter. */
function CurrentUser({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 py-2",
        collapsed ? "justify-center px-3" : "px-4",
      )}
    >
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
      {!collapsed && (
        <span className="flex min-w-0 flex-col">
          <span className="font-sans text-base font-bold text-[#101928]">
            Oreoluwa
          </span>
          <span className="truncate font-sans text-sm text-ink-300">
            Building a business (early)
          </span>
        </span>
      )}
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
