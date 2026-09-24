import { bondRankColor } from "@/lib/bonds";
import { cn } from "@/lib/cn";

/**
 * The bond icon. Its colour is the only place a bond's rank ever shows —
 * deep gold for the strongest down to cool stone — with no number or label.
 */
export function BondMark({ rank, className }: { rank: number | null; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={cn("size-4 shrink-0", className)}>
      <circle cx="6" cy="8" r="4.25" stroke={bondRankColor(rank)} strokeWidth="1.8" />
      <circle cx="10" cy="8" r="4.25" stroke={bondRankColor(rank)} strokeWidth="1.8" />
    </svg>
  );
}
