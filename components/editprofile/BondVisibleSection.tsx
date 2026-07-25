'use client';
import { Section } from './Section';
import { fieldStyle, focusStyle, blurStyle } from './fieldStyle';

export function BondVisibleSection({ tension, setTension, sitting, setSitting, openTo, setOpenTo }: {
  tension: string; setTension: (v: string) => void;
  sitting: string; setSitting: (v: string) => void;
  openTo: string; setOpenTo: (v: string) => void;
}) {
  return (
    <Section label="Visible only to your Bonds">
      {([
        ['Honest tension', tension, setTension, 'The thing I\'m not quite saying out loud…'],
        ['Sitting with',   sitting, setSitting,  'Something unresolved…'],
        ['Open to',        openTo,  setOpenTo,   'The people or conversations I need…'],
      ] as [string, string, (v: string) => void, string][]).map(([label, value, setter, ph]) => (
        <div key={label} style={{ marginBottom: '.9rem' }}>
          <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--ink-3)', marginBottom: '.35rem' }}>{label}</div>
          <textarea value={value} onChange={e => setter(e.target.value)} placeholder={ph}
            style={{ ...fieldStyle, minHeight: 60, resize: 'vertical' as const }}
            onFocus={focusStyle} onBlur={blurStyle}/>
        </div>
      ))}
    </Section>
  );
}
