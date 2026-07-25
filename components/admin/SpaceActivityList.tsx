'use client';
import { Spinner } from '@/components/ui/Spinner';
import type { useAdminSpaceStats } from '@/hooks/useAdmin';

export function SpaceActivityList({ spaces, loading }: {
  spaces: ReturnType<typeof useAdminSpaceStats>['data'];
  loading: boolean;
}) {
  const maxSpacePosts = Math.max(1, ...(spaces ?? []).map(s => s.postCount));

  return (
    <div className="card" style={{ padding: '1.2rem 1.3rem' }}>
      <div className="label-mono" style={{ marginBottom: '1rem' }}>Most active spaces</div>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}><Spinner size={18} /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
          {(spaces ?? []).map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '.8rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.colorHex, flexShrink: 0 }} />
              <div style={{
                width: 100, fontSize: '.82rem', fontWeight: 500, flexShrink: 0,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>{s.name}</div>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surf-high)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${(s.postCount / maxSpacePosts) * 100}%`,
                  background: s.colorHex, borderRadius: 3, transition: 'width .5s ease'
                }} />
              </div>
              <div style={{
                width: 70, textAlign: 'right', fontSize: '.74rem', color: 'var(--ink-3)', flexShrink: 0,
                fontFamily: 'var(--font-dm-mono, DM Mono)'
              }}>
                {s.postCount} posts
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
