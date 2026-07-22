'use client';
import { create } from 'zustand';
import type { FeatureFlagState } from '@/lib/api';

interface FeatureFlagStore {
  flags: Record<string, boolean>;
  // Distinguishes "haven't fetched yet" from "fetched, and it's off" —
  // gates must not block/redirect before they know the real state.
  loaded: boolean;
  setFlags: (flags: FeatureFlagState[]) => void;
  // Defaults to enabled for any key not present (e.g. new flags added after
  // a client cached an older list) — a missing flag should never look
  // silently disabled.
  isEnabled: (key: string) => boolean;
}

export const useFeatureFlagStore = create<FeatureFlagStore>((set, get) => ({
  flags: {},
  loaded: false,
  setFlags: (flags) => set({ flags: Object.fromEntries(flags.map(f => [f.key, f.enabled])), loaded: true }),
  isEnabled: (key) => get().flags[key] ?? true,
}));
