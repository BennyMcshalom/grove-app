/**
 * Where browsers report Content-Security-Policy violations (see src/lib/csp.ts).
 * Logged, truncated, so anything the policy blocks shows up in Railway's logs.
 */
export async function POST(request: Request) {
  const body = (await request.text()).slice(0, 4000);
  console.warn("[csp] violation", body.replace(/\s+/g, " "));
  return new Response(null, { status: 204 });
}
