'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { OBShell } from '@/components/features/OBShell';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';

export default function ObWelcome() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 1300);
    return () => clearTimeout(t);
  }, []);

  return (
    <OBShell step={1}>
      <div style={{ textAlign: 'center', margin: 'auto 0', maxWidth: 500, marginInline: 'auto' }}>
        {/* Simple 2-avatar scene */}
        <div className="ob-scene fade-in" style={{ position: 'relative', width: 'min(280px, 100%)', height: 160, margin: '0 auto 1.6rem' }}>
          <div style={{ position: 'absolute', width: 160, height: 160, left: 0, top: 16, borderRadius: '50%',
            filter: 'blur(18px)', background: 'radial-gradient(circle at 38% 35%, var(--c-creative), transparent 70%)', opacity: .85 }}/>
          <div style={{ position: 'absolute', width: 170, height: 170, right: 0, top: 6, borderRadius: '50%',
            filter: 'blur(18px)', background: 'radial-gradient(circle at 38% 35%, var(--c-adventure), transparent 70%)', opacity: .85 }}/>
          <div style={{ position: 'absolute', left: '50%', top: '30%', transform: 'translate(-50%,-50%)',
            fontSize: '1.5rem', zIndex: 3, filter: 'drop-shadow(0 4px 8px rgba(243,112,30,.4))',
            animation: 'breathe 3s ease-in-out infinite' }}>⦿</div>
          <div style={{ position: 'absolute', left: 14, bottom: 0, zIndex: 2 }}>
            <Avatar name="Saanvi Rao" size={120} aura="open" priority
              style={{ boxShadow: '0 0 0 5px var(--cream), 0 16px 36px -10px rgba(26,26,26,.28)', borderRadius: '50%' }}/>
          </div>
          <div style={{ position: 'absolute', right: 14, top: 6, zIndex: 2 }}>
            <Avatar name="Jonah Pierce" size={100} aura="reflective" priority
              style={{ boxShadow: '0 0 0 5px var(--cream), 0 16px 36px -10px rgba(26,26,26,.28)', borderRadius: '50%' }}/>
          </div>
        </div>

        <h1 className="serif" style={{ fontSize: 'clamp(1.9rem, 8vw, 2.8rem)', fontWeight: 600, lineHeight: 1.12, marginBottom: '1.1rem' }}>
          Depth, on purpose.
        </h1>
        <p style={{ fontSize: 'clamp(.95rem, 4vw, 1.15rem)', color: 'var(--ink-2)', lineHeight: 1.6 }}>
          It's a small circle of people in the same chapter as you. No audience. No performance. Just depth.
        </p>
        <div style={{ height: 64, marginTop: '2.4rem' }}>
          {show && (
            <button className="btn btn-primary btn-lg btn-pill fade-in"
              onClick={() => router.push('/onboarding/name')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}>
              Begin my chapter <Icon name="arrow" stroke="#fff"/>
            </button>
          )}
        </div>
      </div>
    </OBShell>
  );
}
