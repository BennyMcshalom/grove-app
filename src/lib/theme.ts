export type Theme = 'light' | 'dark';

const KEY = 'grove-theme';
const MANUAL_KEY = 'grove-theme-manual'; // set when user explicitly chose a theme

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(KEY) as Theme | null;
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function isManuallySet(): boolean {
  return typeof window !== 'undefined' && !!localStorage.getItem(MANUAL_KEY);
}

export function applyTheme(theme: Theme, manual = false) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(KEY, theme);
  if (manual) localStorage.setItem(MANUAL_KEY, '1');
  window.dispatchEvent(new CustomEvent('grove-theme', { detail: theme }));
}

export function toggleTheme() {
  applyTheme(getStoredTheme() === 'dark' ? 'light' : 'dark', true);
}

// Call once on app boot — follows system changes unless user has set manually
let _listenerAttached = false;
export function setupSystemThemeListener() {
  if (typeof window === 'undefined' || _listenerAttached) return;
  _listenerAttached = true;

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', (e) => {
    // Only auto-follow if the user hasn't manually overridden
    if (!isManuallySet()) {
      applyTheme(e.matches ? 'dark' : 'light', false);
    }
  });
}
