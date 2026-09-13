"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/app/Avatar";
import { listShareTargets, sendPostToBond } from "@/lib/bond-actions";

/**
 * Post menu → "Send to a Bond". Figma has the menu item but no picker, so this
 * reuses the post modals' white card with one row per bond.
 */
export function SendToBondModal({
  postId,
  onClose,
  onSent,
}: {
  postId: string;
  onClose: () => void;
  onSent: (name: string) => void;
}) {
  const [targets, setTargets] = useState<{ userId: string; name: string; avatarUrl: string | null }[] | null>(null);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    listShareTargets().then((result) => {
      if (!cancelled) setTargets(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center scroll-slim overflow-y-auto bg-ink-900/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Send to a Bond"
        onClick={(e) => e.stopPropagation()}
        className="my-auto flex w-full max-w-[480px] flex-col gap-5 rounded-2xl bg-white p-6"
      >
        <header className="flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-semibold text-[#101928]">Send to a Bond</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded p-2 text-ink-800 transition-colors hover:bg-ivory-200"
          >
            <svg viewBox="0 0 16 16" fill="none" className="size-5" aria-hidden="true">
              <path d="m3.5 3.5 9 9m0-9-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {error && <p className="font-sans text-sm text-destructive-60">{error}</p>}

        {targets === null ? (
          <p className="font-sans text-sm text-ink-300">Loading your bonds…</p>
        ) : targets.length === 0 ? (
          <p className="font-sans text-sm text-ink-300">
            You don&rsquo;t have any bonds yet. Invite someone from a space&rsquo;s Ask Members tab.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {targets.map((target) => (
              <li key={target.userId} className="flex items-center justify-between gap-3 rounded-lg p-2 hover:bg-ivory-100">
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar src={target.avatarUrl} name={target.name} className="size-10" />
                  <span className="truncate font-sans text-base font-medium text-ink-700">{target.name}</span>
                </span>
                <button
                  type="button"
                  disabled={sendingTo !== null}
                  onClick={async () => {
                    setError(undefined);
                    setSendingTo(target.userId);
                    const result = await sendPostToBond(postId, target.userId);
                    setSendingTo(null);
                    if (result.error) setError(result.error);
                    else onSent(target.name);
                  }}
                  className="shrink-0 rounded-full bg-primary-500 px-4 py-2 font-ui text-sm font-medium text-white transition-colors hover:bg-primary-400 disabled:opacity-60"
                >
                  {sendingTo === target.userId ? "Sending…" : "Send"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
