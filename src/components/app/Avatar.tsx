"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useOptionalViewer } from "@/components/app/ViewerProvider";
import { cn } from "@/lib/cn";

/** Where someone's photo leads: their Grouv, or Your Grouv for yourself. */
export function grouvHref(userId: string, viewerId?: string | null) {
  return userId === viewerId ? "/settings/your-grouv" : `/people/${userId}`;
}

/**
 * A round profile photo that fills its box (size it with `className`), or the
 * first letter of the name — both when the person hasn't added a photo and
 * when the one they added no longer loads. A person's initial reads better
 * here than the Grouv mark, which is what broken content images fall back to.
 *
 * With `userId`, tapping the photo opens that person's Grouv page. Avatars
 * often sit inside a row that's already a button (a chat, a notification),
 * so this navigates itself and stops the tap from reaching the row, rather
 * than nesting a link inside a button.
 */
export function Avatar({
  src,
  name,
  sizes = "40px",
  className,
  userId,
}: {
  src: string | null;
  name: string;
  /** Rendered width, for next/image's srcset. */
  sizes?: string;
  className?: string;
  /** Makes the photo open this person's Grouv page. */
  userId?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const router = useRouter();
  const viewer = useOptionalViewer();
  const href = userId ? grouvHref(userId, viewer?.id) : null;

  const open = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (href) router.push(href);
  };
  const linkProps = href
    ? {
        role: "link" as const,
        tabIndex: 0,
        "aria-label": userId === viewer?.id ? "Your Grouv" : `${name || "Their"}'s Grouv`,
        onClick: open,
        onPointerEnter: () => router.prefetch(href),
        onKeyDown: (event: React.KeyboardEvent) => {
          if (event.key === "Enter" || event.key === " ") open(event);
        },
      }
    : {};
  const linkClass = href && "cursor-pointer outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary-400";

  if (src && !failed) {
    return (
      <span {...linkProps} className={cn("relative block shrink-0 overflow-hidden rounded-full", linkClass, className)}>
        <Image src={src} alt="" fill sizes={sizes} className="object-cover" onError={() => setFailed(true)} />
      </span>
    );
  }

  return (
    <span
      {...linkProps}
      aria-hidden={href ? undefined : true}
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-primary-100 font-sans font-semibold text-primary-600 [container-type:size]",
        linkClass,
        className,
      )}
    >
      <span aria-hidden="true" className="text-[40cqh] leading-none">
        {name.trim().charAt(0).toUpperCase() || "?"}
      </span>
    </span>
  );
}
