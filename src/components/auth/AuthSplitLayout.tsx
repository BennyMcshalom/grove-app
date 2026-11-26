import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";

/**
 * Auth shell, lean version (2026-11-26). The orange orbit panel is gone: the
 * logo sits top-left, one narrow column holds the form, and a quiet footer
 * carries Terms and Privacy. Every auth screen (sign in, sign up, verify,
 * two-step, forgot password, team sign-in, invite landing) shares it.
 * AuthOrbit.tsx is kept in the repo in case the panel comes back.
 *
 * Scrolling note: the column must NOT centre with `justify-center` on the
 * scrolling element itself, or a tall form gets its top clipped. The scroller
 * is <main>; the inner wrapper uses `min-h-full` so it centres while short and
 * grows from the top once it is taller than the viewport.
 */
export function AuthSplitLayout({ children }: { children: ReactNode }) {
  return (
    <main className="h-viewport w-full scroll-slim overflow-y-auto bg-ivory-100">
      <div className="flex min-h-full flex-col">
        <header className="px-5 pt-6 sm:px-8 lg:px-10 lg:pt-8">
          <Link href="/" aria-label="Grouv home" className="inline-block">
            <Logo tone="ink" className="h-7 lg:h-8" priority />
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>

        <footer className="flex justify-center gap-4 px-5 pb-6 font-sans text-xs text-ink-300">
          <span>&copy; Grouv</span>
          <Link href="/terms" className="hover:text-ink-600">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-ink-600">
            Privacy
          </Link>
        </footer>
      </div>
    </main>
  );
}
