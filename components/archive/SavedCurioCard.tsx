"use client";
import { SpaceIcon } from "@/components/ui/SpaceIcon";
import type { CurioEntry } from "@/lib/api";

export function SavedCurioCard({
  curio: c,
  open,
  onToggle,
  spaceSlug,
}: {
  curio: CurioEntry;
  open: boolean;
  onToggle: () => void;
  spaceSlug: string;
}) {
  const dateStr = new Date(c.servedDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className="card"
      style={{
        marginBottom: ".9rem",
        borderLeft: "4px solid var(--sage)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "1.1rem 1.4rem" }}>
        {/* Header row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: ".6rem",
            marginBottom: ".4rem",
          }}
        >
          <SpaceIcon spaceId={spaceSlug} size={13} />
          <span className="label-mono" style={{ color: "var(--sage)" }}>
            {dateStr}
          </span>
        </div>

        {/* Title */}
        {c.title && (
          <h3
            className="serif"
            style={{
              fontSize: "1.15rem",
              fontWeight: 600,
              marginBottom: ".3rem",
              lineHeight: 1.3,
            }}
          >
            {c.title}
          </h3>
        )}

        {/* Reflection preview */}
        {c.reflection && (
          <p
            style={{
              fontSize: ".84rem",
              color: "var(--ink-3)",
              fontStyle: "italic",
              marginBottom: ".5rem",
              lineHeight: 1.5,
              display: open ? "none" : "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            &ldquo;{c.reflection}&rdquo;
          </p>
        )}

        {/* Expand button */}
        {(c.body || c.reflection) && (
          <button
            onClick={onToggle}
            style={{
              fontSize: ".82rem",
              color: "var(--sage)",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: ".3rem",
            }}
          >
            {open ? "Show less" : "Read more"} →
          </button>
        )}

        {/* Expanded body */}
        {open && (
          <div
            className="fade-in"
            style={{
              borderTop: "1px solid var(--border)",
              marginTop: ".8rem",
              paddingTop: ".9rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            {c.body && (
              <div>
                <div className="label-mono" style={{ marginBottom: ".4rem" }}>
                  Reading
                </div>
                <p
                  style={{
                    color: "var(--ink-2)",
                    lineHeight: 1.7,
                    fontSize: ".92rem",
                  }}
                >
                  {c.body}
                </p>
              </div>
            )}
            {c.reflection && (
              <div>
                <div
                  className="label-mono"
                  style={{ marginBottom: ".4rem", color: "var(--sage)" }}
                >
                  Your reflection
                </div>
                <p
                  style={{
                    fontStyle: "italic",
                    color: "var(--ink-2)",
                    lineHeight: 1.65,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  &ldquo;{c.reflection}&rdquo;
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
