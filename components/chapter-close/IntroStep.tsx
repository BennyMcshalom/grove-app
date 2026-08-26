"use client";
import { SpaceIcon } from "@/components/ui/SpaceIcon";

// ── Step 0: Intro ──
export function IntroStep({
  spaceId,
  ready,
  onBegin,
}: {
  spaceId: string;
  ready: boolean;
  onBegin: () => void;
}) {
  return (
    <>
      <div style={{ marginBottom: ".8rem" }}>
        <SpaceIcon spaceId={spaceId} size={28} pill pillSize={56} />
      </div>
      <h1
        className="serif"
        style={{
          fontSize: "clamp(1.7rem, 7.5vw, 2.4rem)",
          fontWeight: 600,
          marginBottom: ".8rem",
        }}
      >
        Before you close this chapter.
      </h1>
      <p
        style={{
          color: "var(--ink-2)",
          fontSize: "1.05rem",
          marginBottom: "2rem",
          lineHeight: 1.6,
        }}
      >
        Take your time. Answer what you want. Leave what you don&apos;t.
      </p>
      {ready ? (
        <button
          className="btn btn-primary btn-lg btn-pill fade-in"
          onClick={onBegin}
        >
          Begin
        </button>
      ) : (
        <div style={{ color: "var(--ink-4)", fontSize: ".85rem" }}>
          Take a breath…
        </div>
      )}
    </>
  );
}
