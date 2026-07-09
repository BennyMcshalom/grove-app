interface RightPanelProps { children: React.ReactNode; }

export function RightPanel({ children }: RightPanelProps) {
  return (
    <aside className="scroll" style={{ width: 312, flexShrink: 0, padding: '1.15rem 1.25rem 2rem',
      height: '100vh', overflowY: 'auto' }}>
      {children}
    </aside>
  );
}

interface RPSectionProps {
  label: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
  /** Sets this section apart as a recommendation module, distinct from the main feed. */
  suggested?: boolean;
}

export function RPSection({ label, action, onAction, children, suggested }: RPSectionProps) {
  return (
    <section style={{ marginBottom: '1.6rem',
      ...(suggested ? {
        background: 'linear-gradient(160deg, var(--ember-dim), var(--surf-low))',
        border: '1px solid var(--ember-bdr)', borderRadius: 'var(--r-lg)', padding: '.9rem 1rem',
      } : {}) }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.7rem' }}>
        <div className="label-mono" style={suggested ? { color: 'var(--ember-deep)' } : undefined}>{label}</div>
        {action && <button onClick={onAction} style={{ fontSize: '.72rem', color: 'var(--ember)', fontWeight: 500 }}>{action}</button>}
      </div>
      {children}
    </section>
  );
}
