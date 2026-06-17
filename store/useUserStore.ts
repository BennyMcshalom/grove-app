'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/lib/types';

interface UserStore {
  user: User;
  setUser: (updater: User | ((prev: User) => User)) => void;
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
    }),
    { name: 'grove-user' }
  )
);
