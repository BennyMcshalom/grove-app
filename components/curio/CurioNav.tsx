"use client";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useToastStore } from "@/store/useToastStore";

export function CurioNav({
  from,
  title,
  saved,
  setSaved,
}: {
  from: string;
  title: string;
  saved: boolean;
  setSaved: (fn: (s: boolean) => boolean) => void;
}) {
  const router = useRouter();
  const { toast } = useToastStore();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "2rem",
      }}
    >
      <button
        onClick={() => router.push(`/${from}`)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: ".4rem",
          color: "var(--ink-3)",
          fontSize: ".9rem",
        }}
      >
        <Icon name="back" size={18} stroke="var(--ink-3)" /> Back
      </button>
      <div style={{ display: "flex", gap: ".5rem" }}>
        <button
          onClick={() => {
            setSaved((s) => !s);
            toast(saved ? "Removed from shelf." : "Saved to your shelf.");
          }}
          className="chip"
          style={{
            cursor: "pointer",
            background: saved ? "var(--ember-dim)" : "var(--surf-high)",
            color: saved ? "var(--ember-deep)" : "var(--ink-2)",
          }}
        >
          {saved ? (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Icon
                name="check"
                size={12}
                stroke="var(--ember-deep)"
                sw={2.5}
              />{" "}
              Saved
            </span>
          ) : (
            "Save"
          )}
        </button>
        <button
          onClick={() => toast(`"${title}" sent to a Bond.`)}
          className="chip"
          style={{ cursor: "pointer", background: "var(--surf-high)" }}
        >
          Send to a Bond
        </button>
      </div>
    </div>
  );
}
