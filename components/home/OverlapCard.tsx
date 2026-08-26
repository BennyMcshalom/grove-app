"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { useToastStore } from "@/store/useToastStore";
import { spacesApi } from "@/lib/api";

// ── Overlap card ──
export function OverlapCard() {
  const router = useRouter();
  const { toast } = useToastStore();
  const { data: overlap, isLoading } = useQuery({
    queryKey: ["space-overlap"],
    queryFn: () => spacesApi.overlap(),
    staleTime: 5 * 60_000,
  });
  const [state, setState] = useState<"idle" | "introduced" | "dismissed">(
    "idle",
  );
  const [busy, setBusy] = useState(false);

  if (isLoading || !overlap?.id || state === "dismissed") return null;

  const nameA = overlap.connectionA?.displayName ?? "Someone";
  const nameB = overlap.connectionB?.displayName ?? "Someone";

  if (state === "introduced")
    return (
      <div
        className="card fade-in"
        style={{
          padding: "1.2rem 1.4rem",
          marginBottom: ".9rem",
          background: "var(--green-dim)",
          border: "1px solid rgba(46,107,58,.2)",
          display: "flex",
          alignItems: "center",
          gap: ".6rem",
        }}
      >
        <Icon name="check" size={18} stroke="var(--green)" />
        <span style={{ color: "var(--ink-2)", fontSize: ".92rem" }}>
          Introduced. {nameA.split(" ")[0]} and {nameB.split(" ")[0]} will each
          get a notification.
        </span>
      </div>
    );

  return (
    <div
      className="card"
      style={{
        padding: "1.2rem 1.4rem",
        marginBottom: ".9rem",
        background: "linear-gradient(135deg, var(--cream), var(--ember-soft))",
        border: "1px solid var(--ember-bdr)",
      }}
    >
      <div
        className="label-mono"
        style={{ color: "var(--ember-deep)", marginBottom: ".6rem" }}
      >
        A quiet observation
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: ".6rem",
          marginBottom: ".8rem",
        }}
      >
        <button
          onClick={() =>
            overlap.connectionA?.id &&
            router.push(`/grove/${overlap.connectionA.id}`)
          }
        >
          <Avatar
            name={nameA}
            size={40}
            avatarUrl={overlap.connectionA?.avatarUrl}
          />
        </button>
        <button
          onClick={() =>
            overlap.connectionB?.id &&
            router.push(`/grove/${overlap.connectionB.id}`)
          }
          style={{ marginLeft: -12 }}
        >
          <Avatar
            name={nameB}
            size={40}
            avatarUrl={overlap.connectionB?.avatarUrl}
          />
        </button>
        <p style={{ fontSize: ".92rem", color: "var(--ink-2)" }}>
          <strong style={{ color: "var(--ink)" }}>{nameA.split(" ")[0]}</strong>{" "}
          and{" "}
          <strong style={{ color: "var(--ink)" }}>{nameB.split(" ")[0]}</strong>{" "}
          seem to be in a similar{" "}
          {overlap.sharedSpace ? (
            <strong style={{ color: "var(--ink)" }}>
              {overlap.sharedSpace}
            </strong>
          ) : (
            "chapter"
          )}
          .
        </p>
      </div>
      <div style={{ display: "flex", gap: ".5rem" }}>
        <button
          disabled={busy}
          className="btn btn-primary"
          style={{ padding: ".5rem 1rem", fontSize: ".85rem" }}
          onClick={async () => {
            setBusy(true);
            try {
              await spacesApi.introduceOverlap(overlap.id!);
              setState("introduced");
              toast(
                `You introduced ${nameA.split(" ")[0]} and ${nameB.split(" ")[0]}.`,
              );
            } catch {
              toast("Could not introduce. Try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Introducing…" : "Introduce them"}
        </button>
        <button
          disabled={busy}
          className="btn btn-soft"
          style={{ padding: ".5rem 1rem", fontSize: ".85rem" }}
          onClick={() => {
            setState("dismissed");
            spacesApi.dismissOverlap(overlap.id!).catch(() => {});
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
