import { TopBar } from "@/components/app/TopBar";
import { Composer } from "@/components/app/Composer";
import { PostCard, type Post } from "@/components/app/PostCard";
import { RightRail } from "@/components/app/RightRail";

/**
 * Home feed — Figma frame 58:2301.
 *
 * A 724px scrolling feed column beside the 396px right rail (94:2684). Copy
 * and media are lifted from the Figma post instances in frame 90:1355.
 */
const POSTS: Post[] = [
  {
    id: "1",
    author: "Helena Brown",
    avatar: "/images/feed/avatar-helena.png",
    badge: "In progress",
    time: "5 mins ago",
    title: "I think I’m ready for a career change.",
    body: "I’ve been in the same role for almost three years, and lately I’ve been feeling like I’ve outgrown it. I’m excited about what could come next, but honestly, I’m also scared of starting over.",
    roots: 22,
    comments: 8,
  },
  {
    id: "2",
    author: "Helena Brown",
    avatar: "/images/feed/avatar-helena.png",
    badge: "In progress",
    time: "2 hours ago",
    body: "Took the long way home today and actually noticed the walk. Small thing, but it helped.",
    media: { src: "/images/feed/post-photo.png", kind: "photo" },
    roots: 14,
    comments: 3,
  },
  {
    id: "3",
    author: "Helena Brown",
    avatar: "/images/feed/avatar-helena.png",
    badge: "In progress",
    time: "Yesterday",
    body: "Recorded a short update on where the move is at. Still figuring it out as I go.",
    media: { src: "/images/feed/post-video.png", kind: "video" },
    roots: 31,
    comments: 12,
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />

        {/* Figma 90:1355 — the feed column is the scroll region. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[724px] flex-col gap-6">
            <Composer />
            {POSTS.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      </div>

      <RightRail />
    </div>
  );
}
