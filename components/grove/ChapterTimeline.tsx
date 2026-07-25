'use client';
import { PHASE } from '@/lib/data';
import type { TimePhase } from '@/lib/types';
import type { GroveData } from '@/lib/api';

export function ChapterTimeline({ phase, closedChapters, ci, setCi, chapter, onSelectRing }: {
  phase: TimePhase;
  closedChapters: GroveData['closedChapters'];
  ci: number; setCi: (n: number) => void;
  chapter: GroveData['closedChapters'][number] | undefined;
  onSelectRing: (key: string | null) => void;
}) {
  return (
    <div style={{ textAlign: 'center', marginTop: '.4rem' }}>
      <div className="label-mono" style={{ marginBottom: '.9rem' }}>
        Tap a ring to enter · hold the portrait to hear them · {PHASE[phase].label.toLowerCase()} light
      </div>
      {closedChapters.length > 1 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.9rem', justifyContent: 'center' }}>
            <span style={{ fontSize: '.72rem', color: 'var(--ink-3)' }}>Now</span>
            <input type="range" min="0" max={closedChapters.length - 1} value={ci}
              onChange={e => { setCi(+e.target.value); onSelectRing(null); }}
              style={{ width: 'min(240px, 60vw)', accentColor: 'var(--ember)' }} />
            <span style={{ fontSize: '.72rem', color: 'var(--ink-3)' }}>Earlier</span>
          </div>
          {chapter && (
            <div style={{ marginTop: '.5rem', fontSize: '.85rem', color: 'var(--ink-2)' }}>
              Chapter in <strong style={{ color: 'var(--ink)' }}>{chapter.space?.name ?? 'Unknown'}</strong>
              {chapter.closedAt && <> · closed {new Date(chapter.closedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
