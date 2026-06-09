export default function AuthLoading() {
  return (
    <div style={{ height: '100vh', width: '100vw', background: 'var(--cream)',
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 440, maxWidth: '92vw' }}>
        <div className="card" style={{ padding: '2.4rem 2.2rem' }}>
          <div style={{ height: 39, width: 100, borderRadius: 8, background: 'var(--surf-high)', margin: '0 auto 1.4rem' }}/>
          <div style={{ display: 'flex', gap: '1.6rem', marginBottom: '1.5rem' }}>
            {[80, 60].map((w, i) => <div key={i} style={{ height: 14, width: w, borderRadius: 4, background: 'var(--surf-high)' }}/>)}
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ marginBottom: '.95rem' }}>
              <div style={{ height: 11, width: 70, borderRadius: 3, background: 'var(--surf-high)', marginBottom: '.35rem' }}/>
              <div style={{ height: 46, borderRadius: 'var(--r-md)', background: 'var(--surf-high)' }}/>
            </div>
          ))}
          <div style={{ height: 46, borderRadius: 'var(--r-md)', background: 'var(--surf-high)', marginTop: '.5rem' }}/>
        </div>
      </div>
    </div>
  );
}
