'use client';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi, type CreatePostPayload, type PostRecord } from '@/lib/api';

export function usePostComments(postId: string | undefined) {
  return useQuery({
    queryKey: ['post-comments', postId],
    queryFn:  () => postsApi.comments(postId!),
    enabled:  !!postId,
  });
}

export function useAddComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => postsApi.addComment(postId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['post-comments', postId] }),
  });
}

// Infinite-scroll feed: first page is the fresh 48h window (see the API's
// own comment for why); once that's exhausted, each further page reaches
// further into the past instead of the feed dead-ending, so there's always
// more to pull as the reader keeps scrolling.
export function usePosts(spaceId?: string) {
  return useInfiniteQuery({
    queryKey: ['posts', spaceId ?? 'all'],
    queryFn:  ({ pageParam }: { pageParam?: string }) => postsApi.list(spaceId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: PostRecord[]) =>
      lastPage.length > 0 ? lastPage[lastPage.length - 1].createdAt : undefined,
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
    mutationFn: ({ id, data }: { id: string; data: { doing?: string; honestThing?: string; progress?: string } }) =>
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
