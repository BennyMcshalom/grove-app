import Link from "next/link";
import { Avatar } from "@/components/app/Avatar";

/**
 * Chapter group card — Figma frame 575:17916 (Card).
 *
 * Column, 16px padding, 8px radius: the title over a row holding the member
 * stack — up to four 32px photos overlapping by 8px, then a count avatar — and
 * the blurb. The first card in a rail takes the warm wash, the rest the pink.
 */
export const GROUP_GRADIENT = {
  orange:
    "linear-gradient(-7deg, rgba(254,230,215,1) 0%, rgba(254,251,249,1) 100%)",
  pink: "linear-gradient(135deg, rgba(250,231,237,1) 0%, rgba(240,221,221,1) 100%)",
};

export function ChapterGroupCard({
  title,
  blurb,
  href,
  avatars,
  memberCount,
  gradient = GROUP_GRADIENT.pink,
}: {
  title: string;
  blurb: string | null;
  href: string;
  avatars: string[];
  memberCount: number;
  gradient?: string;
}) {
  const extra = memberCount - avatars.length;

  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-lg p-4 transition-opacity hover:opacity-90"
      style={{ backgroundImage: gradient }}
    >
      <span className="font-display text-[13.8px] leading-[1.26] font-semibold text-ink-500">
        {title}
      </span>

      <div className="flex items-center gap-3">
        <span className="flex shrink-0">
          {avatars.map((src, i) => (
            <span
              key={`${src}-${i}`}
              className="rounded-full border-2 border-white"
              style={{ marginLeft: i === 0 ? 0 : -8 }}
            >
              <Avatar src={src} name="" sizes="32px" className="size-7" />
            </span>
          ))}
          {(extra > 0 || avatars.length === 0) && (
            <span
              className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-white bg-primary-50 font-ui text-xs font-extrabold text-primary-600"
              style={{ marginLeft: avatars.length ? -8 : 0 }}
            >
              {avatars.length === 0 ? memberCount : `+${extra}`}
            </span>
          )}
        </span>
        {/* Figma's line-height here is 18px, not Tailwind's 16px. The blurb
            wraps rather than running past the card: our Figtree renders ~2px
            wider than Figma's, so forcing one line overflowed the edge. */}
        {blurb && (
          <span className="min-w-0 font-sans text-xs leading-[18px] text-ink-400">
            {blurb}
          </span>
        )}
      </div>
    </Link>
  );
}
