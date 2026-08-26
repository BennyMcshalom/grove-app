"use client";

export function Radar({ isOn, count }: { isOn: boolean; count: number }) {
  return (
    <div
      style={{
        position: "relative",
        height: 260,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Rings — pointerEvents:none so they never block clicks */}
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            pointerEvents: "none",
            width: 56 + i * 56,
            height: 56 + i * 56,
            borderRadius: "50%",
            border: `1.5px solid ${isOn ? "rgba(78,125,94,.35)" : "rgba(78,125,94,.1)"}`,
            transition: "border-color .5s",
            animation: isOn
              ? `ringPulse 4s ease-out ${i * 0.65}s infinite`
              : "none",
          }}
        />
      ))}
      {/* Center glow */}
      <div
        style={{
          position: "absolute",
          pointerEvents: "none",
          width: isOn ? 48 : 24,
          height: isOn ? 48 : 24,
          borderRadius: "50%",
          background: isOn
            ? "radial-gradient(circle, rgba(78,125,94,.3), transparent)"
            : "transparent",
          transition: "all .5s",
        }}
      />
      {/* Center dot */}
      <div
        style={{
          position: "relative",
          pointerEvents: "none",
          zIndex: 2,
          width: isOn ? 14 : 10,
          height: isOn ? 14 : 10,
          borderRadius: "50%",
          background: isOn ? "var(--sage)" : "var(--border-2)",
          boxShadow: isOn ? "0 0 18px 5px rgba(78,125,94,.5)" : "none",
          transition: "all .4s",
        }}
      />
      {/* Live badge */}
      {isOn && (
        <div
          style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: ".4rem",
            pointerEvents: "none",
            background: "var(--green-dim)",
            border: "1px solid rgba(46,107,58,.2)",
            borderRadius: 100,
            padding: ".28rem .75rem",
            fontSize: ".74rem",
            fontWeight: 600,
            color: "var(--green)",
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--sage)",
              animation: "pulseDot 1.4s infinite",
              display: "block",
              flexShrink: 0,
            }}
          />
          {count > 0 ? `${count} nearby` : "Scanning…"}
        </div>
      )}
    </div>
  );
}
