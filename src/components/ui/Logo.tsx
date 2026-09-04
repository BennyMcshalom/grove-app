import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Logo — Figma component set 36:759.
 *
 * Two assets, both exported from Figma as rendered nodes rather than raw image
 * fills: the raw fill has no stroke, so on a white surface it disappears.
 *   onDark  — splash instance 36:854, sits on primary-600
 *   onLight — sidebar instance I65:1853;60:2562, outlined for white surfaces
 *
 * No default height: `cn` is a plain joiner, so a baked-in `lg:h-20` would
 * out-specify a caller's `h-10` at that breakpoint and silently render the
 * wrong size. Each caller states the size Figma gives it:
 *   sidebar  143x40
 *   splash   285x80 desktop / 171x48 mobile
 */
export function Logo({
  className,
  tone = "onLight",
  priority = false,
}: {
  className?: string;
  tone?: "onLight" | "onDark";
  priority?: boolean;
}) {
  const src =
    tone === "onDark" ? "/images/logo-splash.png" : "/images/logo-sidebar.png";

  return (
    <Image
      src={src}
      alt="Grouv"
      width={285}
      height={80}
      priority={priority}
      className={cn("w-auto", className)}
    />
  );
}
