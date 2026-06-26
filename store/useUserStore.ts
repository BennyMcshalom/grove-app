'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/lib/types';

interface UserStore {
  user: User;
  setUser: (updater: User | ((prev: User) => User)) => void;
  clear: () => void;
}

const DEFAULT_USER: User = {
  name: 'You',
  spaces: ['career', 'creative', 'health'],
  stageLabels: {
    career: 'Building a business (early)',
    creative: 'Mid-project',
    health: 'Building a habit',
  },
  proximity: false,
  deepFocus: false,
};

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: DEFAULT_USER,
      setUser: (updater) =>
        set((state) => ({
          user: typeof updater === 'function' ? updater(state.user) : updater,
        })),
      // This store is persisted to localStorage with no per-account scoping —
      // without clearing it on logout/new-signup, a different account on the
      // same browser inherits the previous account's onboardingCompleted flag
      // (and session.ts's hydrateSession then writes that stale "true" back
      // to the NEW account's actual DB profile as a "repair").
      clear: () => set({ user: DEFAULT_USER }),
    }),
    { name: 'grove-user' }
  )
);
