import { cn } from "@/lib/cn";

/**
 * Loading placeholders shaped like the thing that's coming.
 *
 * A line of grey text ("Loading posts…") tells someone the app is stuck;
 * a placeholder in the shape of a card tells them it's on its way, and stops
 * the page jumping when it lands. Everything here is presentational — no
 * client JavaScript — and the shimmer respects reduced-motion.
 */
export function Skeleton({ className }: { className?: string }) {
  return <span className={cn("block rounded-md bg-ivory-300 shimmer", className)} />;
}

/** A few lines of body text, the last one short like a real paragraph. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <span className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-3.5", i === lines - 1 ? "w-2/5" : "w-full")} />
      ))}
    </span>
  );
}

/** One post, at the size PostCard renders. */
export function PostCardSkeleton({ withMedia = false }: { withMedia?: boolean }) {
  return (
    <article aria-hidden="true" className="flex gap-4 rounded-2xl bg-surface p-5 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)]">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <SkeletonText lines={2} className="py-2" />
        {withMedia && <Skeleton className="aspect-[589/332] w-full rounded-2xl" />}
        <div className="flex gap-5 py-1">
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>
      </div>
    </article>
  );
}

/** The feed, while its first page loads. */
export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-6">
      <span className="sr-only" role="status">
        Loading posts
      </span>
      {Array.from({ length: count }, (_, i) => (
        <PostCardSkeleton key={i} withMedia={i === 0} />
      ))}
    </div>
  );
}

/** A list of people or conversations: avatar, name, one line under it. */
export function PersonRowsSkeleton({
  count = 4,
  label = "Loading",
  className,
}: {
  count?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <span className="sr-only" role="status">
        {label}
      </span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-40 max-w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Chat messages, alternating sides. */
export function MessagesSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <span className="sr-only" role="status">
        Loading messages
      </span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
          <Skeleton
            className={cn("h-12 rounded-2xl", i % 3 === 0 ? "w-56" : i % 3 === 1 ? "w-40" : "w-64", "max-w-[75%]")}
          />
        </div>
      ))}
    </div>
  );
}
