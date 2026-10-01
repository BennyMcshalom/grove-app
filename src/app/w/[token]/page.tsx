import type { Metadata } from "next";
import Link from "next/link";
import { ShareCard } from "@/components/app/wrapped/ShareCard";
import { Logo } from "@/components/ui/Logo";
import { createClient } from "@/lib/supabase/server";

/**
 * A shared Life Wrapped moment — Figma 1497:23534. Opens signed out.
 *
 * Shows only the snapshot stored when the link was made (names and photos
 * already removed if the sharer hid them). The photo comes through ./photo so
 * the storage path never reaches the browser. A revoked or unknown token gets
 * a calm "not available" card instead.
 */
export const metadata: Metadata = {
  title: "A moment shared from Grouv",
  robots: { index: false, follow: false },
};

export default async function SharedWrapPage({ params }: PageProps<"/w/[token]">) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = /^[0-9a-f]{16}$/.test(token)
    ? await supabase.rpc("shared_wrap_card", { p_token: token })
    : { data: null };
  const card = data?.[0];
  const name = card?.sharer_name ?? null;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ivory-100 px-4 py-10 sm:py-16">
      <article className="flex w-full max-w-[660px] flex-col gap-8 rounded-3xl bg-surface p-6 sm:p-8">
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
            <p className="font-sans text-xs text-ink-300">
              This is a shared moment from Grouv. It doesn&rsquo;t link to {name ? `${name}’s` : "anyone’s"} private Log,
              profile, or anyone in it.
            </p>
          </>
        ) : (
          <div className="flex flex-col gap-4">
            <Logo className="h-10" />
            <h1 className="font-display text-2xl font-semibold text-ink-800">This moment isn&rsquo;t available</h1>
            <p className="font-sans text-base text-ink-400">
              The person who shared it may have turned the link off. Nothing else about them is shown here.
            </p>
          </div>
        )}
        <Link href="/" className="self-center font-ui text-sm font-semibold text-primary-800 hover:underline">
          Curious what Grouv is? Check it out
        </Link>
      </article>
    </main>
  );
}
