'use client';
import { create } from 'zustand';

interface Toast { id: number; msg: string; }

interface ToastStore {
  toasts: Toast[];
  toast: (msg: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  toast: (msg) => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts, { id, msg }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 2600);
  },
}));
