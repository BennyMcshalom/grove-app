"use client";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useBondMessages } from "@/hooks/useBonds";
import { startCall } from "@/lib/calling";
import { humanDuration } from "@/lib/mappers";
import type { BondRecord } from "@/lib/api";

export function BondInfoPanel({
  bond,
  onClose,
}: {
  bond: BondRecord;
  onClose: () => void;
}) {
  const router = useRouter();
  const other = bond.otherUser;
  const name = other?.displayName ?? "Bond";
  const isBond = bond.status === "bond";

  // Same query key BondThread already subscribes to — TanStack Query dedupes it.
  const { data: messages } = useBondMessages(bond.id);
  const voiceCount = messages?.filter((m) => m.kind === "voice").length ?? 0;
  const sharedCount =
    messages?.filter((m) => m.kind === "shared_post").length ?? 0;

  const focusEndsLabel = other?.deepFocusEndsAt
    ? `Ends ${new Date(other.deepFocusEndsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
    : null;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--white)",
        borderRadius: "var(--r-lg)",
        border: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          padding: "1.1rem 1.3rem",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span className="label-mono">Bond Info</span>
        <button
          onClick={onClose}
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = "var(--surf-low)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = "transparent")
          }
        >
          <Icon name="close" size={16} stroke="var(--ink-3)" />
        </button>
      </header>

      <div
        className="scroll"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1.6rem 1.3rem",
          textAlign: "center",
        }}
      >
        <button
          onClick={() => other?.id && router.push(`/grove/${other.id}`)}
          title="Enter their Grouv"
        >
          <Avatar
            name={name}
            size={92}
            ring={isBond ? 3 : undefined}
            aura={other?.aura ?? undefined}
            avatarUrl={other?.avatarUrl}
            style={{ margin: "0 auto" }}
          />
        </button>
        <h2
          className="serif"
          style={{ fontSize: "1.3rem", fontWeight: 600, marginTop: ".9rem" }}
        >
          {name}
        </h2>
        {other?.openTo && (
          <p
            style={{
              fontSize: ".82rem",
              color: "var(--ink-3)",
              marginTop: ".3rem",
              lineHeight: 1.5,
            }}
          >
            {other.openTo}
          </p>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: ".5rem",
            marginTop: "1rem",
          }}
        >
          <span
            className="chip"
            style={
              isBond
                ? { background: "var(--ember-dim)", color: "var(--ember)" }
                : undefined
            }
          >
            {isBond ? "Bond" : "Circle"}
          </span>
          <span className="chip">
            <Icon name="fire" size={12} stroke="currentColor" />{" "}
            {bond.streakDays ?? 0}d streak
          </span>
        </div>

        {isBond && (
          <div style={{ marginTop: "1.3rem", textAlign: "left" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: ".4rem",
              }}
            >
              <span className="label-mono" style={{ fontSize: ".66rem" }}>
                Bond depth
              </span>
              <span style={{ fontSize: ".72rem", color: "var(--ink-4)" }}>
                {humanDuration(bond.formedAt)} old
              </span>
            </div>
            <ProgressBar value={bond.depthScore ?? 0} />
          </div>
        )}

        {bond.originLabel && (
          <p
            style={{
              fontSize: ".76rem",
              color: "var(--ink-4)",
              fontStyle: "italic",
              marginTop: "1rem",
            }}
          >
            {bond.originLabel}
          </p>
        )}

        {other?.deepFocusActive && (
          <div
            style={{
              marginTop: "1.1rem",
              padding: ".6rem .8rem",
              borderRadius: "var(--r-md)",
              background: "var(--ink)",
              display: "flex",
              alignItems: "center",
              gap: ".5rem",
              textAlign: "left",
            }}
          >
            <Icon name="moon" size={14} stroke="var(--cream)" sw={1.8} />
            <div>
              <div
                style={{
                  fontSize: ".78rem",
                  color: "var(--cream)",
                  fontWeight: 500,
                }}
              >
                In Deep Focus
              </div>
              {focusEndsLabel && (
                <div
                  style={{ fontSize: ".68rem", color: "rgba(255,255,255,.65)" }}
                >
                  {focusEndsLabel}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: ".6rem", marginTop: "1.4rem" }}>
          <button
            onClick={() => startCall(bond, "voice")}
            className="btn btn-soft"
            style={{ flex: 1, padding: ".6rem", fontSize: ".82rem" }}
          >
            <Icon name="phone" size={15} stroke="currentColor" /> Voice
          </button>
          <button
            onClick={() => startCall(bond, "video")}
            className="btn btn-soft"
            style={{ flex: 1, padding: ".6rem", fontSize: ".82rem" }}
          >
            <Icon name="video" size={15} stroke="currentColor" /> Video
          </button>
        </div>

        {(voiceCount > 0 || sharedCount > 0) && (
          <div style={{ marginTop: "1.4rem", textAlign: "left" }}>
            <div
              className="label-mono"
              style={{ fontSize: ".66rem", marginBottom: ".5rem" }}
            >
              Shared
            </div>
            <div style={{ display: "flex", gap: ".6rem" }}>
              <div
                className="card"
                style={{
                  flex: 1,
                  padding: ".7rem",
                  textAlign: "center",
                  boxShadow: "none",
                  border: "1px solid var(--border)",
                }}
              >
                <Icon name="mic" size={16} stroke="var(--ink-3)" />
                <div
                  style={{
                    fontSize: ".9rem",
                    fontWeight: 600,
                    marginTop: ".3rem",
                  }}
                >
                  {voiceCount}
                </div>
                <div style={{ fontSize: ".66rem", color: "var(--ink-4)" }}>
                  Voice notes
                </div>
              </div>
              <div
                className="card"
                style={{
                  flex: 1,
                  padding: ".7rem",
                  textAlign: "center",
                  boxShadow: "none",
                  border: "1px solid var(--border)",
                }}
              >
                <Icon name="share" size={16} stroke="var(--ink-3)" />
                <div
                  style={{
                    fontSize: ".9rem",
                    fontWeight: 600,
                    marginTop: ".3rem",
                  }}
                >
                  {sharedCount}
                </div>
                <div style={{ fontSize: ".66rem", color: "var(--ink-4)" }}>
                  Shared posts
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        style={{ padding: "1rem 1.3rem", borderTop: "1px solid var(--border)" }}
      >
        {isBond ? (
          <button
            onClick={() =>
              router.push(
                `/bond-release?bond=${encodeURIComponent(name)}&bondId=${bond.id}`,
              )
            }
            className="btn btn-ghost"
            style={{
              width: "100%",
              padding: ".65rem",
              fontSize: ".84rem",
              color: "var(--ink-3)",
            }}
          >
            Release this Bond
          </button>
        ) : (
          <p
            style={{
              fontSize: ".76rem",
              color: "var(--ink-4)",
              fontStyle: "italic",
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            Bonds form after 7 days of consistently showing up for each other.
          </p>
        )}
      </div>
    </div>
  );
}
