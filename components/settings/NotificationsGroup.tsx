"use client";
import { Spinner } from "@/components/ui/Spinner";
import { Group, Row, Toggle } from "./primitives";

// ── Notifications ──
export function NotificationsGroup({
  notifPrefs,
  onUpdate,
}: {
  notifPrefs: Record<string, boolean> | null;
  onUpdate: (key: string, value: boolean) => void;
}) {
  const prefs = notifPrefs ?? {
    morning_curio: true,
    chapter_prompt: false,
    bond_invitation: true,
    wave: true,
  };

  return (
    <Group label="Notifications">
      {notifPrefs === null ? (
        <div
          style={{ display: "flex", justifyContent: "center", padding: "1rem" }}
        >
          <Spinner size={16} color="var(--ember)" />
        </div>
      ) : (
        <>
          <Row label="Morning Curio" sub="Daily reading card">
            <Toggle
              on={prefs.morning_curio ?? true}
              onChange={(v) => onUpdate("morning_curio", v)}
            />
          </Row>
          <Row label="Chapter prompt" sub="Weekly reflection nudge">
            <Toggle
              on={prefs.chapter_prompt ?? false}
              onChange={(v) => onUpdate("chapter_prompt", v)}
            />
          </Row>
          <Row label="Wave received" sub="When someone waves at you nearby">
            <Toggle
              on={prefs.wave ?? true}
              onChange={(v) => onUpdate("wave", v)}
            />
          </Row>
          <Row label="Bond invitation" sub="Always on, required for safety">
            <Toggle on={true} locked />
          </Row>
        </>
      )}
    </Group>
  );
}
