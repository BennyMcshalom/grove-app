'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { spacesApi } from '@/lib/api';

export function useSpaceMembers(spaceId: string | undefined, opts?: { region?: string; enabled?: boolean }) {
  return useQuery({
    queryKey: ['space-members', spaceId, opts?.region ?? null],
    queryFn:  () => spacesApi.members(spaceId!, opts?.region),
    enabled:  !!spaceId && (opts?.enabled ?? true),
    staleTime: 2 * 60_000,
  });
}

export function useAllSpaces() {
  return useQuery({
    queryKey: ['spaces-all'],
    queryFn:  spacesApi.all,
    staleTime: Infinity, // space definitions rarely change
  });
}

export function useMySpaces() {
  return useQuery({
    queryKey: ['spaces-mine'],
    queryFn:  spacesApi.mine,
  });
}

export function useOpenSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { spaceId: string; stage?: string; isPrimary?: boolean }) => spacesApi.open(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spaces-mine'] }),
  });
}

export function useUpdateSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; stage?: string; currentMarker?: string }) =>
      spacesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spaces-mine'] }),
  });
}

export function useCloseSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => spacesApi.close(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spaces-mine'] });
      qc.invalidateQueries({ queryKey: ['chapters'] });
    },
  });
}
