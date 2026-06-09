import { type NextRequest, NextResponse } from 'next/server';

// Server-side IP geolocation fallback for when browser geolocation fails
// (common on macOS desktops without GPS / WiFi positioning issues).
export async function GET(req: NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0].trim() ?? '';

  const isLocal =
    !ip || ip === '127.0.0.1' || ip === '::1' ||
    ip.startsWith('10.') || ip.startsWith('172.16.') || ip.startsWith('192.168.');

  if (isLocal) {
    // Dev fallback — return a plausible location so the feature works on localhost.
    // Both users on the same dev machine will share this and see each other nearby.
    return NextResponse.json({ lat: 6.5244, lng: 3.3792, city: 'Lagos', approximate: true });
  }

  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error('ipapi error');
    const data = await res.json();
    if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
      return NextResponse.json({
        lat: data.latitude,
        lng: data.longitude,
        city: data.city ?? null,
        approximate: true,
      });
    }
  } catch {}

  return NextResponse.json({ error: 'Location unavailable' }, { status: 503 });
}
