'use client';
import { useRouter } from 'next/navigation';

const LINKS: [string, string][] = [
  ['View full archive →', 'archive'],
  ['Chapter stats →', 'stats'],
  ['Manage plan →', 'subscribe'],
  ["Grouv's Promise →", 'legal'],
];

export function QuickLinksCard() {
  const router = useRouter();

  return (
    <div className="card" style={{ padding: '.4rem .6rem', marginBottom: '1.2rem' }}>
      {LINKS.map(([l, scr]) => (
        <button key={l} onClick={() => router.push(`/${scr}`)}
          style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', padding: '.9rem 1rem', borderRadius: 'var(--r-md)', fontSize: '.92rem' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf-low)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          {l}
        </button>
      ))}
    </div>
  );
}
