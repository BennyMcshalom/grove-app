import { useId } from "react";
import { ART_STROKE, artShapes } from "@/components/app/GroupArt";
import { resolveBanner } from "@/lib/banners";
import { cn } from "@/lib/cn";
import { inkOn } from "@/lib/group-look";

/** Where each drawing sits in one 120x84 tile of the doodle wallpaper. */
const TILE = [
  { x: 6, y: 6, s: 0.5, r: -12 },
  { x: 70, y: 2, s: 0.44, r: 10 },
  { x: 38, y: 46, s: 0.5, r: 6 },
] as const;

/**
 * A profile card's banner strip: a solid colour, or that colour tiled with
 * line-art doodles. Size it with `className`; children sit on top.
 * `seed` (the person's id) picks the default colour when they haven't chosen.
 */
export function ProfileBanner({
  banner,
  seed,
  className,
  children,
}: {
  banner: string | null | undefined;
  seed: string;
  className?: string;
  children?: React.ReactNode;
}) {
  // useId has characters url(#…) can't reference.
  const id = `banner-${useId().replace(/[^\w-]/g, "")}`;
  const look = resolveBanner(banner, seed);
  const { ink, paper } = inkOn(look.hex);

  return (
    <div className={cn("relative overflow-hidden", className)} style={{ backgroundColor: look.hex }}>
      {look.kind === "art" && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 size-full opacity-60"
          style={{ "--art-ink": ink, "--art-paper": paper } as React.CSSProperties}
        >
          <defs>
            <pattern id={`${id}-tile`} width="120" height="84" patternUnits="userSpaceOnUse">
              {TILE.map((t, i) => (
                <g
                  key={i}
                  transform={`translate(${t.x} ${t.y}) rotate(${t.r} 16 16) scale(${t.s})`}
                  {...ART_STROKE}
                  strokeWidth={4}
                >
                  {artShapes(look.arts[i % look.arts.length])}
                </g>
              ))}
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${id}-tile)`} />
        </svg>
      )}
      {children && <div className="relative">{children}</div>}
    </div>
  );
}

