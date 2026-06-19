/**
 * Loads /auth/me + /me and writes both stores.
 * Returns { authenticated, onboardingCompleted }.
 *
 * onboardingCompleted logic:
 *   - If the backend says true  → true (authoritative)
 *   - If the backend says false but the local store says true → true
 *     (handles the case where PATCH /me failed during onboarding due to a
 *      transient network error; the local flag was set optimistically and
 *      persisted in localStorage, so we trust it until the backend catches up)
 *   - If both say false → false (user needs to onboard)
 */
import { useAuthStore } from '@/store/useAuthStore';
import { useUserStore } from '@/store/useUserStore';
import { authApi, profilesApi, ApiError } from './api';

export interface SessionResult {
  authenticated: boolean;
  onboardingCompleted: boolean;
  apiUnreachable?: boolean;
}

export async function hydrateSession(): Promise<SessionResult> {
  const { setUser, setInitialized } = useAuthStore.getState();
  const { setUser: setProfile } = useUserStore.getState();

  let me: Awaited<ReturnType<typeof authApi.me>>;
  try {
    me = await authApi.me();
  } catch (err) {
    const isNetwork = err instanceof ApiError && err.status === 0;
    const isExpected = err instanceof ApiError &&
      (err.status === 401 || err.status === 0 || err.status === 429);
    if (!isExpected && process.env.NODE_ENV === 'development') {
      console.warn('[session] /auth/me →', err instanceof ApiError
        ? `${err.status} – ${err.message}` : String(err));
    }
    if (isNetwork) {
      useAuthStore.getState().setApiUnreachable(true);
      return { authenticated: false, onboardingCompleted: false, apiUnreachable: true };
    }
    return { authenticated: false, onboardingCompleted: false };
  }
  // Successful response — API is reachable
  useAuthStore.getState().setApiUnreachable(false);

  setUser(me);

  // Read the locally-persisted value BEFORE the profile fetch overwrites it
  const localOnboarded = useUserStore.getState().user.onboardingCompleted ?? false;
  let onboardingCompleted = localOnboarded;

  try {
    const profile = await profilesApi.me();

    // If the DB says true, always trust it.
    // If the DB says false but local says true, keep true and queue a repair.
    onboardingCompleted = profile.onboardingCompleted || localOnboarded;

    setProfile(u => ({
      ...u,
      id: me.id,
      name: profile.displayName,
      email: me.email,
      avatar_url: profile.avatarUrl ?? undefined,
      tension: profile.honestTension ?? undefined,
      sitting: profile.sittingWith ?? undefined,
      open: profile.openTo ?? undefined,
      deepFocus: profile.deepFocusActive,
      onboardingCompleted, // resolved value, not raw profile value
    }));

    // Repair: if local says complete but DB doesn't, push the update silently
    if (localOnboarded && !profile.onboardingCompleted) {
      profilesApi.updateMe({ onboarding_completed: true }).catch(() => {
        // best-effort — will retry on next session load
      });
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[session] /me →', err instanceof ApiError
        ? `${err.status} – ${err.message}` : String(err));
    }
  } finally {
    setInitialized();
  }

  return { authenticated: true, onboardingCompleted };
}
