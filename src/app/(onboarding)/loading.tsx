export default function OnboardingLoading() {
  return (
    <div style={{ height: '100vh', width: '100vw', background: 'var(--cream)',
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--ember)',
          animation: 'pulseDot 1.5s ease infinite', margin: '0 auto' }}/>
      </div>
    </div>
  );
}
