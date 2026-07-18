'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useSpaceStore } from '@/store/useSpaceStore';
import { useUserStore } from '@/store/useUserStore';
import { hydrateSession } from '@/lib/session';
import { spacesApi, usersApi, ApiError } from '@/lib/api';
import { setupPush } from '@/lib/push';
import { setupSystemThemeListener } from '@/lib/theme';
import { initCalling } from '@/lib/calling';
import type { Region } from '@/lib/regions';

let _started = false;

// Best-effort, silent: derive the user's region from IP geolocation the
// first time they're seen with none set yet. Never overwrites an existing
// value, never surfaces an error to the user — matches the coarse "region"
// use case (cross-region browsing on Spaces), not anything precision-
// sensitive like the Nearby feature.
async function backfillRegion() {
  if (useUserStore.getState().user.region) return;
  try {
    const res = await fetch('/api/locate');
    if (!res.ok) return;
    const { countryCode } = await res.json();
    if (!countryCode) return;
    const updated = await usersApi.updateMe({ countryCode });
    useUserStore.getState().setUser(u => ({
      ...u,
      region: (updated.region as Region | null) ?? undefined,
      countryCode: updated.countryCode ?? undefined,
    }));
  } catch { /* best-effort */ }
}

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
        if (authenticated) {
          setupPush().catch(() => {});
          initCalling();
          backfillRegion();
        }
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
