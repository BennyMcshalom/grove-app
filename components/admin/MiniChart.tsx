interface MiniChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  /** Optional headline shown above the chart, e.g. "1,204 total" */
  headline?: string;
}

// Lightweight hand-rolled SVG bar chart — no charting dependency, matching the
// rest of this codebase's pattern of hand-drawn SVG visuals (VoicePlayer's
// waveform, the bar grid on the Stats page) rather than pulling in a library
// for something this small.
export function MiniChart({ data, color = 'var(--ember)', height = 96, headline }: MiniChartProps) {
  if (!data.length) return null;
  const max = Math.max(1, ...data.map(d => d.value));
  const barW = 100 / data.length;
  const gradId = `mc-grad-${color.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <div className="fade-in">
      {headline && (
        <div className="serif" style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '.6rem' }}>
          {headline}
        </div>
      )}
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none"
        width="100%" height={height} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.55"/>
            <stop offset="100%" stopColor={color} stopOpacity="1"/>
          </linearGradient>
        </defs>
        {/* Baseline */}
        <line x1="0" y1={height - 0.75} x2="100" y2={height - 0.75} stroke="var(--border)" strokeWidth="0.5"/>
        {data.map((d, i) => {
          const h = Math.max(1.5, (d.value / max) * (height - 8));
          const isLast = i === data.length - 1;
          return (
            <rect key={i}
              x={i * barW + barW * 0.18}
              y={height - h}
              width={Math.max(0.6, barW * 0.64)}
              height={h}
              rx={Math.min(2.2, barW * 0.28)}
              fill={`url(#${gradId})`}
              opacity={isLast ? 1 : 0.55 + (d.value / max) * 0.35}
            />
          );
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.5rem',
        fontSize: '.64rem', color: 'var(--ink-4)', fontFamily: 'var(--font-dm-mono, DM Mono)' }}>
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
