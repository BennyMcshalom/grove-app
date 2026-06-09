import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      background: 'var(--cream)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }} className="fade-in">

        {/* Decorative leaf-ring */}
        <div style={{ position: 'relative', display: 'inline-flex', marginBottom: '2rem' }}>
          <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true">
            <circle cx="48" cy="48" r="44" stroke="var(--ember-bdr)" strokeWidth="1.5" strokeDasharray="6 5" />
            <circle cx="48" cy="48" r="30" fill="var(--ember-dim)" />
            <text x="48" y="56" textAnchor="middle" fontSize="28" fill="var(--ember)" fontFamily="inherit">
              🌿
            </text>
          </svg>
        </div>

        {/* 404 heading */}
        <div className="serif" style={{
          fontSize: '5rem',
          fontWeight: 700,
          color: 'var(--ember)',
          lineHeight: 1,
          letterSpacing: '-2px',
        }}>
          404
        </div>

        <h1 style={{
          marginTop: '.75rem',
          fontSize: '1.35rem',
          fontWeight: 600,
          color: 'var(--ink)',
        }}>
          This chapter doesn't exist
        </h1>

        <p style={{
          marginTop: '.6rem',
          fontSize: '1rem',
          color: 'var(--ink-3)',
          lineHeight: 1.6,
        }}>
          The page you're looking for may have moved, been removed,<br />
          or never started its journey here.
        </p>

        {/* Divider */}
        <div style={{
          margin: '2rem auto',
          height: 1,
          width: 48,
          background: 'var(--border-2)',
          borderRadius: 100,
        }} />

        {/* CTA */}
        <Link href="/" className="btn btn-primary btn-pill" style={{ fontSize: '1rem', padding: '.75rem 2rem' }}>
          Back to Grouw
        </Link>

      </div>
    </div>
  );
}
