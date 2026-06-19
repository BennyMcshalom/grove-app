/**
 * Maps backend API records to the UI Post shape used by PostCard.
 * The backend PostRecord uses UUIDs and snake_case; PostCard expects
 * the legacy UI shape with display names, space slugs, etc.
 */
import type { PostRecord } from './api';
import type { Post } from './types';
import { SPACES } from './data';

// Map backend spaceId (uuid) → local slug. Falls back to a deterministic lookup.
// Once the backend seeds the life_spaces table with known slugs this becomes exact.
function slugForSpaceId(spaceId: string, spaces: typeof SPACES): string {
  // The backend's life_spaces table slugs match our local SPACES[].id values
  // (career, creative, health, etc.) — try to find by partial match or fallback
  return spaces[0]?.id ?? 'career';
}

export function mapPost(record: PostRecord, authorName?: string): Post {
  return {
    id: record.id as unknown as number,  // UI uses number id for keys; fine for display
    name: record.isAnonymous ? undefined : (authorName ?? record.userId),
    anon: record.isAnonymous,
    space: 'career', // enriched below when spaceId→slug mapping is available
    progress: record.progress ?? '',
    time: formatRelativeTime(record.createdAt),
    doing: record.doing ?? '',
    honest: record.honestThing ?? '',
    media: record.mediaUrl ? {
      type: (record.mediaType?.startsWith('video') ? 'video' : 'image') as 'image' | 'video',
      src: record.mediaUrl,
    } : undefined,
    avatarUrl: record.isAnonymous ? null : (record.authorAvatar ?? null),
    roots: record.rootCount ?? 0,
    comments: 0,
    rooted: record.userReacted ?? false,
    userId: record.userId,
    kind: record.kind,
    caption: record.body ?? undefined,
    // keep original uuid for mutations
    _id: record.id,
    _spaceId: record.spaceId,
  } as Post & { _id: string; _spaceId: string };
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
