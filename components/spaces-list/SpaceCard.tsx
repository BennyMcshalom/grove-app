'use client';
import { SpaceIcon } from '@/components/ui/SpaceIcon';
import { useToastStore } from '@/store/useToastStore';
import { useUpdateSpace } from '@/hooks/useSpaces';
import { spaceById } from '@/lib/data';
import type { UserSpaceRecord } from '@/lib/api';

export const STAGE_MARKERS = ['Just started', 'In progress', 'Thick of it', 'Wrapping up'];

export function SpaceCard({ slot, onOpen, onClose }: {
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
