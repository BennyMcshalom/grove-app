'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bondInvitationsApi } from '@/lib/api';

export function useBondInvitations() {
  return useQuery({
    queryKey: ['bond-invitations'],
    queryFn:  bondInvitationsApi.received,
    refetchInterval: 30_000,
  });
}

export function useSentBondInvitations() {
  return useQuery({
    queryKey: ['bond-invitations-sent'],
    queryFn:  bondInvitationsApi.sent,
  });
}

export function useInviteToBond() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recipientId, message }: { recipientId: string; message?: string }) =>
      bondInvitationsApi.invite(recipientId, message),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bond-invitations-sent'] });
      // Backend excludes anyone with a pending invite out from suggestions —
      // refetch so they actually drop out of the list instead of lingering
      // until the 5-minute staleTime.
      qc.invalidateQueries({ queryKey: ['user-suggestions'] });
    },
  });
}

export function useAcceptBondInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bondInvitationsApi.accept(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bond-invitations'] });
      qc.invalidateQueries({ queryKey: ['bonds'] });
    },
  });
}

export function useDeclineBondInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bondInvitationsApi.decline(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bond-invitations'] }),
  });
}
