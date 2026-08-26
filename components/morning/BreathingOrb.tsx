"use client";
import { PROMPTS } from "./prompts";

export function BreathingOrb({
  pidx,
  onNext,
}: {
  pidx: number;
  onNext: () => void;
}) {
  return (
    <div style={{ textAlign: "center", padding: "1.2rem 0 2rem" }}>
      <button
        onClick={onNext}
        title="Tap for another prompt"
        style={{ display: "block", margin: "0 auto" }}
      >
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 38% 35%, var(--mint), var(--sage))",
            animation: "breathe 4s ease-in-out infinite",
            boxShadow: "0 0 50px -8px rgba(78,125,94,.45)",
          }}
        />
      </button>
      <p
        className="serif"
        style={{
          fontSize: "1.3rem",
          fontStyle: "italic",
          color: "var(--ink)",
          maxWidth: 380,
          margin: "1.5rem auto .4rem",
          lineHeight: 1.4,
        }}
      >
        &ldquo;{PROMPTS[pidx]}&rdquo;
      </p>
      <div className="label-mono" style={{ color: "var(--ink-4)" }}>
        Tap the orb for another
      </div>
    </div>
  );
}
