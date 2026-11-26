"use client";

import { useState } from "react";
import { JoinSpaceModal } from "@/components/app/JoinSpaceModal";
import { usePaywall } from "@/components/app/pass/PaywallProvider";
import { useToast } from "@/components/app/ToastProvider";
import { joinSpace } from "@/app/(app)/spaces/actions";
import { cn } from "@/lib/cn";
import type { Chapter } from "@/lib/chapters";

/** Join a Space: the same flow (and Free's four-Space limit) as before. */
export function JoinSpaceButton({ chapter, className }: { chapter: Chapter; className?: string }) {
  const [joining, setJoining] = useState(false);
  const paywall = usePaywall();
  const toast = useToast();

  return (
    <>
      <button
        type="button"
        onClick={() => setJoining(true)}
        className={cn(
          "shrink-0 rounded-full bg-ink-800 px-4 py-1.5 font-sans text-sm font-semibold text-white transition-colors hover:bg-ink-700",
          className,
        )}
      >
        Join
      </button>
      {joining && (
        <JoinSpaceModal
          chapter={chapter}
          onClose={() => setJoining(false)}
          onJoin={async ([phase]) => {
            const result = await joinSpace(chapter.slug, phase);
            if (result.limit) {
              setJoining(false);
              paywall("space_limit");
              return {};
            }
            if (result.error) return result;
            setJoining(false);
            toast({ title: `You joined ${chapter.name}` });
            return {};
          }}
        />
      )}
    </>
  );
}
