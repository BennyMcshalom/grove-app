'use client';
import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  emailVerifiedAt: string | null;
  roles: string[];
}

interface AuthStore {
  user: AuthUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  apiUnreachable: boolean;
  setUser: (u: AuthUser | null) => void;
  setLoading: (v: boolean) => void;
  setInitialized: () => void;
  setApiUnreachable: (v: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: false,
  isInitialized: false,
  apiUnreachable: false,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setInitialized: () => set({ isInitialized: true }),
  setApiUnreachable: (apiUnreachable) => set({ apiUnreachable }),
  clear: () => set({ user: null }),
}));
