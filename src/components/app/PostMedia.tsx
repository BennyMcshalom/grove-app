"use client";

import { useEffect, useRef, useState } from "react";
import { MediaLightbox } from "@/components/app/MediaLightbox";
import { Photo } from "@/components/ui/Media";
import { withTrim } from "@/lib/media-draft";
import type { Post } from "@/lib/posts";
import { cn } from "@/lib/cn";

const timeOfDay = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

/**
 * Tallest and widest a post's media box gets, as width ÷ height — the range X
 * and LinkedIn use. Inside it a picture keeps its own shape; outside it, it's
 * cropped to the limit (tap to see all of it). The box always fills the
 * card's width, so there are never empty bands beside a tall photo.
 */
const TALLEST = 4 / 5;
const WIDEST = 1.91;
/** Until an older post's file has loaded and been measured. */
const UNKNOWN = 4 / 3;

type Media = Post["media"][number];

/**
 * A post's photos and videos. The box's shape comes from the first file's
 * recorded size, so it's reserved before anything downloads and nothing
 * jumps. Photos shimmer until they arrive, then fade in; they load only as
 * they near the screen. Videos show letterboxed on black like YouTube, fetch
 * nothing until they're on screen, and pause when scrolled away.
 *
 * Several files swipe like a carousel. A Just Grouv post (Figma 110:3891)
 * carries its time of day on top and its caption along the bottom.
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
  const [measured, setMeasured] = useState<Record<string, number>>({});
  const [viewing, setViewing] = useState<number | null>(null);
  const track = useRef<HTMLDivElement>(null);

  const first = media[0];
  if (!first) return null;

  const natural = first.width && first.height ? first.width / first.height : measured[first.src];
  const ratio = Math.min(WIDEST, Math.max(TALLEST, natural ?? UNKNOWN));
  const count = media.length;
  const overlay = caption !== undefined;
  const current = media[index] ?? first;

  const go = (next: number) => {
    const el = track.current;
    if (!el) return;
    const target = (next + count) % count;
    el.scrollTo({ left: target * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl bg-ivory-200"
      style={{ aspectRatio: String(ratio) }}
    >
      <div
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          const next = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
          if (next !== index) setIndex(next);
        }}
        className="scrollbar-none flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
      >
        {media.map((item, i) => (
          <div key={item.src} className="relative size-full shrink-0 snap-center">
            {item.kind === "photo" ? (
              <PhotoSlide
                item={item}
                priority={false}
                onMeasured={(r) => setMeasured((prev) => (prev[item.src] ? prev : { ...prev, [item.src]: r }))}
                onOpen={() => setViewing(i)}
              />
            ) : (
              <VideoSlide item={item} />
            )}
          </div>
        ))}
      </div>

      {overlay && postedAt && (
        <span className="pointer-events-none absolute inset-x-0 top-0 flex justify-center bg-gradient-to-b from-black/45 to-transparent px-4 pt-3 pb-8">
          <span className="font-sans text-sm font-semibold text-white" suppressHydrationWarning>
            {timeOfDay.format(new Date(postedAt)).replace(" ", "")}
          </span>
        </span>
      )}

      {count > 1 && (
        <span className="pointer-events-none absolute top-3 right-3 rounded-full bg-black/55 px-2.5 py-1 font-sans text-xs font-semibold text-white tabular-nums">
          {index + 1}/{count}
        </span>
      )}

      {(overlay && caption) || count > 1 ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 px-4 pb-3",
            overlay && caption && "bg-gradient-to-t from-black/60 to-transparent pt-10",
            // Keep clear of a video's own controls.
            current.kind === "video" && "bottom-12",
          )}
        >
          {count > 1 && (
            <span className="flex gap-1.5" aria-hidden="true">
              {media.map((m, i) => (
                <span
                  key={m.src}
                  className={cn("size-1.5 rounded-full transition-colors", i === index ? "bg-white" : "bg-white/50")}
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
          {index > 0 && <CarouselButton side="left" onClick={() => go(index - 1)} />}
          {index < count - 1 && <CarouselButton side="right" onClick={() => go(index + 1)} />}
          <span className="sr-only" aria-live="polite">
            {index + 1} of {count}
          </span>
        </>
      )}

      {viewing !== null && (
        <MediaLightbox media={media} start={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  );
}

/** A photo filling its slide: shimmer, then a fade-in once it has loaded. */
function PhotoSlide({
  item,
  priority,
  onMeasured,
  onOpen,
}: {
  item: Media;
  priority: boolean;
  onMeasured: (ratio: number) => void;
  onOpen: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <button type="button" onClick={onOpen} aria-label="View photo" className="relative block size-full cursor-zoom-in">
      {!loaded && <span className="absolute inset-0 shimmer bg-ivory-300" aria-hidden="true" />}
      {/* Signed Storage links expire, so they skip the image optimiser. */}
      <Photo
        src={item.src}
        alt=""
        fill
        unoptimized
        priority={priority}
        sizes="(min-width: 1024px) 640px, 100vw"
        onLoad={(event) => {
          const img = event.currentTarget;
          if (img.naturalWidth && img.naturalHeight) onMeasured(img.naturalWidth / img.naturalHeight);
          setLoaded(true);
        }}
        className={cn("object-cover transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
      />
    </button>
  );
}

/**
 * A video that downloads nothing until it's on screen, then just enough to
 * show its first frame; it pauses when scrolled out of view.
 */
function VideoSlide({ item }: { item: Media }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setNear(true);
        else if (!el.paused) el.pause();
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative size-full bg-black">
      {!ready && <span className="absolute inset-0 shimmer bg-ink-800/60" aria-hidden="true" />}
      <video
        ref={ref}
        src={near ? withTrim(item.src, item.trimStart, item.trimEnd) : undefined}
        controls
        playsInline
        preload={near ? "metadata" : "none"}
        onLoadedData={() => setReady(true)}
        onLoadedMetadata={() => setReady(true)}
        className="relative size-full object-contain"
      />
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
        "absolute top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60",
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
