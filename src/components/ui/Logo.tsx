interface LogoProps { size?: number; sub?: string; light?: boolean; }

export function Logo({ size = 22, sub, light }: LogoProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem' }}>
      <div style={{
        width: size * 1.5, height: size * 1.5, borderRadius: size * 0.45,
        background: 'var(--ember)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, boxShadow: '0 2px 8px -2px rgba(243,112,30,.5)'
      }}>
        <span className="serif" style={{ color: '#fff', fontWeight: 700, fontSize: size }}>G</span>
      </div>
      <div style={{ lineHeight: 1.05 }}>
        <div className="serif" style={{
          fontWeight: 700, fontSize: size,
          color: light ? '#fff' : 'var(--ember)', letterSpacing: '.01em'
        }}>Grouw</div>
        {sub && <div className="label-mono" style={{
          fontSize: '.54rem',
          color: light ? 'rgba(255,255,255,.5)' : 'var(--ink-4)'
        }}>{sub}</div>}
      </div>
    </div>
  );
}
