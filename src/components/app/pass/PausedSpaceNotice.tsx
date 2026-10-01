"use client";

import { useTransition } from "react";
import { useToast } from "@/components/app/ToastProvider";
import { useSpaceChooser } from "@/components/app/pass/PaywallProvider";
import { Button } from "@/components/ui/Button";
import { resumeSpace } from "@/lib/pass-actions";

/**
 * A paused Space's view (PRD §13): everything stays readable; this floating
 * note says why posting is off and offers "Reactivate". Fixed, so it sits over
 * SpaceView without changing its layout.
 */
export function PausedSpaceNotice({ userChapterId, name }: { userChapterId: string; name: string }) {
  const toast = useToast();
  const chooseSpaces = useSpaceChooser();
  const [pending, startPending] = useTransition();

  const reactivate = () =>
    startPending(async () => {
      const result = await resumeSpace(userChapterId);
      if (result.full) return chooseSpaces(userChapterId);
      toast(result.error ? { title: result.error, tone: "danger" } : { title: `${name} is active again`, tone: "confirm" });
    });

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-24 z-30 mx-auto flex max-w-[560px] items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-lg ring-1 ring-ivory-600 lg:bottom-6"
    >
      <span className="rounded-pill bg-ivory-300 px-2 py-0.5 font-sans text-[11px] font-medium text-ink-400 uppercase">
        Paused
      </span>
      <span className="min-w-0 flex-1 font-sans text-xs text-ink-400">
        Everything here is kept. Reactivate {name} to post or log again.
      </span>
      <Button size="sm" loading={pending} onClick={reactivate} className="shrink-0">
        Reactivate
      </Button>
    </div>
  );
}
