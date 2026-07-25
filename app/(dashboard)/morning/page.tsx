'use client';
import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { FeatureGate } from '@/components/layout/FeatureGate';
import { useToastStore } from '@/store/useToastStore';
import { useSpaceStore } from '@/store/useSpaceStore';
import { useMySpaces } from '@/hooks/useSpaces';
import { useTodayCurio, useSaveCurio } from '@/hooks/useCurio';
import { useCreatePost } from '@/hooks/usePosts';
import { PROMPTS, WEEKLY_QUESTIONS, dailyIdx, isoWeek, fmtDate } from '@/components/morning/prompts';
import { CurioCard } from '@/components/morning/CurioCard';
import { BreathingOrb } from '@/components/morning/BreathingOrb';
import { WeeklyReflection } from '@/components/morning/WeeklyReflection';

function MorningPageInner() {
  const { toast } = useToastStore();
  const { uuidBySlug } = useSpaceStore();

  // user.spaces is a one-time onboarding snapshot, never updated when a
  // space is opened/closed later — mySpaceSlugs is the real, live list.
  const { data: mySpaces } = useMySpaces();
  const mySpaceSlugs = (mySpaces ?? []).map(s => s.space?.slug).filter((s): s is string => !!s);
  const primarySlug = mySpaceSlugs[0] ?? 'career';
  const primaryUuid = uuidBySlug(primarySlug);
  const { data: curio, isLoading } = useTodayCurio(primaryUuid);
  const saveCurio   = useSaveCurio();
  const createPost  = useCreatePost();

  // Deterministic daily prompt (same all day; clicking orb cycles through the rest)
  const [pidx, setPidx] = useState(() => dailyIdx(PROMPTS));
  const weeklyQ = WEEKLY_QUESTIONS[isoWeek() % WEEKLY_QUESTIONS.length];

  // Pre-populate textarea with any previously saved reflection
  const [ans,   setAns]   = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (curio?.reflection) {
      setAns(curio.reflection);
      setSaved(true);
    }
  }, [curio?.reflection]);

  async function handleSave(shared: boolean) {
    if (!ans.trim()) { toast('Write something first.'); return; }

    if (curio?.id) {
      saveCurio.mutateAsync({ id: curio.id, saved: true, reflection: ans.trim() }).catch(() => {});
    }

    if (shared) {
      const spaceUuid = uuidBySlug(primarySlug);
      if (spaceUuid) {
        createPost.mutateAsync({
          spaceId: spaceUuid, kind: 'reflection', body: ans.trim(),
        }).catch(() => {});
      }
    }

    setSaved(true);
    toast(shared ? 'Shared to your space.' : 'Saved to your Morning Room.');
  }

  return (
    <AppShell title="Morning Room">
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 1.6rem 3rem' }}>

        {/* ── Date header ── */}
        <p className="label-mono" style={{ marginBottom: '1.4rem' }}>
          {fmtDate()}
        </p>

        <CurioCard curio={curio} isLoading={isLoading} primarySlug={primarySlug} />

        <BreathingOrb pidx={pidx} onNext={() => setPidx(p => (p + 1) % PROMPTS.length)} />

        <WeeklyReflection weeklyQ={weeklyQ} ans={ans} setAns={setAns} saved={saved} setSaved={setSaved}
          onSave={handleSave} />

      </div>
    </AppShell>
  );
}

export default function MorningPage() {
  return (
    <FeatureGate flagKey="nav_morning">
      <MorningPageInner />
    </FeatureGate>
  );
}
