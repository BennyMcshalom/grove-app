import { cn } from "@/lib/cn";

/**
 * "Empty State Illustrations_Light Mode_No Data" (Figma 1207:22754): a page of
 * three rows under a magnifying glass, on a soft blob. Used by the Nearby and
 * Deep Focus cross states. Drawn with theme tokens so it holds up in dark mode.
 */
export function SearchArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 340 260" fill="none" aria-hidden="true" className={cn("h-auto w-[220px] lg:w-[280px]", className)}>
      <ellipse cx="160" cy="130" rx="130" ry="95" className="fill-primary-50" />
      <ellipse cx="170" cy="246" rx="80" ry="5" className="fill-primary-50" />
      <path d="M72 12h14M79 5v14" className="stroke-primary-600" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M300 200h14M307 193v14" className="stroke-primary-600" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="30" cy="160" r="2.8" className="fill-ink-100" />
      <circle cx="250" cy="14" r="2.8" className="fill-ink-100" />
      {/* The page, its folded corner and three rows. */}
      <path d="M92 30h110v186H92a8 8 0 0 1-8-8V46Z" className="fill-primary-100" />
      <path d="M84 46 100 30v16Z" className="fill-surface stroke-ink-100" strokeWidth="1.2" />
      {[70, 118, 166].map((y) => (
        <g key={y}>
          <rect x="110" y={y} width="120" height="38" rx="6" className="fill-surface stroke-ink-100" strokeWidth="1.2" />
          {[132, 152, 172].map((x) => (
            <circle key={x} cx={x} cy={y + 19} r="6.5" className="fill-ink-50" />
          ))}
        </g>
      ))}
      {/* The magnifying glass. */}
      <path d="m268 104 34 32" className="stroke-ink-100" strokeWidth="10" strokeLinecap="round" />
      <path d="m268 104 34 32" className="stroke-surface" strokeWidth="7" strokeLinecap="round" />
      <circle cx="232" cy="70" r="40" className="fill-surface stroke-ink-100" strokeWidth="1.5" />
    </svg>
  );
}
