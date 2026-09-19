"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/app/Avatar";
import { useSidebar } from "@/components/app/SidebarProvider";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { updatePreferences } from "@/app/(app)/settings/actions";
import { applyTheme } from "@/lib/theme";
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
  const { theme: savedTheme } = useViewer();
  const toast = useToast();
  const [theme, setTheme] = useState(savedTheme);
  const dark = theme === "dark";

  // Repaint first, then save; put it back if the save fails.
  const toggleTheme = async () => {
    const next = dark ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    const result = await updatePreferences({ theme: next });
    if (result.error) {
      setTheme(theme);
      applyTheme(theme);
      toast({ title: result.error, tone: "danger" });
    }
  };

  return (
    <aside
      className={cn(
        "relative flex h-full shrink-0 flex-col gap-5 scroll-slim overflow-y-auto overflow-x-hidden bg-surface py-10 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)] transition-[width] duration-200",
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
        className="absolute top-2.5 right-2 grid size-7 place-items-center rounded-full border border-ink-50 bg-surface text-ink-400 shadow-sm transition-colors hover:bg-ivory-200 hover:text-ink-600"
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
              <button
                type="button"
                role="switch"
                aria-checked={dark}
                aria-label="Dark mode"
                onClick={toggleTheme}
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
                  <>
                    <span className="flex-1 text-left">Dark mode</span>
                    {/* The same switch as Settings > Appearance, at rail size. */}
                    <span
                      className={cn(
                        "flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors",
                        dark ? "justify-end bg-primary-600" : "justify-start bg-ink-50",
                      )}
                    >
                      <span className="size-4 rounded-full bg-white shadow-sm" />
                    </span>
                  </>
                )}
              </button>
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
  const viewer = useViewer();
  // Figma shows the phase of the chapter held longest ("Building a business (early)").
  const status = viewer.chapters[0]?.phase;

  return (
    <Link
      href="/settings"
      className={cn(
        "flex items-center gap-3 py-2 transition-colors hover:bg-ivory-100",
        collapsed ? "justify-center px-3" : "px-4",
      )}
    >
      <span className="relative size-10 shrink-0">
        <Avatar
          src={viewer.avatarUrl}
          name={viewer.firstName}
          className="size-10 border-[1.5px] border-surface"
        />
        <span className="absolute right-0 bottom-0 size-2.5 rounded-full border border-surface bg-[#04802E]" />
      </span>
      {!collapsed && (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-sans text-base font-bold text-ink-700">
            {viewer.firstName}
          </span>
          {status && (
            <span className="truncate font-sans text-sm text-ink-300">{status}</span>
          )}
        </span>
      )}
    </Link>
  );
}

/** Figma 65:1729 — the primary-500 trial promo, until a trial or plan starts. */
function TrialCard() {
  const { subscriptionStatus } = useViewer();
  if (subscriptionStatus === "trialing" || subscriptionStatus === "active") return null;

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
        <span className="font-sans text-sm font-semibold text-white">
          {subscriptionStatus === "none" ? "Start 14-day trial" : "Get full access"}
        </span>
        <span className="font-sans text-xs text-white">
          {subscriptionStatus === "none" ? "Full access, free" : "Subscribe in Settings"}
        </span>
      </span>
    </Link>
  );
}
