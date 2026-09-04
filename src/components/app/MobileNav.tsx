"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  HomeIcon,
  SpacesIcon,
  LogIcon,
  BondsIcon,
} from "@/components/icons/nav";

/**
 * Mobile bottom nav — Figma component 601:30105 (instance 621:32013).
 *
 * Five destinations at 440px wide with a 4px primary-500 indicator above the
 * active item. The sidebar takes over from `lg` up.
 */
const ITEMS = [
  { href: "/home", label: "Home", Icon: HomeIcon },
  { href: "/spaces", label: "My Spaces", Icon: SpacesIcon },
  { href: "/log", label: "Grouv Log", Icon: LogIcon },
  { href: "/bonds", label: "Bonds", Icon: BondsIcon },
  { href: "/settings", label: "More", Icon: MoreIcon },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="shrink-0 border-t border-ink-50 bg-white px-5 py-4 lg:hidden">
      <ul className="flex items-center justify-between">
        {ITEMS.map(({ href, label, Icon }) => {
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
                <Icon className="size-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
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
