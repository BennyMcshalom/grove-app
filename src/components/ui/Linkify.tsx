import { splitLinks } from "@/lib/links";
import { cn } from "@/lib/cn";

/**
 * Plain text with its web addresses turned into links. Each goes through
 * /link, which checks the address before leaving Grouv.
 */
export function Linkify({ text, className }: { text: string; className?: string }) {
  return (
    <>
      {splitLinks(text).map((part, i) =>
        part.kind === "text" ? (
          part.text
        ) : (
          <a
            key={i}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn("break-all underline underline-offset-2 hover:opacity-80", className)}
            onClick={(e) => e.stopPropagation()}
          >
            {part.text}
          </a>
        ),
      )}
    </>
  );
}
