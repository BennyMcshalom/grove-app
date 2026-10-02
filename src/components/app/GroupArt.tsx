import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { GroupArtKey } from "@/lib/group-look";

/**
 * Line-art for chapter groups and profile banners: hand-drawn-style marks in
 * thick ink strokes with a few paper fills, drawn on a 64x64 grid. Ink and
 * paper come from `--art-ink` / `--art-paper` so the same drawing works on
 * light colours (dark ink) and dark ones (white ink).
 */
const INK = "var(--art-ink, var(--color-art-ink))";
const PAPER = "var(--art-paper, var(--color-art-paper))";

const p = { fill: PAPER };
const ink = { fill: INK, stroke: "none" };
const thin = { strokeWidth: 2.2 };

const ART: Record<GroupArtKey, ReactNode> = {
  crossroads: (
    <>
      <path d="M32 10v46" />
      <path d="M17 15h27l6 6-6 6H17z" {...p} />
      <path d="M47 31H20l-6 6 6 6h27z" {...p} />
      <path d="M22 21h14M25 37h15" {...thin} />
      <path d="M18 56h28" />
    </>
  ),
  sprout: (
    <>
      <path d="M32 38V22" />
      <path d="M32 28c-11 0-15-6-15-13 9 0 15 4 15 13z" {...p} />
      <path d="M32 23c0-8 6-13 15-13 0 8-5 13-15 13z" {...p} />
      <path d="M16 36h32v6H16z" {...p} />
      <path d="M19 42h26l-3 14H22z" {...p} />
      <path d="M24 47h4" {...thin} />
    </>
  ),
  "piggy-bank": (
    <>
      <circle cx="32" cy="12" r="5" {...p} />
      <path d="M32 9.5v5" {...thin} />
      <ellipse cx="31" cy="37" rx="19" ry="13" {...p} />
      <path d="M22 26l2-7 7 5" {...p} />
      <path d="M50 33h4v8h-4" {...p} />
      <path d="M22 49v6M40 49v6" />
      <path d="M12 35c-4 0-5-5-1-5" {...thin} />
      <path d="M27 28h9" {...thin} />
      <circle cx="42" cy="33" r="1.8" {...ink} />
    </>
  ),
  summit: (
    <>
      <path d="M6 54l18-32 10 15 6-8 18 25z" {...p} />
      <path d="M18.5 32.5 24 22l5.5 8.5-3 2.5-3-2.5z" {...ink} />
      <path d="M24 22V7" />
      <path d="M24 8h12l-3.5 4 3.5 4H24" {...p} />
    </>
  ),
  briefcase: (
    <>
      <path d="M24 22v-5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v5" />
      <rect x="9" y="22" width="46" height="31" rx="4" {...p} />
      <path d="M9 35h46" />
      <rect x="28" y="31" width="8" height="8" rx="1.5" {...ink} />
    </>
  ),
  "heart-hands": (
    <>
      <path d="M32 31c-6-9-17-5-15 4 2 7 15 12 15 12s13-5 15-12c2-9-9-13-15-4z" {...p} />
      <path d="M6 37c8 2 12 8 17 13h9" />
      <path d="M58 37c-8 2-12 8-17 13h-9" />
      <path d="M8 46l5 10M56 46l-5 10" />
      <path d="M24 33c1-3 3-4 5-4" {...thin} />
    </>
  ),
  book: (
    <>
      <path d="M32 18c-6-4-14-5-23-4v35c9-1 17 0 23 4z" {...p} />
      <path d="M32 18c6-4 14-5 23-4v35c-9-1-17 0-23 4z" {...p} />
      <path d="M32 18v35" />
      <path d="M15 24c4 0 8 1 12 2M15 31c4 0 8 1 12 2M15 38c4 0 8 1 12 2M37 26c4-1 8-2 12-2M37 33c4-1 8-2 12-2" {...thin} />
    </>
  ),
  palette: (
    <>
      <path d="M31 8C17 8 7 18 7 31s10 23 22 23c4 0 5-3 3-6s0-6 4-6h7c8 0 12-5 12-11C55 18 45 8 31 8z" {...p} />
      <circle cx="20" cy="24" r="3.5" {...ink} />
      <circle cx="31" cy="17" r="3.5" />
      <circle cx="42" cy="21" r="3.5" {...ink} />
      <circle cx="18" cy="36" r="3.5" />
      <path d="M44 53l13-15" />
    </>
  ),
  compass: (
    <>
      <circle cx="32" cy="32" r="22" {...p} />
      <path d="M32 15l6 17-6 17-6-17z" />
      <path d="M32 15l6 17H26z" {...ink} />
      <path d="M32 4v5M32 55v5M4 32h5M55 32h5" />
    </>
  ),
  plane: (
    <>
      <path d="M8 30 56 12 44 52 32 39z" {...p} />
      <path d="M56 12 32 39v12l7-7" />
      <path d="M5 52c5 0 7-3 11-3M10 58c4 0 6-2 9-2" {...thin} strokeDasharray="3 4" />
    </>
  ),
  house: (
    <>
      <path d="M42 20v-8h6v13" {...p} />
      <path d="M16 28v26h32V28" {...p} />
      <path d="M10 31 32 12l22 19" />
      <path d="M28 54V41h8v13" {...ink} />
      <rect x="20" y="33" width="6" height="6" rx="1" />
      <path d="M6 54h52" />
    </>
  ),
  stroller: (
    <>
      <path d="M30 13a17 17 0 0 0-17 17h17z" {...ink} />
      <path d="M13 30h33c0 9-7 15-16.5 15S13 39 13 30z" {...p} />
      <path d="M46 30l4-14h6" />
      <circle cx="20" cy="51" r="5" {...p} />
      <circle cx="40" cy="51" r="5" {...p} />
    </>
  ),
  sneaker: (
    <>
      <path d="M8 46V27h10l6 8c9 2 19 3 27 6 4 2 6 4 6 7H8z" {...p} />
      <path d="M8 46h49v3a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4z" {...ink} />
      <path d="M23 33l4-3M28 35l4-3M33 36l4-3" {...thin} />
      <path d="M8 31h7" {...thin} />
    </>
  ),
  lotus: (
    <>
      <path d="M32 13c7 7 9 15 0 27-9-12-7-20 0-27z" {...p} />
      <path d="M32 40c-4-9-12-14-21-14 0 10 9 14 21 14z" {...p} />
      <path d="M32 40c4-9 12-14 21-14 0 10-9 14-21 14z" {...p} />
      <path d="M12 48h40M19 55h26" />
    </>
  ),
  lightbulb: (
    <>
      <path d="M32 9a15 15 0 0 0-9 27c2 2 3 4 3 7h12c0-3 1-5 3-7a15 15 0 0 0-9-27z" {...p} />
      <path d="M26 49h12M28 55h8" />
      <path d="M28 36l4-8 4 8" {...thin} />
      <path d="M6 22h5M53 22h5M12 6l4 4M52 6l-4 4" />
    </>
  ),
  handshake: (
    <>
      <path d="M3 25l11-5 7 17-11 5z" {...p} />
      <path d="M61 25l-11-5-7 17 11 5z" {...p} />
      <path d="M20 23c6-3 10-1 14 2l9-3 6 15c-4 6-10 10-16 10-4 0-6-2-8-4l-8-6z" {...p} />
      <path d="M29 39l4 4M33 35l5 5M37 32l4 4" {...thin} />
      <path d="M34 25l-7 6c-2 2 0 5 3 4l6-4" />
    </>
  ),
};

/** The drawing's shapes alone, for tiling inside another SVG (banners). */
export function artShapes(art: GroupArtKey): ReactNode {
  return ART[art] ?? ART.crossroads;
}

/** The shared stroke style every drawing is made with. */
export const ART_STROKE = {
  fill: "none",
  stroke: INK,
  strokeWidth: 3,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function GroupArt({
  art,
  ink: inkColor,
  paper,
  className,
  title,
}: {
  art: GroupArtKey;
  /** Stroke colour; defaults to the art ink. */
  ink?: string;
  /** Fill colour for the paper shapes; defaults to white. */
  paper?: string;
  className?: string;
  /** Read out instead of hiding the drawing. */
  title?: string;
}) {
  const style = {
    ...(inkColor && { "--art-ink": inkColor }),
    ...(paper && { "--art-paper": paper }),
  } as CSSProperties;
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      style={style}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      {...ART_STROKE}
    >
      {artShapes(art)}
    </svg>
  );
}
