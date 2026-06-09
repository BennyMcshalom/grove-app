'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chaptersApi } from '@/lib/api';

export function useChapters() {
  return useQuery({
    queryKey: ['chapters'],
    queryFn:  chaptersApi.list,
  });
}

export function useClosedChapters() {
  return useQuery({
    queryKey: ['chapters-closed'],
    queryFn:  chaptersApi.listClosed,
  });
}

export function useChapterStats() {
  return useQuery({
    queryKey: ['chapter-stats'],
    queryFn:  chaptersApi.stats,
  });
}

export function useCloseChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; closingLearned: string; closingAdvice: string; closingCarryForward: string }) =>
      chaptersApi.close(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chapters'] });
      qc.invalidateQueries({ queryKey: ['spaces-mine'] });
    },
  });
}
