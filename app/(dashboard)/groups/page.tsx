'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { RPSection } from '@/components/layout/RightPanel';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToastStore } from '@/store/useToastStore';
import { useGroups, useJoinGroup } from '@/hooks/useGroups';
import { groupIcon } from '@/lib/data';
import type { GroupRecord } from '@/lib/api';

function GroupDetail({ group, onClose }: { group: GroupRecord; onClose: () => void }) {
  const { toast } = useToastStore();
  const join = useJoinGroup();

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 7000, background: 'rgba(26,26,26,.4)', display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div className="scroll" style={{ width: 520, maxWidth: '92vw', height: '100%', background: 'var(--white)', overflowY: 'auto', animation: 'slideIn .3s ease both' }} onClick={e => e.stopPropagation()}>
        <div style={{ height: 6, background: group.coverColor }}/>
        <div style={{ padding: '1.6rem 1.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ width: 56, height: 56, borderRadius: '50%', background: group.coverColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={groupIcon(group.emoji)} size={26} stroke="#fff" sw={1.4}/></span>
            <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="close" stroke="var(--ink-3)"/>
            </button>
          </div>
          <h2 className="serif" style={{ fontSize: '1.7rem', fontWeight: 600, marginTop: '.8rem' }}>{group.name}</h2>
          <span className="chip" style={{ background: 'var(--surf-high)', margin: '.4rem 0 .8rem', display: 'inline-flex' }}>{group.lifePhase}</span>
          <p style={{ color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: '1.4rem' }}>{group.description}</p>

          <div className="card" style={{ padding: '1.3rem', background: 'var(--surf-low)', boxShadow: 'none', textAlign: 'center', marginBottom: '1.4rem' }}>
            <p style={{ fontWeight: 600, marginBottom: '.3rem' }}>Request to join this chapter</p>
            <p style={{ fontSize: '.85rem', color: 'var(--ink-3)', marginBottom: '1rem' }}>
              {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
            </p>
            <button
              className="btn btn-block"
              style={{ background: group.coverColor, color: '#3a2a18' }}
              disabled={join.isPending}
              onClick={async () => {
                try {
                  await join.mutateAsync(group.id);
                  toast(`You joined ${group.name}.`);
                  onClose();
                } catch {
                  toast('Could not join. Try again.');
                }
              }}>
              {join.isPending ? 'Joining…' : 'Join group'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GroupsPage() {
  const { toast } = useToastStore();
  const { data: groups, isLoading } = useGroups();
  const [open, setOpen] = useState<GroupRecord | null>(null);
  const [q, setQ] = useState('');

  const list = (groups ?? []).filter(g =>
    g.name.toLowerCase().includes(q.toLowerCase()) ||
    g.lifePhase.toLowerCase().includes(q.toLowerCase())
  );

  const right = (
    <RPSection label="Suggested for your chapter">
      {(groups ?? []).slice(0, 3).map(g => (
        <button key={g.id} onClick={() => setOpen(g)} className="card"
          style={{ display: 'flex', width: '100%', textAlign: 'left', padding: '.8rem', marginBottom: '.55rem', boxShadow: 'var(--shadow-soft)', alignItems: 'center', gap: '.6rem' }}>
          <span style={{ width: 32, height: 32, borderRadius: '50%', background: g.coverColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={groupIcon(g.emoji)} size={16} stroke="#fff" sw={1.5}/></span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '.84rem' }}>{g.name}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--ink-3)' }}>{g.lifePhase}</div>
          </div>
        </button>
      ))}
    </RPSection>
  );

  return (
    <AppShell title="Chapter Groups" right={right}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 1.6rem 3rem' }}>
        <p style={{ color: 'var(--ink-3)', marginTop: '-.4rem', marginBottom: '1.2rem' }}>Life-phase rooms. Join to read the conversation.</p>
        <div style={{ position: 'relative', marginBottom: '1.4rem' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}><Icon name="search" size={17} stroke="var(--ink-4)"/></span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search chapters…"
            style={{ width: '100%', padding: '.8rem 1rem .8rem 2.6rem', borderRadius: 100, border: '1.5px solid var(--border-2)', background: 'var(--white)', fontSize: '.95rem' }}/>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner/></div>
        ) : list.length === 0 ? (
          <div className="card" style={{ background: 'linear-gradient(160deg, var(--slate-dim), var(--green-dim))', maxWidth: 480, margin: '0 auto' }}>
            <EmptyState variant="groups"
              title={q ? `No groups match "${q}".` : 'No chapter groups yet.'}
              body={q ? 'Try a different search, or start a new chapter.' : 'Chapter groups form around shared life phases. Start the first one.'}/>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.8rem' }}>
            {list.map(g => (
              <button key={g.id} onClick={() => setOpen(g)} className="card" style={{ display: 'block', textAlign: 'left', overflow: 'hidden', padding: 0 }}>
                <div style={{ height: 4, background: g.coverColor }}/>
                <div style={{ padding: '1.1rem 1.3rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', marginBottom: '.6rem' }}>
                    <span style={{ width: 42, height: 42, borderRadius: '50%', background: g.coverColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={groupIcon(g.emoji)} size={20} stroke="#fff" sw={1.4}/></span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{g.name}</div>
                      <span className="chip" style={{ background: 'var(--surf-high)', marginTop: 2 }}>{g.lifePhase}</span>
                    </div>
                    <span style={{ fontSize: '.78rem', color: 'var(--ink-4)' }}>{g.memberCount} members</span>
                  </div>
                  <p style={{ fontSize: '.88rem', color: 'var(--ink-2)', marginBottom: '.4rem' }}>{g.description}</p>
                  <span style={{ fontSize: '.82rem', color: 'var(--ember)', fontWeight: 500 }}>Join →</span>
                </div>
              </button>
            ))}
            <div onClick={() => toast('Starting a new chapter group…')}
              style={{ borderRadius: 'var(--r-lg)', border: '1.5px dashed var(--border-2)', padding: '1.2rem', textAlign: 'center', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem', cursor: 'pointer' }}>
              <Icon name="plus" size={18} stroke="var(--ember)"/> Start a chapter
            </div>
          </div>
        )}
      </div>
      {open && <GroupDetail group={open} onClose={() => setOpen(null)}/>}
    </AppShell>
  );
}
