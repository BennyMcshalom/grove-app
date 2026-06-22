'use client';
import { useMutation } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api';

export function useSubmitReport() {
  return useMutation({
    mutationFn: reportsApi.submit,
  });
}
