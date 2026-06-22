interface MiniChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}

// Lightweight hand-rolled SVG bar chart — no charting dependency, matching the
// rest of this codebase's pattern of hand-drawn SVG visuals (VoicePlayer's
// waveform, the bar grid on the Stats page) rather than pulling in a library
// for something this small.
export function MiniChart({ data, color = 'var(--ember)', height = 72 }: MiniChartProps) {
  if (!data.length) return null;
  const max = Math.max(1, ...data.map(d => d.value));
  const barW = 100 / data.length;

  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none"
        width="100%" height={height} style={{ display: 'block', overflow: 'visible' }}>
        {data.map((d, i) => {
          const h = Math.max(1.5, (d.value / max) * (height - 6));
          const isLast = i === data.length - 1;
          return (
            <rect key={i}
              x={i * barW + barW * 0.18}
              y={height - h}
              width={Math.max(0.6, barW * 0.64)}
              height={h}
              rx={Math.min(2, barW * 0.25)}
              fill={color}
              opacity={isLast ? 1 : 0.4 + (d.value / max) * 0.35}
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
