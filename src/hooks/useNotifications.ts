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
