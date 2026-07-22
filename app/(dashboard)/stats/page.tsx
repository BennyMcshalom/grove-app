'use client';
import { AppShell } from '@/components/layout/AppShell';
import { FeatureGate } from '@/components/layout/FeatureGate';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useChapterStats } from '@/hooks/useChapters';
import { useState } from 'react';

function StatsPageInner() {
  const { data: stats, isLoading } = useChapterStats();
  const [mi, setMi] = useState(0);

  const months = stats ?? [];
  const month = months[mi];

  function formatMonth(iso: string) {
    return new Date(iso + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  const rows: [string, number][] = month ? [
    ['Posts shared', month.rootsPosts],
    ['Voice notes sent', month.voiceNotesSent],
    ['Voice notes received', month.voiceNotesRecv],
    ['Bond interactions', month.bondInteractions],
    ['Curio reads', month.curioReads],
    ['Wander saves', month.wanderSaves],
  ] : [];

  return (
    <AppShell title="Chapter Stats">
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '0 1.6rem 3rem' }}>
        <p style={{ color: 'var(--ink-3)', fontStyle: 'italic', marginTop: '-.4rem', marginBottom: '1.6rem' }}>
          A private mirror. Not a scoreboard.
        </p>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Spinner/>
          </div>
        ) : months.length === 0 ? (
          <div className="card" style={{ background: 'linear-gradient(160deg, var(--ember-dim), var(--green-dim))', maxWidth: 480, margin: '0 auto' }}>
            <EmptyState variant="stats"/>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.6rem', marginBottom: '1.4rem' }}>
              <button onClick={() => setMi(Math.min(mi + 1, months.length - 1))}
                disabled={mi >= months.length - 1} style={{ flexShrink: 0, opacity: mi >= months.length - 1 ? .3 : 1 }}>
                <Icon name="back" stroke="var(--ink-2)"/>
              </button>
              <div className="serif" style={{ fontSize: 'clamp(1.25rem, 5.5vw, 1.7rem)', fontWeight: 600, minWidth: 0, textAlign: 'center', whiteSpace: 'nowrap' }}>
                {formatMonth(month!.month)}
              </div>
              <button onClick={() => setMi(Math.max(mi - 1, 0))}
                disabled={mi <= 0} style={{ flexShrink: 0, opacity: mi <= 0 ? .3 : 1, transform: 'scaleX(-1)' }}>
                <Icon name="back" stroke="var(--ink-2)"/>
              </button>
            </div>
            <div className="card stats-grid" style={{ padding: '1.8rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.8rem 1rem' }}>
              {rows.map(([label, n]) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div className="serif" style={{ fontSize: 'clamp(1.9rem, 7vw, 2.6rem)', fontWeight: 600, lineHeight: 1 }}>{n}</div>
                  <div className="label-mono" style={{ marginTop: '.5rem' }}>{label}</div>
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', marginTop: '1.4rem', color: 'var(--ink-3)', fontStyle: 'italic' }}>
              {month!.rootsPosts === 0
                ? "A quiet month. That's allowed."
                : `You showed up ${month!.rootsPosts} times this month.`}
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function StatsPage() {
  return (
    <FeatureGate flagKey="nav_stats">
      <StatsPageInner />
    </FeatureGate>
  );
}
