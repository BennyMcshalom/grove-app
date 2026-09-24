import { FeedPageSkeleton } from "@/components/ui/Skeleton";

/** Shown the moment this page is opened, until its data is ready. */
export default function Loading() {
  return <FeedPageSkeleton withTabs={false} />;
}
