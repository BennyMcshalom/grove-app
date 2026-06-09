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
