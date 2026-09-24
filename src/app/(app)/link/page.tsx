import { TopBar } from "@/components/app/TopBar";
import { checkLink } from "@/lib/link-safety";
import { normaliseOutboundUrl } from "@/lib/links";

/**
 * Every link in a post, comment or chat opens here first. No Figma frame.
 * The address is checked (Google Safe Browsing, when configured) and shown in
 * full, so nobody leaves Grouv for somewhere other than they expected.
 */
export default async function LeavingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { to } = await searchParams;
  const url = normaliseOutboundUrl(typeof to === "string" ? to : null);
  const verdict = url ? await checkLink(url.href) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title="Leaving Grouv" back="/home" />
      <div className="min-h-0 flex-1 scroll-slim overflow-y-auto p-4 lg:p-8">
        <div className="mx-auto flex w-full max-w-[560px] flex-col gap-5 rounded-3xl bg-surface p-6 lg:p-8">
          {!url ? (
            <>
              <h1 className="font-display text-2xl font-semibold text-ink-700">That link can&apos;t be opened</h1>
              <p className="font-sans text-base text-ink-500">
                It isn&apos;t a normal web address, so we won&apos;t open it.
              </p>
            </>
          ) : verdict === "unsafe" ? (
            <>
              <h1 className="font-display text-2xl font-semibold text-destructive-60">This link looks unsafe</h1>
              <p className="font-sans text-base text-ink-500">
                Google Safe Browsing has flagged <strong className="break-all text-ink-700">{url.hostname}</strong> for
                malware or phishing. We&apos;ve stopped it here to keep you safe.
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-semibold text-ink-700">You&apos;re leaving Grouv</h1>
              <p className="font-sans text-base text-ink-500">This link goes to</p>
              <p className="rounded-lg bg-ivory-100 px-4 py-3 font-sans text-base break-all text-ink-700">
                <strong>{url.hostname}</strong>
                <span className="text-ink-400">{url.href.slice(url.origin.length)}</span>
              </p>
              <p className="font-sans text-sm text-ink-400">
                {verdict === "safe"
                  ? "No known threats found. Still, only continue if you trust where it came from."
                  : "We couldn't check this link. Only continue if you trust where it came from."}
              </p>
              {/* A plain anchor, so no Grouv page is sent as the referrer. */}
              <a
                href={url.href}
                rel="noopener noreferrer"
                className="flex h-12 w-full items-center justify-center rounded-full bg-primary-500 px-6 font-ui text-base font-medium text-white transition-colors hover:bg-primary-400"
              >
                Continue to {url.hostname}
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
