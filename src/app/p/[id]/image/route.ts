import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const SAFE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

/**
 * The picture a link preview (WhatsApp, X, iMessage…) shows for a shared
 * post: its first photo, streamed with the secret key once the database says
 * the post is open to anyone with the link. No storage path or signed URL
 * reaches the crawler, and a deleted post stops serving at once.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 404 });

  const supabase = await createClient();
  const { data } = await supabase.rpc("public_post", { p_post_id: id });
  const path = data?.[0]?.media.find((m) => m.kind === "photo")?.path;
  if (!path) return new Response(null, { status: 404 });

  const { data: file, error } = await createAdminClient().storage.from("media").download(path);
  if (error || !file) {
    console.error("[public-post] preview image download failed", error);
    return new Response(null, { status: 404 });
  }

  // Only plain raster images; an SVG served from grouv.app could run script.
  const type = (file.type || "").split(";")[0].trim().toLowerCase();
  if (!SAFE_IMAGE_TYPES.has(type)) return new Response(null, { status: 404 });

  return new Response(file, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": "inline",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; sandbox",
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
