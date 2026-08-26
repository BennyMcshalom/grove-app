export function GMark({
  size = 20,
  color = "#fff",
  bg,
}: {
  size?: number;
  color?: string;
  bg?: string;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        background: bg || "rgba(255,255,255,.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span
        className="serif"
        style={{ color, fontWeight: 700, fontSize: size * 0.62, lineHeight: 1 }}
      >
        G
      </span>
    </div>
  );
}
