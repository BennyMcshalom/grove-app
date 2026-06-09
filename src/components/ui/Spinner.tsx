interface SpinnerProps { size?: number; color?: string; }

export function Spinner({ size = 20, color = 'var(--ember)' }: SpinnerProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: 'spin .7s linear infinite', display: 'block', flexShrink: 0 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="9" stroke={color} strokeOpacity=".25" strokeWidth="2.5"/>
      <path d="M21 12a9 9 0 0 0-9-9" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}
