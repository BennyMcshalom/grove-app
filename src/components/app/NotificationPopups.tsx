"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/app/Avatar";
import { useUnread } from "@/components/app/Unread";
import { useViewer } from "@/components/app/ViewerProvider";
import { loadNotification } from "@/lib/notification-actions";
import type { InboxItem } from "@/lib/notifications";

/** How long a popup stays before it slips away on its own. */
const SHOW_MS = 6000;
/** Never more than this many at once; the oldest makes room. */
const MAX_SHOWN = 3;

/**
 * Live notifications at the top of the screen, on any page in the app: a new
 * notification drops in (photo or mark, title, one line, and a button where
 * it leads somewhere), hides itself after a few seconds, and can be dismissed.
 * It listens on the bell's own Realtime subscription (UnreadProvider), and
 * stays quiet while a Deep Focus session runs.
 */
export function NotificationPopups() {
  const viewer = useViewer();
  const pathname = usePathname();
  const { onArrival } = useUnread();
  const [items, setItems] = useState<InboxItem[]>([]);

  const focusing = pathname === "/deep-focus";
  const focusEndsAt = viewer.focusEndsAt;

  useEffect(
    () =>
      onArrival((id) => {
        // Deep Focus means no interruptions; the bell still counts it.
        if (focusing || (focusEndsAt && new Date(focusEndsAt).getTime() > Date.now())) return;
        void loadNotification(id)
          .then((item) => {
            if (!item) return;
            setItems((prev) =>
              prev.some((p) => p.id === item.id) ? prev : [...prev, item].slice(-MAX_SHOWN),
            );
          })
          .catch(() => {});
      }),
    [onArrival, focusing, focusEndsAt],
  );

  // Entering Deep Focus clears anything still showing.
  const [wasFocusing, setWasFocusing] = useState(focusing);
  if (wasFocusing !== focusing) {
    setWasFocusing(focusing);
    if (focusing) setItems([]);
  }

  const dismiss = (id: string) => setItems((prev) => prev.filter((p) => p.id !== id));

  if (items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex flex-col items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]"
    >
      {items.map((item) => (
        <Popup key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
      ))}
    </div>
  );
}

function Popup({ item, onDismiss }: { item: InboxItem; onDismiss: () => void }) {
  const [hovered, setHovered] = useState(false);

  // Paused while the pointer is on it, so it can be read and acted on.
  useEffect(() => {
    if (hovered) return;
    const timer = window.setTimeout(onDismiss, SHOW_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDismiss is a fresh closure each render; the id is what matters
  }, [hovered, item.id]);

  const label = actionLabel(item);

  return (
    <div
      role="status"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="pointer-events-auto flex w-full max-w-[440px] animate-drop-in items-start gap-3 rounded-2xl bg-surface p-4 shadow-[0px_0px_36px_0px_rgba(0,0,0,0.15)] motion-reduce:animate-none"
    >
      {item.actorName ? (
        <Avatar src={item.actorAvatar} name={item.actorName} userId={item.actorId} className="size-10 shrink-0" />
      ) : (
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-600">
          <BellIcon className="size-5" />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="font-sans text-sm font-semibold text-ink-800">{item.title}</p>
        {item.body && <p className="line-clamp-1 font-sans text-sm text-ink-300">{item.body}</p>}
        {label && (
          <Link
            href={item.href}
            onClick={onDismiss}
            className="mt-2 w-fit rounded-full bg-primary-500 px-3 py-1.5 font-ui text-sm font-medium text-white transition-colors hover:bg-primary-400"
          >
            {label}
          </Link>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="-m-1 shrink-0 rounded p-1 text-ink-300 transition-colors hover:bg-ivory-200 hover:text-ink-600"
      >
        <CloseIcon className="size-4" />
      </button>
    </div>
  );
}

/** The button on a popup, by what the notification leads to. */
function actionLabel(item: InboxItem): string | null {
  if (!item.href) return null;
  switch (item.kind) {
    case "connection_accepted":
    case "bond_accepted":
    case "bond_formed":
    case "introduction_accepted":
      return "Open conversation";
    case "connection_request":
    case "group_join_request":
    case "introduction_request":
    case "introduction_received":
      return "Review";
    case "bond_invitation":
    case "chapter_invite":
      return "See invite";
    case "post_rooted":
    case "post_commented":
      return "View post";
    case "match_available":
    case "connection_suggested":
    case "introduction_suggested":
      return "See match";
    default:
      return "Open";
  }
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Zm4 4a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
