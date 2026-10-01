/** Phosphor-style line icons the Wrap view frames use (942:17890). */

type IconProps = { className?: string };

function Svg({ className, children, viewBox = "0 0 24 24" }: IconProps & { children: React.ReactNode; viewBox?: string }) {
  return (
    <svg viewBox={viewBox} fill="none" aria-hidden="true" className={className ?? "size-5"}>
      {children}
    </svg>
  );
}

const line = { stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** The orange "99" quote mark above each moment. */
export function QuoteIcon({ className }: IconProps) {
  return (
    <Svg className={className ?? "size-5"} viewBox="0 0 20 20">
      <path d="M4 5.5h3.5v4H5c0 2 .8 3.2 2.5 3.8M12 5.5h3.5v4H13c0 2 .8 3.2 2.5 3.8" {...line} />
    </Svg>
  );
}

export function ImageIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" {...line} />
      <circle cx="9" cy="9.5" r="1.5" {...line} />
      <path d="m4 18 5.5-5.5L13 16l2.5-2.5L20 18" {...line} />
    </Svg>
  );
}

export function PencilIcon({ className }: IconProps) {
  return (
    <Svg className={className ?? "size-4"}>
      <path d="M4 20h4L19 9l-4-4L4 16v4Zm9-13 4 4" {...line} />
    </Svg>
  );
}

export function ShareIcon({ className }: IconProps) {
  return (
    <Svg className={className ?? "size-4"}>
      <path d="M12 14V3.5m0 0L8 7.5m4-4 4 4M8 10.5H5.5v10h13v-10H16" {...line} />
    </Svg>
  );
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <Svg className={className ?? "size-4"}>
      <path d="M12 3.5V15m0 0-4-4m4 4 4-4M4.5 19.5h15" {...line} />
    </Svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <Svg className={className ?? "size-7"}>
      <path d="m5 12.5 4.5 4.5L19 7.5" {...line} strokeWidth={2} />
    </Svg>
  );
}

export function CheckCircleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className ?? "size-5"}>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.7-9.3a1 1 0 0 0-1.4-1.4L9 10.6 7.7 9.3a1 1 0 0 0-1.4 1.4l2 2a1 1 0 0 0 1.4 0l4-4Z"
      />
    </svg>
  );
}

/** Filled warning triangle — "We couldn’t put this together". */
export function WarningIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className ?? "size-8"}>
      <path
        fillRule="evenodd"
        d="M10.3 3.9a2 2 0 0 1 3.4 0l8 13.6A2 2 0 0 1 20 20.5H4a2 2 0 0 1-1.7-3l8-13.6ZM12 8.5a1 1 0 0 0-1 1v4a1 1 0 1 0 2 0v-4a1 1 0 0 0-1-1Zm0 9.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z"
      />
    </svg>
  );
}

/** Open book — "Not enough moments yet". */
export function BookIcon({ className }: IconProps) {
  return (
    <Svg className={className ?? "size-6"}>
      <path d="M12 7c-1.5-1.3-3.5-2-6-2H3.5v12.5H6c2.5 0 4.5.7 6 2 1.5-1.3 3.5-2 6-2h2.5V5H18c-2.5 0-4.5.7-6 2Zm0 0v12.5" {...line} />
    </Svg>
  );
}

/** The quarter-cut circle Figma uses for "Putting your wrap together…". */
export function PreparingIcon({ className }: IconProps) {
  return (
    <Svg className={className ?? "size-12"} viewBox="0 0 48 48">
      <path d="M24 6a18 18 0 1 0 18 18H24V6Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
    </Svg>
  );
}

export function SpinnerIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className ?? "size-8 animate-spin"}>
      <path d="M12 3a9 9 0 1 1-8.5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Clapperboard — the Grouv Log "YOUR LIFE WRAPPED" card. */
export function ClapperIcon({ className }: IconProps) {
  return (
    <Svg className={className ?? "size-5"}>
      <path d="M4 10h16v9.5H4V10Zm0 0-.7-3.5 15.2-3 .7 3.5L4 10Zm4.2-.8L6 5.9m6.5 2.4-2.2-3.3m6.5 2.4-2.2-3.3" {...line} />
    </Svg>
  );
}

/** A little bar chart on a card — "Your weekly Wrapped is ready". */
export function WrapBadgeIcon({ className }: IconProps) {
  return (
    <Svg className={className ?? "size-6"}>
      <rect x="4" y="3.5" width="16" height="17" rx="2" {...line} />
      <path d="M8.5 16.5v-3m3.5 3v-6m3.5 6v-8" {...line} strokeWidth={2} />
    </Svg>
  );
}

export function ChartIcon({ className }: IconProps) {
  return (
    <Svg className={className ?? "size-4"}>
      <path d="M3.5 4v16h17M7 15l4-4 3 3 5.5-5.5" {...line} />
    </Svg>
  );
}

export function EyeIcon({ className }: IconProps) {
  return (
    <Svg className={className ?? "size-4"}>
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" {...line} />
      <circle cx="12" cy="12" r="3" {...line} />
    </Svg>
  );
}

export function DotsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className ?? "size-5"}>
      <circle cx="10" cy="4" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="10" cy="16" r="1.5" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <Svg className={className ?? "size-4"}>
      <path d="M12 5v14M5 12h14" {...line} />
    </Svg>
  );
}

/** Paper plane — "Chapter closed". */
export function SendIcon({ className }: IconProps) {
  return (
    <Svg className={className ?? "size-7"}>
      <path d="M20.5 3.5 3.5 10l7 3m10-9.5L14 20.5l-3.5-7.5m10-9.5-10 9.5" {...line} />
    </Svg>
  );
}
