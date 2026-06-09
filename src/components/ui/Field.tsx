'use client';
import { useState } from 'react';
import { Icon } from './Icon';

interface FieldProps {
  label?: string;
  type?: string;
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  right?: string;
  onRightClick?: () => void;
  autoComplete?: string;
}

export function Field({ label, type = 'text', value, onChange, placeholder, right, onRightClick, autoComplete }: FieldProps) {
  const [show, setShow] = useState(false);
  const isPw = type === 'password';

  // Default sensible autocomplete values when not explicitly set
  const defaultAutoComplete = isPw ? 'current-password' : type === 'email' ? 'email' : undefined;
  const ac = autoComplete ?? defaultAutoComplete;

  return (
    <label style={{ display: 'block', marginBottom: '.95rem' }}>
      {label && <div style={{ fontSize: '.78rem', fontWeight: 500, color: 'var(--ink-2)', marginBottom: '.35rem' }}>{label}</div>}
      <div style={{ position: 'relative' }}>
        <input
          type={isPw && show ? 'text' : type}
          value={value} onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder}
          autoComplete={ac}
          style={{ width: '100%', padding: '.8rem .95rem', fontSize: '1rem',
            background: 'var(--surf-high)', border: '1.5px solid var(--border-2)',
            borderRadius: 'var(--r-md)', transition: 'border .15s, box-shadow .15s, background .15s',
            color: 'var(--ink)' }}
          onFocus={e => { e.target.style.borderColor = 'var(--ember)'; e.target.style.boxShadow = '0 0 0 3px var(--ember-dim)'; e.target.style.background = 'var(--white)'; }}
          onBlur={e  => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'var(--surf-high)'; }}
        />
        {isPw && (
          <button type="button" onClick={() => setShow(s => !s)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)' }}>
            <Icon name="eye" size={18} stroke="var(--ink-3)"/>
          </button>
        )}
        {right && (
          <button type="button" onClick={onRightClick}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              fontSize: '.78rem', color: 'var(--ember)', fontWeight: 500 }}>
            {right}
          </button>
        )}
      </div>
    </label>
  );
}
