'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ToastLayer } from './ui/Toast';
import { AuthInitializer } from './AuthInitializer';
import { PageLoader } from './ui/PageLoader';
import { OfflineBanner } from './ui/OfflineBanner';
import { CallOverlay } from './calling/CallOverlay';
import { ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useToastStore } from '@/store/useToastStore';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        // Don't retry client errors (4xx) — only transient failures
        retry: (count, err) => {
          if (err instanceof ApiError && err.status >= 400 && err.status < 500) return false;
          return count < 2;
        },
      },
      mutations: {
        onError: (err) => {
          // Network / CORS errors surface as status=0
          if (err instanceof ApiError && err.status === 0) {
            useAuthStore.getState().setApiUnreachable(true);
            return;
          }
          // Don't toast validation errors — callers handle those inline
          if (err instanceof ApiError && err.status < 500) return;
          useToastStore.getState().toast('Something went wrong. Please try again.');
        },
      },
    },
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <OfflineBanner />
      <PageLoader />
      <AuthInitializer />
      {children}
      <CallOverlay />
      <ToastLayer />
    </QueryClientProvider>
  );
}
