import type { ReactNode } from "react";
import { AuthOrbit } from "@/components/auth/AuthOrbit";

/**
 * Auth shell — Figma 11:16808 / 23:125 / 127:21282.
 *
 * Figma's artboard is 1440x1024: a 580px primary-600 panel (40.28%) beside an
 * ivory-100 form panel. Those are ratios here so the screen fits the device.
 *
 * Scrolling note: the form column must NOT use `justify-center`. On a flex
 * column that scrolls, centring overflowing content pushes the top out of the
 * scrollable area, so the heading gets clipped and can never be reached. The
 * fix is `min-h-full` + `justify-center` on an inner wrapper: it centres while
 * short, and grows from the top once it is taller than the viewport.
 */
export function AuthSplitLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex h-dvh w-full overflow-hidden bg-ivory-100">
      {/* 580/1440 of the artboard width. */}
      <div className="hidden h-full w-[40.28%] shrink-0 items-center justify-center overflow-hidden bg-primary-600 p-[1.8%] lg:flex">
        <AuthOrbit />
      </div>

      {/* Figma's mobile auth frames carry no logo, so none is added here. */}
      <div className="h-full flex-1 overflow-y-auto px-5 py-8 sm:px-8 lg:px-[6%] lg:py-10">
        <div className="mx-auto flex min-h-full w-full max-w-[560px] flex-col justify-center">
          {children}
        </div>
      </div>
    </main>
  );
}
