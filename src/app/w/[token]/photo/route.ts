import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const SAFE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

/**
 * The photo on a shared Wrapped card. The link's snapshot says which object
 * (if any) it carries; this streams just that one with the secret key, so a
 * signed-out recipient never sees a storage path or a signed URL. Revoking
 * the link stops it at once.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{16}$/.test(token)) return new Response(null, { status: 404 });

  const supabase = await createClient();
  const { data } = await supabase.rpc("shared_wrap_card", { p_token: token });
  const path = data?.[0]?.photo_path;
  if (!path) return new Response(null, { status: 404 });

  const { data: file, error } = await createAdminClient().storage.from("media").download(path);
  if (error || !file) {
    console.error("[wrapped] shared photo download failed", error);
    return new Response(null, { status: 404 });
  }

  // Only plain raster images. An SVG (or anything else) served from grouv.app
  // could run script on our origin, so it is never served, whatever the
  // bucket accepted.
  const type = (file.type || "").split(";")[0].trim().toLowerCase();
  if (!SAFE_IMAGE_TYPES.has(type)) return new Response(null, { status: 404 });

  return new Response(file, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": "inline",
      // Even if a browser tried to treat it as a document, it gets no script and no origin.
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; sandbox",
      // Short, private caching: a revoke should take effect quickly.
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
