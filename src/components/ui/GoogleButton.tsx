"use client";

import { useRouter } from "next/navigation";

/**
 * "Continue with Google" — Figma frame 11:26627.
 * 1px ivory-600 border, 8px radius, 16/32 padding, 16px gap.
 *
 * There is no OAuth backend yet, so this completes the same step the email
 * form does rather than being a dead control.
 */
export function GoogleButton({
  label = "Continue with Google",
}: {
  label?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push("/verify")}
      className="flex w-full items-center justify-center gap-4 rounded-lg border border-ivory-600 px-8 py-4 font-sans text-base text-ink-500 transition-colors hover:bg-ivory-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
    >
      <GoogleMark />
      {label}
    </button>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3.01h3.88c2.27-2.09 3.58-5.17 3.58-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.96H1.29v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27a7.2 7.2 0 0 1 0-4.54V6.62H1.29a12 12 0 0 0 0 10.76l3.99-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.96 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.62l3.99 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

/** The "OR" rule between the form and social sign-in. Figma frame 15:18153. */
export function OrDivider() {
  return (
    <div className="flex items-center gap-[13px]">
      <span className="h-px flex-1 bg-ink-100" />
      <span className="font-sans text-base text-ink-500">OR</span>
      <span className="h-px flex-1 bg-ink-100" />
    </div>
  );
}
