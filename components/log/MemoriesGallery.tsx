'use client';
import { useState } from 'react';
import type { Space } from '@/lib/types';
import type { LogEntry } from './types';
import { MemoryLightbox } from './MemoryLightbox';
import { StyleA } from './LogStyles';

// ── Memories gallery ──
export function MemoriesGallery({ entries, space }: {
  entries: LogEntry[]; space: Space;
}) {
  const filled = entries.filter(e => !e.missed);
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section>
      <div style={{ marginBottom: '1rem' }}>
        <div className="serif" style={{ fontSize: '1.5rem', fontWeight: 600 }}>Log Memories</div>
        <div style={{ fontSize: '.78rem', color: 'var(--ink-3)' }}>{filled.length} moments</div>
      </div>
      {filled.length === 0 ? (
        <div className="card" style={{ padding: '2.2rem 1.5rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-3)', fontSize: '.9rem' }}>No moments yet. Write today&apos;s entry above to start your Log.</p>
        </div>
      ) : (
        <div className="swap-in" key={space.id}>
          <StyleA entries={filled} onOpen={setOpen} />
        </div>
      )}
      {open != null && <MemoryLightbox entries={filled} startIndex={open} space={space} onClose={() => setOpen(null)} />}
    </section>
  );
}
