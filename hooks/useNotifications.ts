'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifsApi } from '@/lib/api';

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn:  () => notifsApi.list(),
    refetchInterval: 30_000, // poll every 30 s
  });
}

export function useMarkNotifRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notifsApi.read(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotifsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notifsApi.readAll,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

// Deletes every notification currently in the cache — there's no bulk-delete
// endpoint, so this fires the per-id delete in parallel.
export function useClearAllNotifs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map(id => notifsApi.delete(id))),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
