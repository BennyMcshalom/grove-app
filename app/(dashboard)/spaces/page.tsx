'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { RPSection } from '@/components/layout/RightPanel';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { SpaceIcon } from '@/components/ui/SpaceIcon';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToastStore } from '@/store/useToastStore';
import { useSpaceStore } from '@/store/useSpaceStore';
import { useMySpaces, useOpenSpace, useCloseSpace, useUpdateSpace } from '@/hooks/useSpaces';
import { useGroups } from '@/hooks/useGroups';
import { SPACES, STAGES, spaceById, groupIcon } from '@/lib/data';
import type { UserSpaceRecord } from '@/lib/api';

const STAGE_MARKERS = ['Just started', 'In progress', 'Thick of it', 'Wrapping up'];

function SpaceCard({ slot, onOpen, onClose }: {
  slot: UserSpaceRecord;
  onOpen: () => void;
  onClose: () => void;
}) {
  const { toast } = useToastStore();
  const updateSpace = useUpdateSpace();
  const slug = slot.space?.slug ?? '';
  const s = spaceById(slug || 'career');

  // Use persisted marker from DB, default to 'In progress'
  const currentIdx = STAGE_MARKERS.indexOf(slot.currentMarker ?? '') ?? 1;
  const markerIdx = currentIdx >= 0 ? currentIdx : 1;

  const cycleMarker = async () => {
    const next = STAGE_MARKERS[(markerIdx + 1) % STAGE_MARKERS.length];
    try {
      await updateSpace.mutateAsync({ id: slot.id, currentMarker: next });
    } catch {
      toast('Could not update marker.');
    }
  };

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ height: 5, background: s.color }}/>
      <div style={{ padding: '1.3rem 1.4rem' }}>
        <div style={{ marginBottom: '.7rem' }}>
          <SpaceIcon spaceId={slug || 'career'} size={26} pill pillSize={52}/>
        </div>
        <div className="serif" style={{ fontSize: '1.45rem', fontWeight: 600 }}>{s.name}</div>
        <div style={{ fontSize: '.88rem', fontStyle: 'italic', color: 'var(--ink-3)', marginBottom: '.9rem' }}>
          {slot.stage || 'Finding your footing'}
        </div>

        {/* Stage marker — persists to DB */}
        <button onClick={cycleMarker} disabled={updateSpace.isPending}
          className="chip" style={{ cursor: 'pointer', background: 'var(--surf-high)', marginBottom: '1rem' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ember)',
            display: 'inline-block', marginRight: '.4rem' }}/>
          {STAGE_MARKERS[markerIdx]}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '.8rem', color: 'var(--ink-4)' }}>
            {slot.memberCount ?? 0} in this space
          </span>
          <button onClick={onOpen} className="btn btn-primary" style={{ padding: '.45rem .9rem', fontSize: '.82rem' }}>
            Open feed →
          </button>
        </div>
        <button onClick={onClose} style={{ marginTop: '.8rem', fontSize: '.74rem', color: 'var(--ink-4)' }}>
          Close chapter
        </button>
      </div>
    </div>
  );
}

export default function SpacesPage() {
  const router = useRouter();
  const { toast } = useToastStore();
  const { uuidBySlug } = useSpaceStore();
  const [filter, setFilter] = useState('all');
  const [opening, setOpening] = useState<string | null>(null); // space id being named
  const [chapter, setChapter] = useState('');

  const { data: mySpaces, isLoading } = useMySpaces();
  const { data: groupsData } = useGroups();
  const openSpace = useOpenSpace();

  const activeSlots = mySpaces?.filter(s => !s.closedAt) ?? [];
  // Spaces not yet opened by this user
  const activeSlugs = activeSlots.map(s => s.space?.slug ?? '').filter(Boolean);
  const dirSpaces = SPACES.filter(s => !activeSlugs.includes(s.id));

  const openChapter = async (slug: string, label: string) => {
    const uuid = uuidBySlug(slug);
    if (!uuid) { toast('Space not available right now.'); return; }
    if (activeSlots.length >= 4) { toast('You can have at most 4 open chapters.'); return; }
    try {
      await openSpace.mutateAsync({ spaceId: uuid, stage: label.trim() || undefined, isPrimary: activeSlots.length === 0 });
      setOpening(null);
      setChapter('');
      toast(`You opened the ${spaceById(slug).name} chapter.`);
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Could not open space.');
    }
  };

  const right = (
    <RPSection label="Suggested for your chapter">
      {groupsData && groupsData.length > 0 ? groupsData.slice(0, 3).map(g => (
        <button key={g.id} onClick={() => router.push('/groups')} className="card"
          style={{ display: 'flex', width: '100%', textAlign: 'left', alignItems: 'center', gap: '.6rem',
            padding: '.75rem', marginBottom: '.55rem', boxShadow: 'var(--shadow-soft)' }}>
          <span style={{ width: 34, height: 34, borderRadius: '50%', background: g.coverColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name={groupIcon(g.emoji)} size={17} stroke="#fff" sw={1.5}/>
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '.84rem' }}>{g.name}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--ink-3)' }}>{g.lifePhase}</div>
          </div>
        </button>
      )) : (
        <p style={{ fontSize: '.82rem', color: 'var(--ink-4)', fontStyle: 'italic' }}>
          No groups yet. Browse to join one.
        </p>
      )}
    </RPSection>
  );

  return (
    <AppShell title="My Spaces" right={right}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 1.6rem 3rem' }}>
        <p style={{ color: 'var(--ink-3)', marginTop: '-.4rem', marginBottom: '1.4rem', fontSize: '1.02rem' }}>
          Your open chapters.
        </p>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner/></div>
        ) : activeSlots.length === 0 ? (
          <div className="card" style={{ background: 'linear-gradient(160deg, var(--green-dim), var(--ember-dim))', maxWidth: 480, margin: '0 auto' }}>
            <EmptyState variant="feed"
              title="No open chapters yet."
              body="Open a space from the directory below to start your chapter."
              action={{ label: 'Browse spaces', onClick: () => document.getElementById('spaces-dir')?.scrollIntoView({ behavior: 'smooth' }) }}/>
          </div>
        ) : (
          <div className="spaces-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {activeSlots.map(slot => (
              <SpaceCard key={slot.id} slot={slot}
                onOpen={() => router.push(`/spaces/${slot.space?.slug ?? ''}`)}
                onClose={() => router.push(`/chapter-close?space=${slot.space?.slug ?? ''}&userSpaceId=${slot.id}`)}/>
            ))}
            {activeSlots.length < 4 && (
              <button
                style={{ borderRadius: 'var(--r-lg)', border: '1.5px dashed var(--border-2)',
                  background: 'transparent', minHeight: 230,
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: '.6rem', color: 'var(--ink-3)' }}
                onClick={() => document.getElementById('spaces-dir')?.scrollIntoView({ behavior: 'smooth' })}>
                <span style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--surf-high)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="plus" size={22} stroke="var(--ember)"/>
                </span>
                Open a new chapter
              </button>
            )}
          </div>
        )}

        {/* ── Spaces Directory ── */}
        <div id="spaces-dir">
          <h2 className="serif" style={{ fontSize: '1.5rem', fontWeight: 600, margin: '2.4rem 0 .3rem' }}>
            Spaces Directory
          </h2>
          <p style={{ color: 'var(--ink-3)', marginBottom: '1rem' }}>Chapters you could open next.</p>

          <div className="scroll" style={{ display: 'flex', gap: '.5rem', overflowX: 'auto', marginBottom: '1.1rem' }}>
            {['all', ...SPACES.map(s => s.id)].map(id => (
              <button key={id} onClick={() => setFilter(id)} className="chip"
                style={{ cursor: 'pointer', flexShrink: 0, padding: '.45rem .9rem',
                  background: filter === id ? 'var(--slate)' : 'var(--surf-high)',
                  color: filter === id ? '#fff' : 'var(--ink-2)' }}>
                {id === 'all' ? 'All' : spaceById(id).name}
              </button>
            ))}
          </div>

          <div className="spaces-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {dirSpaces.filter(s => filter === 'all' || s.id === filter).map(s => (
              <div key={s.id} className="card" style={{ overflow: 'hidden' }}>
                <div style={{ height: 88, background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={s.icon} size={32} stroke={s.ink} sw={1.6}/>
                </div>
                <div style={{ padding: '1rem 1.1rem' }}>
                  <div className="serif" style={{ fontSize: '1.2rem', fontWeight: 600 }}>{s.name}</div>
                  <div style={{ fontSize: '.82rem', color: 'var(--ink-3)', marginBottom: '.8rem' }}>{s.desc}</div>
                  {opening === s.id ? (
                    <div className="fade-in">
                      <div className="label-mono" style={{ marginBottom: '.4rem' }}>Name your chapter</div>
                      <input autoFocus value={chapter} onChange={e => setChapter(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') openChapter(s.id, chapter); }}
                        placeholder={`e.g. ${(STAGES[s.id] ?? ['Just starting'])[0]}`}
                        style={{ width: '100%', padding: '.6rem .8rem', fontSize: '.88rem', background: 'var(--surf-low)',
                          border: '1.5px solid var(--border-2)', borderRadius: 'var(--r-md)', marginBottom: '.5rem' }}
                        onFocus={e => { e.target.style.borderColor = 'var(--ember)'; }}
                        onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; }}/>
                      <div style={{ display: 'flex', gap: '.4rem' }}>
                        <button onClick={() => openChapter(s.id, chapter)} disabled={openSpace.isPending}
                          className="btn btn-primary" style={{ flex: 1, padding: '.45rem', fontSize: '.82rem' }}>
                          {openSpace.isPending ? '…' : 'Open chapter'}
                        </button>
                        <button onClick={() => { setOpening(null); setChapter(''); }}
                          className="btn btn-soft" style={{ padding: '.45rem .7rem', fontSize: '.82rem' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setOpening(s.id); setChapter(''); }}
                      className="btn btn-ghost" style={{ padding: '.4rem .9rem', fontSize: '.82rem' }}>Join</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
