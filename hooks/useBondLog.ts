'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bondLogApi } from '@/lib/api';

export function useBondLogToday(bondId: string | undefined) {
  return useQuery({
    queryKey:  ['bond-log-today', bondId],
    queryFn:   () => bondLogApi.today(bondId!),
    enabled:   !!bondId,
    refetchInterval: (query) => {
      // Poll every 30s when waiting for partner to post
      const data = query.state.data;
      if (data && data.myEntry && !data.revealed) return 30_000;
      return false;
    },
  });
}

export function usePostBondLog(bondId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => bondLogApi.post(bondId!, body),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['bond-log-today', bondId] }),
  });
}

export function useMarkBondResonance(bondId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => bondLogApi.resonate(bondId!),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['bond-log-today', bondId] }),
  });
}

export function useBondLogHistory(bondId: string | undefined) {
  return useQuery({
    queryKey: ['bond-log-history', bondId],
    queryFn:  () => bondLogApi.history(bondId!),
    enabled:  !!bondId,
    staleTime: 5 * 60_000,
  });
}
