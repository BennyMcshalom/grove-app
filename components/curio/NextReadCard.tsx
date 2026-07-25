'use client';
import { useRouter } from 'next/navigation';
import { coverBg, type CurioEntry } from './library';

export function NextReadCard({ title, entry, from }: { title: string; entry: CurioEntry; from: string }) {
  const router = useRouter();

  return (
    <button onClick={() => router.push(`/curio?title=${encodeURIComponent(title)}&from=${from}`)}
      className="card" style={{ textAlign: 'left', overflow: 'hidden' }}>
      <div style={{ height: 80, background: coverBg(entry.seed) }}/>
      <div style={{ padding: '.9rem 1rem' }}>
        <div className="label-mono" style={{ marginBottom: '.3rem' }}>{entry.kind} · {entry.read}</div>
        <div className="serif" style={{ fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.25 }}>{title}</div>
      </div>
    </button>
  );
}
