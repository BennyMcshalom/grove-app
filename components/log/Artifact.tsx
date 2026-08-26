"use client";
import { Icon } from "@/components/ui/Icon";
import { spaceById } from "@/lib/data";
import type { LogEntry } from "./types";

// ── Artifact ──────────────────────────────────────────────────────
export function Artifact({
  spaceId,
  phase,
  entries,
  onClose,
}: {
  spaceId: string;
  phase: string;
  entries: LogEntry[];
  onClose: () => void;
}) {
  const space = spaceById(spaceId);
  const filled = entries.filter((e) => !e.missed);
  const range = filled.length
    ? `${filled[0].date}, ${filled[filled.length - 1].date} · `
    : "";
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 7000,
        background: "rgba(26,26,26,.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "center",
        padding: "4vh 1rem",
      }}
      onClick={onClose}
    >
      <div
        className="scroll"
        style={{
          width: "min(620px, 96vw)",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "var(--cream)",
          borderRadius: "var(--r-lg)",
          boxShadow: "var(--shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            background: "var(--cream)",
            borderBottom: "1px solid var(--border)",
            padding: "1.1rem 1.6rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 2,
          }}
        >
          <div className="label-mono" style={{ color: "var(--ember)" }}>
            Preview · the Artifact
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="close" stroke="var(--ink-3)" />
          </button>
        </div>
        <div style={{ padding: "2.2rem 2rem 3rem" }}>
          <div style={{ textAlign: "center", marginBottom: "2.2rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: ".4rem",
              }}
            >
              <Icon name={space.icon} size={32} stroke={space.ink} sw={1.5} />
            </div>
            <h1
              className="serif"
              style={{
                fontSize: "clamp(1.6rem, 7.5vw, 2.4rem)",
                fontWeight: 600,
                lineHeight: 1.1,
              }}
            >
              {space.name} · {phase}
            </h1>
            <div
              className="mono"
              style={{
                fontSize: ".72rem",
                color: "var(--ink-4)",
                marginTop: ".5rem",
              }}
            >
              {range}
              {filled.length} entries stitched
            </div>
          </div>
          {filled.map((e, i) => (
            <article
              key={i}
              style={{
                marginBottom: "2rem",
                paddingBottom: "2rem",
                borderBottom:
                  i < filled.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <div className="label-mono" style={{ marginBottom: ".7rem" }}>
                Day {e.day} · {e.date}
              </div>
              {e.media && (
                <div
                  style={{
                    borderRadius: "var(--r-md)",
                    overflow: "hidden",
                    marginBottom: ".9rem",
                    maxHeight: 280,
                  }}
                >
                  <img
                    src={e.media}
                    alt=""
                    style={{
                      width: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </div>
              )}
              <p
                className="serif"
                style={{ fontSize: "1.25rem", lineHeight: 1.5 }}
              >
                {e.text}
              </p>
            </article>
          ))}
          <div
            style={{
              textAlign: "center",
              color: "var(--ink-3)",
              fontStyle: "italic",
              fontSize: ".9rem",
            }}
          >
            This is a preview. The Artifact unlocks for real when you close the
            chapter, then it&apos;s yours, permanently, in your Life Archive.
          </div>
        </div>
      </div>
    </div>
  );
}
