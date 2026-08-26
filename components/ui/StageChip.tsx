import { spaceById } from "@/lib/data";
import { Icon } from "./Icon";

interface StageChipProps {
  space: string;
  stage: string;
  small?: boolean;
  tone?: "ember";
}

export function StageChip({ space, stage, small, tone }: StageChipProps) {
  const s = spaceById(space);
  const ember = tone === "ember";
  return (
    <span
      className="chip"
      style={{
        background: ember ? "var(--ember-pale)" : "var(--surf-high)",
        color: ember ? "var(--ember-deep)" : "var(--ink-2)",
        fontSize: ember
          ? small
            ? ".85rem"
            : ".9rem"
          : small
            ? ".7rem"
            : ".74rem",
        padding: ember ? ".35rem .75rem" : undefined,
        display: "inline-flex",
        alignItems: "center",
        gap: ".35rem",
      }}
    >
      <span
        style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}
      >
        <Icon
          name={s.icon}
          size={ember ? (small ? 14 : 15) : small ? 11 : 12}
          stroke={ember ? "var(--ember-deep)" : s.ink}
          sw={1.9}
        />
      </span>
      {stage}
    </span>
  );
}
