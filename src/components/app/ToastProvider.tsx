"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Alert, type AlertTone } from "@/components/app/Alert";
import { cn } from "@/lib/cn";

/**
 * The alert stack — Figma reuses component set 115:7025 across every section
 * to confirm an action ("Post updated", "Invite sent", "Events created" …).
 *
 * Screens push one with `useToast()`; it shows bottom-right and dismisses
 * itself. Confirmations show a check (the default); `tone: "danger"` shows the
 * warning style and `tone: "info"` the "i". Several at once sit in a stack,
 * newest in front; hovering (or tapping) the stack fans them out.
 */
export interface Toast {
  id: number;
  title: string;
  description?: string;
  tone?: AlertTone;
  /** A link-style button under the text; tapping it also dismisses the toast. */
  action?: string;
  onAction?: () => void;
}

const ToastContext = createContext<(toast: Omit<Toast, "id">) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

/** How many sit visibly behind the front one. */
const STACK_DEPTH = 3;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [expanded, setExpanded] = useState(false);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { ...toast, id }]);
      window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  // Newest first: index 0 is the one in front.
  const shown = [...toasts].reverse().slice(0, STACK_DEPTH + 1);

  return (
    <ToastContext.Provider value={push}>
      {children}

      {shown.length > 0 && (
        <div
          aria-live="polite"
          onMouseEnter={() => setExpanded(true)}
          onMouseLeave={() => setExpanded(false)}
          onClick={() => setExpanded(true)}
          className={cn(
            "fixed inset-x-4 bottom-4 z-[60] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[394px]",
            expanded ? "flex flex-col-reverse gap-3" : "grid",
          )}
        >
          {shown.map((toast, index) => (
            <div
              key={toast.id}
              className="transition-all duration-300 ease-out"
              style={
                expanded
                  ? undefined
                  : {
                      // Every card shares one cell; the older ones peek out above.
                      gridArea: "1 / 1",
                      alignSelf: "end",
                      zIndex: STACK_DEPTH + 1 - index,
                      transform: `translateY(${-index * 10}px) scale(${1 - index * 0.05})`,
                      transformOrigin: "bottom center",
                      opacity: index > STACK_DEPTH - 1 ? 0 : 1 - index * 0.15,
                      pointerEvents: index === 0 ? "auto" : "none",
                    }
              }
            >
              <Alert
                tone={toast.tone === "danger" ? "danger" : toast.tone === "info" ? "info" : "success"}
                title={toast.title}
                description={index === 0 || expanded ? toast.description : undefined}
                action={toast.action}
                onAction={
                  toast.onAction &&
                  (() => {
                    toast.onAction?.();
                    dismiss(toast.id);
                  })
                }
                onClose={() => {
                  dismiss(toast.id);
                  if (toasts.length <= 1) setExpanded(false);
                }}
                className="w-full max-w-none bg-surface shadow-[0px_8px_28px_0px_rgba(0,0,0,0.14)]"
              />
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
