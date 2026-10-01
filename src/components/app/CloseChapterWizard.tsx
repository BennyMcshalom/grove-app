"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { SendIcon, SpinnerIcon } from "@/components/app/wrapped/icons";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import type { Chapter } from "@/lib/chapters";
import { finishChapter, generateWrap, undoCloseChapter } from "@/lib/wrapped-actions";

/**
 * Close chapter — Figma frames 172:4378 (Review before closing), /1 172:4397,
 * /2 172:4472, /3 172:4507, /Reflection 172:4541, then 1183:20555 (Wrapped
 * still preparing) and 1183:20540 (Completed).
 *
 * The review, three questions each with Continue and Skip, the free
 * reflection and "Close this Chapter". The chapter moves to the Life Archive
 * at once; with the Season Pass its wrap is made next ("still on its way"
 * while that runs). "Undo" works for the first few minutes. All copy is
 * Figma's, including its "Question 2 of 3" label repeated on the third
 * question.
 */
const QUESTIONS = [
  {
    step: "Question 1 of 3",
    question: "What did this chapter teach you?",
    label: "WHAT SHIFTED IN YOU THIS PERIOD?",
    next: "Continue",
  },
  {
    step: "Question 2 of 3",
    question: "What would you tell someone starting where you started?",
    label: "THE HONEST THING YOU WISH YOU’D KNOWN...... ",
    next: "Continue",
  },
  {
    // Figma's third step is also labelled "Question 2 of 3" (172:4518).
    step: "Question 2 of 3",
    question: "Who or what from this chapter are you carrying forward?",
    label: "PEOPLE, LESSONS, HOBBIES......",
    next: "One last thing",
  },
];

export interface ChapterClosingAnswers {
  taught: string;
  advice: string;
  carryingForward: string;
  reflections: string[];
}

export function CloseChapterWizard({
  chapter,
  userChapterId,
  onClose,
  onClosed,
  onReopened,
}: {
  chapter: Chapter;
  /** The held chapter being closed. */
  userChapterId: string;
  onClose: () => void;
  /** The chapter is closed (the closing screens are still showing). */
  onClosed?: () => void;
  /** Undo put it back. */
  onReopened?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const { hasPass } = useViewer();
  // 0 = review, 1-3 = questions, 4 = reflection.
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(["", "", ""]);
  const [reflections, setReflections] = useState([""]);
  const [error, setError] = useState<string>();
  const [closing, startClosing] = useTransition();
  const [undoing, startUndoing] = useTransition();
  // After "Close this Chapter": the wrap on its way, then the closed screen.
  const [phase, setPhase] = useState<"asking" | "wrapping" | "closed">("asking");
  const [hasWrap, setHasWrap] = useState(false);

  const finish = () => {
    setError(undefined);
    startClosing(async () => {
      const [taught, advice, carryingForward] = answers;
      const result = await finishChapter({ userChapterId, taught, advice, carryingForward, reflections });
      if (result.error) {
        setError(result.error);
        return;
      }
      onClosed?.();
      if (!hasPass) {
        setPhase("closed");
        return;
      }
      // The chapter is in the Archive already; its wrap follows (PRD §7).
      setPhase("wrapping");
      const wrap = await generateWrap({ range: "chapter", userChapterId });
      setHasWrap("wrap" in wrap);
      setPhase((p) => (p === "wrapping" ? "closed" : p));
    });
  };

  // Once closed, leaving refreshes the page underneath (the card moves to the Archive).
  const leave = (href?: string) => {
    onClose();
    if (href) router.push(href);
    else router.refresh();
  };

  const undo = () => {
    setError(undefined);
    startUndoing(async () => {
      const result = await undoCloseChapter(userChapterId);
      if (result.error) {
        setError(result.error);
        return;
      }
      onReopened?.();
      toast({ title: `${chapter.name} is open again` });
      leave();
    });
  };

  const question = QUESTIONS[step - 1];
  const dismiss = phase === "asking" ? onClose : () => leave();

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center scroll-slim overflow-y-auto bg-ink-900/40 p-4 sm:p-8"
      onClick={dismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Close ${chapter.name}`}
        onClick={(e) => e.stopPropagation()}
        className="my-auto flex w-full max-w-[660px] flex-col gap-6 rounded-2xl bg-surface p-6 sm:p-8"
      >
        {phase === "wrapping" ? (
          // Figma 1183:20555 — Chapter closed, Wrapped still preparing.
          <>
            <div className="flex justify-end">
              <CloseButton onClick={dismiss} />
            </div>
            <div className="flex flex-col items-center gap-3 py-10 text-center" role="status">
              <SpinnerIcon className="size-9 animate-spin text-primary-500" />
              <h2 className="font-display text-2xl font-semibold text-ink-700">
                Chapter closed — Wrapped still on its way
              </h2>
              <p className="font-sans text-sm text-ink-300">
                We&rsquo;ll notify you the moment it&rsquo;s ready. You can close this and come back anytime.
              </p>
            </div>
            <div className="border-t border-ink-50 pt-6">
              <Button size="sm" fullWidth onClick={dismiss}>
                Close
              </Button>
            </div>
          </>
        ) : phase === "closed" ? (
          // Figma 1183:20540 — Chapter closed.
          <>
            <div className="flex justify-end">
              <CloseButton onClick={dismiss} />
            </div>
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-primary-100 text-primary-600">
                <SendIcon />
              </span>
              <h2 className="font-display text-2xl font-semibold text-ink-700">Chapter closed</h2>
              <p className="max-w-[480px] font-sans text-sm text-ink-400">
                &ldquo;{chapter.name}&rdquo; is now part of your Life Archive.{" "}
                {hasWrap ? "Your Wrapped and memories are saved" : "Your memories are saved"} and stay readable
                anytime. If you begin another chapter, the connections you&rsquo;ve formed don&rsquo;t get left
                behind, they move into whatever you start next.
              </p>
            </div>
            <div className="flex flex-col gap-2 border-t border-ink-50 pt-6">
              <FormError message={error} />
              <Button size="sm" fullWidth onClick={() => leave(`/archive/${userChapterId}`)}>
                View in Life Archive
              </Button>
              <Button variant="secondary" size="sm" fullWidth onClick={() => leave("/spaces")}>
                Begin another chapter
              </Button>
              <Button variant="tertiary" size="sm" fullWidth loading={undoing} onClick={undo}>
                Undo
              </Button>
            </div>
          </>
        ) : step === 0 ? (
          // Figma 172:4378 — Review before closing.
          <>
            <div className="flex justify-end">
              <CloseButton onClick={onClose} />
            </div>
            <div className="flex flex-col items-center gap-4 pb-10">
              <span className="grid size-14 place-items-center rounded-full bg-primary-100">
                <Image src={chapter.icon} alt="" width={56} height={56} className="size-7" />
              </span>
              <div className="flex flex-col items-center gap-3 text-center">
                <h2 className="font-display text-2xl font-semibold text-ink-700">Close this chapter?</h2>
                <p className="max-w-[440px] font-sans text-sm text-ink-400">
                  Closing a chapter doesn&rsquo;t end anything else — your active Bonds stay exactly as they are. If
                  you begin another chapter right away, those same connections carry straight into it.
                </p>
              </div>
            </div>
            <div className="border-t border-ink-50 pt-6">
              <Button size="sm" fullWidth onClick={() => setStep(1)}>
                Continue
              </Button>
            </div>
          </>
        ) : (
          <>
            <header className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2">
                <Image
                  src={chapter.icon}
                  alt=""
                  width={56}
                  height={56}
                  className="size-10"
                />
                <h2 className="font-display text-xl font-semibold text-ink-800">
                  {chapter.name}
                </h2>
              </span>
              <CloseButton onClick={onClose} />
            </header>

            {question ? (
              <>
                <div className="flex flex-col items-center gap-2.5 text-center">
                  <p className="font-sans text-sm text-ink-200">
                    {question.step}
                  </p>
                  <h3 className="font-display text-2xl font-semibold text-ink-700">
                    {question.question}
                  </h3>
                </div>

                <label className="flex h-[210px] flex-col gap-1.5">
                  <span className="font-sans text-sm font-medium text-ink-500">
                    {question.label}
                  </span>
                  <textarea
                    value={answers[step - 1]}
                    onChange={(e) =>
                      setAnswers((prev) =>
                        prev.map((a, i) => (i === step - 1 ? e.target.value : a)),
                      )
                    }
                    className={`${FIELD} flex-1`}
                  />
                </label>

                <div className="flex flex-col gap-2 border-t border-ink-50 pt-6">
                  <Button size="sm" fullWidth onClick={() => setStep(step + 1)}>
                    {question.next}
                  </Button>
                  <Button
                    variant="tertiary"
                    size="sm"
                    fullWidth
                    onClick={() => setStep(step + 1)}
                  >
                    Skip
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col items-center gap-2 text-center">
                  <p className="font-sans text-sm text-ink-200">
                    Anything else?
                  </p>
                  <h3 className="font-display text-2xl font-semibold text-ink-700">
                    Anything else you want to record?
                  </h3>
                </div>

                <div className="flex flex-col">
                  {reflections.map((value, i) => (
                    <label key={i} className="flex h-[116px] flex-col gap-1.5">
                      <span className="font-sans text-sm font-medium text-ink-500">
                        ADD REFLECTION
                      </span>
                      <textarea
                        value={value}
                        onChange={(e) =>
                          setReflections((prev) =>
                            prev.map((r, j) => (j === i ? e.target.value : r)),
                          )
                        }
                        className={`${FIELD} flex-1`}
                      />
                    </label>
                  ))}
                  <button
                    type="button"
                    onClick={() => setReflections((prev) => [...prev, ""])}
                    className="flex items-center justify-center gap-2 py-2 font-ui text-sm font-medium text-primary-800 transition-colors hover:underline"
                  >
                    <PlusIcon />
                    Add More Reflection
                  </button>
                </div>

                <div className="flex flex-col gap-2 border-t border-ink-50 pt-6">
                  <FormError message={error} />
                  <Button size="sm" fullWidth loading={closing} onClick={finish}>
                    Close this Chapter
                  </Button>
                  <Button
                    variant="tertiary"
                    size="sm"
                    fullWidth
                    onClick={onClose}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const FIELD =
  "w-full resize-none rounded-lg bg-ivory-100 px-3.5 py-2.5 font-sans text-xs text-ink-300 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline-none focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]";

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className="shrink-0 rounded p-3 text-ink-800 transition-colors hover:bg-ivory-200"
    >
      <svg viewBox="0 0 16 16" fill="none" className="size-5" aria-hidden="true">
        <path
          d="m3.5 3.5 9 9m0-9-9 9"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
      <path
        d="M8 3.5v9M3.5 8h9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
