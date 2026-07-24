'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { spaceById } from '@/lib/data';
import { useSpaceStore } from '@/store/useSpaceStore';
import { chaptersApi, spacesApi, bondsApi } from '@/lib/api';
import type { BondRecord, ChapterRecord } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { PRESETS, monthsBetween, pluralMonths } from '@/components/chapter-close/helpers';
import { IntroStep } from '@/components/chapter-close/IntroStep';
import { QuestionStep } from '@/components/chapter-close/QuestionStep';
import { ExtrasStep } from '@/components/chapter-close/ExtrasStep';
import { SummaryStep } from '@/components/chapter-close/SummaryStep';

// ── Main inner component ──────────────────────────────────────────
function ChapterCloseInner() {
  const qc = useQueryClient();
  const router       = useRouter();
  const params       = useSearchParams();
  const { uuidBySlug } = useSpaceStore();

  const spaceSlug  = params.get('space') || 'career';
  const userSpaceId = params.get('userSpaceId');
  const s = spaceById(spaceSlug);

  // ── Remote data ──
  const [chapter, setChapter] = useState<ChapterRecord | null>(null);
  const [bonds,   setBonds]   = useState<BondRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const spaceUuid = uuidBySlug(spaceSlug);
        const [chList, bondList] = await Promise.allSettled([
          chaptersApi.list(),
          bondsApi.list(),
        ]);
        if (chList.status === 'fulfilled') {
          const ch = chList.value.find(c =>
            (!spaceUuid || c.spaceId === spaceUuid) && !c.closedAt
          );
          setChapter(ch ?? null);
        }
        if (bondList.status === 'fulfilled') setBonds(bondList.value);
      } finally { setLoading(false); }
    })();
  }, [spaceSlug, uuidBySlug]);

  // ── Step flow ──
  const [step,  setStep]  = useState(0);
  const [ready, setReady] = useState(false); // intro "Begin" reveal
  const [held,  setHeld]  = useState(false); // summary "Save" reveal

  useEffect(() => {
    if (step === 0) { const t = setTimeout(() => setReady(true), 3000); return () => clearTimeout(t); }
  }, [step]);
  useEffect(() => {
    if (step === FINAL) { setHeld(false); const t = setTimeout(() => setHeld(true), 4000); return () => clearTimeout(t); }
  }, [step]);

  // ── Reflection state ──
  const FINAL = PRESETS.length + 2; // intro + 3 questions + extras step + summary

  const [answers, setAnswers] = useState(['', '', '']);
  const [extras,  setExtras]  = useState<string[]>([]);
  const [closing, setClosing] = useState(false);

  const updateAnswer = (i: number, v: string) =>
    setAnswers(a => { const n = [...a]; n[i] = v; return n; });

  const addExtra    = () => setExtras(e => [...e, '']);
  const removeExtra = (i: number) => setExtras(e => e.filter((_, idx) => idx !== i));
  const updateExtra = (i: number, v: string) =>
    setExtras(e => { const n = [...e]; n[i] = v; return n; });

  // ── Dates ──
  const openedAt  = chapter?.openedAt ? new Date(chapter.openedAt) : null;
  const closedAt  = new Date();
  const monthsStr = openedAt ? pluralMonths(monthsBetween(openedAt, closedAt)) : null;

  // ── Save handler ──
  const handleSave = async () => {
    setClosing(true);
    try {
      const spaceUuid = uuidBySlug(spaceSlug);
      if (spaceUuid) {
        const list  = await chaptersApi.list();
        const ch    = list.find(c => c.spaceId === spaceUuid && !c.closedAt);
        const id    = ch?.id ?? (await chaptersApi.open(spaceUuid)).id;
        const extrasJoined = extras.filter(e => e.trim()).join('\n\n—\n\n');
        await chaptersApi.close(id, {
          ...(answers[0].trim() && { closingLearned:      answers[0].trim() }),
          ...(answers[1].trim() && { closingAdvice:       answers[1].trim() }),
          ...(answers[2].trim() && { closingCarryForward: answers[2].trim() }),
          ...(extrasJoined      && { reflectionQ1:        extrasJoined }),
        });
      }
      if (userSpaceId) await spacesApi.close(userSpaceId);
    } catch {}
    // Bust the archive cache so the new entry shows immediately
    qc.invalidateQueries({ queryKey: ['chapters-closed'] });
    qc.invalidateQueries({ queryKey: ['chapters'] });
    router.push('/archive');
  };

  const next = () => setStep(s => s + 1);
  const skip = () => setStep(s => s + 1);

  // ── Render ────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={24} color="var(--sage)"/>
    </div>
  );

  return (
    <div className="scroll" style={{ minHeight: '100dvh', width: '100%', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(1.2rem, 5vw, 2rem)', overflowY: 'auto' }}>
      <div style={{ maxWidth: 580, width: '100%', textAlign: 'center' }} className="screen-enter" key={step}>

        {step === 0 && (
          <IntroStep spaceId={s.id} ready={ready} onBegin={next}/>
        )}

        {step >= 1 && step <= PRESETS.length && (() => {
          const idx = step - 1;
          const { label, placeholder } = PRESETS[idx];
          return (
            <QuestionStep
              spaceId={s.id} spaceName={s.name} step={step} total={PRESETS.length}
              label={label} placeholder={placeholder} value={answers[idx]}
              onChange={v => updateAnswer(idx, v)} onContinue={next} onSkip={skip}
              continueLabel={idx === PRESETS.length - 1 ? 'One last thing' : 'Continue'}/>
          );
        })()}

        {step === PRESETS.length + 1 && (
          <ExtrasStep spaceId={s.id} spaceName={s.name} extras={extras}
            onAddExtra={addExtra} onUpdateExtra={updateExtra} onRemoveExtra={removeExtra}
            onContinue={next} onSkip={skip}/>
        )}

        {step === FINAL && (
          <SummaryStep spaceId={s.id} spaceName={s.name} openedAt={openedAt} closedAt={closedAt}
            monthsStr={monthsStr} bonds={bonds} answers={answers} extras={extras}
            held={held} closing={closing} onSave={handleSave}/>
        )}

      </div>
    </div>
  );
}

export default function ChapterClosePage() {
  return <Suspense><ChapterCloseInner/></Suspense>;
}
