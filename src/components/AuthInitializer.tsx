'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useSpaceStore } from '@/store/useSpaceStore';
import { hydrateSession } from '@/lib/session';
import { spacesApi } from '@/lib/api';
import { setupPush } from '@/lib/push';
import { setupSystemThemeListener } from '@/lib/theme';

let _started = false;

export function AuthInitializer() {
  useEffect(() => {
    if (_started) return;
    _started = true;

    // Start following OS dark/light mode changes (unless user has manually overridden)
    setupSystemThemeListener();

    // Load space slug→UUID map (needed by every space operation)
    spacesApi.all().then(s => useSpaceStore.getState().setSpaces(s)).catch(() => {});

    hydrateSession()
      .then(({ authenticated }) => {
        if (authenticated) setupPush().catch(() => {});
      })
      .finally(() => {
        useAuthStore.getState().setInitialized();
      });
  }, []);

  return null;
}
