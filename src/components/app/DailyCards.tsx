"use client";

import { useState } from "react";
import { SendToBondModal } from "@/components/app/SendToBondModal";
import { useToast } from "@/components/app/ToastProvider";
import { listCardTargets, sendCard } from "@/lib/bond-actions";
import type { DailyCard } from "@/lib/bonds";
import { getChapter } from "@/lib/chapters";

/**
 * This morning's cards: one Curio per open space and one Wander, delivered
 * before you wake and gone at noon. No Figma frame. Nothing about what you
 * read, open or skip is recorded — the only action is sending one privately
 * to someone in your circle.
 */
export function DailyCards({ cards }: { cards: DailyCard[] }) {
  const toast = useToast();
  const [sending, setSending] = useState<DailyCard | null>(null);

  if (cards.length === 0) return null;

  return (
    <section aria-label="This morning's cards" className="flex flex-col gap-3">
      <h2 className="font-sans text-sm font-medium tracking-wide text-ink-400 uppercase">This morning · until noon</h2>
      <div className="flex snap-x gap-4 scroll-slim overflow-x-auto pb-1">
        {cards.map((card) => (
          <article
            key={card.cardId}
            className="flex w-[260px] shrink-0 snap-start flex-col gap-2 rounded-2xl bg-surface p-5 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)]"
          >
            <span className="font-sans text-xs font-semibold text-primary-600">
              {card.kind === "wander"
                ? "Wander"
                : `Curio · ${card.chapterSlug ? (getChapter(card.chapterSlug)?.name ?? "") : ""}`}
            </span>
            <h3 className="font-sans text-base font-semibold text-ink-700">{card.title}</h3>
            <p className="flex-1 font-sans text-sm text-ink-400">{card.body}</p>
            <button
              type="button"
              onClick={() => setSending(card)}
              className="self-start rounded-full bg-primary-50 px-3 py-1.5 font-ui text-sm font-medium text-primary-600 transition-colors hover:bg-primary-100"
            >
              Send to someone
            </button>
          </article>
        ))}
      </div>

      {sending && (
        <SendToBondModal
          title="Send this card"
          loadTargets={listCardTargets}
          send={(userId) => sendCard(sending.cardId, userId)}
          emptyText="Once you're connected with someone, you can send them cards."
          onClose={() => setSending(null)}
          onSent={(name) => {
            setSending(null);
            toast({ title: `Sent to ${name}` });
          }}
        />
      )}
    </section>
  );
}
