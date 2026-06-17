'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { curioApi } from '@/lib/api';

export function useTodayCurio(spaceId: string | undefined) {
  return useQuery({
    queryKey: ['curio-today', spaceId],
    queryFn:  () => curioApi.today(spaceId!),
    enabled:  !!spaceId,
    staleTime: 60 * 60_000, // fresh for 1 hour — one card per day
  });
}

export function useSavedCurios() {
  return useQuery({
    queryKey: ['curio-saved'],
    queryFn:  curioApi.saved,
    staleTime: 5 * 60_000,
  });
}

export function useSaveCurio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; saved?: boolean; reflection?: string }) =>
      curioApi.save(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['curio-today'] });
      qc.invalidateQueries({ queryKey: ['curio-saved'] });
    },
  });
}
