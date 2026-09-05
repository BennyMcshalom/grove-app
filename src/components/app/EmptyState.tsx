/**
 * Empty states — Figma frames 648:35986 (No Group) and 648:36642 (No Events).
 *
 * A centred illustration over a title and a line of helper copy, with an
 * optional primary action beneath.
 */
export function EmptyState({
  title,
  body,
  action,
  variant = "board",
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
  /** "board" is the clipboard used by No Group; "screen" the No Events panel. */
  variant?: "board" | "screen";
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      {variant === "board" ? <BoardArt /> : <ScreenArt />}
      <div className="flex flex-col gap-1">
        <p className="font-sans text-base font-medium text-ink-600">{title}</p>
        <p className="font-sans text-sm text-ink-300">{body}</p>
      </div>
      {action}
    </div>
  );
}

/** The clipboard-with-a-frown illustration. */
function BoardArt() {
  return (
    <svg
      viewBox="0 0 220 200"
      className="h-[180px] w-[200px]"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="118" cy="118" rx="82" ry="58" fill="#FDE7D8" />
      <rect
        x="62"
        y="26"
        width="98"
        height="128"
        rx="8"
        fill="#FFFFFF"
        stroke="#F3A06A"
        strokeWidth="3"
      />
      <rect
        x="98"
        y="16"
        width="26"
        height="16"
        rx="4"
        fill="#FFFFFF"
        stroke="#F3A06A"
        strokeWidth="3"
      />
      <path
        d="m92 66 14 14M106 66l-14 14M118 66l14 14M132 66l-14 14"
        stroke="#C9CDD4"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M94 116a18 18 0 0 1 34 0"
        stroke="#C9CDD4"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M44 60h10M49 55v10M176 92h8M180 88v8M52 128h8M56 124v8"
        stroke="#F3A06A"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="166" cy="42" r="3" fill="#F3701E" />
      <circle cx="108" cy="176" r="3" fill="#F3701E" />
      <ellipse cx="111" cy="170" rx="52" ry="4" fill="#F6D9C6" />
    </svg>
  );
}

/** The empty-screen illustration used by No Events. */
function ScreenArt() {
  return (
    <svg
      viewBox="0 0 220 180"
      className="h-[160px] w-[200px]"
      fill="none"
      aria-hidden="true"
    >
      <ellipse cx="110" cy="104" rx="86" ry="52" fill="#FDE7D8" />
      <rect x="56" y="34" width="108" height="18" rx="4" fill="#F9BE95" />
      <rect
        x="56"
        y="52"
        width="108"
        height="72"
        rx="6"
        fill="#FFFFFF"
        stroke="#C9CDD4"
        strokeWidth="2.5"
      />
      <path
        d="M92 84a4 4 0 1 1 0 .1M128 84a4 4 0 1 1 0 .1"
        stroke="#C9CDD4"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M94 106a18 18 0 0 1 32 0"
        stroke="#C9CDD4"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M110 24v10M104 30l6-6 6 6" stroke="#C9CDD4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M40 62h9M44.5 57.5v9M178 118h8M182 114v8M84 150h8M88 146v8"
        stroke="#F3A06A"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <ellipse cx="110" cy="140" rx="54" ry="4" fill="#F6D9C6" />
    </svg>
  );
}
