"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useOptionalViewer } from "@/components/app/ViewerProvider";
import { cn } from "@/lib/cn";
import { auraLabel, auraRing, type Aura } from "@/lib/profile";

/** Where someone's photo leads: their Grouv, or Your Grouv for yourself. */
export function grouvHref(userId: string, viewerId?: string | null) {
  return userId === viewerId ? "/settings/your-grouv" : `/people/${userId}`;
}

/**
 * The aura status ring: a thin solid ring in the aura colour, held off the
 * photo by a surface-coloured gap, over a soft drop shadow. Drawn as stacked
 * box-shadows so it never changes the avatar’s layout box. Thickness
 * follows the rendered size (from `sizes`) so small and large photos match.
 */
function auraStyle(aura: Aura, sizes: string): React.CSSProperties {
  const px = Number.parseInt(sizes, 10) || 40;
  const ring = px >= 96 ? 3 : px >= 32 ? 2 : 1.5;
  const gap = px >= 96 ? 3 : 2;
  return {
    boxShadow: [
      `0 0 0 ${gap}px var(--color-surface)`,
      `0 0 0 ${gap + ring}px ${auraRing(aura)}`,
      `0 ${Math.round(px / 16) + 2}px ${Math.round(px / 6) + 6}px -2px rgb(23 23 23 / 0.22)`,
    ].join(", "),
  };
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
 *
 * With `aura`, the photo wears that person’s status ring (see auraStyle).
 * Leave it out when their aura isn’t known — the photo then stays natural.
 */
export function Avatar({
  src,
  name,
  sizes = "40px",
  className,
  userId,
  aura,
}: {
  src: string | null;
  name: string;
  /** Rendered width, for next/image's srcset. */
  sizes?: string;
  className?: string;
  /** Makes the photo open this person's Grouv page. */
  userId?: string | null;
  /** Draws the aura status ring around the photo. */
  aura?: Aura | null;
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
  const ringProps = aura ? { style: auraStyle(aura, sizes), title: auraLabel(aura) } : {};
  // The aura ring owns box-shadow, so a ringed photo shows focus as an outline.
  const linkClass =
    href &&
    cn(
      "cursor-pointer outline-none transition-opacity hover:opacity-90",
      aura
        ? "focus-visible:outline-2 focus-visible:outline-offset-[6px] focus-visible:outline-primary-400"
        : "focus-visible:ring-2 focus-visible:ring-primary-400",
    );

  if (src && !failed) {
    return (
      <span {...linkProps} {...ringProps} className={cn("relative block shrink-0 overflow-hidden rounded-full", linkClass, className)}>
        <Image src={src} alt="" fill sizes={sizes} className="object-cover" onError={() => setFailed(true)} />
      </span>
    );
  }

  return (
    <span
      {...linkProps}
      {...ringProps}
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
