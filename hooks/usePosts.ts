'use client';
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi, type CreatePostPayload, type PostRecord } from '@/lib/api';
import { onRealtime } from '@/lib/calling';

export function usePostComments(postId: string | undefined) {
  return useQuery({
    queryKey: ['post-comments', postId],
    queryFn: () => postsApi.comments(postId!),
    enabled: !!postId,
  });
}

export function useAddComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => postsApi.addComment(postId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['post-comments', postId] }),
  });
}

// Single page only — the fresh 48h window, no infinite scroll.
export function usePosts(spaceId?: string, opts?: { region?: string; enabled?: boolean }) {
  const qc = useQueryClient();

  useEffect(() => onRealtime('post:new', (payload) => {
    const post = payload as PostRecord;
    const queries = qc.getQueryCache().findAll({
      predicate: (query) => query.queryKey[0] === 'posts' && query.queryKey[2] === 'none',
    });
    for (const query of queries) {
      const scopedSpaceId = query.queryKey[1];
      if (scopedSpaceId !== 'all' && scopedSpaceId !== post.spaceId) continue;
      qc.setQueryData<PostRecord[]>(query.queryKey, (old) => {
        if (!old) return old;
        if (old.some(p => p.id === post.id)) return old;
        return [post, ...old];
      });
    }
  }), [qc]);

  return useQuery({
    queryKey: ['posts', spaceId ?? 'all', opts?.region ?? 'none'],
    queryFn: () => postsApi.list(spaceId, undefined, opts?.region),
    enabled: opts?.enabled ?? true,
    refetchInterval: 60_000, // safety net in case a push is missed
  });
}

// Fetches a single post by id, independent of the 48h feed window — for
// deep links (e.g. a search result) that may point at an older post.
export function usePost(id?: string) {
  return useQuery({
    queryKey: ['post', id],
    queryFn: () => postsApi.get(id!),
    enabled: !!id,
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePostPayload) => postsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}

export function useReactToPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, emoji }: { id: string; emoji: string }) => postsApi.react(id, emoji),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });
}

export function useUpdatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { doing?: string; honestThing?: string; progress?: string; body?: string } }) =>
      postsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });
}
