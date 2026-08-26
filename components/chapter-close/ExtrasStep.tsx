"use client";
import { Icon } from "@/components/ui/Icon";
import { SpaceIcon } from "@/components/ui/SpaceIcon";
import { NavRow } from "./NavRow";
import { ReflectionField } from "./ReflectionField";

// ── Step 4: Extra thoughts (any number) ──
export function ExtrasStep({
  spaceId,
  spaceName,
  extras,
  onAddExtra,
  onUpdateExtra,
  onRemoveExtra,
  onContinue,
  onSkip,
}: {
  spaceId: string;
  spaceName: string;
  extras: string[];
  onAddExtra: () => void;
  onUpdateExtra: (i: number, v: string) => void;
  onRemoveExtra: (i: number) => void;
  onContinue: () => void;
  onSkip: () => void;
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
        <SpaceIcon spaceId={spaceId} size={12} /> {spaceName} · Anything else?
      </div>
      <h1
        className="serif"
        style={{
          fontSize: "1.9rem",
          fontWeight: 600,
          marginBottom: ".5rem",
          lineHeight: 1.25,
        }}
      >
        Anything else you want to record?
      </h1>
      <p
        style={{
          color: "var(--ink-3)",
          fontSize: ".9rem",
          marginBottom: "1.6rem",
          lineHeight: 1.5,
        }}
      >
        Add as many reflections as you like, or skip right through.
      </p>

      <div style={{ textAlign: "left" }}>
        {extras.length === 0 ? (
          <p
            style={{
              color: "var(--ink-4)",
              fontSize: ".88rem",
              fontStyle: "italic",
              marginBottom: "1rem",
              textAlign: "center",
            }}
          >
            Nothing added yet.
          </p>
        ) : (
          extras.map((val, i) => (
            <ReflectionField
              key={i}
              label={`Reflection ${i + 1}`}
              value={val}
              onChange={(v) => onUpdateExtra(i, v)}
              onRemove={extras.length > 0 ? () => onRemoveExtra(i) : undefined}
              autoFocus={i === extras.length - 1 && val === ""}
            />
          ))
        )}

        <button
          onClick={onAddExtra}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: ".4rem",
            fontSize: ".86rem",
            color: "var(--ember)",
            fontWeight: 500,
            padding: ".5rem .9rem",
            borderRadius: 100,
            border: "1.5px dashed var(--ember-bdr)",
            background: "transparent",
            marginBottom: "1rem",
          }}
        >
          <Icon name="plus" size={14} stroke="var(--ember)" /> Add a reflection
        </button>
      </div>

      <NavRow
        onSkip={onSkip}
        onContinue={onContinue}
        continueLabel="Close this chapter"
      />
    </>
  );
}
