import "server-only";

export interface Place {
  latitude: number;
  longitude: number;
  label: string;
}

/**
 * Turns an address or place name into coordinates, server-side only.
 *
 * Uses OpenStreetMap's public Nominatim by default: free, but limited to one
 * request a second, it has to identify the app, and it can't be used for
 * type-ahead. That fits here, where lookups happen only when someone saves an
 * event or their location. Set LOCATIONIQ_API_KEY to switch to LocationIQ's
 * Nominatim-compatible API (free up to 5,000 lookups a day) if traffic outgrows
 * that.
 */
export async function geocode(query: string): Promise<Place | null> {
  const q = query.trim().replace(/\s+/g, " ");
  if (q.length < 2) return null;

  const key = q.toLowerCase();
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const place = await throttled(() => lookup(q));
  if (place !== undefined) remember(key, place);
  return place ?? null;
}

const locationIqKey = () => process.env.LOCATIONIQ_API_KEY;

/** Undefined means the lookup itself failed, so the miss isn't cached. */
async function lookup(q: string): Promise<Place | null | undefined> {
  const apiKey = locationIqKey();
  const url = apiKey
    ? new URL("https://us1.locationiq.com/v1/search")
    : new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  if (apiKey) url.searchParams.set("key", apiKey);

  const contact = process.env.NEXT_PUBLIC_SITE_URL ?? "https://github.com/BennyMcshalom/grove-app";

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": `Grouv/1.0 (${contact})`, "Accept-Language": "en" },
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    // LocationIQ answers "no match" with a 404.
    if (response.status === 404) return null;
    if (!response.ok) {
      console.warn(`[geocode] ${response.status} for "${q}"`);
      return undefined;
    }

    const results = (await response.json()) as { lat: string; lon: string; display_name: string }[];
    const first = results[0];
    if (!first) return null;
    const latitude = Number(first.lat);
    const longitude = Number(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude, label: first.display_name };
  } catch (error) {
    console.warn(`[geocode] lookup failed for "${q}"`, error);
    return undefined;
  }
}

// Per-instance politeness: one request a second, and repeat lookups served
// from memory.
let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

function throttled<T>(task: () => Promise<T>): Promise<T> {
  const minGap = locationIqKey() ? 500 : 1000;
  const run = queue.then(async () => {
    const wait = lastRequestAt + minGap - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
    return task();
  });
  queue = run.catch(() => undefined);
  return run;
}

const cache = new Map<string, Place | null>();

function remember(key: string, place: Place | null) {
  if (cache.size >= 500) cache.delete(cache.keys().next().value!);
  cache.set(key, place);
}
