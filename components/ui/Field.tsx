'use client';
import { useState } from 'react';
import { Icon } from './Icon';
import styles from './Field.module.css';

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
    <label className={styles.label}>
      {label && <div className={styles.labelText}>{label}</div>}
      <div className={styles.inputWrap}>
        <input
          type={isPw && show ? 'text' : type}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder}
          autoComplete={ac}
          className={styles.input}
        />
        {isPw && (
          <button type="button" onClick={() => setShow(s => !s)} className={styles.eyeBtn}>
            <Icon name="eye" size={18} stroke="var(--ink-3)" />
          </button>
        )}
        {right && (
          <button type="button" onClick={onRightClick} className={styles.rightBtn}>
            {right}
          </button>
        )}
      </div>
    </label>
  );
}
