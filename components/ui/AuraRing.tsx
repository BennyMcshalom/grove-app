import type { AuraKey } from '@/lib/types';
import { AURAS } from '@/lib/data';

interface AuraRingProps { aura: AuraKey; size: number; }

export function AuraRing({ aura, size }: AuraRingProps) {
  const a = AURAS[aura] || AURAS.reflective;
  const c = a.color;
  const out = size + Math.max(10, size * 0.22);
  const common: React.CSSProperties = {
    position: 'absolute', left: '50%', top: '50%', borderRadius: '50%', pointerEvents: 'none',
  };

  if (aura === 'focus') return (
    <div style={{ ...common, width: out + 6, height: out + 6, transform: 'translate(-50%,-50%)',
      background: `radial-gradient(circle, ${c}55, transparent 70%)`,
      filter: 'blur(5px)', animation: 'mistDrift 5s ease-in-out infinite' }}/>
  );

  if (aura === 'transition') return (
    <div style={{ ...common, width: out, height: out, transform: 'translate(-50%,-50%)',
      border: `2px dashed ${c}`, opacity: .85, animation: 'auraSpin 14s linear infinite' }}/>
  );

  if (aura === 'active') return (
    <>
      {[0,1,2,3,4].map(i => (
        <span key={i} style={{ ...common, width: 5, height: 5, marginLeft: -2.5, marginTop: -2.5,
          background: c, boxShadow: `0 0 6px 2px ${c}`,
          ['--r' as string]: `${out / 2}px`,
          animation: `firefly ${3 + i * 0.6}s linear ${i * 0.5}s infinite` }}/>
      ))}
    </>
  );

  if (aura === 'open') return (
    <>
      <div style={{ ...common, width: out + 8, height: out + 8, transform: 'translate(-50%,-50%)',
        background: `radial-gradient(circle, ${c}40, transparent 68%)`,
        animation: 'auraBreath 3s ease-in-out infinite' }}/>
      <div style={{ ...common, width: size + 5, height: size + 5, transform: 'translate(-50%,-50%)',
        boxShadow: `0 0 16px 2px ${c}88`, animation: 'auraGlow 2.6s ease-in-out infinite' }}/>
    </>
  );

  return (
    <div style={{ ...common, width: out, height: out, transform: 'translate(-50%,-50%)',
      background: `radial-gradient(circle, ${c}33, transparent 70%)`,
      animation: 'auraBreath 5s ease-in-out infinite' }}/>
  );
}
