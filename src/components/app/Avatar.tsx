import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * A round profile photo that fills its box (size it with `className`), or the
 * first letter of the name when the person hasn't added one.
 */
export function Avatar({
  src,
  name,
  sizes = "40px",
  className,
}: {
  src: string | null;
  name: string;
  /** Rendered width, for next/image's srcset. */
  sizes?: string;
  className?: string;
}) {
  if (src) {
    return (
      <span className={cn("relative block shrink-0 overflow-hidden rounded-full", className)}>
        <Image src={src} alt="" fill sizes={sizes} className="object-cover" />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-primary-100 font-sans font-semibold text-primary-600 [container-type:size]",
        className,
      )}
    >
      <span className="text-[40cqh] leading-none">{name.trim().charAt(0).toUpperCase() || "?"}</span>
    </span>
  );
}
