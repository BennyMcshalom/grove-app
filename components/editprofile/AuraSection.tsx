"use client";
import { AURAS } from "@/lib/data";
import type { AuraKey } from "@/lib/types";
import { Section } from "./Section";

export function AuraSection({
  aura,
  setAura,
}: {
  aura: AuraKey;
  setAura: (k: AuraKey) => void;
}) {
  return (
    <Section label="Your aura, how your circle reads you">
      <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
        {(Object.entries(AURAS) as [AuraKey, (typeof AURAS)[AuraKey]][]).map(
          ([k, a]) => (
            <button
              key={k}
              onClick={() => setAura(k)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: ".5rem",
                padding: ".5rem .85rem",
                borderRadius: 100,
                fontSize: ".84rem",
                fontWeight: 500,
                border:
                  aura === k
                    ? `1.5px solid ${a.color}`
                    : "1.5px solid var(--border-2)",
                background: aura === k ? `${a.color}18` : "transparent",
                color: aura === k ? "var(--ink)" : "var(--ink-3)",
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: a.color,
                  boxShadow: `0 0 7px ${a.color}`,
                  display: "block",
                }}
              />
              {a.label}
            </button>
          ),
        )}
      </div>
      <div
        style={{
          fontSize: ".78rem",
          fontStyle: "italic",
          color: "var(--ink-4)",
          marginTop: ".8rem",
        }}
      >
        {AURAS[aura].hint}
      </div>
    </Section>
  );
}
