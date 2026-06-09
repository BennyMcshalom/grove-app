'use client';
import { create } from 'zustand';
import type { SpaceRecord } from '@/lib/api';

interface SpaceStore {
  spaces: SpaceRecord[];
  setSpaces: (s: SpaceRecord[]) => void;
  // Map slug → DB uuid
  uuidBySlug: (slug: string) => string | undefined;
  // Map DB uuid → slug (for display)
  slugById: (id: string) => string | undefined;
}

export const useSpaceStore = create<SpaceStore>((set, get) => ({
  spaces: [],
  setSpaces: (spaces) => set({ spaces }),
  uuidBySlug: (slug) => get().spaces.find(s => s.slug === slug)?.id,
  slugById:   (id)   => get().spaces.find(s => s.id === id)?.slug,
}));
