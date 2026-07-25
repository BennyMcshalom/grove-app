import { Logo } from '@/components/ui/Logo';

// ── Left brand panel (desktop only) ──
export function BrandPanel() {
  return (
    <div className="auth-brand-panel" style={{
      flex: '0 0 45%', maxWidth: 520,
      background: 'linear-gradient(145deg, var(--forest) 0%, var(--forest-2) 55%, var(--forest-3) 100%)',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      padding: '2.4rem 2.8rem', position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative circles */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {[180, 280, 380, 480].map((r, i) => (
          <div key={i} style={{
            position: 'absolute', right: -r / 2, top: '50%',
            width: r, height: r, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.06)',
            transform: 'translateY(-50%)',
          }}/>
        ))}
        <div style={{
          position: 'absolute', bottom: -80, left: -80,
          width: 320, height: 320, borderRadius: '50%',
          background: 'rgba(78,125,94,0.18)',
        }}/>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Logo size={24} light/>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <h1 className="serif" style={{
          fontSize: 'clamp(2rem, 3vw, 2.8rem)', fontWeight: 600,
          color: '#fff', lineHeight: 1.2, marginBottom: '1rem',
        }}>
          Your chapter.<br/>Your circle.
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '.95rem', lineHeight: 1.7, marginBottom: '2rem' }}>
          A small, intentional app for people<br/>navigating real life chapters.
        </p>
        {[
          'Up to 5 Bonds, earned not added',
          'Private reflections that stay yours',
          'People in the same chapter as you',
        ].map(t => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '.7rem',
            marginBottom: '.55rem', color: 'rgba(255,255,255,0.75)', fontSize: '.88rem' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sage)', flexShrink: 0 }}/>
            {t}
          </div>
        ))}
      </div>

      <p style={{ position: 'relative', zIndex: 1, fontSize: '.72rem', color: 'rgba(255,255,255,0.3)' }}>
        © {new Date().getFullYear()} Grouv
      </p>
    </div>
  );
}
