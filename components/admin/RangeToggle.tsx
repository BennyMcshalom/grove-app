export function RangeToggle({ days, setDays }: { days: number; setDays: (n: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: '.3rem' }}>
      {[7, 30, 90].map(d => (
        <button key={d} onClick={() => setDays(d)} className="chip"
          style={{
            cursor: 'pointer', background: days === d ? 'var(--ember)' : 'var(--surf-high)',
            color: days === d ? '#fff' : 'var(--ink-2)', fontWeight: 500
          }}>
          {d}d
        </button>
      ))}
    </div>
  );
}
