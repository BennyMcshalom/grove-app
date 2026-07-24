'use client';
import type { ReactNode } from 'react';

// ── Toggle component ───────────────────────────────────────────────
export function Toggle({ on, onChange, locked }: { on: boolean; onChange?: (v: boolean) => void; locked?: boolean }) {
  return (
    <button onClick={() => !locked && onChange?.(!on)}
      aria-label={on ? 'On' : 'Off'}
      style={{ width: 44, height: 26, borderRadius: 100,
        background: on ? 'var(--ember)' : 'var(--border-2)',
        position: 'relative', flexShrink: 0, opacity: locked ? .55 : 1,
        transition: 'background .2s', cursor: locked ? 'default' : 'pointer' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20,
        borderRadius: '50%', background: '#fff', transition: 'left .2s',
        boxShadow: '0 1px 3px rgba(0,0,0,.2)', display: 'block' }}/>
    </button>
  );
}

// ── Row + Group layout helpers ─────────────────────────────────────
export function Row({ label, sub, children, onClick, danger }: {
  label: string; sub?: string | ReactNode;
  children?: ReactNode; onClick?: () => void; danger?: boolean;
}) {
  return (
    <div onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '1rem', padding: '.9rem 0', borderBottom: '1px solid var(--border)',
        cursor: onClick ? 'pointer' : 'default' }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.opacity = '.7'; }}
      onMouseLeave={e => { if (onClick) (e.currentTarget as HTMLElement).style.opacity = '1'; }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: '.92rem', color: danger ? 'var(--red)' : 'var(--ink)' }}>{label}</div>
        {sub && <div style={{ fontSize: '.78rem', color: 'var(--ink-3)', marginTop: '.1rem' }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

export function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="card" style={{ padding: '1.2rem 1.5rem', marginBottom: '1.1rem' }}>
      <div className="label-mono" style={{ marginBottom: '.4rem' }}>{label}</div>
      {children}
    </div>
  );
}
