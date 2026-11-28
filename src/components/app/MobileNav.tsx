"use client";

import { NavCount, useUnreadMessages } from "@/components/app/UnreadMessages";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MobileMenuSheet } from "@/components/app/MobileMenuSheet";
import { cn } from "@/lib/cn";
import { FEATURES, shownInNav } from "@/lib/features";
import {
  HomeIcon,
  SpacesIcon,
  LogIcon,
  BondsIcon,
  ProfileIcon,
  ProfileOutlineIcon,
} from "@/components/icons/nav";

/**
 * Mobile bottom nav — Figma component 601:30105 (instance 621:32013).
 *
 * Five destinations at 440px wide with a 4px primary-500 indicator above the
 * active item. The sidebar takes over from `lg` up. Since 2026-11-28 it is
 * Home, Spaces and Profile (src/lib/features.ts), with no More sheet.
 */
const ITEMS = [
  { href: "/home", label: "Home", Icon: HomeIcon },
  { href: "/spaces", label: "Spaces", Icon: SpacesIcon },
  { href: "/log", label: "Grouv Log", Icon: LogIcon },
  { href: "/bonds", label: "Bonds", Icon: BondsIcon },
  ...(FEATURES.richProfile ? [] : [{ href: "/profile", label: "Profile", Icon: ProfileIcon, IdleIcon: ProfileOutlineIcon }]),
].filter((item) => shownInNav(item.href));

/** The More sheet only while something it holds is switched on. */
const SHOW_MORE = FEATURES.settings;

export function MobileNav() {
  const pathname = usePathname();
  const messages = useUnreadMessages();
  // "More" opens the sheet (601:31816) rather than navigating.
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
    <nav className="shrink-0 border-t border-ink-50 bg-surface px-5 py-4 lg:hidden">
      <ul className={cn("flex items-center", SHOW_MORE ? "justify-between" : "justify-around")}>
        {ITEMS.map(({ href, label, Icon, ...item }) => {
          const badge = href === "/bonds" ? messages : 0;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="relative">
              {active && (
                <span className="absolute -top-4 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-primary-500" />
              )}
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-16 flex-col items-center gap-1 font-sans text-xs",
                  active
                    ? "font-semibold text-primary-500"
                    : "font-medium text-ink-600",
                )}
              >
                <span className="relative">
                  {!active && "IdleIcon" in item && item.IdleIcon ? <item.IdleIcon className="size-5" /> : <Icon className="size-5" />}
                  {badge > 0 && <NavCount count={badge} className="absolute -top-2 -right-3" />}
                </span>
                {label}
              </Link>
            </li>
          );
        })}

        {SHOW_MORE && (
        <li>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            className="flex w-16 flex-col items-center gap-1 font-sans text-xs font-medium text-ink-600"
          >
            <MoreIcon className="size-5" />
            More
          </button>
        </li>
        )}
      </ul>
    </nav>

    {menuOpen && <MobileMenuSheet onClose={() => setMenuOpen(false)} />}
    </>
  );
}

/** Phosphor "List" — the More item's icon. */
function MoreIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className ?? "size-5"} aria-hidden="true">
      <path
        d="M3 5.5h14M3 10h14M3 14.5h14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
