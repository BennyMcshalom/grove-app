"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { usePaywall } from "@/components/app/pass/PaywallProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { ClapperIcon } from "@/components/app/wrapped/icons";
import { WrappedFlow, type WrappedStart } from "@/components/app/wrapped/WrappedFlow";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { getWrapChoices } from "@/lib/wrapped-actions";
import type { WrapSummary } from "@/lib/wrapped";

/**
 * "YOUR LIFE WRAPPED" — the card at the top of the Grouv Log (Figma 246:6061,
 * under the chapter tabs). Opens the newest wrap when it's fresh, otherwise
 * starts a new one. Also opens `?wrap=<id>`, which notifications and the Home
 * card link to.
 */
const FRESH_MS = 7 * 86_400_000;

export function WrappedLogCard() {
  const { hasPass } = useViewer();
  const paywall = usePaywall();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const linked = params.get("wrap");
  const [latest, setLatest] = useState<WrapSummary | null | undefined>(undefined);
  const [fresh, setFresh] = useState(false);
  const [open, setOpen] = useState<WrappedStart | false>(linked ? { wrapId: linked } : false);

  // A notification can link here while the Log is already open.
  const [seenLink, setSeenLink] = useState(linked);
  if (linked !== seenLink) {
    setSeenLink(linked);
    if (linked) setOpen({ wrapId: linked });
  }

  useEffect(() => {
    let live = true;
    getWrapChoices().then((c) => {
      if (!live) return;
      setLatest(c.latest);
      setFresh(Boolean(c.latest && Date.now() - Date.parse(c.latest.createdAt) < FRESH_MS));
    });
    return () => {
      live = false;
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    if (linked) router.replace(pathname, { scroll: false });
  };

  const create = () => (hasPass ? setOpen(null) : paywall("wrapped"));

  const period = latest?.range === "week" ? "This week’s" : latest?.range === "month" ? "This month’s" : "Your chapter’s";

  return (
    <>
      <section className="flex w-full items-center gap-4 rounded-lg bg-surface p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ivory-300 text-ink-700">
          <ClapperIcon />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-sans text-base font-medium tracking-wide text-primary-600 uppercase">
            Your Life Wrapped
          </span>
          {latest === undefined ? (
            <Skeleton className="h-3.5 w-48" />
          ) : (
            <span className="font-sans text-sm text-ink-300">
              {fresh ? `${period} story is ready to view` : "Turn your moments into a short story"}
            </span>
          )}
        </span>
        {latest !== undefined && (
          <span className="flex shrink-0 items-center gap-1">
            {fresh && latest ? (
              <>
                <Button variant="tertiary" size="sm" onClick={create} className="hidden sm:inline-flex">
                  New
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setOpen({ wrapId: latest.id })}>
                  View Wrap
                </Button>
              </>
            ) : (
              <Button variant="secondary" size="sm" onClick={create}>
                Create
              </Button>
            )}
          </span>
        )}
      </section>

      {open !== false && <WrappedFlow start={open} onClose={close} />}
    </>
  );
}
