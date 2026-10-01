"use client";

import { useEffect, useState, useTransition } from "react";
import { usePaywall } from "@/components/app/pass/PaywallProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { CheckCircleIcon, PencilIcon, QuoteIcon, ShareIcon } from "@/components/app/wrapped/icons";
import { FormError } from "@/components/auth/FormError";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { Button } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Media";
import { ModalClose } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { saveWrapMoment } from "@/lib/wrapped-actions";
import { momentDateLabel, wrapRangeLabel, type Wrap } from "@/lib/wrapped";

/**
 * The Wrapped viewer — Figma 942:17773 (Ready), 1349:29125 (Editing),
 * 1351:29202 (Saving) and 1351:29279 / 1420:22717 (Saved).
 *
 * Story-style: a progress bar per moment, the wrap's title and range, the
 * moment's photo and words, Back / Next, and "Edit this wrap" / "Share".
 * Editing changes the wrap's copy of the moment; the member can tick "Also
 * update it in my Grouv Log" to change the memory itself (PRD: "source
 * memory update"). Editing and sharing need the Season Pass; viewing doesn't.
 */
export function WrapViewer({
  wrap,
  index,
  onIndex,
  onEdited,
  onShare,
  onClose,
}: {
  wrap: Wrap;
  index: number;
  onIndex: (index: number) => void;
  onEdited: (momentId: string, body: string) => void;
  onShare: () => void;
  onClose: () => void;
}) {
  const { hasPass } = useViewer();
  const paywall = usePaywall();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [updateSource, setUpdateSource] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [saving, startSaving] = useTransition();

  const moment = wrap.moments[index];
  const total = wrap.moments.length;
  const last = index === total - 1;

  // The arrow keys flick through moments, like a story.
  useEffect(() => {
    if (editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && index < total - 1) onIndex(index + 1);
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, index, total, onIndex]);

  const go = (next: number) => {
    setSaved(null);
    setEditing(false);
    onIndex(next);
  };

  const gated = (action: () => void) => () => (hasPass ? action() : paywall("wrapped"));

  const startEditing = gated(() => {
    setDraft(moment.body ?? "");
    setUpdateSource(false);
    setError(undefined);
    setSaved(null);
    setEditing(true);
  });

  const save = () => {
    setError(undefined);
    startSaving(async () => {
      const result = await saveWrapMoment({ momentId: moment.id, body: draft, updateSource });
      if ("error" in result) {
        if (result.reason === "pass") paywall("wrapped");
        setError(result.error);
        return;
      }
      onEdited(moment.id, draft.trim());
      setEditing(false);
      setSaved(result.sourceUpdated ? "Memory updated" : "Wrap updated");
    });
  };

  return (
    <>
      <header className="flex items-center justify-between gap-4">
        <div className="flex gap-2" aria-hidden="true">
          {wrap.moments.map((m, i) => (
            <span
              key={m.id}
              className={cn("h-1 w-7 rounded-full sm:w-10", i <= index ? "bg-primary-500" : "bg-primary-200")}
            />
          ))}
        </div>
        <ModalClose onClose={onClose} />
      </header>

      <div className="flex flex-col gap-1">
        <p className="font-sans text-xs font-medium tracking-wide text-primary-600 uppercase">Your Life Wrapped</p>
        <h2 className="font-display text-2xl font-semibold text-ink-800">{wrap.title}</h2>
        <p className="font-sans text-sm text-ink-300">{wrapRangeLabel(wrap.range, wrap.startsOn, wrap.endsOn)}</p>
      </div>

      {saved && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-success-5 px-4 py-3 font-sans text-sm text-success-70">
          <CheckCircleIcon className="size-5 text-success-60" />
          {saved}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {moment.photoUrl && (
          <div className="relative aspect-[596/260] w-full overflow-hidden rounded-2xl bg-ink-800">
            <Photo src={moment.photoUrl} alt="" fill unoptimized sizes="600px" className="object-cover" />
          </div>
        )}
        <p className="font-sans text-xs text-ink-300">From your Grouv Log · {momentDateLabel(moment.date)}</p>
      </div>

      {editing ? (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-2 rounded-lg border border-dashed border-primary-400 p-4">
            <QuoteIcon className="size-5 text-primary-600" />
            <span className="sr-only">This moment</span>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={2000}
              rows={3}
              autoFocus
              className="w-full resize-none bg-transparent font-sans text-base text-ink-700 outline-none"
            />
          </label>
          {moment.sourceEditable && (
            <label className="flex cursor-pointer items-center gap-2 font-sans text-sm text-ink-400">
              <input
                type="checkbox"
                checked={updateSource}
                onChange={(e) => setUpdateSource(e.target.checked)}
                className="size-4 accent-primary-500"
              />
              Also update this memory in my Grouv Log
            </label>
          )}
          <FormError message={error} />
          <div className="flex justify-end gap-2">
            <Button variant="tertiary" size="sm" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" loading={saving} onClick={save} iconRight={<ArrowRight className="size-4" />}>
              {saving ? "Saving….." : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {moment.body && (
            <div className="flex flex-col gap-2">
              <QuoteIcon className="size-5 text-primary-600" />
              <p className="font-sans text-base whitespace-pre-line text-ink-700">{moment.body}</p>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            {index > 0 ? (
              <Button variant="secondary" size="sm" onClick={() => go(index - 1)}>
                Back
              </Button>
            ) : (
              <span />
            )}
            {last ? (
              <Button size="sm" onClick={onClose}>
                Done
              </Button>
            ) : (
              <Button size="sm" onClick={() => go(index + 1)} iconRight={<ArrowRight className="size-4" />}>
                Next
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-sans text-sm text-ink-300">
              Moment {index + 1} of {total}
            </p>
            <div className="flex items-center gap-1">
              {!saved && (
                <Button variant="tertiary" size="sm" onClick={startEditing} iconLeft={<PencilIcon />}>
                  Edit this wrap
                </Button>
              )}
              <Button variant="tertiary" size="sm" onClick={gated(onShare)} iconLeft={<ShareIcon />}>
                Share
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
