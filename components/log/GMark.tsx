import styles from "./GMark.module.css";

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
      className={styles.mark}
      style={
        {
          "--size": `${size}px`,
          "--radius": `${size * 0.32}px`,
          background: bg || "rgba(255,255,255,.18)",
        } as React.CSSProperties
      }
    >
      <span
        className={`serif ${styles.letter}`}
        style={
          { color, "--font-size": `${size * 0.62}px` } as React.CSSProperties
        }
      >
        G
      </span>
    </div>
  );
}
