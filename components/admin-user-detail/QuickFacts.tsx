export function QuickFacts({ bondCount, spaceCount, subscriptionStatus }: {
  bondCount: number; spaceCount: number; subscriptionStatus?: string | null;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.7rem', marginBottom: '1.4rem' }}>
      <div className="card" style={{ padding: '.9rem 1rem', textAlign: 'center' }}>
        <div className="serif" style={{ fontSize: '1.4rem', fontWeight: 600 }}>{bondCount}</div>
        <div className="label-mono" style={{ marginTop: '.2rem' }}>Connections</div>
      </div>
      <div className="card" style={{ padding: '.9rem 1rem', textAlign: 'center' }}>
        <div className="serif" style={{ fontSize: '1.4rem', fontWeight: 600 }}>{spaceCount}</div>
        <div className="label-mono" style={{ marginTop: '.2rem' }}>Spaces</div>
      </div>
      <div className="card" style={{ padding: '.9rem 1rem', textAlign: 'center' }}>
        <div className="serif" style={{ fontSize: '1.05rem', fontWeight: 600, textTransform: 'capitalize' }}>
          {subscriptionStatus ?? 'None'}
        </div>
        <div className="label-mono" style={{ marginTop: '.2rem' }}>Subscription</div>
      </div>
    </div>
  );
}
