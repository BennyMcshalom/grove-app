import "server-only";

/**
 * Checks an outbound address against Google Safe Browsing (malware, phishing,
 * unwanted software). Needs GOOGLE_SAFE_BROWSING_API_KEY (free, from Google
 * Cloud: enable "Safe Browsing API"). Without a key — or if Google can't be
 * reached — the answer is "unchecked", and the leaving page says so.
 */
export type LinkVerdict = "safe" | "unsafe" | "unchecked";

export async function checkLink(url: string): Promise<LinkVerdict> {
  const key = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
  if (!key) return "unchecked";

  try {
    const response = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client: { clientId: "grouv", clientVersion: "1.0" },
        threatInfo: {
          threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url }],
        },
      }),
      signal: AbortSignal.timeout(4000),
      // Verdicts change; don't let Next cache them.
      cache: "no-store",
    });
    if (!response.ok) return "unchecked";
    const body = (await response.json()) as { matches?: unknown[] };
    return body.matches?.length ? "unsafe" : "safe";
  } catch {
    return "unchecked";
  }
}
