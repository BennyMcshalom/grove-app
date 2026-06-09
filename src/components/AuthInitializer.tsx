'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useSpaceStore } from '@/store/useSpaceStore';
import { hydrateSession } from '@/lib/session';
import { spacesApi, ApiError } from '@/lib/api';
import { setupPush } from '@/lib/push';
import { setupSystemThemeListener } from '@/lib/theme';

let _started = false;

export function AuthInitializer() {
  useEffect(() => {
    if (_started) return;
    _started = true;

    setupSystemThemeListener();

    spacesApi.all()
      .then(s => useSpaceStore.getState().setSpaces(s))
      .catch(err => {
        if (err instanceof ApiError && err.status === 0) {
          useAuthStore.getState().setApiUnreachable(true);
        }
      });

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

// Exported so the OfflineBanner can trigger a fresh session check
export async function retrySession() {
  _started = false;
  useAuthStore.getState().setApiUnreachable(false);
  try {
    await hydrateSession();
    const spaces = await spacesApi.all();
    useSpaceStore.getState().setSpaces(spaces);
  } catch (err) {
    if (err instanceof ApiError && err.status === 0) {
      useAuthStore.getState().setApiUnreachable(true);
    }
  } finally {
    useAuthStore.getState().setInitialized();
  }
}
