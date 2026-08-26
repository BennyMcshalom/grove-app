"use client";
import { SpaceIcon } from "@/components/ui/SpaceIcon";
import { NavRow } from "./NavRow";

// ── Steps 1–3: Preset questions ──
export function QuestionStep({
  spaceId,
  spaceName,
  step,
  total,
  label,
  placeholder,
  value,
  onChange,
  onContinue,
  onSkip,
  continueLabel,
}: {
  spaceId: string;
  spaceName: string;
  step: number;
  total: number;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onContinue: () => void;
  onSkip: () => void;
  continueLabel: string;
}) {
  return (
    <>
      <div
        className="label-mono"
        style={{
          marginBottom: "1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: ".5rem",
        }}
      >
        <SpaceIcon spaceId={spaceId} size={12} /> {spaceName} · Question {step}{" "}
        of {total}
      </div>
      <h1
        className="serif"
        style={{
          fontSize: "1.9rem",
          fontWeight: 600,
          marginBottom: "1.4rem",
          lineHeight: 1.25,
        }}
      >
        {label}
      </h1>
      <textarea
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          minHeight: 140,
          padding: "1.1rem",
          fontSize: "1.05rem",
          lineHeight: 1.6,
          background: "var(--white)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md)",
          resize: "vertical",
          marginBottom: ".2rem",
          textAlign: "left",
        }}
      />
      <p
        style={{
          fontSize: ".78rem",
          color: "var(--ink-4)",
          marginBottom: 0,
          textAlign: "right",
        }}
      >
        Optional. Write as much or as little as you need.
      </p>
      <NavRow
        onSkip={onSkip}
        onContinue={onContinue}
        continueLabel={continueLabel}
      />
    </>
  );
}
