import { Photo } from "@/components/ui/Media";
import { Logo } from "@/components/ui/Logo";
import { QuoteIcon } from "@/components/app/wrapped/icons";
import { momentDateLabel, wrapRangeLabel, type ShareCardData } from "@/lib/wrapped";

/**
 * The share card — Figma 1483:22575 (Preview) and 1497:23534 (the recipient
 * page). One moment, the Grouv logo, nothing else about the member's Log.
 *
 * "preview" is the sharer's own view ("MOMENT FROM MY LIFE WRAPPED"); "public"
 * is what a recipient sees ("Shared by Amara"). A hidden name reads as "a
 * Grouv member" everywhere.
 */
export function ShareCard({ card, variant }: { card: ShareCardData; variant: "preview" | "public" }) {
  const name = card.sharerName;
  const date = momentDateLabel(card.date);

  return (
    <div className="flex flex-col gap-5">
      <Logo className="h-10" />

      {variant === "public" ? (
        <div className="flex flex-col gap-1">
          <p className="font-sans text-xl font-medium text-ink-800">
            {name ? `Shared by ${name}` : "Shared from Grouv"}
          </p>
          <p className="font-sans text-xs font-medium tracking-wide text-primary-600 uppercase">
            {name ? `Moment from ${name}’s Life Wrapped` : "A moment from a Life Wrapped"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="font-sans text-xs font-medium tracking-wide text-primary-600 uppercase">
            Moment from my Life Wrapped
          </p>
          <p className="font-sans text-sm text-ink-300">
            {wrapRangeLabel(card.range, card.startsOn, card.endsOn)}
          </p>
        </div>
      )}

      {card.photoUrl && (
        <div className="flex flex-col gap-2">
          <div className="relative aspect-[596/260] w-full overflow-hidden rounded-2xl bg-ink-800">
            <Photo src={card.photoUrl} alt="" fill unoptimized sizes="600px" className="object-cover" />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <p className="font-sans text-xs text-ink-300">
          {variant === "preview"
            ? `From your Grouv Log · ${date}`
            : `From ${name ? `${name}’s` : "a"} Grouv Log · ${date}`}
        </p>
        {card.body && (
          <div className="flex flex-col gap-2">
            <QuoteIcon className="size-5 text-primary-600" />
            <p className="font-sans text-base whitespace-pre-line text-ink-700">{card.body}</p>
          </div>
        )}
      </div>
    </div>
  );
}
