"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/app/ToastProvider";
import { cn } from "@/lib/cn";

export type ShareChannel =
  | "native"
  | "whatsapp"
  | "instagram"
  | "x"
  | "facebook"
  | "linkedin"
  | "telegram"
  | "email"
  | "sms"
  | "copy";

/**
 * The one way Grouv shares a link. On a phone with a system share sheet it
 * opens that (WhatsApp, Instagram, Messages… are all there). Everywhere else —
 * desktop browsers mostly have no `navigator.share`, or one that opens an
 * empty OS dialog — it opens our own sheet of apps.
 *
 * `trigger` renders whatever button the screen draws and gets `open`.
 */
export function ShareSheet({
  url,
  title,
  text,
  onShared,
  trigger,
}: {
  url: string;
  /** Subject line for email and the system sheet's title. */
  title: string;
  /** A line to go with the link (the link is added for each app). */
  text?: string;
  /** Told which way the link left, e.g. to count referral invites. */
  onShared?: (channel: ShareChannel) => void;
  trigger: (open: () => void) => React.ReactNode;
}) {
  const [sheet, setSheet] = useState(false);

  const open = async () => {
    if (isPhone() && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        onShared?.("native");
        return;
      } catch (error) {
        // Closing the system sheet isn't an error; anything else falls back.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    setSheet(true);
  };

  return (
    <>
      {trigger(() => void open())}
      {sheet && (
        <SharePanel url={url} title={title} text={text} onShared={onShared} onClose={() => setSheet(false)} />
      )}
    </>
  );
}

/** A touch-first device, where `sms:` and the system sheet make sense. */
function isPhone() {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

function SharePanel({
  url,
  title,
  text,
  onShared,
  onClose,
}: {
  url: string;
  title: string;
  text?: string;
  onShared?: (channel: ShareChannel) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const closeRef = useRef<HTMLButtonElement>(null);
  const message = text ? `${text} ${url}` : url;
  const e = encodeURIComponent;

  useEffect(() => {
    closeRef.current?.focus();
    // Capture phase, so Escape closes only this sheet and not a modal under it.
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  };

  const go = (channel: ShareChannel, href: string) => {
    onShared?.(channel);
    if (/^https?:/.test(href)) window.open(href, "_blank", "noopener,noreferrer");
    else window.location.assign(href);
    onClose();
  };

  const targets: { channel: ShareChannel; label: string; icon: React.ReactNode; tile: string; run: () => void }[] = [
    {
      channel: "whatsapp",
      label: "WhatsApp",
      icon: <WhatsAppIcon />,
      tile: "bg-brand-whatsapp text-white",
      run: () => go("whatsapp", `https://wa.me/?text=${e(message)}`),
    },
    {
      channel: "instagram",
      label: "Instagram",
      icon: <InstagramIcon />,
      tile: "bg-brand-instagram text-white",
      // Instagram has no web share link: copy, then open it to paste.
      run: async () => {
        const copied = await copy();
        toast(
          copied
            ? { title: "Link copied — paste it in Instagram", tone: "confirm" }
            : { title: "Couldn’t copy the link", description: url, tone: "danger" },
        );
        go("instagram", "https://www.instagram.com/");
      },
    },
    {
      channel: "x",
      label: "X",
      icon: <XIcon />,
      tile: "bg-ink-800 text-ivory-100",
      run: () => go("x", `https://x.com/intent/tweet?url=${e(url)}${text ? `&text=${e(text)}` : ""}`),
    },
    {
      channel: "facebook",
      label: "Facebook",
      icon: <FacebookIcon />,
      tile: "bg-brand-facebook text-white",
      run: () => go("facebook", `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`),
    },
    {
      channel: "linkedin",
      label: "LinkedIn",
      icon: <LinkedInIcon />,
      tile: "bg-brand-linkedin text-white",
      run: () => go("linkedin", `https://www.linkedin.com/sharing/share-offsite/?url=${e(url)}`),
    },
    {
      channel: "telegram",
      label: "Telegram",
      icon: <TelegramIcon />,
      tile: "bg-brand-telegram text-white",
      run: () => go("telegram", `https://t.me/share/url?url=${e(url)}${text ? `&text=${e(text)}` : ""}`),
    },
    {
      channel: "email",
      label: "Email",
      icon: <MailIcon />,
      tile: "bg-primary-50 text-primary-600",
      run: () => go("email", `mailto:?subject=${e(title)}&body=${e(text ? `${text}\n\n${url}` : url)}`),
    },
    ...(isPhone()
      ? [
          {
            channel: "sms" as const,
            label: "Messages",
            icon: <MessageIcon />,
            tile: "bg-primary-50 text-primary-600",
            run: () => go("sms", `sms:?&body=${e(message)}`),
          },
        ]
      : []),
    {
      channel: "copy",
      label: "Copy link",
      icon: <LinkIcon />,
      tile: "bg-ivory-300 text-ink-700",
      run: async () => {
        const copied = await copy();
        if (copied) onShared?.("copy");
        toast(copied ? { title: "Link copied", tone: "confirm" } : { title: "Couldn’t copy the link", description: url, tone: "danger" });
        onClose();
      },
    },
  ];

  const canNative = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink-900/40 sm:items-center sm:p-8"
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share"
        onClick={(event) => event.stopPropagation()}
        className="flex w-full flex-col gap-5 rounded-t-2xl bg-surface px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-[400px] sm:rounded-2xl sm:p-6"
      >
        <header className="flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-semibold text-ink-800">Share</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-2 text-ink-800 transition-colors hover:bg-ivory-200"
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <ul className="grid grid-cols-4 gap-x-2 gap-y-4">
          {targets.map((target) => (
            <li key={target.channel}>
              <button
                type="button"
                onClick={() => void target.run()}
                className="group flex w-full flex-col items-center gap-1.5 rounded-lg py-1 focus-visible:outline-2 focus-visible:outline-primary-600"
              >
                <span
                  className={cn(
                    "grid size-12 place-items-center rounded-full transition-transform group-hover:scale-105",
                    target.tile,
                  )}
                >
                  {target.icon}
                </span>
                <span className="font-sans text-xs text-ink-500">{target.label}</span>
              </button>
            </li>
          ))}
        </ul>

        {/* A desktop that does have a system sheet (Safari, Edge on Windows). */}
        {canNative && !isPhone() && (
          <button
            type="button"
            onClick={() => {
              navigator
                .share({ title, text, url })
                .then(() => {
                  onShared?.("native");
                  onClose();
                })
                .catch(() => {});
            }}
            className="self-center font-ui text-sm font-semibold text-primary-600 hover:underline"
          >
            More options
          </button>
        )}
      </div>
    </div>
  );
}

/* Brand marks: simplified single-colour glyphs, drawn in currentColor. */

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden="true">
      <path d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.1-.2-.2-.5-.3Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
      <path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.5l11.2 14.5Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-7.5H16l.4-3h-2.9V8.6c0-.9.3-1.5 1.5-1.5h1.5V4.4a20 20 0 0 0-2.2-.1c-2.2 0-3.7 1.3-3.7 3.8v2.4H8v3h2.6V21h2.9Z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
      <path d="M4.98 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM3.2 9h3.6v11.5H3.2V9Zm5.9 0h3.4v1.6h.1a3.8 3.8 0 0 1 3.4-1.9c3.6 0 4.3 2.4 4.3 5.5v6.3h-3.6v-5.6c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9v5.7H9.1V9Z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden="true">
      <path d="M20.7 4.1 2.9 11c-1.2.5-1.2 1.2-.2 1.5l4.6 1.4 1.7 5.4c.2.6.4.8.8.8s.6-.2.9-.5l2.2-2.1 4.6 3.4c.8.5 1.4.2 1.6-.8l3-14.2c.3-1.3-.5-1.8-1.4-1.4ZM9.5 14.3l8.6-7.6c.4-.3-.1-.5-.6-.2L7 13.3" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H9l-5 4V5.5Z" strokeLinejoin="round" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path
        d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"
        strokeLinecap="round"
      />
    </svg>
  );
}
