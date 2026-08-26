"use client";
import { Spinner } from "@/components/ui/Spinner";

// ── Danger zone ──
export function DangerZoneCard({
  delConfirm,
  setDelConfirm,
  onDelete,
  deleting,
}: {
  delConfirm: string;
  setDelConfirm: (v: string) => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div
      className="card"
      style={{
        padding: "1.2rem 1.5rem",
        marginBottom: "1.1rem",
        border: "1px solid var(--red-bdr)",
      }}
    >
      <div
        className="label-mono"
        style={{ color: "var(--red)", marginBottom: ".7rem" }}
      >
        Danger zone
      </div>
      <div
        style={{
          fontSize: ".84rem",
          color: "var(--ink-3)",
          marginBottom: ".9rem",
          lineHeight: 1.55,
        }}
      >
        Permanently deletes your account, all your data, bonds, and posts. This
        cannot be undone.
      </div>
      <div style={{ display: "flex", gap: ".5rem" }}>
        <input
          value={delConfirm}
          onChange={(e) => setDelConfirm(e.target.value.toUpperCase())}
          placeholder='Type "DELETE" to confirm'
          style={{
            flex: 1,
            padding: ".6rem .9rem",
            borderRadius: "var(--r-md)",
            fontSize: ".86rem",
            border: "1.5px solid var(--red-bdr)",
            background: "var(--red-dim)",
            color: "var(--ink)",
          }}
        />
        <button
          onClick={onDelete}
          disabled={delConfirm !== "DELETE" || deleting}
          style={{
            padding: ".6rem 1rem",
            borderRadius: "var(--r-md)",
            fontSize: ".84rem",
            fontWeight: 600,
            cursor: delConfirm === "DELETE" ? "pointer" : "default",
            background:
              delConfirm === "DELETE" ? "var(--red)" : "var(--surf-high)",
            color: delConfirm === "DELETE" ? "#fff" : "var(--ink-4)",
            transition: "all .2s",
            opacity: deleting ? 0.6 : 1,
          }}
        >
          {deleting ? <Spinner size={14} color="#fff" /> : "Delete"}
        </button>
      </div>
    </div>
  );
}
