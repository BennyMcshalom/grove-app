'use client';
import { useEffect, useState } from 'react';
import { getStoredTheme, type Theme } from '@/lib/theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    setTheme(getStoredTheme());
    const handler = (e: Event) => setTheme((e as CustomEvent<Theme>).detail);
    window.addEventListener('grove-theme', handler);
    return () => window.removeEventListener('grove-theme', handler);
  }, []);

  return theme;
}
