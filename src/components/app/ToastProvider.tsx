"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Alert, type AlertTone } from "@/components/app/Alert";

/**
 * The alert stack — Figma reuses component set 115:7025 across every section
 * to confirm an action ("Post updated", "Invite sent", "Events created" …).
 *
 * Screens push one with `useToast()`; it renders bottom-right and auto-dismisses.
 */
export interface Toast {
  id: number;
  title: string;
  description?: string;
  tone?: AlertTone;
}

const ToastContext = createContext<(toast: Omit<Toast, "id">) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((toast: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...toast, id }]);
    window.setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      5000,
    );
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}

      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-3 sm:inset-x-auto sm:right-6 sm:bottom-6"
        >
          {toasts.map((toast) => (
            <Alert
              key={toast.id}
              tone={toast.tone ?? "info"}
              title={toast.title}
              description={toast.description}
              onClose={() =>
                setToasts((prev) => prev.filter((t) => t.id !== toast.id))
              }
              className="pointer-events-auto w-full bg-white shadow-[0px_0px_36px_0px_rgba(0,0,0,0.15)] sm:w-[394px]"
            />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
