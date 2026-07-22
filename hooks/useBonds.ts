'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bondsApi } from '@/lib/api';

export function useBonds() {
  return useQuery({
    queryKey: ['bonds'],
    queryFn:  bondsApi.list,
    refetchInterval: 30_000,  // re-check for new bonds every 30s
  });
}

export function useBondMessages(bondId: string | undefined) {
  return useQuery({
    queryKey: ['bond-messages', bondId],
    queryFn:  () => bondsApi.messages(bondId!),
    enabled:  !!bondId,
    refetchInterval: 5_000,   // poll every 5s for new messages
    refetchIntervalInBackground: false,
  });
}

export function useSendBondMessage(bondId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opts: { body?: string; replyToId?: string; replyPreview?: string; postId?: string }) =>
      bondsApi.sendMessage(bondId, opts.body, { replyToId: opts.replyToId, replyPreview: opts.replyPreview, postId: opts.postId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bond-messages', bondId] }),
  });
}

// For "Save to a Bond" — the target bond isn't known until the user picks
// one from a list, so (unlike useSendBondMessage) it takes bondId as a
// mutation variable instead of being scoped to one bond at hook-creation time.
export function useSharePostToBond() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bondId, postId }: { bondId: string; postId: string }) =>
      bondsApi.sendMessage(bondId, undefined, { postId }),
    onSuccess: (_, { bondId }) => qc.invalidateQueries({ queryKey: ['bond-messages', bondId] }),
  });
}

export function useUploadVoice(bondId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ blob, duration }: { blob: Blob; duration?: number }) =>
      bondsApi.uploadVoice(bondId, blob, duration),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bond-messages', bondId] }),
  });
}

export function useReleaseBond() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; whatItGave: string; carryingForward: string; messageUnsent: string }) =>
      bondsApi.release(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bonds'] }),
  });
}
