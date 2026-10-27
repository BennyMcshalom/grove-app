"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useViewer } from "@/components/app/ViewerProvider";
import { Button } from "@/components/ui/Button";
import { Modal, ModalClose } from "@/components/ui/Modal";
import { markGuideSeen } from "@/lib/guide-actions";
import { GUIDES, type GuideId } from "@/lib/guides";
import { cn } from "@/lib/cn";

/**
 * Guides closed in this tab, on top of the ones the server knew about when
 * the page loaded, so moving between pages doesn't reopen one.
 */
const closedHere = new Set<string>();
/** The page that already opened a guide by itself: one per visit, never two stacked. */
let autoOpenedOn: string | null = null;

/**
 * A "?" beside a feature's heading that explains it (src/lib/guides.ts). The
 * first time someone reaches the feature it opens by itself; after they
 * close it, it only opens when tapped.
 */
export function FeatureGuide({
  id,
  name,
  auto = true,
  afterAction = false,
  className,
}: {
  id: GuideId;
  /** Fills {name} in the copy (chapter invitations: whose chapter). */
  name?: string;
  /** Open by itself on the first visit (when this turns true). */
  auto?: boolean;
  /**
   * `auto` follows something they did (switching to a tab), not the page
   * loading, so it may open even if another guide opened on this page already.
   */
  afterAction?: boolean;
  className?: string;
}) {
  const viewer = useViewer();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const guide = GUIDES[id];
  const fill = (text: string) => text.replaceAll("{name}", name ?? "this person");

  useEffect(() => {
    if (!auto || viewer.seenGuides.includes(id) || closedHere.has(id)) return;
    if (afterAction) {
      const timer = window.setTimeout(() => setOpen(true), 200);
      return () => window.clearTimeout(timer);
    }
    if (autoOpenedOn === pathname) return;
    autoOpenedOn = pathname;
    // Let the page settle first, so the guide doesn't flash over a loading screen.
    const timer = window.setTimeout(() => setOpen(true), 600);
    return () => {
      window.clearTimeout(timer);
      if (autoOpenedOn === pathname) autoOpenedOn = null;
    };
  }, [afterAction, auto, id, pathname, viewer.seenGuides]);

  const close = () => {
    setOpen(false);
    if (!closedHere.has(id) && !viewer.seenGuides.includes(id)) {
      closedHere.add(id);
      void markGuideSeen(id);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`About ${guide.place}`}
        title={`About ${guide.place}`}
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-ink-100 font-sans text-xs font-semibold text-ink-400 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-800",
          className,
        )}
      >
        ?
      </button>
      {/* Portalled: the "?" can sit in a header hidden at this width (TopBar draws one per layout). */}
      {open &&
        createPortal(
        <Modal label={guide.place} onClose={close} width="max-w-[480px]">
          <header className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-sans text-xs font-semibold uppercase tracking-wide text-primary-600">
                {guide.place}
              </span>
              <h2 className="font-display text-2xl font-semibold text-ink-800">{fill(guide.title)}</h2>
            </div>
            <ModalClose onClose={close} className="-mr-3 -mt-3" />
          </header>
          <p className="font-sans text-base leading-relaxed text-ink-500">{fill(guide.body)}</p>
          <Button onClick={close} className="self-end">
            Got it
          </Button>
        </Modal>,
          document.body,
        )}
    </>
  );
}
