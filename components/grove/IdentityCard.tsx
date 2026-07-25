'use client';
import { Spinner } from '@/components/ui/Spinner';
import { StageChip } from '@/components/ui/StageChip';
import { AURAS } from '@/lib/data';
import type { AuraKey } from '@/lib/types';
import type { GroveData } from '@/lib/api';

export function IdentityCard({ isLoading, name, isOwnProfile, primarySpace, realAura,
  editingName, setEditingName, nameDraft, setNameDraft, savingName, onStartEditName, onSaveName }: {
  isLoading: boolean;
  name: string;
  isOwnProfile: boolean;
  primarySpace: GroveData['activeSpaces'][number] | undefined;
  realAura: AuraKey | undefined;
  editingName: boolean; setEditingName: (v: boolean) => void;
  nameDraft: string; setNameDraft: (v: string) => void;
  savingName: boolean;
  onStartEditName: () => void; onSaveName: () => void;
}) {
  return (
    <div className="card" style={{ padding: '1.3rem 1.4rem' }}>
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          <div style={{ height: 28, width: '65%', background: 'var(--surf-high)', borderRadius: 6, animation: 'pulse 1.5s ease infinite' }} />
          <div style={{ height: 18, width: '40%', background: 'var(--surf-high)', borderRadius: 6, animation: 'pulse 1.5s ease infinite' }} />
        </div>
      ) : (
        <>
          {editingName ? (
            <div style={{ marginBottom: '.6rem' }}>
              <input autoFocus value={nameDraft} onChange={e => setNameDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') onSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                style={{
                  width: '100%', padding: '.5rem .7rem', fontSize: '1.1rem', fontFamily: 'inherit',
                  border: '1.5px solid var(--ember)', borderRadius: 'var(--r-md)', background: 'var(--surf-low)'
                }} />
              <div style={{ display: 'flex', gap: '.5rem', marginTop: '.5rem' }}>
                <button onClick={onSaveName} disabled={savingName || !nameDraft.trim()} className="btn btn-primary"
                  style={{ padding: '.35rem .8rem', fontSize: '.8rem' }}>
                  {savingName ? <Spinner size={12} color="#fff" /> : 'Save'}
                </button>
                <button onClick={() => setEditingName(false)} disabled={savingName} className="btn btn-soft"
                  style={{ padding: '.35rem .8rem', fontSize: '.8rem' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.6rem' }}>
              <div className="serif" style={{ fontSize: '1.7rem', fontWeight: 600, lineHeight: 1.15, marginBottom: '.6rem' }}>{name}</div>
              {isOwnProfile && (
                <button onClick={onStartEditName}
                  style={{ fontSize: '.8rem', color: 'var(--ember)', fontWeight: 500, flexShrink: 0, marginTop: '.2rem' }}>
                  Edit
                </button>
              )}
            </div>
          )}
          {primarySpace?.space?.slug && (
            <StageChip space={primarySpace.space.slug} stage={primarySpace.stage ?? primarySpace.space.name} />
          )}
          {realAura && (
            <div style={{ marginTop: '.8rem', display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.8rem', color: 'var(--ink-3)' }}>
              <span style={{
                width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
                background: AURAS[realAura].color,
                boxShadow: `0 0 8px ${AURAS[realAura].color}`, display: 'block'
              }} />
              {AURAS[realAura].label}, <span style={{ fontStyle: 'italic' }}>{AURAS[realAura].hint}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
