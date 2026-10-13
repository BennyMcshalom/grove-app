"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export interface PressAction {
  label: string;
  run: () => void;
  danger?: boolean;
  /** Draws a rule above this item (Figma's grouped menus). */
  divider?: boolean;
}

const HOLD_MS = 450;
const MOVE_TOLERANCE = 10;
const HINT_KEY = "grouv-press-hint";

/**
 * Message options the way chat apps do it: press and hold on a phone,
 * right-click (or a two-finger tap on a trackpad) on desktop, and the menu
 * opens where you pressed. Replaces the ⋮ that sat beside each bubble.
 *
 * Wrap the bubble in this. The menu key / Shift+F10 opens it from the
 * keyboard, so it stays reachable without a pointer.
 */
export function PressMenu({
  actions,
  label = "Message options",
  className,
  children,
}: {
  /** Empty → the wrapper is inert (deleted messages, read-only chats). */
  actions: PressAction[];
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const hold = useRef<{ timer: number; x: number; y: number } | null>(null);
  // The tap that ends a long-press mustn't also follow a link or open a photo.
  const swallowClick = useRef(false);
  const enabled = actions.length > 0;

  const cancelHold = () => {
    if (hold.current) window.clearTimeout(hold.current.timer);
    hold.current = null;
  };

  useEffect(() => cancelHold, []);

  if (!enabled) return <div className={className}>{children}</div>;

  return (
    <div
      className={cn("outline-none [-webkit-touch-callout:none] focus-visible:ring-2 focus-visible:ring-primary-300", className)}
      tabIndex={0}
      aria-haspopup="menu"
      aria-label={label}
      onContextMenu={(e) => {
        e.preventDefault();
        cancelHold();
        setAt({ x: e.clientX, y: e.clientY });
      }}
      onTouchStart={(e) => {
        const touch = e.touches[0];
        if (!touch || e.touches.length > 1) return cancelHold();
        cancelHold();
        const { clientX: x, clientY: y } = touch;
        hold.current = {
          x,
          y,
          timer: window.setTimeout(() => {
            hold.current = null;
            swallowClick.current = true;
            window.getSelection?.()?.removeAllRanges();
            navigator.vibrate?.(10);
            setAt({ x, y });
          }, HOLD_MS),
        };
      }}
      onTouchMove={(e) => {
        const touch = e.touches[0];
        if (!hold.current || !touch) return;
        if (Math.hypot(touch.clientX - hold.current.x, touch.clientY - hold.current.y) > MOVE_TOLERANCE) cancelHold();
      }}
      onTouchEnd={cancelHold}
      onTouchCancel={cancelHold}
      onClickCapture={(e) => {
        if (!swallowClick.current) return;
        swallowClick.current = false;
        e.preventDefault();
        e.stopPropagation();
      }}
      onKeyDown={(e) => {
        if (e.key !== "ContextMenu" && !(e.shiftKey && e.key === "F10")) return;
        e.preventDefault();
        const box = e.currentTarget.getBoundingClientRect();
        setAt({ x: box.left + box.width / 2, y: box.top + box.height / 2 });
      }}
    >
      {children}
      {at && <Menu at={at} actions={actions} label={label} onClose={() => setAt(null)} />}
    </div>
  );
}

function Menu({
  at,
  actions,
  label,
  onClose,
}: {
  at: { x: number; y: number };
  actions: PressAction[];
  label: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  // Keep the whole menu on screen wherever the press landed.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const margin = 8;
    const { width, height } = el.getBoundingClientRect();
    setPos({
      left: Math.max(margin, Math.min(at.x, window.innerWidth - width - margin)),
      top: Math.max(margin, Math.min(at.y, window.innerHeight - height - margin)),
    });
  }, [at]);

  useEffect(() => {
    const outside = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    // Deferred so the press that opened the menu doesn't close it.
    const id = window.setTimeout(() => {
      document.addEventListener("pointerdown", outside);
      document.addEventListener("scroll", onClose, true);
    });
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onClose);
    ref.current?.querySelector("button")?.focus({ preventScroll: true });
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("scroll", onClose, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      // Clicks inside the menu aren't clicks on the bubble underneath.
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "fixed z-[70] flex w-52 flex-col rounded-xl bg-surface p-1.5 shadow-[0px_8px_24px_0px_rgba(0,0,0,0.16)]",
        !pos && "invisible",
      )}
      style={pos ?? { left: at.x, top: at.y }}
    >
      {actions.map((item) => (
        <div key={item.label} role="none" className={cn(item.divider && "mt-1 border-t border-ink-50 pt-1")}>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onClose();
              item.run();
            }}
            className={cn(
              "w-full rounded-lg px-3 py-2.5 text-left font-sans text-sm transition-colors outline-none hover:bg-ivory-100 focus-visible:bg-ivory-100",
              item.danger ? "text-destructive-60" : "text-ink-700",
            )}
          >
            {item.label}
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}

/**
 * There's no ⋮ to discover any more, so say how it works — once per device.
 * Returns the line to show, or null after it's been seen.
 */
export function usePressHint(): string | null {
  const [hint, setHint] = useState<string | null>(null);
  useEffect(() => {
    try {
      if (localStorage.getItem(HINT_KEY)) return;
      localStorage.setItem(HINT_KEY, "1");
    } catch {
      return;
    }
    const touch = window.matchMedia("(pointer: coarse)").matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- storage and pointer type only exist in the browser
    setHint(touch ? "Press and hold a message to reply, copy and more." : "Right-click a message to reply, copy and more.");
  }, []);
  return hint;
}
