"use client";
import { Icon } from "@/components/ui/Icon";

// ── Shared button row ──
export function NavRow({
  onSkip,
  onContinue,
  continueLabel = "Continue",
}: {
  onSkip: () => void;
  onContinue: () => void;
  continueLabel?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        marginTop: "1.6rem",
      }}
    >
      <button
        onClick={onSkip}
        style={{
          fontSize: ".88rem",
          color: "var(--ink-3)",
          padding: ".5rem 1rem",
        }}
      >
        Skip
      </button>
      <button
        onClick={onContinue}
        className="btn btn-primary btn-pill"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: ".4rem",
          padding: ".7rem 1.8rem",
        }}
      >
        {continueLabel} <Icon name="arrow" stroke="#fff" size={16} />
      </button>
    </div>
  );
}
