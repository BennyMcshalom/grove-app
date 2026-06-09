// Shown by Next.js App Router while a dashboard page chunk is loading
export default function DashboardLoading() {
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--bg)' }}>
      {/* Sidebar skeleton */}
      <aside style={{ width: 262, flexShrink: 0, background: 'var(--white)',
        borderRight: '1px solid var(--border)', padding: '1.4rem 1rem 1rem' }}>
        <div style={{ height: 33, width: 100, borderRadius: 8, background: 'var(--surf-high)', marginBottom: '1.2rem' }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', padding: '.7rem .55rem', marginBottom: '.6rem' }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--surf-high)', flexShrink: 0 }}/>
          <div style={{ flex: 1 }}>
            <div style={{ height: 13, width: 80, borderRadius: 4, background: 'var(--surf-high)', marginBottom: 6 }}/>
            <div style={{ height: 10, width: 110, borderRadius: 4, background: 'var(--surf-high)' }}/>
          </div>
        </div>
        {[...Array(7)].map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.62rem .7rem', marginBottom: 2 }}>
            <div style={{ width: 19, height: 19, borderRadius: 4, background: 'var(--surf-high)', flexShrink: 0 }}/>
            <div style={{ height: 12, width: 80 + (i % 3) * 20, borderRadius: 4, background: 'var(--surf-high)' }}/>
          </div>
        ))}
      </aside>
      {/* Main content skeleton */}
      <main style={{ flex: 1, minWidth: 0, padding: '1.15rem 1.6rem' }}>
        <div style={{ height: 36, width: 140, borderRadius: 6, background: 'var(--surf-high)', marginBottom: '2rem' }}/>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card" style={{ padding: '1.3rem 1.4rem', marginBottom: '.9rem', maxWidth: 620 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.8rem', marginBottom: '.9rem' }}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--surf-high)', flexShrink: 0 }}/>
              <div style={{ flex: 1 }}>
                <div style={{ height: 13, width: 120, borderRadius: 4, background: 'var(--surf-high)', marginBottom: 6 }}/>
                <div style={{ height: 10, width: 80, borderRadius: 4, background: 'var(--surf-high)' }}/>
              </div>
            </div>
            <div style={{ height: 12, width: '90%', borderRadius: 4, background: 'var(--surf-high)', marginBottom: 8 }}/>
            <div style={{ height: 12, width: '70%', borderRadius: 4, background: 'var(--surf-high)' }}/>
          </div>
        ))}
      </main>
    </div>
  );
}
