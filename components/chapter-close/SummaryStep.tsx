"use client";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import { SpaceIcon } from "@/components/ui/SpaceIcon";
import type { BondRecord } from "@/lib/api";
import { PRESETS, fmtMonth } from "./helpers";

// ── Final step: Summary ──
export function SummaryStep({
  spaceId,
  spaceName,
  openedAt,
  closedAt,
  monthsStr,
  bonds,
  answers,
  extras,
  held,
  closing,
  onSave,
}: {
  spaceId: string;
  spaceName: string;
  openedAt: Date | null;
  closedAt: Date;
  monthsStr: string | null;
  bonds: BondRecord[];
  answers: string[];
  extras: string[];
  held: boolean;
  closing: boolean;
  onSave: () => void;
}) {
  return (
    <>
      <div style={{ marginBottom: "1.2rem" }}>
        <SpaceIcon spaceId={spaceId} size={28} pill pillSize={56} />
      </div>
      <h1
        className="serif"
        style={{ fontSize: "clamp(1.7rem, 7.5vw, 2.4rem)", fontWeight: 600 }}
      >
        Chapter closed.
      </h1>
      <p
        style={{
          color: "var(--ink-2)",
          margin: ".6rem 0 .25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: ".4rem",
        }}
      >
        <SpaceIcon spaceId={spaceId} size={13} /> {spaceName}
        {openedAt && ` · ${fmtMonth(openedAt)} – ${fmtMonth(closedAt)}`}
      </p>
      {monthsStr && (
        <p style={{ color: "var(--ink-4)", fontSize: ".88rem" }}>{monthsStr}</p>
      )}

      {/* People from bonds */}
      {bonds.length > 0 && (
        <div style={{ marginTop: "1.4rem" }}>
          <p
            style={{
              fontSize: ".8rem",
              color: "var(--ink-3)",
              marginBottom: ".8rem",
            }}
          >
            People who were part of this chapter
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: ".4rem",
            }}
          >
            {bonds.slice(0, 7).map((b) => (
              <div key={b.id} title={b.otherUser?.displayName ?? ""}>
                <Avatar
                  name={b.otherUser?.displayName ?? "?"}
                  avatarUrl={b.otherUser?.avatarUrl}
                  size={44}
                  ring={1}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reflection preview — show any non-empty answers */}
      {[...answers, ...extras].some((a) => a.trim()) && (
        <div
          className="card"
          style={{
            marginTop: "1.6rem",
            padding: "1.2rem 1.4rem",
            textAlign: "left",
          }}
        >
          <div className="label-mono" style={{ marginBottom: ".8rem" }}>
            Your reflections
          </div>
          {answers.map((a, i) =>
            a.trim() ? (
              <div key={i} style={{ marginBottom: ".9rem" }}>
                <div
                  style={{
                    fontSize: ".75rem",
                    fontWeight: 600,
                    color: "var(--ink-3)",
                    marginBottom: ".2rem",
                  }}
                >
                  {PRESETS[i].label}
                </div>
                <p
                  style={{
                    fontSize: ".9rem",
                    color: "var(--ink-2)",
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {a}
                </p>
              </div>
            ) : null,
          )}
          {extras.map((e, i) =>
            e.trim() ? (
              <div key={`extra-${i}`} style={{ marginBottom: ".9rem" }}>
                <div
                  style={{
                    fontSize: ".75rem",
                    fontWeight: 600,
                    color: "var(--ink-3)",
                    marginBottom: ".2rem",
                  }}
                >
                  Extra reflection {i + 1}
                </div>
                <p
                  style={{
                    fontSize: ".9rem",
                    color: "var(--ink-2)",
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {e}
                </p>
              </div>
            ) : null,
          )}
        </div>
      )}

      <div style={{ height: 64, marginTop: "2rem" }}>
        {held ? (
          <button
            className="btn btn-ghost btn-lg btn-pill fade-in"
            disabled={closing}
            onClick={onSave}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: ".5rem",
            }}
          >
            {closing ? (
              <>
                <Spinner size={16} color="var(--ink-3)" /> Saving…
              </>
            ) : (
              "Save to Life Archive"
            )}
          </button>
        ) : (
          <p
            style={{ color: "var(--ink-4)", fontSize: ".85rem" }}
            className="fade-in"
          >
            Sit with it for a moment.
          </p>
        )}
      </div>
    </>
  );
}
