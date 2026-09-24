"use client";

import { useState } from "react";
import { Photo, Video } from "@/components/ui/Media";
import { withTrim } from "@/lib/media-draft";
import type { Post } from "@/lib/posts";
import { cn } from "@/lib/cn";

const timeOfDay = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

/**
 * A post's photos and videos, each shown in its own shape — a tall phone
 * video stays tall, a wide photo stays wide — and never cropped. Very tall
 * media stops at 640px and sits centred on a quiet background instead.
 *
 * With more than one file it's a carousel (arrows and dots). A Just Grouv
 * post (Figma 110:3891) carries its time of day on top of the picture and its
 * caption along the bottom, over a soft shade so the white text reads.
 */
export function PostMedia({
  media,
  caption,
  postedAt,
}: {
  media: Post["media"];
  /** Just Grouv: the caption lives inside the picture. */
  caption?: string | null;
  postedAt?: string;
}) {
  const [index, setIndex] = useState(0);
  const count = media.length;
  const current = media[Math.min(index, count - 1)];
  if (!current) return null;

  const overlay = caption !== undefined;
  const step = (dir: number) => setIndex((i) => (i + dir + count) % count);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-ivory-200">
      {current.kind === "photo" ? (
        // Signed Storage links expire, so they skip the image optimiser.
        <Photo
          key={current.src}
          src={current.src}
          alt=""
          width={0}
          height={0}
          sizes="(min-width: 1024px) 640px, 100vw"
          unoptimized
          className="mx-auto block h-auto max-h-[640px] w-full object-contain"
          fallbackClassName="aspect-[589/332] w-full"
        />
      ) : (
        <Video
          key={current.src}
          src={withTrim(current.src, current.trimStart, current.trimEnd)}
          controls
          playsInline
          preload="metadata"
          className="mx-auto block h-auto max-h-[640px] w-full bg-black object-contain"
          fallbackClassName="aspect-[589/332] w-full"
        />
      )}

      {overlay && postedAt && (
        <span className="pointer-events-none absolute inset-x-0 top-0 flex justify-center bg-gradient-to-b from-black/45 to-transparent px-4 pt-3 pb-8">
          <span className="font-sans text-sm font-semibold text-white" suppressHydrationWarning>
            {timeOfDay.format(new Date(postedAt)).replace(" ", "")}
          </span>
        </span>
      )}

      {(overlay && caption) || count > 1 ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 px-4 pb-3",
            overlay && caption && "bg-gradient-to-t from-black/60 to-transparent pt-10",
            // Clear the video's own controls.
            current.kind === "video" && "bottom-12",
          )}
        >
          {count > 1 && (
            <span className="flex gap-1.5" aria-hidden="true">
              {media.map((m, i) => (
                <span
                  key={m.src}
                  className={cn("size-1.5 rounded-full", i === index ? "bg-white" : "bg-white/50")}
                />
              ))}
            </span>
          )}
          {overlay && caption && (
            <p className="text-center font-sans text-base font-medium whitespace-pre-line text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]">
              {caption}
            </p>
          )}
        </div>
      ) : null}

      {count > 1 && (
        <>
          <CarouselButton side="left" onClick={() => step(-1)} />
          <CarouselButton side="right" onClick={() => step(1)} />
          <span className="sr-only" aria-live="polite">
            {index + 1} of {count}
          </span>
        </>
      )}
    </div>
  );
}

function CarouselButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous" : "Next"}
      className={cn(
        "absolute top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white transition-colors hover:bg-black/55",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
        <path
          d={side === "left" ? "m10 3-5 5 5 5" : "m6 3 5 5-5 5"}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
