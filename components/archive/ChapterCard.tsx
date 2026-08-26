"use client";
import { useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { SpaceIcon } from "@/components/ui/SpaceIcon";
import { useMyLogEntries } from "@/hooks/useLog";
import { spaceById } from "@/lib/data";
import type { ChapterRecord } from "@/lib/api";

export function ChapterCard({
  chapter: c,
  slug,
}: {
  chapter: ChapterRecord;
  slug: string;
}) {
  const s = spaceById(slug);
  const [open, setOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const { data: logEntries, isLoading: logLoading } = useMyLogEntries(
    logOpen ? c.spaceId : undefined,
  );
  const openedDate = new Date(c.openedAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
  const closedDate = c.closedAt
    ? new Date(c.closedAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <div
      className="card"
      style={{
        marginBottom: "1.1rem",
        borderLeft: `6px solid ${s.color}`,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "1.3rem 1.5rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: ".7rem",
            marginBottom: ".3rem",
          }}
        >
          <SpaceIcon spaceId={slug} size={22} pill pillSize={40} />
          <div
            className="serif"
            style={{ fontSize: "1.4rem", fontWeight: 600 }}
          >
            {s.name}
          </div>
        </div>
        <div
          style={{
            color: "var(--ink-3)",
            fontSize: ".88rem",
            marginBottom: ".9rem",
          }}
        >
          {openedDate} – {closedDate}
        </div>

        <div style={{ display: "flex", gap: "1.3rem", flexWrap: "wrap" }}>
          <button
            onClick={() => setOpen((o) => !o)}
            style={{
              fontSize: ".85rem",
              color: "var(--ember)",
              fontWeight: 500,
            }}
          >
            {open ? "Hide reflections" : "Read reflections"} →
          </button>
          <button
            onClick={() => setLogOpen((o) => !o)}
            style={{
              fontSize: ".85rem",
              color: "var(--sage)",
              fontWeight: 500,
            }}
          >
            {logOpen ? "Hide Grouv Log" : "View Grouv Log"} →
          </button>
        </div>

        {open && (
          <div
            className="fade-in"
            style={{
              borderTop: "1px solid var(--border)",
              marginTop: "1rem",
              paddingTop: "1rem",
            }}
          >
            {!c.closingLearned &&
            !c.closingAdvice &&
            !c.closingCarryForward &&
            !c.reflectionQ1 ? (
              <p
                style={{
                  fontSize: ".88rem",
                  color: "var(--ink-4)",
                  fontStyle: "italic",
                }}
              >
                No reflections were recorded for this chapter.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                {c.closingLearned && (
                  <div>
                    <div
                      className="label-mono"
                      style={{ marginBottom: ".3rem" }}
                    >
                      What this chapter taught me
                    </div>
                    <p
                      style={{
                        fontStyle: "italic",
                        color: "var(--ink-2)",
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      &apos;{c.closingLearned}&apos;
                    </p>
                  </div>
                )}
                {c.closingAdvice && (
                  <div>
                    <div
                      className="label-mono"
                      style={{ marginBottom: ".3rem" }}
                    >
                      What I&apos;d tell someone starting
                    </div>
                    <p
                      style={{
                        fontStyle: "italic",
                        color: "var(--ink-2)",
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      &apos;{c.closingAdvice}&apos;
                    </p>
                  </div>
                )}
                {c.closingCarryForward && (
                  <div>
                    <div
                      className="label-mono"
                      style={{ marginBottom: ".3rem" }}
                    >
                      Who I&apos;m carrying forward
                    </div>
                    <p
                      style={{
                        fontStyle: "italic",
                        color: "var(--ink-2)",
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      &apos;{c.closingCarryForward}&apos;
                    </p>
                  </div>
                )}
                {c.reflectionQ1 &&
                  c.reflectionQ1.split("\n\n—\n\n").map(
                    (entry, i) =>
                      entry.trim() && (
                        <div key={i}>
                          <div
                            className="label-mono"
                            style={{ marginBottom: ".3rem" }}
                          >
                            Extra reflection {i + 1}
                          </div>
                          <p
                            style={{
                              fontStyle: "italic",
                              color: "var(--ink-2)",
                              lineHeight: 1.6,
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {entry.trim()}
                          </p>
                        </div>
                      ),
                  )}
              </div>
            )}
          </div>
        )}

        {logOpen && (
          <div
            className="fade-in"
            style={{
              borderTop: "1px solid var(--border)",
              marginTop: "1rem",
              paddingTop: "1rem",
            }}
          >
            {logLoading ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "1rem 0",
                }}
              >
                <Spinner />
              </div>
            ) : !logEntries || logEntries.length === 0 ? (
              <p
                style={{
                  fontSize: ".88rem",
                  color: "var(--ink-4)",
                  fontStyle: "italic",
                }}
              >
                No Grouv Log entries were written during this chapter.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                {logEntries.map((e) => (
                  <div key={e.id}>
                    <div
                      className="label-mono"
                      style={{ marginBottom: ".3rem", color: "var(--sage)" }}
                    >
                      Day {e.dayNumber} ·{" "}
                      {new Date(e.entryDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    <p
                      style={{
                        color: "var(--ink-2)",
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {e.body}
                    </p>
                    {e.mediaUrl && (
                      <div
                        style={{
                          marginTop: ".6rem",
                          borderRadius: "var(--r-md)",
                          overflow: "hidden",
                          background: "var(--surf-high)",
                        }}
                      >
                        {e.mediaType?.startsWith("video") ? (
                          <video
                            src={e.mediaUrl}
                            controls
                            style={{
                              width: "100%",
                              maxHeight: 260,
                              display: "block",
                            }}
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={e.mediaUrl}
                            alt=""
                            style={{
                              width: "100%",
                              maxHeight: 260,
                              objectFit: "contain",
                              display: "block",
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
