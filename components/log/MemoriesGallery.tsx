'use client';
import { useState } from 'react';
import type { Space, LogStyle } from '@/lib/types';
import type { LogEntry } from './types';
import { MemoryLightbox } from './MemoryLightbox';
import { StyleA, StyleB, StyleC } from './LogStyles';

const LOG_STYLES: [LogStyle, string][] = [['A', 'Player'], ['B', 'Minimal'], ['C', 'Card']];

// ── Memories gallery switcher (Style A/B/C) ──
export function MemoriesGallery({ entries, space, style, onStyleChange }: {
  entries: LogEntry[]; space: Space; style: LogStyle; onStyleChange: (s: LogStyle) => void;
}) {
  const filled = entries.filter(e => !e.missed);
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '.6rem' }}>
        <div>
          <div className="serif" style={{ fontSize: '1.5rem', fontWeight: 600 }}>Log Memories</div>
          <div style={{ fontSize: '.78rem', color: 'var(--ink-3)' }}>{filled.length} moments · pick how you view them</div>
        </div>
        <div style={{ display: 'flex', gap: 3, background: 'var(--surf-high)', borderRadius: 100, padding: 3 }}>
          {LOG_STYLES.map(([id, l]) => (
            <button key={id} onClick={() => onStyleChange(id)}
              style={{
                padding: '.4rem .85rem', borderRadius: 100, fontSize: '.8rem', fontWeight: 600,
                background: style === id ? 'var(--white)' : 'transparent', color: style === id ? 'var(--ember)' : 'var(--ink-3)',
                boxShadow: style === id ? 'var(--shadow-soft)' : 'none'
              }}>
              {id} · {l}
            </button>
          ))}
        </div>
      </div>
      {filled.length === 0 ? (
        <div className="card" style={{ padding: '2.2rem 1.5rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-3)', fontSize: '.9rem' }}>No moments yet. Write today&apos;s entry above to start your Log.</p>
        </div>
      ) : (
        <div className="swap-in" key={space.id + style}>
          {style === 'A' && <StyleA entries={filled} onOpen={setOpen} />}
          {style === 'B' && <StyleB entries={filled} onOpen={setOpen} />}
          {style === 'C' && <StyleC entries={filled} space={space} onOpen={setOpen} />}
        </div>
      )}
      {open != null && <MemoryLightbox entries={filled} startIndex={open} space={space} onClose={() => setOpen(null)} />}
    </section>
  );
}
