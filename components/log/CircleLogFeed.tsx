'use client';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { SpaceIcon } from '@/components/ui/SpaceIcon';
import type { OtherLog } from './types';

// ── CircleLogFeed — scroll others' logs ──
export function CircleLogFeed({ logs, onOpen }: { logs: OtherLog[]; onOpen: (log: OtherLog) => void }) {
  return (
    <section>
      <div style={{ marginBottom: '1rem' }}>
        <div className="serif" style={{ fontSize: '1.5rem', fontWeight: 600 }}>Logs from your circle</div>
        <div style={{ fontSize: '.78rem', color: 'var(--ink-3)' }}>Different lives, different phases. Scroll through.</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        {logs.map((log, li) => (
          <article key={li} className="card" style={{ overflow: 'hidden' }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: '.7rem', padding: '.9rem 1.1rem' }}>
              <Avatar name={log.name} size={42} avatarUrl={log.avatarUrl} aura={log.aura ?? undefined} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '.92rem' }}>{log.name}</div>
                <div style={{ fontSize: '.74rem', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                  <SpaceIcon spaceId={log.space} size={11} /> {log.phase} · {log.when}
                </div>
              </div>
              <span className="chip" style={{ background: 'var(--surf-high)', fontSize: '.66rem' }}>Style {log.style}</span>
            </header>
            <div className="scroll" style={{ display: 'flex', gap: '.6rem', overflowX: 'auto', padding: '0 1.1rem .5rem' }}>
              {log.entries.slice(0, 6).map((e, i) => (
                <button key={i} onClick={() => onOpen(log)} style={{ flexShrink: 0, width: 150, borderRadius: 16, overflow: 'hidden', position: 'relative', textAlign: 'left', boxShadow: 'var(--shadow-soft)' }}>
                  <div style={{ height: 180, position: 'relative' }}>
                    {e.media
                      ? <img src={e.media} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', background: 'var(--surf-high)' }} />}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 45%, rgba(20,14,8,.82))' }} />
                    <div style={{ position: 'absolute', left: 8, right: 8, bottom: 8 }}>
                      <div className="mono" style={{ color: 'rgba(255,255,255,.8)', fontSize: '.6rem', marginBottom: 2 }}>DAY {e.day} · {e.date}</div>
                      <div style={{ color: '#fff', fontSize: '.78rem', fontWeight: 500, lineHeight: 1.3 }}>
                        {(e.text ?? '').length > 44 ? e.text!.slice(0, 44) + '…' : e.text}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => onOpen(log)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem',
              width: '100%', padding: '.8rem', borderTop: '1px solid var(--border)', fontSize: '.85rem', fontWeight: 500, color: 'var(--ember)'
            }}>
              Open {log.name.split(' ')[0]}&apos;s full log <Icon name="arrow" size={15} stroke="var(--ember)" />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
