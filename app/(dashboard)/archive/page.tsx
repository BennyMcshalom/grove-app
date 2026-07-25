'use client';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { FeatureGate } from '@/components/layout/FeatureGate';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useClosedChapters } from '@/hooks/useChapters';
import { useSavedCurios } from '@/hooks/useCurio';
import { useSpaceStore } from '@/store/useSpaceStore';
import { ChapterCard } from '@/components/archive/ChapterCard';
import { SavedCurioCard } from '@/components/archive/SavedCurioCard';

function ArchivePageInner() {
  const { data: chapters, isLoading }         = useClosedChapters();
  const { data: savedCurios, isLoading: curioLoading } = useSavedCurios();
  const { slugById } = useSpaceStore();
  const [curioExp, setCurioExp] = useState<Record<string, boolean>>({});

  const closed = (chapters ?? []).filter(c => c.closedAt);

  return (
    <AppShell title="Life Archive">
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 1.6rem 3rem' }}>
        <p style={{ color: 'var(--ink-3)', marginTop: '-.4rem', marginBottom: '1.6rem' }}>
          Every chapter you've lived through. Private, permanent, read-only.
        </p>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Spinner/>
          </div>
        ) : closed.length === 0 ? (
          <div className="card" style={{ background: 'linear-gradient(160deg, var(--slate-dim), var(--green-dim))', maxWidth: 480, margin: '0 auto' }}>
            <EmptyState variant="archive"
              body="When you close a space, the reflections you wrote will live here, private and permanent."/>
          </div>
        ) : closed.map(c => {
          const slug = c.space?.slug ?? slugById(c.spaceId) ?? 'career';
          return <ChapterCard key={c.id} chapter={c} slug={slug}/>;
        })}
        {/* ── Morning Room — saved curios & reflections ── */}
        <div style={{ marginTop: closed.length > 0 ? '2.4rem' : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '1.1rem' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
            <span className="label-mono" style={{ color: 'var(--sage)' }}>Morning Room</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
          </div>

          {curioLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Spinner/></div>
          ) : !savedCurios || savedCurios.length === 0 ? (
            <div className="card" style={{ background: 'linear-gradient(160deg, var(--amber-dim), var(--green-dim))', maxWidth: 440, margin: '0 auto' }}>
              <EmptyState variant="curio" compact
                title="Nothing saved yet."
                body="Curio cards and reflections you save will appear here."/>
            </div>
          ) : savedCurios.map(c => (
            <SavedCurioCard key={c.id} curio={c} open={!!curioExp[c.id]}
              onToggle={() => setCurioExp({ ...curioExp, [c.id]: !curioExp[c.id] })}
              spaceSlug={slugById(c.spaceId) ?? 'career'} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

export default function ArchivePage() {
  return (
    <FeatureGate flagKey="nav_archive">
      <ArchivePageInner />
    </FeatureGate>
  );
}
