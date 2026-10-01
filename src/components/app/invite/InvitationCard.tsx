"use client";

/* eslint-disable @next/next/no-img-element -- signed Storage URLs, sized by the card */
import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * The chapter invitation card — Figma 1497:23440 (the sender's Preview) and
 * 1524:25315 (what the recipient sees).
 *
 * "CHAPTER INVITATION", the title, one line of context, the photos as a
 * one-at-a-time carousel, then the note. Actions come from the caller.
 */
export function InvitationCard({
  title,
  subtitle,
  photoUrls,
  note,
  children,
}: {
  title: string;
  /** "You are inviting people…" / "Amara has invited you…". */
  subtitle: string;
  photoUrls: string[];
  note: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="font-sans text-xs font-semibold tracking-wide text-primary-600 uppercase">
          Chapter invitation
        </span>
        <h2 className="font-display text-2xl font-semibold text-ink-800">{title}</h2>
        <p className="font-sans text-base text-ink-300">{subtitle}</p>
      </div>

      {photoUrls.length > 0 && <PhotoCarousel urls={photoUrls} />}

      {note && (
        <div className="flex flex-col gap-2">
          <span className="font-sans text-sm font-medium text-ink-700">Note</span>
          <p className="rounded-lg bg-ivory-100 px-4 py-3 font-sans text-base whitespace-pre-line text-ink-400">
            {note}
          </p>
        </div>
      )}

      {children}
    </div>
  );
}

function PhotoCarousel({ urls }: { urls: string[] }) {
  const [index, setIndex] = useState(0);
  const many = urls.length > 1;

  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-ivory-200">
      <img src={urls[index]} alt={`Invitation photo ${index + 1} of ${urls.length}`} className="size-full object-cover" />
      {many && (
        <>
          {index > 0 && (
            <CarouselButton side="left" label="Previous photo" onClick={() => setIndex((i) => i - 1)} />
          )}
          {index < urls.length - 1 && (
            <CarouselButton side="right" label="Next photo" onClick={() => setIndex((i) => i + 1)} />
          )}
          <span className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5" aria-hidden="true">
            {urls.map((url, i) => (
              <span key={url} className={cn("size-1.5 rounded-full", i === index ? "bg-white" : "bg-white/50")} />
            ))}
          </span>
        </>
      )}
    </div>
  );
}

function CarouselButton({ side, label, onClick }: { side: "left" | "right"; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "absolute top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-ink-900/30 text-white transition-colors hover:bg-ink-900/50",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <svg viewBox="0 0 16 16" fill="none" className={cn("size-4", side === "left" && "rotate-180")} aria-hidden="true">
        <path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
