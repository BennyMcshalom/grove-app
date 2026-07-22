'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { FeatureGate } from '@/components/layout/FeatureGate';
import { Spinner } from '@/components/ui/Spinner';
import { Icon } from '@/components/ui/Icon';
import { useToastStore } from '@/store/useToastStore';
import { useSpaceStore } from '@/store/useSpaceStore';
import { useMySpaces } from '@/hooks/useSpaces';
import { useTodayCurio, useSaveCurio } from '@/hooks/useCurio';
import { useCreatePost } from '@/hooks/usePosts';

// ── Reflection prompts — rotate daily, deterministic ─────────────
const PROMPTS = [
  'What would today look like if you trusted yourself more?',
  'What are you pretending not to know?',
  'Where are you waiting for permission?',
  'What small thing did you do today that no one saw?',
  'What would you do if you weren\'t performing for anyone?',
  'What feeling have you been avoiding naming?',
  'What did yesterday cost you that wasn\'t worth it?',
  'If today had a theme, what would it be?',
  'Who showed up for you recently, and have you told them?',
  'What would your most honest self say about this week?',
  'What are you carrying that isn\'t yours to carry?',
  'What do you keep almost saying?',
  'Where in your life are you still playing small?',
  'What would you regret not starting today?',
];

const WEEKLY_QUESTIONS = [
  'When did you last feel genuinely proud of yourself, and did you let it land?',
  'What is the honest story underneath the story you\'ve been telling?',
  'What chapter of your life is quietly ending right now?',
  'Who have you been, and who are you becoming?',
  'What is one thing you keep choosing that doesn\'t actually serve you?',
  'What would you do this week if outcome didn\'t matter?',
  'What part of yourself have you been neglecting?',
];

/** Deterministic index based on day-of-year — same question all day, changes daily */
function dailyIdx(arr: unknown[]) {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const day   = Math.floor((Date.now() - start.getTime()) / 86_400_000);
  return day % arr.length;
}

/** ISO week number for weekly question rotation */
function isoWeek() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

function fmtDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function MorningPageInner() {
  const router = useRouter();
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

        {/* ── Curio card ── */}
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Spinner color="var(--sage)"/>
          </div>
        ) : curio?.title ? (
          <div className="card rise" style={{ padding: '1.6rem', marginBottom: '1.6rem',
            background: 'linear-gradient(160deg, var(--white) 55%, var(--surf-high))',
            borderLeft: '4px solid var(--sage)', cursor: 'pointer' }}
            onClick={() => router.push(`/curio?title=${encodeURIComponent(curio.title ?? '')}&from=morning`)}>
            <div className="label-mono" style={{ color: 'var(--sage)', marginBottom: '.7rem' }}>
              Today's Curio · 2 min read
            </div>
            <h2 className="serif" style={{ fontSize: '1.6rem', fontWeight: 600,
              marginBottom: '.8rem', lineHeight: 1.25 }}>
              {curio.title}
            </h2>
            {curio.body && (
              <p style={{ color: 'var(--ink-2)', lineHeight: 1.75, marginBottom: '1.2rem' }}>
                {curio.body}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '.84rem', color: 'var(--sage)', fontWeight: 600 }}>Read & reflect →</span>
              {curio.saved ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem',
                  fontSize: '.82rem', color: 'var(--sage)', fontWeight: 500 }}>
                  <Icon name="check" size={13} stroke="var(--sage)" sw={2.5}/>
                  Saved
                </div>
              ) : (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    try { await saveCurio.mutateAsync({ id: curio.id, saved: true }); }
                    catch {}
                    toast('Curio saved to archive.');
                  }}
                  style={{ fontSize: '.82rem', color: 'var(--ink-3)' }}>
                  Save to archive
                </button>
              )}
            </div>
          </div>
        ) : (
          // No curio cards seeded for this space — show a graceful placeholder
          <div className="card" style={{ padding: '1.6rem', marginBottom: '1.6rem',
            background: 'linear-gradient(160deg, var(--white) 55%, var(--surf-high))',
            borderLeft: '4px solid var(--border-2)', opacity: .7 }}>
            <div className="label-mono" style={{ marginBottom: '.7rem' }}>No reading today</div>
            <p className="serif" style={{ fontSize: '1.35rem', fontStyle: 'italic',
              color: 'var(--ink-3)', lineHeight: 1.4 }}>
              A curio card for your {primarySlug} chapter will appear here when one is ready.
            </p>
          </div>
        )}

        {/* ── Breathing orb + daily prompt ── */}
        <div style={{ textAlign: 'center', padding: '1.2rem 0 2rem' }}>
          <button
            onClick={() => setPidx(p => (p + 1) % PROMPTS.length)}
            title="Tap for another prompt"
            style={{ display: 'block', margin: '0 auto' }}>
            <div style={{ width: 140, height: 140, borderRadius: '50%',
              background: 'radial-gradient(circle at 38% 35%, var(--mint), var(--sage))',
              animation: 'breathe 4s ease-in-out infinite',
              boxShadow: '0 0 50px -8px rgba(78,125,94,.45)' }}/>
          </button>
          <p className="serif" style={{ fontSize: '1.3rem', fontStyle: 'italic',
            color: 'var(--ink)', maxWidth: 380, margin: '1.5rem auto .4rem', lineHeight: 1.4 }}>
            &ldquo;{PROMPTS[pidx]}&rdquo;
          </p>
          <div className="label-mono" style={{ color: 'var(--ink-4)' }}>Tap the orb for another</div>
        </div>

        {/* ── Weekly reflection question ── */}
        <div className="card" style={{ padding: '1.6rem' }}>
          <div className="label-mono" style={{ color: 'var(--sage)', marginBottom: '.6rem' }}>
            This week&apos;s question
          </div>
          <p className="serif" style={{ fontSize: '1.3rem', fontStyle: 'italic',
            marginBottom: '1.1rem', lineHeight: 1.45, color: 'var(--ink)' }}>
            {weeklyQ}
          </p>

          {/* Saved indicator */}
          {saved && !ans && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem',
              fontSize: '.82rem', color: 'var(--sage)', marginBottom: '.8rem' }}>
              <Icon name="check" size={13} stroke="var(--sage)" sw={2.5}/>
              Reflected today
            </div>
          )}

          <textarea
            value={ans}
            onChange={e => { setAns(e.target.value); setSaved(false); }}
            placeholder="Your honest answer…"
            style={{ width: '100%', minHeight: 100, padding: '.9rem 1rem',
              background: 'var(--surf-high)', border: '1.5px solid var(--border-2)',
              borderRadius: 'var(--r-md)', fontSize: '.97rem', lineHeight: 1.65,
              resize: 'vertical', marginBottom: '1rem', color: 'var(--ink)',
              transition: 'border .15s, box-shadow .15s, background .15s' }}
            onFocus={e => {
              e.target.style.borderColor = 'var(--sage)';
              e.target.style.boxShadow   = '0 0 0 3px rgba(78,125,94,.15)';
              e.target.style.background  = 'var(--white)';
            }}
            onBlur={e => {
              e.target.style.borderColor = 'var(--border-2)';
              e.target.style.boxShadow   = 'none';
              e.target.style.background  = 'var(--surf-high)';
            }}
          />

          <div style={{ display: 'flex', gap: '.6rem' }}>
            <button onClick={() => handleSave(false)} className="btn"
              style={{ background: 'var(--sage)', color: '#fff', flex: 1 }}>
              {saved ? 'Update reflection' : 'Save privately'}
            </button>
            <button onClick={() => handleSave(true)} className="btn btn-ghost" style={{ flex: 1 }}>
              Share to my space
            </button>
          </div>
        </div>

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
