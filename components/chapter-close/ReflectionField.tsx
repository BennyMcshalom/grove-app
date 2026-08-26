"use client";
import { Icon } from "@/components/ui/Icon";

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
    <div style={{ marginBottom: "1.2rem", position: "relative" }}>
      {label && (
        <div
          style={{
            fontSize: ".78rem",
            fontWeight: 600,
            color: "var(--ink-3)",
            marginBottom: ".4rem",
            textAlign: "left",
          }}
        >
          {label}
        </div>
      )}
      <textarea
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Don't edit yourself. Write what's true."}
        style={{
          width: "100%",
          minHeight: 110,
          padding: "1rem",
          fontSize: "1rem",
          lineHeight: 1.6,
          background: "var(--white)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md)",
          resize: "vertical",
        }}
      />
      {onRemove && (
        <button
          onClick={onRemove}
          style={{
            position: "absolute",
            top: label ? 28 : 8,
            right: 8,
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "var(--surf-high)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon name="close" size={12} stroke="var(--ink-3)" />
        </button>
      )}
    </div>
  );
}
