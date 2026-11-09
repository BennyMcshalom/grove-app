"use client";

import { useState } from "react";
import { CONVERSATIONS, type Conversation } from "@/lib/conversations";
import type { Post } from "@/lib/posts";
import { cn } from "@/lib/cn";

export type ConversationChoice = Conversation | "all";

/** Does this post pass the chips? */
export function matchesConversation(post: Post, choice: ConversationChoice, topic: string | null = null) {
  if (choice !== "all" && post.conversation !== choice) return false;
  if (topic && post.topic !== topic) return false;
  return true;
}

/**
 * "All · Unspoken · Unfiltered · Unfinished" above a feed. In a Space,
 * `topics` adds "Explore topics", a second row that narrows to one topic.
 */
export function ConversationFilter({
  value,
  onChange,
  topics,
  topic = null,
  onTopicChange,
}: {
  value: ConversationChoice;
  onChange: (value: ConversationChoice) => void;
  topics?: { slug: string; label: string }[];
  topic?: string | null;
  onTopicChange?: (topic: string | null) => void;
}) {
  const [exploring, setExploring] = useState(topic !== null);
  const choices: { value: ConversationChoice; label: string; hint?: string }[] = [
    { value: "all", label: "All" },
    ...CONVERSATIONS.map((c) => ({ value: c.value, label: c.label, hint: c.hint })),
  ];
  const canExplore = Boolean(topics?.length && onTopicChange);

  return (
    <div className="flex flex-col gap-3">
      {/* Phones: the chips get the full width, Explore topics sits under them. */}
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
        <div role="group" aria-label="Show conversations" className="flex w-full min-w-0 flex-1 gap-2 overflow-x-auto scroll-slim">
          {choices.map((choice) => (
            <button
              key={choice.value}
              type="button"
              aria-pressed={value === choice.value}
              title={choice.hint}
              onClick={() => onChange(choice.value)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 font-sans text-sm font-semibold transition-colors sm:px-4",
                value === choice.value
                  ? "bg-primary-500 text-white"
                  : "bg-surface text-ink-500 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)] hover:bg-ivory-200",
              )}
            >
              {choice.label}
            </button>
          ))}
        </div>
        {canExplore && (
          <button
            type="button"
            aria-expanded={exploring}
            onClick={() => {
              if (exploring) onTopicChange?.(null);
              setExploring((open) => !open);
            }}
            className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1.5 font-sans text-sm font-medium text-ink-400 transition-colors hover:text-ink-600"
          >
            Explore topics
            <svg viewBox="0 0 16 16" fill="none" className={cn("size-4 transition-transform", exploring && "rotate-90")} aria-hidden="true">
              <path d="m6 4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {canExplore && exploring && (
        <div role="group" aria-label="Topics" className="flex flex-wrap gap-2">
          {topics!.map((t) => (
            <button
              key={t.slug}
              type="button"
              aria-pressed={topic === t.slug}
              onClick={() => onTopicChange?.(topic === t.slug ? null : t.slug)}
              className={cn(
                "rounded-full px-3 py-1 font-sans text-sm transition-colors",
                topic === t.slug ? "bg-ink-700 text-ivory-100" : "bg-ivory-400 text-ink-500 hover:bg-ivory-500",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** When the chips leave nothing: say so, and offer the way back. */
export function FilteredEmpty({ onReset, label }: { onReset: () => void; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface px-6 py-10 text-center">
      <p className="font-sans text-base text-ink-500">No {label} posts in the last 48 hours.</p>
      <button type="button" onClick={onReset} className="font-sans text-sm font-medium text-primary-600 hover:underline">
        Show everything
      </button>
    </div>
  );
}
