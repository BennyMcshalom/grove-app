interface ProgressBarProps { value: number; color?: string; }

export function ProgressBar({ value, color = 'var(--ember)' }: ProgressBarProps) {
  return (
    <div style={{ height: 5, borderRadius: 100, background: 'var(--surf-high)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 100, transition: 'width .5s ease' }}/>
    </div>
  );
}
