'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi, type CreatePostPayload } from '@/lib/api';

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
  return useQuery({
    queryKey: ['posts', spaceId ?? 'all', opts?.region ?? 'none'],
    queryFn: () => postsApi.list(spaceId, undefined, opts?.region),
    enabled: opts?.enabled ?? true,
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
