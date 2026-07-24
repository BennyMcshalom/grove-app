import { useSpaceStore } from '@/store/useSpaceStore';
import { mapPostRecordToPost } from '@/lib/mappers';
import type { PostRecord } from '@/lib/api';

// Convert backend PostRecord → display Post
export function useDisplayPosts(records: PostRecord[] | undefined) {
  const { slugById } = useSpaceStore();
  if (!records) return [];
  return records.map(r => mapPostRecordToPost(r, slugById(r.spaceId) ?? 'career'));
}
