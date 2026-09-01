"use client";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import styles from "./ReflectionField.module.css";

// ── Reflection textarea row ───────────────────────────────────────
export function ReflectionField({
  label,
  placeholder,
  value,
  onChange,
  onRemove,
  autoFocus = false,
}: {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  onRemove?: () => void;
  autoFocus?: boolean;
}) {
  return (
    <div className={styles.wrap}>
      {label && (
        <div className={styles.label}>
          {label}
        </div>
      )}
      <textarea
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Don't edit yourself. Write what's true."}
        className={styles.textarea}
      />
      {onRemove && (
        <button
          onClick={onRemove}
          className={clsx(styles.removeBtn, label && styles.withLabel)}
        >
          <Icon name="close" size={12} stroke="var(--ink-3)" />
        </button>
      )}
    </div>
  );
}
