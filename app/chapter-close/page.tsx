'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { SpaceIcon } from '@/components/ui/SpaceIcon';
import { spaceById } from '@/lib/data';
import { useSpaceStore } from '@/store/useSpaceStore';
import { chaptersApi, spacesApi, bondsApi } from '@/lib/api';
import type { BondRecord, ChapterRecord } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

// ── Helpers ───────────────────────────────────────────────────────
function monthsBetween(from: Date, to: Date) {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 30)));
}
function fmtMonth(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
function pluralMonths(n: number) {
  return n === 1 ? '1 month' : `${n} months`;
}

// ── Reflection textarea row ───────────────────────────────────────
function ReflectionField({
  label, placeholder, value, onChange, onRemove, autoFocus = false,
}: {
  label?: string; placeholder?: string; value: string;
  onChange: (v: string) => void; onRemove?: () => void; autoFocus?: boolean;
}) {
  return (
    <div style={{ marginBottom: '1.2rem', position: 'relative' }}>
      {label && (
        <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--ink-3)',
          marginBottom: '.4rem', textAlign: 'left' }}>
          {label}
        </div>
      )}
      <textarea
        autoFocus={autoFocus}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? "Don't edit yourself. Write what's true."}
        style={{ width: '100%', minHeight: 110, padding: '1rem', fontSize: '1rem',
          lineHeight: 1.6, background: 'var(--white)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)', resize: 'vertical' }}
      />
      {onRemove && (
        <button onClick={onRemove}
          style={{ position: 'absolute', top: label ? 28 : 8, right: 8,
            width: 24, height: 24, borderRadius: '50%', background: 'var(--surf-high)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="close" size={12} stroke="var(--ink-3)"/>
        </button>
      )}
    </div>
  );
}

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
  // 3 preset questions + dynamic extra fields
  const PRESETS = [
    { key: 'learned',  label: 'What did this chapter teach you?',              placeholder: "What shifted in you during this time…" },
    { key: 'advice',   label: 'What would you tell someone starting where you started?', placeholder: "The honest thing you wish you'd known…" },
    { key: 'carry',    label: 'Who or what from this chapter are you carrying forward?', placeholder: "People, lessons, habits…" },
  ];
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

  // ── Shared button row ──
  const NavRow = ({ onContinue, continueLabel = 'Continue' }: { onContinue: () => void; continueLabel?: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1.6rem' }}>
      <button onClick={skip} style={{ fontSize: '.88rem', color: 'var(--ink-3)', padding: '.5rem 1rem' }}>
        Skip
      </button>
      <button onClick={onContinue} className="btn btn-primary btn-pill"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', padding: '.7rem 1.8rem' }}>
        {continueLabel} <Icon name="arrow" stroke="#fff" size={16}/>
      </button>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={24} color="var(--sage)"/>
    </div>
  );

  return (
    <div style={{ height: '100vh', width: '100vw', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', overflowY: 'auto' }}>
      <div style={{ maxWidth: 580, width: '100%', textAlign: 'center' }} className="screen-enter" key={step}>

        {/* ── Step 0: Intro ── */}
        {step === 0 && (
          <>
            <div style={{ marginBottom: '.8rem' }}>
              <SpaceIcon spaceId={s.id} size={28} pill pillSize={56}/>
            </div>
            <h1 className="serif" style={{ fontSize: '2.4rem', fontWeight: 600, marginBottom: '.8rem' }}>
              Before you close this chapter.
            </h1>
            <p style={{ color: 'var(--ink-2)', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.6 }}>
              Take your time. Answer what you want. Leave what you don&apos;t.
            </p>
            {ready
              ? <button className="btn btn-primary btn-lg btn-pill fade-in" onClick={next}>Begin</button>
              : <div style={{ color: 'var(--ink-4)', fontSize: '.85rem' }}>Take a breath…</div>}
          </>
        )}

        {/* ── Steps 1–3: Preset questions ── */}
        {step >= 1 && step <= PRESETS.length && (() => {
          const idx = step - 1;
          const { label, placeholder } = PRESETS[idx];
          return (
            <>
              <div className="label-mono" style={{ marginBottom: '1rem', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: '.5rem' }}>
                <SpaceIcon spaceId={s.id} size={12}/> {s.name} · Question {step} of {PRESETS.length}
              </div>
              <h1 className="serif" style={{ fontSize: '1.9rem', fontWeight: 600,
                marginBottom: '1.4rem', lineHeight: 1.25 }}>
                {label}
              </h1>
              <textarea
                autoFocus
                value={answers[idx]}
                onChange={e => updateAnswer(idx, e.target.value)}
                placeholder={placeholder}
                style={{ width: '100%', minHeight: 140, padding: '1.1rem', fontSize: '1.05rem',
                  lineHeight: 1.6, background: 'var(--white)', border: '1px solid var(--border)',
                  borderRadius: 'var(--r-md)', resize: 'vertical', marginBottom: '.2rem', textAlign: 'left' }}
              />
              <p style={{ fontSize: '.78rem', color: 'var(--ink-4)', marginBottom: 0, textAlign: 'right' }}>
                Optional — write as much or as little as you need.
              </p>
              <NavRow onContinue={next} continueLabel={idx === PRESETS.length - 1 ? 'One last thing' : 'Continue'}/>
            </>
          );
        })()}

        {/* ── Step 4: Extra thoughts (any number) ── */}
        {step === PRESETS.length + 1 && (
          <>
            <div className="label-mono" style={{ marginBottom: '1rem', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: '.5rem' }}>
              <SpaceIcon spaceId={s.id} size={12}/> {s.name} · Anything else?
            </div>
            <h1 className="serif" style={{ fontSize: '1.9rem', fontWeight: 600,
              marginBottom: '.5rem', lineHeight: 1.25 }}>
              Anything else you want to record?
            </h1>
            <p style={{ color: 'var(--ink-3)', fontSize: '.9rem', marginBottom: '1.6rem', lineHeight: 1.5 }}>
              Add as many reflections as you like, or skip right through.
            </p>

            <div style={{ textAlign: 'left' }}>
              {extras.length === 0 ? (
                <p style={{ color: 'var(--ink-4)', fontSize: '.88rem', fontStyle: 'italic',
                  marginBottom: '1rem', textAlign: 'center' }}>
                  Nothing added yet.
                </p>
              ) : extras.map((val, i) => (
                <ReflectionField
                  key={i}
                  label={`Reflection ${i + 1}`}
                  value={val}
                  onChange={v => updateExtra(i, v)}
                  onRemove={extras.length > 0 ? () => removeExtra(i) : undefined}
                  autoFocus={i === extras.length - 1 && val === ''}
                />
              ))}

              <button onClick={addExtra}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem',
                  fontSize: '.86rem', color: 'var(--ember)', fontWeight: 500,
                  padding: '.5rem .9rem', borderRadius: 100,
                  border: '1.5px dashed var(--ember-bdr)', background: 'transparent',
                  marginBottom: '1rem' }}>
                <Icon name="plus" size={14} stroke="var(--ember)"/> Add a reflection
              </button>
            </div>

            <NavRow onContinue={next} continueLabel="Close this chapter"/>
          </>
        )}

        {/* ── Final step: Summary ── */}
        {step === FINAL && (
          <>
            <div style={{ marginBottom: '1.2rem' }}>
              <SpaceIcon spaceId={s.id} size={28} pill pillSize={56}/>
            </div>
            <h1 className="serif" style={{ fontSize: '2.4rem', fontWeight: 600 }}>
              Chapter closed.
            </h1>
            <p style={{ color: 'var(--ink-2)', margin: '.6rem 0 .25rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem' }}>
              <SpaceIcon spaceId={s.id} size={13}/> {s.name}
              {openedAt && ` · ${fmtMonth(openedAt)} – ${fmtMonth(closedAt)}`}
            </p>
            {monthsStr && (
              <p style={{ color: 'var(--ink-4)', fontSize: '.88rem' }}>{monthsStr}</p>
            )}

            {/* People from bonds */}
            {bonds.length > 0 && (
              <div style={{ marginTop: '1.4rem' }}>
                <p style={{ fontSize: '.8rem', color: 'var(--ink-3)', marginBottom: '.8rem' }}>
                  People who were part of this chapter
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '.4rem' }}>
                  {bonds.slice(0, 7).map((b, i) => (
                    <div key={b.id} title={b.otherUser?.displayName ?? ''}>
                      <Avatar
                        name={b.otherUser?.displayName ?? '?'}
                        avatarUrl={b.otherUser?.avatarUrl}
                        size={44}
                        ring={1}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reflection preview — show any non-empty answers */}
            {[...answers, ...extras].some(a => a.trim()) && (
              <div className="card" style={{ marginTop: '1.6rem', padding: '1.2rem 1.4rem', textAlign: 'left' }}>
                <div className="label-mono" style={{ marginBottom: '.8rem' }}>Your reflections</div>
                {answers.map((a, i) => a.trim() ? (
                  <div key={i} style={{ marginBottom: '.9rem' }}>
                    <div style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--ink-3)', marginBottom: '.2rem' }}>
                      {PRESETS[i].label}
                    </div>
                    <p style={{ fontSize: '.9rem', color: 'var(--ink-2)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{a}</p>
                  </div>
                ) : null)}
                {extras.map((e, i) => e.trim() ? (
                  <div key={`extra-${i}`} style={{ marginBottom: '.9rem' }}>
                    <div style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--ink-3)', marginBottom: '.2rem' }}>
                      Extra reflection {i + 1}
                    </div>
                    <p style={{ fontSize: '.9rem', color: 'var(--ink-2)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{e}</p>
                  </div>
                ) : null)}
              </div>
            )}

            <div style={{ height: 64, marginTop: '2rem' }}>
              {held ? (
                <button className="btn btn-ghost btn-lg btn-pill fade-in"
                  disabled={closing} onClick={handleSave}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}>
                  {closing ? <><Spinner size={16} color="var(--ink-3)"/> Saving…</> : 'Save to Life Archive'}
                </button>
              ) : (
                <p style={{ color: 'var(--ink-4)', fontSize: '.85rem' }} className="fade-in">
                  Sit with it for a moment.
                </p>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default function ChapterClosePage() {
  return <Suspense><ChapterCloseInner/></Suspense>;
}
