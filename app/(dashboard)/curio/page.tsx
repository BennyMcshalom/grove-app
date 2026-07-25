'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CURIO_LIBRARY, DEFAULT_TITLE, coverBg } from '@/components/curio/library';
import { CurioNav } from '@/components/curio/CurioNav';
import { NextReadCard } from '@/components/curio/NextReadCard';

function CurioReaderInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const title  = searchParams.get('title') ?? DEFAULT_TITLE;
  const from   = searchParams.get('from') ?? 'morning';
  const c = CURIO_LIBRARY[title] ?? CURIO_LIBRARY[DEFAULT_TITLE];
  const [saved, setSaved] = useState(false);

  const others = Object.keys(CURIO_LIBRARY).filter(t => t !== title).slice(0, 2);
  const midIdx = Math.floor(c.body.length / 2) - 1;

  return (
    <div className="scroll" style={{ height: '100vh', width: '100vw', overflowY: 'auto', background: 'var(--cream)' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '1.6rem 1.6rem 4rem' }}>

        <CurioNav from={from} title={title} saved={saved} setSaved={setSaved} />

        {/* Label */}
        <div className="label-mono" style={{ color: 'var(--sage)', marginBottom: '.7rem' }}>
          {c.kind === 'Wander' ? 'Wander · a saved place' : `Today's Curio · ${c.read}`}
        </div>

        {/* Title */}
        <h1 className="serif" style={{ fontSize: 'clamp(1.9rem, 8vw, 2.8rem)', fontWeight: 600, lineHeight: 1.12, marginBottom: '1.6rem' }}>
          {title}
        </h1>

        {/* Cover */}
        <div style={{ height: 220, borderRadius: 'var(--r-lg)', background: coverBg(c.seed), marginBottom: '2rem' }}/>

        {/* Body */}
        <article style={{ fontSize: '1.12rem', lineHeight: 1.85, color: 'var(--ink-2)' }}>
          {c.body.map((p, i) => (
            <div key={i}>
              <p style={{ marginBottom: '1.3rem' }}>{p}</p>
              {i === midIdx && (
                <blockquote className="serif" style={{ fontSize: '1.7rem', fontStyle: 'italic', color: 'var(--ink)',
                  lineHeight: 1.35, margin: '2rem 0', paddingLeft: '1.3rem', borderLeft: '4px solid var(--ember)' }}>
                  {c.quote}
                </blockquote>
              )}
            </div>
          ))}
        </article>

        {/* Reflect */}
        <div className="card" style={{ padding: '1.4rem 1.5rem', margin: '2.4rem 0',
          background: 'linear-gradient(160deg, var(--white), var(--surf-low))' }}>
          <div className="label-mono" style={{ marginBottom: '.6rem' }}>Sit with it</div>
          <p style={{ color: 'var(--ink-2)', marginBottom: '1rem' }}>What did this stir up for you?</p>
          <button onClick={() => router.push('/morning')} className="btn btn-soft">
            Answer in your Morning Room →
          </button>
        </div>

        {/* Read next */}
        <div className="label-mono" style={{ marginBottom: '.9rem' }}>Read next</div>
        <div className="grid-2-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.9rem' }}>
          {others.map(t => (
            <NextReadCard key={t} title={t} entry={CURIO_LIBRARY[t]} from={from} />
          ))}
        </div>

      </div>
    </div>
  );
}

export default function CurioPage() {
  return <Suspense><CurioReaderInner/></Suspense>;
}
