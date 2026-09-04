import Link from "next/link";
import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Button — Figma component set 8:7228.
 *
 * Variants map to the Figma "Property 1" axis (Primary / Secondary / Tertiary /
 * Icon), sizes to "Property 2", and the Hover / Pressed / Disabled / Loading
 * states of "Property 3" are expressed as CSS states rather than props.
 */
type Variant = "primary" | "secondary" | "tertiary" | "icon";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  // primary-500 base, primary-400 hover, primary-600 pressed
  primary:
    "bg-primary-500 text-ink-0 hover:bg-primary-400 active:bg-primary-600 disabled:bg-ink-50 disabled:text-ink-200",
  secondary:
    "bg-primary-50 text-primary-800 hover:bg-primary-100 active:bg-primary-200 disabled:bg-ink-50 disabled:text-ink-200",
  tertiary:
    "bg-transparent text-primary-800 hover:bg-primary-50 active:bg-primary-100 disabled:text-ink-200",
  icon: "bg-primary-500 text-ink-0 hover:bg-primary-400 active:bg-primary-600 disabled:bg-ink-50 disabled:text-ink-200",
};

// Figma paddings: Small 10/12, Medium 12/16, Large 14/20. Gap is 8 throughout.
const SIZE: Record<Size, string> = {
  sm: "px-3 py-2.5 text-sm",
  md: "px-4 py-3 text-base",
  lg: "px-5 py-3.5 text-lg",
};

const ICON_SIZE: Record<Size, string> = {
  sm: "p-2.5",
  md: "p-3",
  lg: "p-3.5",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
  /** When set, renders a Next.js Link styled as a button. */
  href?: string;
}

export function Button({
  variant = "primary",
  size = "lg",
  loading = false,
  iconLeft,
  iconRight,
  fullWidth = false,
  href,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const isIconOnly = variant === "icon";

  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-pill font-ui font-medium",
    "transition-colors duration-150",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
    "disabled:cursor-not-allowed",
    isIconOnly ? ICON_SIZE[size] : SIZE[size],
    VARIANT[variant],
    fullWidth && "w-full",
    className,
  );

  const content = (
    <>
      {loading ? <Spinner /> : iconLeft}
      {!isIconOnly && children}
      {!loading && iconRight}
    </>
  );

  if (href && !disabled && !loading) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button
      // Loading is visually distinct but must also block interaction.
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
      {...props}
    >
      {content}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      className="size-5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeOpacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
