"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Chapter } from "@/lib/chapters";

/**
 * Close chapter — Figma frames 172:4378 (intro), /1 172:4397, /2 172:4472,
 * /3 172:4507 and /Reflection 172:4541.
 *
 * Five 660px steps: the intro, three questions each with Continue and Skip,
 * then the free reflection and "Close this Chapter". All copy is Figma's,
 * including its "Question 2 of 3" label repeated on the third question.
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

export function CloseChapterWizard({
  chapter,
  onClose,
  onFinish,
}: {
  chapter: Chapter;
  onClose: () => void;
  onFinish: () => void;
}) {
  // 0 = intro, 1-3 = questions, 4 = reflection.
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(["", "", ""]);
  const [reflections, setReflections] = useState([""]);

  const question = QUESTIONS[step - 1];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Close ${chapter.name}`}
        onClick={(e) => e.stopPropagation()}
        className="my-auto flex w-full max-w-[660px] flex-col gap-6 rounded-2xl bg-white p-6 sm:p-8"
      >
        {step === 0 ? (
          <>
            <div className="flex justify-end">
              <CloseButton onClick={onClose} />
            </div>
            <div className="flex flex-col items-center gap-4">
              <Image
                src={chapter.icon}
                alt=""
                width={56}
                height={56}
                className="size-12"
              />
              <div className="flex flex-col items-center gap-2 text-center">
                <h2 className="font-display text-3xl font-semibold text-[#101928]">
                  Before you close this chapter.
                </h2>
                <p className="font-sans text-base text-ink-400">
                  Take your time. Answer what you want. Leave what you
                  don&rsquo;t.
                </p>
              </div>
            </div>
            <div className="border-t border-ink-50 pt-6">
              <Button size="sm" fullWidth onClick={() => setStep(1)}>
                Begin
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
                  className="size-12"
                />
                <h2 className="font-display text-2xl font-semibold text-ink-800">
                  {chapter.name}
                </h2>
              </span>
              <CloseButton onClick={onClose} />
            </header>

            {question ? (
              <>
                <div className="flex flex-col items-center gap-2.5 text-center">
                  <p className="font-sans text-lg text-ink-200">
                    {question.step}
                  </p>
                  <h3 className="font-display text-3xl font-semibold text-[#1F2937]">
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
                  <p className="font-sans text-lg text-ink-200">
                    Anything else?
                  </p>
                  <h3 className="font-display text-3xl font-semibold text-[#1F2937]">
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
                  <Button size="sm" fullWidth onClick={onFinish}>
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
