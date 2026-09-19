"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";

/**
 * A photo that falls back to the Grouv mark.
 *
 * Uploads can go missing — a signed Storage link that has expired, a file
 * removed behind the row that points at it — and a broken image leaves the
 * browser's torn-page icon in the middle of a card. This shows the logo on a
 * quiet tile instead, so the card still looks like part of the app.
 *
 * Pass the same props as `next/image`. With `fill`, the fallback fills the
 * parent the same way, so the parent still needs `relative`.
 */
export function Photo({
  className,
  fallbackClassName,
  onError,
  // Taken out of the spread so the a11y lint can see it.
  alt,
  ...props
}: ImageProps & { fallbackClassName?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <LogoFallback
        className={cn(props.fill && "absolute inset-0 size-full", className, fallbackClassName)}
        style={props.fill ? undefined : { width: props.width, height: props.height }}
      />
    );
  }

  return (
    <Image
      {...props}
      alt={alt}
      className={className}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}

/** The tile shown in place of a picture that didn't load. */
export function LogoFallback({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  // Only ever rendered after an image has failed, which is client-side, so
  // reading the theme here can't disagree with the server's markup.
  const dark =
    typeof document !== "undefined" && document.documentElement.dataset.theme === "dark";

  return (
    <span
      aria-hidden="true"
      style={style}
      className={cn("grid place-items-center overflow-hidden bg-ivory-200", className)}
    >
      <Logo tone={dark ? "onDark" : "onLight"} className="h-6 max-w-[55%] opacity-35" />
    </span>
  );
}

/**
 * A video that falls back to the same mark when the file won't play — an
 * upload that has gone missing leaves an empty black box otherwise.
 */
export function Video({
  className,
  fallbackClassName,
  ...props
}: React.VideoHTMLAttributes<HTMLVideoElement> & { fallbackClassName?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) return <LogoFallback className={cn(className, fallbackClassName)} />;

  return <video {...props} className={className} onError={() => setFailed(true)} />;
}
