"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePaywall } from "@/components/app/pass/PaywallProvider";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { ChartIcon, DotsIcon, EyeIcon } from "@/components/app/wrapped/icons";
import { WrappedFlow, type WrappedStart } from "@/components/app/wrapped/WrappedFlow";
import { cn } from "@/lib/cn";

/**
 * A closed chapter's actions — Figma 1466:24512 / 648:36333 (the card's
 * "View chapter" and "View Wrapped") and menu 1466:25032 (View Wrapped,
 * Download, Share), with the "Chapter downloaded to your device" alert
 * (1449:22800).
 *
 * An existing wrap opens on any plan; making a chapter's first wrap or
 * sharing one needs the Season Pass. Download is the member's own data, so
 * it's never gated.
 */
export function ArchiveChapterActions({
  userChapterId,
  wrapId,
  variant,
}: {
  userChapterId: string;
  /** The chapter's wrap, when it has one. */
  wrapId: string | null;
  /** "card": the Archive list row; "menu": just the ⋯ (the chapter page header). */
  variant: "card" | "menu";
}) {
  const { hasPass } = useViewer();
  const paywall = usePaywall();
  const toast = useToast();
  const [flow, setFlow] = useState<WrappedStart | false>(false);
  const [menu, setMenu] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const openWrap = (share = false) => {
    setMenu(false);
    if (share && !hasPass) return paywall("wrapped");
    if (wrapId) return setFlow({ wrapId, share });
    if (!hasPass) return paywall("wrapped");
    setFlow({ chapterId: userChapterId, share });
  };

  const download = async () => {
    setMenu(false);
    setDownloading(true);
    try {
      const response = await fetch(`/archive/${userChapterId}/download`);
      if (!response.ok) throw new Error(String(response.status));
      const name =
        /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ?? "grouv-chapter.html";
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast({ title: "Chapter downloaded to your device" });
    } catch {
      toast({ title: "We couldn’t download this chapter", description: "Try again in a moment.", tone: "danger" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={cn("flex items-center", variant === "card" ? "w-full gap-4" : "")}>
      {variant === "card" && (
        <>
          <Link
            href={`/archive/${userChapterId}`}
            className="flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 font-ui text-xs text-primary-600 transition-colors hover:bg-primary-100"
          >
            <EyeIcon />
            View chapter
          </Link>
          <button
            type="button"
            onClick={() => openWrap()}
            className="flex items-center gap-2 rounded-full px-3 py-1.5 font-ui text-xs text-primary-600 transition-colors hover:bg-primary-50"
          >
            <ChartIcon />
            View Wrapped
          </button>
        </>
      )}

      <div ref={menuRef} className={cn("relative", variant === "card" && "ml-auto")}>
        <button
          type="button"
          aria-label="Chapter options"
          aria-haspopup="menu"
          aria-expanded={menu}
          disabled={downloading}
          onClick={() => setMenu((m) => !m)}
          className="rounded p-1.5 text-ink-400 transition-colors hover:bg-ivory-300 disabled:opacity-50"
        >
          <DotsIcon />
        </button>
        {menu && (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 flex w-[245px] flex-col gap-2 rounded-lg bg-surface py-4 shadow-[0px_0px_36px_0px_rgba(0,0,0,0.15)]"
          >
            {[
              { label: "View Wrapped", onClick: () => openWrap() },
              { label: downloading ? "Downloading…" : "Download", onClick: download },
              { label: "Share", onClick: () => openWrap(true) },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={item.onClick}
                className="px-5 py-2 text-left font-sans text-sm font-medium text-ink-500 transition-colors hover:bg-ivory-200"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {flow !== false && <WrappedFlow start={flow} onClose={() => setFlow(false)} />}
    </div>
  );
}
