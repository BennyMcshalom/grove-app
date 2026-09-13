"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireOnboardedViewer } from "@/lib/auth/viewer";
import { loadFeed } from "@/lib/feed";
import {
  MEDIA_LIMITS,
  PROGRESS,
  REPORT_REASONS,
  type FeedPage,
  type FeedQuery,
  type PostComment,
  type PostProgress,
  type ReportReason,
} from "@/lib/posts";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/time";

type Result = { error?: string };

const progressValues = PROGRESS.map((p) => p.value) as [PostProgress, ...PostProgress[]];

const FeedQuerySchema = z.object({
  scope: z.enum(["all", "roots", "open", "mine"]),
  chapterSlug: z.string().nullish(),
  from: z.string().nullish(),
  to: z.string().nullish(),
  cursor: z.object({ before: z.string(), beforeId: z.uuid() }).nullish(),
});

/** The next page of a feed, for infinite scroll and tab changes. */
export async function loadPosts(query: FeedQuery): Promise<FeedPage> {
  const viewer = await requireOnboardedViewer();
  const parsed = FeedQuerySchema.safeParse(query);
  if (!parsed.success) return { posts: [], nextCursor: null, error: "That feed doesn't exist." };
  return loadFeed(parsed.data, viewer.profile.first_name);
}

const CreatePostSchema = z.object({
  chapterSlug: z.string().min(1),
  kind: z.enum(["root", "grouv"]),
  title: z.string().trim().max(500),
  progress: z.enum(progressValues).nullable(),
  body: z.string().trim().max(4000),
  anonymous: z.boolean(),
  media: z
    .array(z.object({ path: z.string().min(1), kind: z.enum(["photo", "video"]) }))
    .max(MEDIA_LIMITS.maxFiles),
});

export type CreatePostInput = z.input<typeof CreatePostSchema>;

/** Composer → "Root this" / "Grouv it". Media is already in Storage. */
export async function createPost(input: CreatePostInput): Promise<Result> {
  const viewer = await requireOnboardedViewer();
  const parsed = CreatePostSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Something in that post didn't look right." };

  const { chapterSlug, kind, title, progress, body, anonymous, media } = parsed.data;
  const isRoot = kind === "root";

  if (isRoot && !title && !body && media.length === 0) {
    return { error: "Write something before you root it." };
  }
  if (!isRoot && !body && media.length === 0) {
    return { error: "Add a photo, a video or a caption first." };
  }
  if (media.some((m) => !m.path.startsWith(`${viewer.userId}/`))) {
    return { error: "One of your uploads didn't finish. Try attaching it again." };
  }

  const supabase = await createClient();
  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      chapter_slug: chapterSlug,
      kind,
      title: isRoot ? title || null : null,
      progress: isRoot ? progress : null,
      body: body || null,
      is_anonymous: anonymous,
    })
    .select("id")
    .single();

  if (error || !post) {
    if (error?.code === "42501") return { error: "You can only post into chapters you hold." };
    console.error("[posts] createPost failed", error);
    if (error?.hint === "rate_limited") return { error: error.message };
    return { error: "We couldn't post that. Try again." };
  }

  if (media.length > 0) {
    const { error: mediaError } = await supabase.from("post_media").insert(
      media.map((m, position) => ({ post_id: post.id, kind: m.kind, storage_path: m.path, position })),
    );
    if (mediaError) {
      console.error("[posts] attaching media failed", mediaError);
      await supabase.from("posts").delete().eq("id", post.id);
      return { error: "We couldn't attach your media. Try again." };
    }
  }

  refresh();
  return {};
}

/** Root / unroot. The card updates optimistically and reverts on error. */
export async function setRooted(postId: string, rooted: boolean): Promise<Result> {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();

  const { error } = rooted
    ? await supabase.from("post_roots").insert({ post_id: postId, user_id: viewer.userId })
    : await supabase.from("post_roots").delete().eq("post_id", postId).eq("user_id", viewer.userId);

  // Rooting twice (double tap, two tabs) is fine.
  if (error && error.code !== "23505") {
    console.error("[posts] setRooted failed", error);
    if (error?.hint === "rate_limited") return { error: error.message };
    return { error: "That didn't go through. Try again." };
  }
  return {};
}

const UpdatePostSchema = z.object({
  title: z.string().trim().max(500),
  progress: z.enum(progressValues).nullable(),
  body: z.string().trim().max(4000),
});

/** Edit Post → "Save changes". */
export async function updatePost(
  postId: string,
  input: z.input<typeof UpdatePostSchema>,
): Promise<Result> {
  await requireOnboardedViewer();
  const parsed = UpdatePostSchema.safeParse(input);
  if (!parsed.success) return { error: "That's too long to save." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .update({
      title: parsed.data.title || null,
      progress: parsed.data.progress,
      body: parsed.data.body || null,
    })
    .eq("id", postId)
    .select("id");

  if (error || !data?.length) {
    if (error) console.error("[posts] updatePost failed", error);
    if (error?.hint === "rate_limited") return { error: error.message };
    return { error: "You can only edit your own posts." };
  }
  return {};
}

/** Delete Post. Comments, roots and media rows cascade; files are removed here. */
export async function deletePost(postId: string): Promise<Result> {
  await requireOnboardedViewer();
  const supabase = await createClient();

  const { data: media } = await supabase
    .from("post_media")
    .select("storage_path")
    .eq("post_id", postId);

  const { data, error } = await supabase.from("posts").delete().eq("id", postId).select("id");
  if (error || !data?.length) {
    if (error) console.error("[posts] deletePost failed", error);
    if (error?.hint === "rate_limited") return { error: error.message };
    return { error: "You can only delete your own posts." };
  }

  if (media?.length) {
    const { error: storageError } = await supabase.storage
      .from("media")
      .remove(media.map((m) => m.storage_path));
    if (storageError) console.warn("[posts] couldn't remove post media", storageError);
  }
  return {};
}

const reasonValues = REPORT_REASONS.map((r) => r.value) as [ReportReason, ...ReportReason[]];

const reportTargets = ["post", "comment", "message", "group", "event", "profile", "truth", "space_question"] as const;

/** Report this → "Submit Report". Posts, and people from their profile page. */
export async function reportContent(
  targetType: (typeof reportTargets)[number],
  targetId: string,
  reason: ReportReason,
  details: string,
): Promise<Result> {
  await requireOnboardedViewer();
  const parsedReason = z.enum(reasonValues).safeParse(reason);
  if (!parsedReason.success) return { error: "Choose what's wrong with it." };
  const parsedTarget = z.object({ type: z.enum(reportTargets), id: z.uuid() }).safeParse({ type: targetType, id: targetId });
  if (!parsedTarget.success) return { error: "We couldn't tell what you're reporting." };

  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({
    target_type: parsedTarget.data.type,
    target_id: parsedTarget.data.id,
    reason: parsedReason.data,
    details: details.trim().slice(0, 2000) || null,
  });

  // Reporting the same thing twice keeps the first report.
  if (error && error.code !== "23505") {
    console.error("[posts] reportContent failed", error);
    if (error.hint === "rate_limited") return { error: error.message };
    return { error: "We couldn't send that report. Try again." };
  }
  return {};
}

export async function loadComments(postId: string): Promise<{ comments: PostComment[]; error?: string }> {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("comments")
    .select("id, author_id, body, created_at, author:profiles!comments_author_id_fkey(first_name, avatar_url)")
    .eq("post_id", postId)
    .order("created_at")
    .limit(100);

  if (error) {
    console.error("[posts] loadComments failed", error);
    return { comments: [], error: "We couldn't load comments." };
  }

  const now = Date.now();
  return {
    comments: (data ?? []).map((c) => ({
      id: c.id,
      authorId: c.author_id,
      author: c.author?.first_name ?? "Someone",
      avatar: c.author?.avatar_url ?? null,
      body: c.body ?? "",
      time: timeAgo(c.created_at, now),
      mine: c.author_id === viewer.userId,
    })),
  };
}

export async function addComment(
  postId: string,
  body: string,
): Promise<{ comment?: PostComment; error?: string }> {
  const viewer = await requireOnboardedViewer();
  const text = body.trim();
  if (!text) return { error: "Write a comment first." };
  if (text.length > 2000) return { error: "Keep comments under 2,000 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, body: text })
    .select("id, created_at")
    .single();

  if (error || !data) {
    console.error("[posts] addComment failed", error);
    if (error?.hint === "rate_limited") return { error: error.message };
    return { error: "We couldn't post your comment. Try again." };
  }

  return {
    comment: {
      id: data.id,
      authorId: viewer.userId,
      author: viewer.profile.first_name,
      avatar: viewer.profile.avatar_url,
      body: text,
      time: timeAgo(data.created_at),
      mine: true,
    },
  };
}

export async function deleteComment(commentId: string): Promise<Result> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.from("comments").delete().eq("id", commentId).select("id");

  if (error || !data?.length) {
    if (error) console.error("[posts] deleteComment failed", error);
    if (error?.hint === "rate_limited") return { error: error.message };
    return { error: "You can only remove your own comments." };
  }
  return {};
}
