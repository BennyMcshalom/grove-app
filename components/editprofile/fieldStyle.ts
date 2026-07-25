import type { CSSProperties, FocusEvent } from 'react';

export const fieldStyle: CSSProperties = {
  width: '100%', padding: '.75rem .9rem', fontSize: '1rem',
  background: 'var(--surf-low)', border: '1.5px solid var(--border-2)', borderRadius: 'var(--r-md)',
  color: 'var(--ink)',
};

export function focusStyle(e: FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  (e.target as HTMLElement).style.borderColor = 'var(--ember)';
  (e.target as HTMLElement).style.boxShadow   = '0 0 0 3px var(--ember-dim)';
}

export function blurStyle(e: FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  (e.target as HTMLElement).style.borderColor = 'var(--border-2)';
  (e.target as HTMLElement).style.boxShadow   = 'none';
}
