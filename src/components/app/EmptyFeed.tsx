"use client";

import { EmptyState } from "@/components/app/EmptyState";

/**
 * Empty feed — Figma frames 650:37394 (desktop) and 664:16902 (phone).
 *
 * The illustration over "No Post" and a "Root a Thought" action.
 */
export function EmptyFeed({ onCompose }: { onCompose?: () => void }) {
  return (
    <EmptyState
      title="No Post"
      body="There are no post hosting for you yet, add a post to start engaging with others"
      action={
        onCompose && (
          <button
            type="button"
            onClick={onCompose}
            className="flex items-center gap-2 rounded-full px-4 py-2 font-ui text-base font-medium text-primary-600 transition-colors hover:bg-primary-50"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              +
            </span>
            Root a Thought
          </button>
        )
      }
    />
  );
}
