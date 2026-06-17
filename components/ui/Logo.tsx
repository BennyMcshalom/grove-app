import Image from 'next/image';

interface LogoProps { size?: number; sub?: string; light?: boolean; }

const LOGO_ASPECT = 1920 / 1080;

export function Logo({ size = 22, sub, light }: LogoProps) {
  const height = size * 1.8;
  const width = Math.round(height * LOGO_ASPECT);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem' }}>
      <Image
        src="/media/logo.png"
        alt="Gröuv"
        width={width}
        height={Math.round(height)}
        priority
        style={{ height: 'auto', width: '80px' }}
      />
      {sub && <div className="label-mono" style={{
        fontSize: '.54rem',
        color: light ? 'rgba(255,255,255,.5)' : 'var(--ink-4)'
      }}>{sub}</div>}
    </div>
  );
}
