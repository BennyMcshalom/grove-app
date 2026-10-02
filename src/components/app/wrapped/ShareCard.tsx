import { Photo } from "@/components/ui/Media";
import { Logo } from "@/components/ui/Logo";
import { QuoteIcon } from "@/components/app/wrapped/icons";
import { cn } from "@/lib/cn";
import { momentDateLabel, type ShareCardData } from "@/lib/wrapped";

/**
 * The share card — one moment, drawn like a Grouv Log card (LogCoverflow's
 * `Card`): a 3:4 portrait photo with the words over a dark fade, or a warm
 * words-only card when there's no photo. Above it, who shared it and the
 * logo. exportCard.ts draws the same layout to a PNG.
 *
 * "preview" is the sharer's own view and "public" the recipient's; both show
 * "Shared by <name>" so the sharer sees exactly what leaves. A hidden name
 * reads generically everywhere.
 */
export function ShareCard({
  card,
  variant,
  className,
}: {
  card: ShareCardData;
  variant: "preview" | "public";
  className?: string;
}) {
  const name = card.sharerName;
  const meta =
    variant === "preview"
      ? `From your Grouv Log · ${momentDateLabel(card.date)}`
      : `From ${name ? `${name}’s` : "a"} Grouv Log · ${momentDateLabel(card.date)}`;

  return (
    <div className={cn("flex w-full flex-col gap-4", className)}>
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-sans text-lg leading-snug font-medium text-ink-800">
            {name ? `Shared by ${name}` : "Shared from Grouv"}
          </p>
          <p className="font-sans text-xs font-medium tracking-wide text-primary-600 uppercase">
            {name ? `Moment from ${name}’s Life Wrapped` : "A moment from a Life Wrapped"}
          </p>
        </div>
        {/* self-start: in a stretch layout the img widened and looked smeared. */}
        <Logo className="h-7 shrink-0 self-start" />
      </header>

      {/* aspect-ratio is only a minimum here: overflow-clip (not hidden) keeps
          the rounded corners without making it a scroll container, so a long
          reflection grows the card instead of being cut off. */}
      <figure
        className={cn(
          "relative flex aspect-[3/4] w-full flex-col overflow-clip rounded-[22px] shadow-[0_18px_40px_-16px_rgba(0,0,0,0.35)]",
          card.photoUrl ? "justify-end bg-ink-800" : "justify-between bg-gradient-to-br from-primary-100 via-ivory-100 to-primary-50",
        )}
      >
        {card.photoUrl ? (
          <>
            <Photo src={card.photoUrl} alt="" fill unoptimized sizes="(max-width: 480px) 100vw, 440px" className="object-cover" />
            <figcaption className="relative flex flex-col gap-2 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-5 pt-24 pb-5">
              {card.body && (
                <p className="font-sans text-base leading-snug font-semibold whitespace-pre-line text-white">{card.body}</p>
              )}
              <p className="font-sans text-xs font-medium text-white/80">{meta}</p>
            </figcaption>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-3 p-6">
              <QuoteIcon className="size-6 text-primary-600" />
              <p className="font-display text-xl leading-snug whitespace-pre-line text-ink-700">{card.body}</p>
            </div>
            <figcaption className="px-6 pb-5 font-sans text-xs font-medium text-ink-400">{meta}</figcaption>
          </>
        )}
      </figure>
    </div>
  );
}
