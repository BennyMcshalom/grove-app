/**
 * Storage paths that actions accept from the browser. uploadFile() names
 * files `<folder>/<prefix><uuid>.<ext>`; anything else (another user's
 * folder, "..", an SVG or HTML file) is refused before it reaches a row.
 */

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const MEDIA_EXT = "jpe?g|png|webp|gif|heic|heif|avif|mp4|mov|webm|m4a|mp3|ogg|aac|wav";
const DOCUMENT_EXT = "pdf|docx?|xlsx?|pptx?|txt|csv|bin";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A photo, video or voice note in the `media` bucket, in the caller's own folder. */
export function isOwnMediaPath(path: unknown, userId: string): path is string {
  return (
    typeof path === "string" &&
    new RegExp(`^${escape(userId)}/[a-z-]{0,20}${UUID}\\.(${MEDIA_EXT})$`, "i").test(path)
  );
}

/** A chat attachment: `<conversation>/<sender>/…`, media or one of the document types chat allows. */
export function isOwnChatPath(path: unknown, conversationId: string, userId: string): path is string {
  return (
    typeof path === "string" &&
    new RegExp(`^${escape(conversationId)}/${escape(userId)}/[a-z-]{0,20}${UUID}\\.(${MEDIA_EXT}|${DOCUMENT_EXT})$`, "i").test(path)
  );
}
