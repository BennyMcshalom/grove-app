"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { FormError } from "@/components/auth/FormError";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { saveLogEntry } from "@/app/(app)/log/actions";
import { cn } from "@/lib/cn";
import { localDay, logDateLabel, type LogEntry } from "@/lib/log";
import { removeUploads, uploadFile, UPLOAD_LIMITS } from "@/lib/upload";

/**
 * Today's prompt card — Figma frame 249:12723.
 *
 * White card, 24px radius, a low centred shadow: chapter + day meta, the
 * 32px prompt in primary-600, a tappable input pill, and a primary-600 footer
 * strip flush to the card's bottom edge. Tapping the pill opens the writer
 * (Figma has no frame for it): text, an optional photo, and — for a Bond Log —
 * which bond it's shared with.
 */
export function LogPrompt({
  chapterName,
  userChapterId,
  prompt,
  scope,
  bonds,
}: {
  chapterName: string;
  userChapterId: string;
  prompt: { id: string; body: string };
  scope: "solo" | "bond";
  bonds: { bondId: string; name: string }[];
}) {
  const viewer = useViewer();
  const toast = useToast();
  const [writing, setWriting] = useState(false);
  const [entry, setEntry] = useState("");
  const [photo, setPhoto] = useState<{ path: string; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [bondId, setBondId] = useState(bonds[0]?.bondId ?? "");
  const [error, setError] = useState<string>();
  const [saving, startSaving] = useTransition();

  const reset = () => {
    if (photo) {
      removeUploads("media", [photo.path]);
      URL.revokeObjectURL(photo.preview);
    }
    setPhoto(null);
    setEntry("");
    setError(undefined);
    setWriting(false);
  };

  const attach = async (file: File) => {
    if (!file.type.startsWith("image/")) return setError("Add a photo (PNG, JPG or WebP).");
    if (file.size > UPLOAD_LIMITS.photoBytes) return setError("Choose a photo under 10MB.");
    setError(undefined);
    setUploading(true);
    const result = await uploadFile("media", viewer.id, file, { prefix: "log-", fallbackExtension: "jpg" });
    setUploading(false);
    if ("error" in result) return setError(result.error);
    if (photo) removeUploads("media", [photo.path]);
    setPhoto({ path: result.path, preview: URL.createObjectURL(file) });
  };

  const save = () => {
    setError(undefined);
    startSaving(async () => {
      const result = await saveLogEntry({
        userChapterId,
        promptId: prompt.id || null,
        body: entry,
        photoPath: photo?.path ?? null,
        scope,
        bondId: scope === "bond" ? bondId || null : null,
        entryDate: localDay(),
      });
      if (result.error) return setError(result.error);
      if (photo) URL.revokeObjectURL(photo.preview);
      setPhoto(null);
      setEntry("");
      setWriting(false);
      toast({ title: scope === "bond" ? "Moment shared with your bond" : "Moment logged" });
    });
  };

  const noBond = scope === "bond" && bonds.length === 0;

  return (
    <section className="flex w-full flex-col items-center gap-6 overflow-hidden rounded-3xl bg-surface pt-6 shadow-[0px_0px_16px_0px_rgba(0,0,0,0.1)]">
      <div className="flex items-center gap-2 px-4">
        <span className="flex items-center gap-1">
          <BriefcaseIcon className="size-4 text-primary-500" />
          <span className="font-sans text-sm text-ink-800">
            {chapterName.toUpperCase()}
          </span>
        </span>
        <span className="size-2 rounded-full bg-ivory-600" />
        <span className="font-sans text-sm text-ink-800">TODAY</span>
      </div>

      <h2 className="max-w-[501px] px-4 text-center font-sans text-xl leading-[1.2] font-bold text-primary-600 lg:text-[1.75rem]">
        {prompt.body}
      </h2>

      {noBond ? (
        <p className="mx-4 max-w-[515px] text-center font-sans text-sm text-ink-300">
          A Bond Log is shared with one of your bonds. Invite someone from a
          space&rsquo;s Ask Members tab to start one.
        </p>
      ) : writing ? (
        <div className="flex w-full max-w-[547px] flex-col gap-3 px-4">
          <textarea
            autoFocus
            value={entry}
            maxLength={2000}
            onChange={(e) => setEntry(e.target.value)}
            placeholder="Write today's moment"
            rows={3}
            className="w-full resize-y rounded-lg bg-ivory-100 px-3.5 py-4 font-sans text-base text-ink-500 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline-none placeholder:text-ink-200 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
          />

          {photo && (
            <div className="relative h-40 w-full overflow-hidden rounded-lg bg-ivory-200">
              <Image src={photo.preview} alt="" fill unoptimized className="object-cover" />
              <button
                type="button"
                onClick={() => {
                  removeUploads("media", [photo.path]);
                  URL.revokeObjectURL(photo.preview);
                  setPhoto(null);
                }}
                className="absolute top-2 right-2 rounded-full bg-black/60 px-3 py-1 font-sans text-xs text-white"
              >
                Remove
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="relative flex cursor-pointer items-center gap-2 rounded-full bg-ivory-400 px-3 py-1.5 font-sans text-sm font-semibold text-ivory-900 transition-colors hover:bg-ivory-500">
                <PlusIcon className="size-4" />
                {uploading ? "Uploading…" : photo ? "Change photo" : "Add photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void attach(file);
                    e.target.value = "";
                  }}
                />
              </label>
              {scope === "bond" && (
                <label className="flex items-center gap-2 font-sans text-sm text-ink-400">
                  With
                  <select
                    value={bondId}
                    onChange={(e) => setBondId(e.target.value)}
                    className="rounded-lg bg-ivory-100 px-2 py-1.5 font-sans text-sm text-ink-600 outline-none"
                  >
                    {bonds.map((b) => (
                      <option key={b.bondId} value={b.bondId}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={reset}
                className="rounded-full px-4 py-2 font-ui text-sm font-medium text-ink-400 hover:bg-ivory-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving || uploading || (!entry.trim() && !photo)}
                className="rounded-full bg-primary-500 px-4 py-2 font-ui text-sm font-medium text-white transition-colors hover:bg-primary-400 disabled:bg-ink-50 disabled:text-ink-200"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
          <FormError message={error} />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setWriting(true)}
          className="mx-4 flex w-full max-w-[515px] items-center gap-2 rounded-lg bg-ivory-100 px-3.5 py-4 text-left shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition-colors hover:bg-ivory-200"
        >
          <PlusIcon className="size-5 shrink-0 text-primary-500" />
          <span className="font-sans text-base text-ink-500">
            Write today&rsquo;s moment
          </span>
        </button>
      )}

      <div className="flex w-full flex-col bg-primary-600 p-4">
        <span className="font-sans text-base font-medium text-white">
          New Entry
        </span>
        <span className="font-sans text-xs text-white">
          The story of your life
        </span>
      </div>
    </section>
  );
}

/**
 * The memories collage — Figma frame 249:12246. Scattered, rotated photo
 * cards on a warm gradient, each captioned.
 *
 * Figma places five cards at x = 130 / 147 / 184 / 241 / 318 in a 708px panel
 * with widths 140–240px, fanning left-to-right and growing as they go. Those
 * are converted to percentages so the fan scales with the container.
 */
const MEMORIES = [
  { left: "10%", top: "26%", w: "18%", rotate: -7 },
  { left: "22%", top: "22%", w: "20%", rotate: 4 },
  { left: "35%", top: "18%", w: "22%", rotate: -4 },
  { left: "48%", top: "14%", w: "24%", rotate: 6 },
  { left: "62%", top: "10%", w: "26%", rotate: -3 },
];

/**
 * The Career Archive draws the same fan on a 1096x389 card (433:17113), where
 * the cards sit at x = 334 / 351 / 388 / 445 / 522 with widths 140-240. Those
 * are a different fraction of the container than the 708px panel's, so each
 * surface carries its own set rather than reusing one and overflowing.
 */
const ARCHIVE_MEMORIES = [
  { left: "30.5%", top: "27.2%", w: "12.8%", rotate: -7 },
  { left: "32.0%", top: "23.9%", w: "14.6%", rotate: 4 },
  { left: "35.4%", top: "20.6%", w: "16.4%", rotate: -4 },
  { left: "40.6%", top: "17.2%", w: "18.2%", rotate: 6 },
  { left: "47.6%", top: "10.8%", w: "21.9%", rotate: -3 },
];

export function LogMemories({
  entries,
  header = true,
  surface = "gradient",
}: {
  /** Newest first; the fan shows the latest five. */
  entries: LogEntry[];
  /** The Career Archive (433:17113) drops the "Log Memories" heading. */
  header?: boolean;
  /**
   * Grouv Log lays the fan on a warm gradient with captions below each card;
   * the Career Archive lays it on a white 16px card with the caption over the
   * photo instead.
   */
  surface?: "gradient" | "white";
}) {
  // The arrows rotate which card is frontmost.
  const [offset, setOffset] = useState(0);
  const slots = surface === "white" ? ARCHIVE_MEMORIES : MEMORIES;
  // Oldest of the five at the back-left, newest front-right.
  const shown = entries.slice(0, slots.length).reverse();
  const step = (dir: number) =>
    setOffset((o) => (o + dir + shown.length) % Math.max(shown.length, 1));

  return (
    <section className="flex w-full flex-col gap-4">
      {header && (
        <header className="flex flex-col gap-1">
          <h2 className="font-display text-2xl font-semibold text-ink-800">
            Log Memories
          </h2>
          <p className="font-sans text-base text-ink-400">
            {entries.length === 1 ? "1 moment" : `${entries.length} moments`}
          </p>
        </header>
      )}

      <div
        className={cn(
          "relative w-full overflow-hidden rounded-2xl",
          surface === "white"
            ? "bg-surface"
            : "h-[280px] lg:h-[354px]",
        )}
        style={
          surface === "gradient"
            ? {
                backgroundImage:
                  "linear-gradient(195deg, rgba(232,163,118,0.8) 0%, rgba(243,163,111,1) 36%)",
              }
            : { aspectRatio: "1096 / 389" }
        }
      >
        {shown.length === 0 ? (
          <p
            className={cn(
              "absolute inset-0 grid place-items-center px-6 text-center font-sans text-sm",
              surface === "white" ? "text-ink-300" : "text-white",
            )}
          >
            No moments logged yet.
          </p>
        ) : (
          shown.map((entry, i) => {
            const slot = slots[i + (slots.length - shown.length)];
            return (
              <figure
                key={entry.id}
                className="absolute overflow-hidden rounded-[20px] border border-ink-100 bg-surface shadow-md"
                style={{
                  left: slot.left,
                  top: slot.top,
                  width: slot.w,
                  transform: `rotate(${slot.rotate}deg)`,
                  zIndex: (i + offset) % shown.length,
                }}
              >
                <div className="relative aspect-[3/4] w-full bg-ivory-100">
                  {entry.photoUrl ? (
                    <Image src={entry.photoUrl} alt="" fill unoptimized className="object-cover" />
                  ) : (
                    <p className="absolute inset-0 overflow-hidden p-3 font-sans text-[11px] leading-snug text-ink-600">
                      {entry.body}
                    </p>
                  )}
                  {surface === "white" && entry.photoUrl && entry.body && (
                    <figcaption className="absolute inset-x-0 bottom-0 line-clamp-2 bg-gradient-to-t from-ink-900/70 to-transparent px-2 pt-6 pb-2 text-center font-sans text-[10px] font-medium text-white">
                      {entry.body}
                    </figcaption>
                  )}
                </div>
                {surface === "gradient" && (
                  <figcaption className="truncate px-2 py-1.5 text-center font-sans text-[10px] font-medium text-ink-700">
                    Day {entry.dayNumber} · {logDateLabel(entry.entryDate)}
                  </figcaption>
                )}
              </figure>
            );
          })
        )}

        {shown.length > 1 && (
          <>
            <NavArrow side="left" onClick={() => step(-1)} />
            <NavArrow side="right" onClick={() => step(1)} />
          </>
        )}
      </div>
    </section>
  );
}

/** The 40px glassy scrubbers at each end of the collage (Figma 249:12327/8). */
function NavArrow({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous memory" : "Next memory"}
      className="absolute top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-surface/40 text-ink-700 backdrop-blur-[20px]"
      style={{
        [side]: "32px",
        backgroundImage:
          "linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.2) 100%)",
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
        <path
          d={side === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <rect
        x="2"
        y="5"
        width="12"
        height="8"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M6 5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M10 4v12M4 10h12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
