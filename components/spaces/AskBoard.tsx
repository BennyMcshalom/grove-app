'use client';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { usePostAsk, useSubmitAnswer } from '@/hooks/useAnonAsks';
import type { AnonAsk } from '@/lib/api';
import { MyAskCard } from './MyAskCard';
import { SpaceAskCard } from './SpaceAskCard';

// ── Full board ────────────────────────────────────────────────────
export function AskBoard({ spaceUuid, myAsk, otherAsks, askText, setAskText, answerText, setAnswerText,
  postAsk, submitAnswer, userName, toast }: {
    spaceUuid: string | undefined;
    myAsk: AnonAsk | null;
    otherAsks: AnonAsk[];
    askText: string; setAskText: (v: string) => void;
    answerText: string; setAnswerText: (v: string) => void;
    postAsk: ReturnType<typeof usePostAsk>;
    submitAnswer: ReturnType<typeof useSubmitAnswer>;
    userName: string;
    toast: (m: string) => void;
  }) {
  const [askOpen, setAskOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* ── SECTION 1: My Ask ── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.7rem' }}>
          <div className="label-mono">Your ask</div>
          {!myAsk && !askOpen && (
            <button onClick={() => setAskOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.8rem',
                color: 'var(--sage)', fontWeight: 600
              }}>
              <Icon name="plus" size={14} stroke="var(--sage)" sw={2} /> Ask something
            </button>
          )}
        </div>

        {myAsk ? (
          <MyAskCard ask={myAsk} />
        ) : askOpen ? (
          <div className="card" style={{ padding: '1.3rem 1.4rem' }}>
            <p style={{ fontSize: '.86rem', color: 'var(--ink-3)', lineHeight: 1.55, marginBottom: '.9rem' }}>
              Ask the space something you&apos;re sitting with. Replies come back without names.
            </p>
            <textarea autoFocus value={askText} onChange={e => setAskText(e.target.value)}
              placeholder="What do you actually want to know from this space?"
              style={{
                width: '100%', minHeight: 72, padding: '.85rem 1rem', background: 'var(--surf-low)',
                border: '1.5px solid var(--border-2)', borderRadius: 'var(--r-md)', fontSize: '.95rem',
                lineHeight: 1.6, resize: 'vertical', marginBottom: '.8rem', color: 'var(--ink)',
                transition: 'border .15s, box-shadow .15s'
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--sage)'; e.target.style.boxShadow = '0 0 0 3px rgba(78,125,94,.15)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none'; }} />
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <button onClick={() => { setAskOpen(false); setAskText(''); }} className="btn btn-soft"
                style={{ padding: '.5rem .9rem', fontSize: '.84rem' }}>Cancel</button>
              <button
                style={{
                  flex: 1, background: 'var(--sage)', color: '#fff', padding: '.6rem 1rem',
                  borderRadius: 'var(--r-md)', fontWeight: 600, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '.45rem', fontSize: '.9rem',
                  opacity: askText.trim() && !postAsk.isPending ? 1 : .55, transition: 'opacity .15s'
                }}
                disabled={!askText.trim() || postAsk.isPending || !spaceUuid}
                onClick={async () => {
                  if (!spaceUuid) return;
                  try {
                    await postAsk.mutateAsync({ question: askText.trim(), spaceId: spaceUuid });
                    setAskText('');
                    setAskOpen(false);
                    toast('Your question is live for 7 days.');
                  } catch { toast('Could not post.'); }
                }}>
                <Icon name="lock" size={15} stroke="#fff" sw={2} />
                {postAsk.isPending ? 'Posting…' : 'Ask the space'}
              </button>
            </div>
            <p style={{ fontSize: '.72rem', color: 'var(--ink-4)', textAlign: 'center', marginTop: '.5rem' }}>
              Live for 7 days · Replies come back without names
            </p>
          </div>
        ) : (
          <button onClick={() => setAskOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '.8rem', width: '100%',
              padding: '1rem 1.2rem', borderRadius: 'var(--r-lg)', border: '1.5px dashed var(--border-2)',
              background: 'var(--surf-low)', textAlign: 'left', transition: 'border-color .15s, background .15s'
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--sage)'; (e.currentTarget as HTMLElement).style.background = 'rgba(78,125,94,.04)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-2)'; (e.currentTarget as HTMLElement).style.background = 'var(--surf-low)'; }}>
            <span style={{
              width: 36, height: 36, borderRadius: '50%', background: 'var(--white)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'var(--shadow-soft)'
            }}>
              <Icon name="comment" size={16} stroke="var(--sage)" sw={1.8} />
            </span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '.9rem', color: 'var(--ink)' }}>Ask the space something</div>
              <div style={{ fontSize: '.76rem', color: 'var(--ink-4)', marginTop: 2 }}>Replies come back without names · 7 days</div>
            </div>
          </button>
        )}
      </section>

      {/* ── SECTION 2: From the space ── */}
      {otherAsks.length > 0 && (
        <section>
          <div className="label-mono" style={{ marginBottom: '.7rem' }}>
            From the space · {otherAsks.length} open question{otherAsks.length !== 1 ? 's' : ''}
          </div>
          {otherAsks.map(ask => (
            <SpaceAskCard key={ask.id} ask={ask} userName={userName} toast={toast} />
          ))}
          <p style={{
            fontSize: '.72rem', color: 'var(--ink-4)', fontStyle: 'italic',
            textAlign: 'center', lineHeight: 1.5
          }}>
            Your replies are anonymous, no one in the space, including the asker, knows it&apos;s you.
          </p>
        </section>
      )}

      {/* ── Empty: no asks at all ── */}
      {!myAsk && otherAsks.length === 0 && !askOpen && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--ink-3)' }}>
          <p style={{ fontSize: '.88rem', lineHeight: 1.6 }}>
            No active questions in this space yet.<br />Be the first to ask something honest.
          </p>
        </div>
      )}
    </div>
  );
}
