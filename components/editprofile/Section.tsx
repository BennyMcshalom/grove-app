export function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="card"
      style={{ padding: "1.4rem 1.6rem", marginBottom: "1.1rem" }}
    >
      <div className="label-mono" style={{ marginBottom: ".9rem" }}>
        {label}
      </div>
      {children}
    </div>
  );
}
