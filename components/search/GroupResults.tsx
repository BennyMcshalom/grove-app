'use client';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useToastStore } from '@/store/useToastStore';
import { useRequestToJoinGroup } from '@/hooks/useGroups';
import { groupIcon } from '@/lib/data';
import type { SearchResults } from '@/lib/api';

export function GroupResults({ groups, showLabel }: { groups: SearchResults['groups']; showLabel: boolean }) {
  const { toast } = useToastStore();
  const requestToJoin = useRequestToJoinGroup();
  const [requested, setRequested] = useState<string[]>([]);

  return (
    <section>
      {showLabel && <div className="label-mono" style={{ marginBottom: '.8rem' }}>Groups</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
        {groups.map(g => (
          <div key={g.id} className="card" style={{ padding: '.9rem 1.1rem', display: 'flex', alignItems: 'center', gap: '.8rem', boxShadow: 'var(--shadow-soft)' }}>
            <span style={{ width: 44, height: 44, borderRadius: '50%', background: g.coverColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={groupIcon(g.emoji)} size={20} stroke="#fff" sw={1.4} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{g.name}</div>
              <div style={{ fontSize: '.78rem', color: 'var(--ink-3)' }}>{g.lifePhase} · {g.memberCount} members</div>
            </div>
            <button
              disabled={requested.includes(g.id) || requestToJoin.isPending}
              onClick={async () => {
                try { await requestToJoin.mutateAsync(g.id); setRequested(j => [...j, g.id]); toast(`Requested to join ${g.name}.`); }
                catch { toast('Could not send request.'); }
              }}
              className="btn btn-ghost" style={{ padding: '.4rem .9rem', fontSize: '.8rem' }}>
              {requested.includes(g.id) ? 'Requested' : 'Request'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
