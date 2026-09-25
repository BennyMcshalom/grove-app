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
      <Skeleton className="hidden size-10 shrink-0 rounded-full sm:block" />
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

/**
 * Route-level placeholders (the pages' loading.tsx files). They show the
 * instant a link is followed, laid out like the page that's coming, so
 * navigation never sits on a blank or frozen screen.
 */

/** The page title bar. */
export function TopBarSkeleton({ withTabs = false }: { withTabs?: boolean }) {
  return (
    <div aria-hidden="true" className="flex shrink-0 flex-col gap-4 bg-surface px-5 pt-4 pb-3 lg:px-6 lg:pt-10">
      <Skeleton className="h-7 w-44" />
      {withTabs && (
        <div className="flex gap-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full" />
          ))}
        </div>
      )}
    </div>
  );
}

/** The right-hand rail on wide screens. */
export function RailSkeleton() {
  return (
    <aside aria-hidden="true" className="hidden w-[396px] shrink-0 flex-col gap-7 bg-surface px-8 pt-6 xl:flex">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex flex-col gap-4">
          <Skeleton className="h-4 w-28" />
          <PersonRowsSkeleton count={3} label="" />
        </div>
      ))}
    </aside>
  );
}

/** Home and a space: title, feed column, rail. */
export function FeedPageSkeleton({ withTabs = true }: { withTabs?: boolean }) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBarSkeleton withTabs={withTabs} />
        <div className="min-h-0 flex-1 overflow-hidden px-4 py-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[724px] flex-col gap-6">
            <Skeleton className="hidden h-40 w-full rounded-2xl lg:block" />
            <FeedSkeleton count={2} />
          </div>
        </div>
      </div>
      <RailSkeleton />
    </div>
  );
}

/** Any other page: title and a stack of cards. */
export function PageSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <span className="sr-only" role="status">
        Loading
      </span>
      <TopBarSkeleton />
      <div className="min-h-0 flex-1 overflow-hidden px-4 py-6 lg:px-8">
        <div aria-hidden="true" className="mx-auto flex w-full max-w-[1096px] flex-col gap-5">
          <Skeleton className="h-36 w-full rounded-2xl" />
          <div className="grid gap-5 sm:grid-cols-2">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
          <div className="flex flex-col gap-4 rounded-2xl bg-surface p-5">
            <PersonRowsSkeleton count={4} label="" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Bonds: conversation list beside the chat. */
export function ChatPageSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div aria-hidden="true" className="flex w-full flex-col gap-4 border-r border-ink-50 bg-surface p-4 lg:w-[360px]">
        <Skeleton className="h-7 w-28" />
        <PersonRowsSkeleton count={7} label="Loading your bonds" />
      </div>
      <div className="hidden min-w-0 flex-1 flex-col bg-ivory-100 lg:flex">
        <div className="flex items-center gap-3 bg-surface p-5">
          <Skeleton className="size-12 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex-1 p-5">
          <MessagesSkeleton />
        </div>
      </div>
    </div>
  );
}

/** A profile grid of 9:16 tiles, three across. */
export function TileGridSkeleton({ count = 9, className }: { count?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("grid grid-cols-3 gap-1 sm:gap-2", className)}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="aspect-[9/16] rounded-lg sm:rounded-xl" />
      ))}
    </div>
  );
}
