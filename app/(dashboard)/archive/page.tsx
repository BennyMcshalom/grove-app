'use client';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { SpaceIcon } from '@/components/ui/SpaceIcon';
import { Icon } from '@/components/ui/Icon';
import { useClosedChapters } from '@/hooks/useChapters';
import { useSavedCurios } from '@/hooks/useCurio';
import { useSpaceStore } from '@/store/useSpaceStore';
import { spaceById } from '@/lib/data';

export default function ArchivePage() {
  const { data: chapters, isLoading }         = useClosedChapters();
  const { data: savedCurios, isLoading: curioLoading } = useSavedCurios();
  const { slugById } = useSpaceStore();
  const [exp,      setExp]      = useState<Record<string, boolean>>({});
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
          const s = spaceById(slug);
          const open = exp[c.id];
          const openedDate = new Date(c.openedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          const closedDate = c.closedAt ? new Date(c.closedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';

          return (
            <div key={c.id} className="card" style={{ marginBottom: '1.1rem', borderLeft: `6px solid ${s.color}`, overflow: 'hidden' }}>
              <div style={{ padding: '1.3rem 1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', marginBottom: '.3rem' }}>
                  <SpaceIcon spaceId={slug} size={22} pill pillSize={40}/>
                  <div className="serif" style={{ fontSize: '1.4rem', fontWeight: 600 }}>{s.name}</div>
                </div>
                <div style={{ color: 'var(--ink-3)', fontSize: '.88rem', marginBottom: '.9rem' }}>
                  {openedDate} – {closedDate}
                </div>

                <button onClick={() => setExp({ ...exp, [c.id]: !open })}
                  style={{ fontSize: '.85rem', color: 'var(--ember)', fontWeight: 500, marginBottom: open ? '1rem' : 0 }}>
                  {open ? 'Hide reflections' : 'Read reflections'} →
                </button>

                {open && (
                  <div className="fade-in" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                    {!c.closingLearned && !c.closingAdvice && !c.closingCarryForward && !c.reflectionQ1 ? (
                      <p style={{ fontSize: '.88rem', color: 'var(--ink-4)', fontStyle: 'italic' }}>
                        No reflections were recorded for this chapter.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {c.closingLearned && (
                          <div>
                            <div className="label-mono" style={{ marginBottom: '.3rem' }}>What this chapter taught me</div>
                            <p style={{ fontStyle: 'italic', color: 'var(--ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>"{c.closingLearned}"</p>
                          </div>
                        )}
                        {c.closingAdvice && (
                          <div>
                            <div className="label-mono" style={{ marginBottom: '.3rem' }}>What I'd tell someone starting</div>
                            <p style={{ fontStyle: 'italic', color: 'var(--ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>"{c.closingAdvice}"</p>
                          </div>
                        )}
                        {c.closingCarryForward && (
                          <div>
                            <div className="label-mono" style={{ marginBottom: '.3rem' }}>Who I'm carrying forward</div>
                            <p style={{ fontStyle: 'italic', color: 'var(--ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>"{c.closingCarryForward}"</p>
                          </div>
                        )}
                        {c.reflectionQ1 && c.reflectionQ1.split('\n\n—\n\n').map((entry, i) => entry.trim() && (
                          <div key={i}>
                            <div className="label-mono" style={{ marginBottom: '.3rem' }}>Extra reflection {i + 1}</div>
                            <p style={{ fontStyle: 'italic', color: 'var(--ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>"{entry.trim()}"</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
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
          ) : savedCurios.map(c => {
            const open = curioExp[c.id];
            const dateStr = new Date(c.servedDate).toLocaleDateString('en-US',
              { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
            const spaceSlug = slugById(c.spaceId) ?? 'career';

            return (
              <div key={c.id} className="card" style={{ marginBottom: '.9rem',
                borderLeft: '4px solid var(--sage)', overflow: 'hidden' }}>
                <div style={{ padding: '1.1rem 1.4rem' }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.4rem' }}>
                    <SpaceIcon spaceId={spaceSlug} size={13}/>
                    <span className="label-mono" style={{ color: 'var(--sage)' }}>
                      {dateStr}
                    </span>
                  </div>

                  {/* Title */}
                  {c.title && (
                    <h3 className="serif" style={{ fontSize: '1.15rem', fontWeight: 600,
                      marginBottom: '.3rem', lineHeight: 1.3 }}>
                      {c.title}
                    </h3>
                  )}

                  {/* Reflection preview */}
                  {c.reflection && (
                    <p style={{ fontSize: '.84rem', color: 'var(--ink-3)', fontStyle: 'italic',
                      marginBottom: '.5rem', lineHeight: 1.5,
                      display: open ? 'none' : '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      overflow: 'hidden' }}>
                      &ldquo;{c.reflection}&rdquo;
                    </p>
                  )}

                  {/* Expand button */}
                  {(c.body || c.reflection) && (
                    <button onClick={() => setCurioExp({ ...curioExp, [c.id]: !open })}
                      style={{ fontSize: '.82rem', color: 'var(--sage)', fontWeight: 500,
                        display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                      {open ? 'Show less' : 'Read more'} →
                    </button>
                  )}

                  {/* Expanded body */}
                  {open && (
                    <div className="fade-in" style={{ borderTop: '1px solid var(--border)',
                      marginTop: '.8rem', paddingTop: '.9rem',
                      display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {c.body && (
                        <div>
                          <div className="label-mono" style={{ marginBottom: '.4rem' }}>Reading</div>
                          <p style={{ color: 'var(--ink-2)', lineHeight: 1.7, fontSize: '.92rem' }}>
                            {c.body}
                          </p>
                        </div>
                      )}
                      {c.reflection && (
                        <div>
                          <div className="label-mono" style={{ marginBottom: '.4rem', color: 'var(--sage)' }}>
                            Your reflection
                          </div>
                          <p style={{ fontStyle: 'italic', color: 'var(--ink-2)',
                            lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                            &ldquo;{c.reflection}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
