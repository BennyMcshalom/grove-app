import type { Metadata } from "next";
import { cache } from "react";
import { ShareCard } from "@/components/app/wrapped/ShareCard";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { siteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

/**
 * A shared Life Wrapped moment — Figma 1497:23534, laid out around the Grouv
 * Log's 3:4 portrait card so it reads well on a phone, where most of these
 * links are opened. Opens signed out.
 *
 * Shows only the snapshot stored when the link was made (names and photos
 * already removed if the sharer hid them). The photo comes through ./photo so
 * the storage path never reaches the browser. A revoked or unknown token gets
 * a calm "not available" card instead.
 */

/** One lookup per request, shared by the page and its link preview. */
const loadCard = cache(async (token: string) => {
  if (!/^[0-9a-f]{16}$/.test(token)) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("shared_wrap_card", { p_token: token });
  return data?.[0] ?? null;
});

/** WhatsApp, iMessage and the rest preview the link with the card's photo. */
export async function generateMetadata({ params }: PageProps<"/w/[token]">): Promise<Metadata> {
  const { token } = await params;
  const card = await loadCard(token);
  const robots = { index: false, follow: false };
  if (!card) return { title: "A moment shared from Grouv", robots };

  const origin = await siteUrl();
  const title = card.sharer_name ? `A moment from ${card.sharer_name}’s Life Wrapped` : "A moment shared from Grouv";
  const body = card.body?.replace(/\s+/g, " ").trim();
  const description = body
    ? body.length > 160
      ? `${body.slice(0, 157)}…`
      : body
    : "A moment from a Life Wrapped on Grouv.";
  const image = card.photo_path ? `${origin}/w/${token}/photo` : `${origin}/images/logo-wordmark-36814b.png`;

  return {
    title,
    description,
    robots,
    openGraph: {
      title,
      description,
      url: `${origin}/w/${token}`,
      siteName: "Grouv",
      type: "article",
      images: [{ url: image, alt: "" }],
    },
    twitter: { card: card.photo_path ? "summary_large_image" : "summary", title, description, images: [image] },
  };
}

export default async function SharedWrapPage({ params }: PageProps<"/w/[token]">) {
  const { token } = await params;
  const card = await loadCard(token);
  const name = card?.sharer_name ?? null;

  return (
    <main className="flex min-h-dvh justify-center bg-ivory-100 px-4 py-6 sm:items-center sm:py-12">
      <div className="flex w-full max-w-[440px] flex-col gap-6">
        {card ? (
          <>
            <ShareCard
              variant="public"
              card={{
                sharerName: name,
                range: card.range,
                startsOn: card.starts_on,
                endsOn: card.ends_on,
                body: card.body,
                photoUrl: card.photo_path ? `/w/${token}/photo` : null,
                date: card.moment_date,
              }}
            />
            <p className="px-2 text-center font-sans text-xs text-ink-300">
              This is a shared moment from Grouv. It doesn&rsquo;t link to {name ? `${name}’s` : "anyone’s"} private Log,
              profile, or anyone in it.
            </p>
          </>
        ) : (
          <div className="flex flex-col gap-4 rounded-[22px] bg-surface p-6">
            <Logo className="h-7 self-start" />
            <h1 className="font-display text-2xl font-semibold text-ink-800">This moment isn&rsquo;t available</h1>
            <p className="font-sans text-base text-ink-400">
              The person who shared it may have turned the link off. Nothing else about them is shown here.
            </p>
          </div>
        )}

        <section className="flex flex-col items-center gap-3 rounded-[22px] bg-surface p-5 text-center">
          <p className="font-sans text-base font-medium text-ink-700">Curious what Grouv is?</p>
          <Button href="/" size="md" fullWidth iconRight={<ArrowRight />}>
            Check it out
          </Button>
        </section>
      </div>
    </main>
  );
}
