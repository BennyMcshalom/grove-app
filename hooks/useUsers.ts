'use client';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';

export function useSuggestions() {
  return useQuery({
    queryKey: ['user-suggestions'],
    queryFn:  usersApi.suggestions,
    staleTime: 5 * 60_000,
  });
}
