"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { usePaywall } from "@/components/app/pass/PaywallProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { BookIcon, PlusIcon, PreparingIcon, WarningIcon } from "@/components/app/wrapped/icons";
import { WrapShareFlow } from "@/components/app/wrapped/WrapShareFlow";
import { WrapViewer } from "@/components/app/wrapped/WrapViewer";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { Button } from "@/components/ui/Button";
import { Modal, ModalClose, ModalHeader, ModalStatus } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { getChapter } from "@/lib/chapters";
import { cn } from "@/lib/cn";
import { localDay } from "@/lib/log";
import { generateWrap, getWrap, getWrapChoices, type GenerateWrapInput } from "@/lib/wrapped-actions";
import { wrapRangeLabel, type Wrap, type WrapChoices } from "@/lib/wrapped";

/**
 * Life Wrapped — Figma section "Wrap view" 942:17890.
 *
 * One dialog for the whole flow: 1328:22595 Choose a time range, a closed
 * chapter picker, 1180:20462 Choose what to include, 942:17810 Preparing,
 * 1348:28377 Generation failed, 942:17849 Not enough moments, then the viewer
 * (942:17773) and the share steps (1483:*).
 *
 * `start` picks the entry: a wrap to open, a closed chapter to wrap (from the
 * Archive; `share` jumps to sharing once it's ready), or nothing for the
 * range picker.
 */
export type WrappedStart =
  | { wrapId: string; share?: boolean }
  | { chapterId: string; share?: boolean }
  | null;

type Step =
  | { name: "range" }
  | { name: "chapter" }
  | { name: "sources"; range: "week" | "month" }
  | { name: "preparing"; request: GenerateWrapInput }
  | { name: "failed"; request: GenerateWrapInput }
  | { name: "not_enough" }
  | { name: "loading" }
  | { name: "missing" }
  | { name: "view" | "share"; wrap: Wrap; index: number };

const RANGES = [
  { value: "week", label: "This week", hint: "The days you’ve had so far this week" },
  { value: "month", label: "This month", hint: "Everything from the past few weeks" },
  { value: "chapter", label: "A completed chapter", hint: "Pick one of your finished chapters to revisit" },
] as const;

export function WrappedFlow({ start, onClose }: { start: WrappedStart; onClose: () => void }) {
  const viewer = useViewer();
  const router = useRouter();
  const paywall = usePaywall();
  const [step, setStep] = useState<Step>(() =>
    !start
      ? { name: "range" }
      : "chapterId" in start
        ? { name: "preparing", request: { range: "chapter", userChapterId: start.chapterId } }
        : { name: "loading" },
  );
  const [choices, setChoices] = useState<WrapChoices | null>(null);
  const [range, setRange] = useState<"week" | "month" | "chapter" | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [sources, setSources] = useState<string[] | null>(null);
  const [, startWork] = useTransition();

  const run = (request: GenerateWrapInput, share = false) => {
    setStep({ name: "preparing", request });
    startWork(async () => {
      const result = await generateWrap(request);
      if ("wrap" in result) {
        setStep({ name: share ? "share" : "view", wrap: result.wrap, index: 0 });
      } else if (result.reason === "not_enough") {
        setStep({ name: "not_enough" });
      } else if (result.reason === "pass") {
        onClose();
        paywall("wrapped");
      } else {
        setStep({ name: "failed", request });
      }
    });
  };

  // Entry from a notification, the Home card or the Archive.
  useEffect(() => {
    if (!start) return;
    let live = true;
    if ("wrapId" in start) {
      getWrap(start.wrapId).then((wrap) => {
        if (!live) return;
        setStep(wrap ? { name: start.share ? "share" : "view", wrap, index: 0 } : { name: "missing" });
      });
    } else {
      // Generating a chapter's wrap returns the existing one when there is.
      generateWrap({ range: "chapter", userChapterId: start.chapterId }).then((result) => {
        if (!live) return;
        if ("wrap" in result) setStep({ name: start.share ? "share" : "view", wrap: result.wrap, index: 0 });
        else if (result.reason === "not_enough") setStep({ name: "not_enough" });
        else if (result.reason === "pass") {
          onClose();
          paywall("wrapped");
        } else setStep({ name: "failed", request: { range: "chapter", userChapterId: start.chapterId } });
      });
    }
    return () => {
      live = false;
    };
    // Runs once for the entry the dialog was opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The pickers need the member's chapters.
  useEffect(() => {
    if (start) return;
    let live = true;
    getWrapChoices().then((c) => {
      if (live) setChoices(c);
    });
    return () => {
      live = false;
    };
  }, [start]);

  const selectedSources = sources ?? choices?.sources.map((s) => s.id) ?? [];

  return (
    <Modal label="Life Wrapped" onClose={onClose}>
      {step.name === "range" && (
        <>
          <ModalHeader title="Choose a time range" onClose={onClose} />
          <p className="-mt-2 font-sans text-sm text-ink-300">Pick what your Life Wrapped should cover.</p>
          <div className="flex flex-col gap-4">
            {RANGES.map((r) => (
              <OptionCard
                key={r.value}
                label={r.label}
                hint={r.hint}
                checked={range === r.value}
                disabled={r.value === "chapter" && choices !== null && choices.closed.length === 0}
                onSelect={() => setRange(r.value)}
              />
            ))}
            {choices?.closed.length === 0 && (
              <p className="font-sans text-xs text-ink-300">Close a chapter to wrap it up here.</p>
            )}
          </div>
          <Button
            size="sm"
            fullWidth
            disabled={!range || !choices}
            onClick={() => {
              if (!viewer.hasPass) {
                onClose();
                paywall("wrapped");
              } else if (range === "chapter") setStep({ name: "chapter" });
              else if (range) setStep({ name: "sources", range });
            }}
          >
            Continue
          </Button>
        </>
      )}

      {step.name === "chapter" && choices && (
        <>
          <ModalHeader title="Pick a chapter" onClose={onClose} />
          <p className="-mt-2 font-sans text-sm text-ink-300">Which finished chapter should your Wrapped revisit?</p>
          <div className="flex flex-col gap-4">
            {choices.closed.map((c) => (
              <OptionCard
                key={c.id}
                label={`${getChapter(c.slug)?.name ?? "Chapter"} · ${c.phase}`}
                hint={wrapRangeLabel("chapter", c.openedAt, c.closedAt)}
                checked={chapterId === c.id}
                onSelect={() => setChapterId(c.id)}
              />
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              fullWidth
              disabled={!chapterId}
              onClick={() => chapterId && run({ range: "chapter", userChapterId: chapterId })}
              iconRight={<ArrowRight className="size-4" />}
            >
              Continue
            </Button>
            <Button variant="tertiary" size="sm" fullWidth onClick={() => setStep({ name: "range" })}>
              Back
            </Button>
          </div>
        </>
      )}

      {step.name === "sources" && choices && (
        <>
          <ModalHeader title="Choose what to include" onClose={onClose} />
          <p className="-mt-2 font-sans text-base text-ink-400">
            Pick the memories and chapters your Wrapped should pull from.
          </p>
          {choices.sources.length === 0 ? (
            <p className="font-sans text-sm text-ink-300">Open a chapter to start logging moments.</p>
          ) : (
            <div className="flex flex-col gap-5">
              {choices.sources.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedSources.includes(s.id)}
                    onChange={(e) =>
                      setSources(
                        e.target.checked
                          ? [...selectedSources, s.id]
                          : selectedSources.filter((id) => id !== s.id),
                      )
                    }
                    className="size-4 shrink-0 accent-primary-500"
                  />
                  <span className="font-sans text-base text-ink-800">
                    {s.phase}
                    <span className="text-ink-300"> · {getChapter(s.slug)?.name ?? s.slug}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              fullWidth
              disabled={selectedSources.length === 0}
              onClick={() => run({ range: step.range, sourceIds: selectedSources, today: localDay() })}
              iconRight={<ArrowRight className="size-4" />}
            >
              Continue
            </Button>
            <Button variant="tertiary" size="sm" fullWidth onClick={() => setStep({ name: "range" })}>
              Back
            </Button>
          </div>
        </>
      )}

      {(step.name === "preparing" || ((step.name === "chapter" || step.name === "sources") && !choices)) && (
        <>
          <div className="flex justify-end">
            <ModalClose onClose={onClose} />
          </div>
          <div className="flex flex-col items-center gap-3 py-16 text-center" role="status">
            <PreparingIcon className="size-12 animate-pulse text-primary-500" />
            <h2 className="font-display text-2xl font-semibold text-ink-800">Putting your wrap together…</h2>
            <p className="font-sans text-base text-ink-300">This usually takes a few seconds.</p>
          </div>
        </>
      )}

      {step.name === "failed" && (
        <>
          <div className="flex justify-end">
            <ModalClose onClose={onClose} />
          </div>
          <ModalStatus icon={<WarningIcon className="size-8" />} tone="danger" title="We couldn’t put this together">
            Something went wrong on our end. Your memories are safe — let’s try again.
          </ModalStatus>
          <Button size="sm" fullWidth className="mt-16" onClick={() => run(step.request)}>
            Try again
          </Button>
        </>
      )}

      {step.name === "not_enough" && (
        <>
          <div className="flex justify-end">
            <ModalClose onClose={onClose} />
          </div>
          <ModalStatus icon={<BookIcon />} title="Not enough moments yet">
            Save a few more updates to this chapter and your Wrapped will be ready to view.
          </ModalStatus>
          <div className="mt-24 flex items-center justify-between gap-4">
            <Button variant="tertiary" size="sm" onClick={onClose}>
              Not now
            </Button>
            <Button
              size="sm"
              iconLeft={<PlusIcon />}
              onClick={() => {
                onClose();
                router.push("/log");
              }}
            >
              Add a memory
            </Button>
          </div>
        </>
      )}

      {step.name === "loading" && (
        <div className="flex flex-col gap-4" aria-busy="true">
          <div className="flex items-center justify-between">
            <Skeleton className="h-1 w-48" />
            <ModalClose onClose={onClose} />
          </div>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="aspect-[596/260] w-full rounded-2xl" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      )}

      {step.name === "missing" && (
        <>
          <div className="flex justify-end">
            <ModalClose onClose={onClose} />
          </div>
          <ModalStatus icon={<BookIcon />} title="This wrap isn’t here anymore">
            It may have been removed when a chapter was reopened.
          </ModalStatus>
          <Button size="sm" fullWidth onClick={onClose}>
            Close
          </Button>
        </>
      )}

      {step.name === "view" && (
        <WrapViewer
          wrap={step.wrap}
          index={step.index}
          onIndex={(index) => setStep({ ...step, index })}
          onEdited={(momentId, body) =>
            setStep({
              ...step,
              wrap: {
                ...step.wrap,
                moments: step.wrap.moments.map((m) => (m.id === momentId ? { ...m, body: body || null } : m)),
              },
            })
          }
          onShare={() => setStep({ name: "share", wrap: step.wrap, index: step.index })}
          onClose={onClose}
        />
      )}

      {step.name === "share" && (
        <WrapShareFlow
          wrap={step.wrap}
          initialIndex={step.index}
          firstName={viewer.firstName}
          onBack={() => setStep({ name: "view", wrap: step.wrap, index: step.index })}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

/** Figma's option rows: a checkbox, a label and a hint on an ivory card. */
function OptionCard({
  label,
  hint,
  checked,
  disabled,
  onSelect,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-4 rounded-lg border bg-ivory-200 px-4 py-4 transition-colors",
        checked ? "border-primary-400" : "border-ivory-500",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input
        type="radio"
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        className="size-4 shrink-0 accent-primary-500"
      />
      <span className="flex flex-col gap-1">
        <span className="font-sans text-base text-ink-800">{label}</span>
        <span className="font-sans text-sm text-ink-300">{hint}</span>
      </span>
    </label>
  );
}
