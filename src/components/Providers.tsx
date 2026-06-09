'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ToastLayer } from './ui/Toast';
import { AuthInitializer } from './AuthInitializer';
import { PageLoader } from './ui/PageLoader';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <PageLoader />
      <AuthInitializer />
      {children}
      <ToastLayer />
    </QueryClientProvider>
  );
}
