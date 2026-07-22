/**
 * Maps backend API records to the UI Post shape used by PostCard.
 * The backend PostRecord uses UUIDs and snake_case; PostCard expects
 * the legacy UI shape with display names, space slugs, etc.
 */
import type { PostRecord } from './api';
import type { Post } from './types';

// Converts a backend PostRecord into the display Post shape PostCard expects.
// spaceSlug is passed in rather than looked up here since callers already
// know it (Home resolves it per-post via slugById; a Space page already has
// its own slug fixed) — keeps this function free of store dependencies.
export function mapPostRecordToPost(record: PostRecord, spaceSlug: string): Post & { _id: string } {
  return {
    id: record.id as unknown as number,  // UI uses number id for keys; fine for display
    name: record.isAnonymous ? undefined : (record.authorName ?? record.userId),
    anon: record.isAnonymous,
    userId: record.userId,
    avatarUrl: record.isAnonymous ? null : (record.authorAvatar ?? null),
    aura: record.isAnonymous ? null : (record.authorAura ?? null),
    clock: formatClock(record.createdAt),
    space: spaceSlug,
    progress: record.progress ?? '',
    time: formatRelativeTime(record.createdAt),
    doing: record.doing ?? '',
    honest: record.honestThing ?? '',
    media: record.mediaUrl ? {
      type: (record.mediaType?.startsWith('video') ? 'video' : 'image') as 'image' | 'video',
      src: record.mediaUrl,
    } : undefined,
    roots: record.rootCount ?? 0,
    comments: record.commentCount ?? 0,
    rooted: record.userReacted ?? false,
    kind: record.kind,
    caption: record.body ?? undefined,
    location: record.authorLocation ?? undefined,
    // keep original uuid for mutations
    _id: record.id,
  };
}

/** "14:07" in the viewer's local time — the actual moment a post was made, not "now". */
export function formatClock(iso: string): string {
  const d = new Date(iso);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatLastSeen(iso?: string | null): string {
  if (!iso) return 'last seen a while ago';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 5) return 'active now';
  if (m < 60) return `active ${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `active ${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `active ${d}d ago`;
  return `last seen ${new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

/** "7 months" / "2 years" / "3 days" — how long it's been since `sinceIso`. */
export function humanDuration(sinceIso: string, to: Date = new Date()): string {
  const from = new Date(sinceIso);
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (months < 1) {
    const days = Math.max(1, Math.floor((to.getTime() - from.getTime()) / 86_400_000));
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  if (months < 24) return `${months} month${months === 1 ? '' : 's'}`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'}`;
}
