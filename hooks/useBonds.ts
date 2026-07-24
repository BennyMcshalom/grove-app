'use client';
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bondsApi, type BondMessage } from '@/lib/api';
import { onRealtime } from '@/lib/calling';

// Live push (bond:message over the shared call-signaling socket) is the
// primary update path now — these intervals are just a safety net in case a
// push is missed (dropped connection, brief reconnect window), so they're
// long instead of the tight polls this used to rely on entirely.
export function useBonds() {
  const qc = useQueryClient();

  useEffect(() => onRealtime('bond:message', () => {
    // A message anywhere changes this bond's unread count / last-message
    // preview in the list — cheap enough to just refetch on any signal.
    qc.invalidateQueries({ queryKey: ['bonds'] });
  }), [qc]);

  return useQuery({
    queryKey: ['bonds'],
    queryFn:  bondsApi.list,
    refetchInterval: 60_000,
  });
}

export function useBondMessages(bondId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!bondId) return;
    return onRealtime('bond:message', (payload) => {
      const p = payload as { bondId: string; message: BondMessage };
      if (p.bondId !== bondId) return;
      qc.setQueryData<BondMessage[]>(['bond-messages', bondId], (old) => {
        if (!old) return old;
        if (old.some(m => m.id === p.message.id)) return old; // already have it (e.g. our own send)
        return [...old, p.message].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      });
    });
  }, [bondId, qc]);

  return useQuery({
    queryKey: ['bond-messages', bondId],
    queryFn:  () => bondsApi.messages(bondId!),
    enabled:  !!bondId,
    refetchInterval: 60_000,
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
