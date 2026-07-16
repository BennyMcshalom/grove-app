'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useToastStore } from '@/store/useToastStore';

// ── Local content library ─────────────────────────────────────────
type CurioEntry = {
  kind: 'Curio' | 'Wander';
  read: string;
  seed: string;
  body: string[];
  quote: string;
};

const CURIO_LIBRARY: Record<string, CurioEntry> = {
  'On the unglamorous middle': {
    kind: 'Curio', read: '2 min read', seed: 'curioMid',
    body: [
      'Most of any meaningful chapter is the middle, the long, unphotographed stretch between the decision and the result.',
      "It rarely feels like progress while you're in it. The beginning had adrenaline. The end will have a story. The middle has neither, just the same desk, the same doubt, the same small unglamorous act repeated past the point where it feels meaningful.",
      "But the middle is not a delay before the real thing. It is the real thing. The people who finish are simply the ones who stayed in the middle a little longer than felt reasonable.",
      "So if you are in the middle of something right now and it feels like nothing is happening: that flatness is not failure. It is the texture of the work. Stay.",
    ],
    quote: 'The middle is not a delay before the real thing. It is the real thing.',
  },
  'A letter to the one who quit': {
    kind: 'Curio', read: '3 min read', seed: 'curioQuit',
    body: [
      "You left the thing everyone envied. For a week, the relief was enormous. Then the relief ran out, and underneath it was a question you hadn't expected: who am I, without the thing that broke me?",
      "Here is what no one tells you about leaving well: the bravery isn't in the exit. It's in the empty months afterward, when no title answers the question \"so what do you do?\"",
      "You don't owe anyone a fast second act. The pause is not wasted time. It is the soil.",
    ],
    quote: "The bravery isn't in the exit. It's in the empty months afterward.",
  },
  'A cabin on the cold coast': {
    kind: 'Wander', read: 'Saved place', seed: 'wanderCabin',
    body: [
      'Somewhere on a coast where the season has already turned, there is a small cabin with a wood stove and a window that faces only weather.',
      "You saved this not because you will go tomorrow, but because something in you needed to know the option exists, that there is a version of your life with more silence in it.",
      "Keep it on the shelf. Some doors are worth leaving open just to feel the draft.",
    ],
    quote: "Some doors are worth leaving open just to feel the draft.",
  },
  'How to finish things': {
    kind: 'Curio', read: '2 min read', seed: 'curioFinish',
    body: [
      "Finishing is a different skill from starting, and almost no one teaches it.",
      "Starting rewards optimism. Finishing rewards a kind of stubborn, unglamorous loyalty to a past version of yourself who made a promise. The work near the end is rarely fun. It is mostly cleanup, doubt, and the temptation to start something shinier.",
      "The trick is to make the finish small enough that you can't talk yourself out of it. Not \"finish the book.\" Just \"fix this page.\" Then the next one.",
    ],
    quote: "Make the finish small enough that you can't talk yourself out of it.",
  },
};

const DEFAULT_TITLE = 'On the unglamorous middle';

function coverBg(seed: string) {
  const map: Record<string, string> = {
    curioMid:    'linear-gradient(160deg, #E8DDD2, #C4B5A5)',
    curioQuit:   'linear-gradient(160deg, #D2D8E0, #A8B8C8)',
    wanderCabin: 'linear-gradient(160deg, #D0DDD4, #A5BFB0)',
    curioFinish: 'linear-gradient(160deg, #E2D5C8, #C9B090)',
  };
  return map[seed] ?? 'linear-gradient(160deg, var(--surf-high), var(--border))';
}

function CurioReaderInner() {
  const router = useRouter();
  const { toast } = useToastStore();
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

        {/* Nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <button onClick={() => router.push(`/${from}`)}
            style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: 'var(--ink-3)', fontSize: '.9rem' }}>
            <Icon name="back" size={18} stroke="var(--ink-3)"/> Back
          </button>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button
              onClick={() => { setSaved(s => !s); toast(saved ? 'Removed from shelf.' : 'Saved to your shelf.'); }}
              className="chip"
              style={{ cursor: 'pointer', background: saved ? 'var(--ember-dim)' : 'var(--surf-high)', color: saved ? 'var(--ember-deep)' : 'var(--ink-2)' }}>
              {saved
                ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="check" size={12} stroke="var(--ember-deep)" sw={2.5}/> Saved</span>
                : 'Save'}
            </button>
            <button onClick={() => toast(`"${title}" sent to a Bond.`)} className="chip"
              style={{ cursor: 'pointer', background: 'var(--surf-high)' }}>
              Send to a Bond
            </button>
          </div>
        </div>

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
          {others.map(t => {
            const o = CURIO_LIBRARY[t];
            return (
              <button key={t} onClick={() => router.push(`/curio?title=${encodeURIComponent(t)}&from=${from}`)}
                className="card" style={{ textAlign: 'left', overflow: 'hidden' }}>
                <div style={{ height: 80, background: coverBg(o.seed) }}/>
                <div style={{ padding: '.9rem 1rem' }}>
                  <div className="label-mono" style={{ marginBottom: '.3rem' }}>{o.kind} · {o.read}</div>
                  <div className="serif" style={{ fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.25 }}>{t}</div>
                </div>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}

export default function CurioPage() {
  return <Suspense><CurioReaderInner/></Suspense>;
}
