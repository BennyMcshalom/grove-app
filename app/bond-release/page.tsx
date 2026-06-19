'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { bondsApi } from '@/lib/api';
import { Suspense } from 'react';

function BondReleaseInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const name = searchParams.get('bond') || '';
  const bondId = searchParams.get('bondId') || '';
  const [step, setStep] = useState(0);
  const [releasing, setReleasing] = useState(false);
  const [begin, setBegin] = useState(false);
  const [ans, setAns] = useState(['', '', '']);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (step === 0) { const t = setTimeout(() => setBegin(true), 2500); return () => clearTimeout(t); }
  }, [step]);
  useEffect(() => {
    if (step === 4) { setHeld(false); const t = setTimeout(() => setHeld(true), 5000); return () => clearTimeout(t); }
  }, [step]);

  const QS = [
    { q: 'What did this Bond give you?', min: 40 },
    { q: 'What did you bring to it?', min: 30 },
    { q: 'What are you carrying forward?', min: 20 },
  ];

  return (
    <div className="scroll" style={{ minHeight: '100dvh', width: '100%', background: '#F6F3F2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(1.2rem, 5vw, 2rem)', overflowY: 'auto' }}>
      <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }} className="screen-enter" key={step}>
        {step === 0 && (
          <>
            <h1 className="serif" style={{ fontSize: 'clamp(1.7rem, 7.5vw, 2.4rem)', fontWeight: 600, marginBottom: '.8rem' }}>Before you release this Bond.</h1>
            <p style={{ color: 'var(--ink-2)', fontSize: '1.05rem', marginBottom: '2rem' }}>Take your time. These answers are private.</p>
            {begin && <button className="btn btn-primary btn-lg btn-pill fade-in" onClick={() => setStep(1)}>Begin</button>}
          </>
        )}
        {step >= 1 && step <= 3 && (() => {
          const i = step - 1; const cur = QS[i];
          return (
            <>
              <div className="label-mono" style={{ marginBottom: '1rem' }}>{name.split(' ')[0]}'s Bond</div>
              <h1 className="serif" style={{ fontSize: 'clamp(1.5rem, 6.5vw, 2.1rem)', fontWeight: 600, marginBottom: '1.4rem', lineHeight: 1.2 }}>{cur.q}</h1>
              <textarea autoFocus value={ans[i]} onChange={e => { const a = [...ans]; a[i] = e.target.value; setAns(a); }}
                placeholder="Write what's true. Don't edit yourself."
                style={{ width: '100%', minHeight: 130, padding: '1.1rem', fontSize: '1.05rem', lineHeight: 1.6, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', resize: 'vertical', marginBottom: '1.4rem' }}/>
              <button className="btn btn-primary btn-lg btn-pill" disabled={ans[i].trim().length < cur.min}
                onClick={() => setStep(step + 1)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}>
                {step === 3 ? 'One last thing' : 'Continue'} <Icon name="arrow" stroke="#fff"/>
              </button>
            </>
          );
        })()}
        {step === 4 && (
          <>
            <Avatar name={name} size={88} style={{ margin: '0 auto 1.4rem' }}/>
            <h1 className="serif" style={{ fontSize: 'clamp(1.5rem, 6vw, 2rem)', fontWeight: 600 }}>{name.split(' ')[0]}'s Bond</h1>
            <p style={{ color: 'var(--ink-3)', margin: '.5rem 0' }}>Oct 2025 – Today · 7 months</p>
            <div style={{ height: 60, marginTop: '2rem' }}>
              {held ? (
                <button className="btn btn-ghost btn-lg btn-pill fade-in" disabled={releasing}
                  onClick={async () => {
                    setReleasing(true);
                    try {
                      if (bondId) {
                        await bondsApi.release(bondId, {
                          whatItGave:       ans[0],
                          carryingForward:  ans[1],
                          messageUnsent:    ans[2] || '.',
                        });
                      }
                    } catch {}
                    router.push('/bonds');
                  }}>
                  {releasing ? 'Releasing…' : 'Archive and release'}
                </button>
              ) : (
                <div style={{ color: 'var(--ink-4)', fontSize: '.85rem' }} className="fade-in">Take a breath.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function BondReleasePage() {
  return <Suspense><BondReleaseInner/></Suspense>;
}
