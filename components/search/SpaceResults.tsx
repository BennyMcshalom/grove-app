'use client';
import { useRouter } from 'next/navigation';
import { SpaceIcon } from '@/components/ui/SpaceIcon';
import { SPACES } from '@/lib/data';
import type { SearchResults } from '@/lib/api';

export function SpaceResults({ spaces, showLabel }: { spaces: SearchResults['spaces']; showLabel: boolean }) {
  const router = useRouter();

  return (
    <section>
      {showLabel && <div className="label-mono" style={{ marginBottom: '.8rem' }}>Spaces</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
        {spaces.map(s => {
          const local = SPACES.find(sp => sp.id === s.slug);
          return (
            <div key={s.id} className="card" style={{ padding: '.9rem 1.1rem', display: 'flex', alignItems: 'center', gap: '.8rem', boxShadow: 'var(--shadow-soft)' }}>
              <SpaceIcon spaceId={s.slug} size={20} pill pillSize={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{s.name}</div>
                {local && <div style={{ fontSize: '.78rem', color: 'var(--ink-3)' }}>{local.desc}</div>}
              </div>
              <button onClick={() => router.push(`/spaces/${s.slug}`)} className="btn btn-ghost" style={{ padding: '.4rem .9rem', fontSize: '.8rem' }}>
                Open
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
