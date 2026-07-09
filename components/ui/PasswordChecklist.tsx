'use client';
import { Icon } from './Icon';

interface Rule { label: string; test: (pw: string) => boolean; }

const RULES: Rule[] = [
  { label: 'At least 8 characters', test: pw => pw.length >= 8 },
  { label: 'At least one letter',   test: pw => /[a-zA-Z]/.test(pw) },
  { label: 'At least one number',   test: pw => /[0-9]/.test(pw) },
];

export function passwordMeetsRequirements(pw: string): boolean {
  return RULES.every(r => r.test(pw));
}

export function PasswordChecklist({ password }: { password: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.32rem', margin: '-.5rem 0 1rem' }}>
      {RULES.map(rule => {
        const met = rule.test(password);
        return (
          <div key={rule.label} style={{ display: 'flex', alignItems: 'center', gap: '.45rem',
            fontSize: '.78rem', color: met ? 'var(--sage)' : 'var(--ink-4)', transition: 'color .15s' }}>
            <span style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .15s, border-color .15s',
              background: met ? 'var(--sage)' : 'transparent',
              border: met ? 'none' : '1.5px solid var(--border-2)' }}>
              {met && <Icon name="check" size={9} stroke="#fff" sw={3}/>}
            </span>
            {rule.label}
          </div>
        );
      })}
    </div>
  );
}
