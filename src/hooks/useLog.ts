'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logApi, type LogSettings } from '@/lib/api';

export function useMyLogEntries(spaceId: string | undefined) {
  return useQuery({
    queryKey: ['log-entries', spaceId],
    queryFn:  () => logApi.myEntries(spaceId!),
    enabled:  !!spaceId,
  });
}

export function useAddLogEntry(spaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { body: string; mediaUrl?: string; mediaType?: string }) =>
      logApi.addEntry(spaceId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['log-entries', spaceId] });
    },
  });
}

export function useLogSettings(spaceId: string | undefined) {
  return useQuery({
    queryKey: ['log-settings', spaceId],
    queryFn:  () => logApi.settings(spaceId!),
    enabled:  !!spaceId,
    staleTime: 5 * 60_000,
  });
}

export function useUpdateLogSettings(spaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (visibility: LogSettings['visibility']) =>
      logApi.updateSettings(spaceId!, visibility),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['log-settings', spaceId] });
    },
  });
}

export function useCircleLogs() {
  return useQuery({
    queryKey: ['log-circle'],
    queryFn:  logApi.circle,
    staleTime: 2 * 60_000,
  });
}
