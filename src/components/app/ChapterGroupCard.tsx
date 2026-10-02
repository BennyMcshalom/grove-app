import Link from "next/link";
import { Avatar } from "@/components/app/Avatar";
import { GroupArt } from "@/components/app/GroupArt";
import { inkOn, type GroupArtKey } from "@/lib/group-look";

/**
 * Chapter group card — Figma frame 575:17916 (Card), restyled after testing
 * (2 Oct 2026): a flat card in the group's own colour with its line-art up
 * top-right, the title bold beside it, then the member stack (up to four
 * photos overlapping by 8px and a count) and the blurb. Text and art switch
 * to white on dark colours.
 */
export const GROUP_GRADIENT = {
  orange: "var(--wash-warm)",
  pink: "var(--wash-pink)",
};

export function ChapterGroupCard({
  title,
  blurb,
  href,
  avatars,
  memberCount,
  color,
  art,
}: {
  title: string;
  blurb: string | null;
  href: string;
  avatars: string[];
  memberCount: number;
  /** The group's flat colour. */
  color: string;
  art: GroupArtKey;
}) {
  const extra = memberCount - avatars.length;
  const { ink, paper, muted } = inkOn(color);

  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-xl p-4 transition-opacity hover:opacity-90"
      style={{ backgroundColor: color, color: ink }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 pt-1 font-display text-base leading-tight font-bold">{title}</span>
        <GroupArt art={art} ink={ink} paper={paper} className="size-14" />
      </div>

      <div className="flex items-center gap-3">
        <span className="flex shrink-0">
          {avatars.map((src, i) => (
            <span
              key={`${src}-${i}`}
              className="rounded-full border-2"
              style={{ marginLeft: i === 0 ? 0 : -8, borderColor: color }}
            >
              <Avatar src={src} name="" sizes="32px" className="size-7" />
            </span>
          ))}
          {(extra > 0 || avatars.length === 0) && (
            <span
              className="grid size-8 shrink-0 place-items-center rounded-full border-2 font-ui text-xs font-extrabold"
              style={{ marginLeft: avatars.length ? -8 : 0, borderColor: color, backgroundColor: paper, color: ink }}
            >
              {avatars.length === 0 ? memberCount : `+${extra}`}
            </span>
          )}
        </span>
        {/* The blurb wraps rather than running past the card. */}
        {blurb && (
          <span className="min-w-0 font-sans text-xs leading-[18px] font-medium" style={{ color: muted }}>
            {blurb}
          </span>
        )}
      </div>
    </Link>
  );
}
