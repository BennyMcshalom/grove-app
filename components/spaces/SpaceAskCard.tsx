'use client';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useAskAnswers, useSubmitAnswer } from '@/hooks/useAnonAsks';
import type { AnonAsk } from '@/lib/api';
import { daysLeft } from './helpers';
import { AnswerCard } from './AnswerCard';

// ── Single ask card for "From the Space" feed ─────────────────────
export function SpaceAskCard({ ask, userName, toast }: {
  ask: AnonAsk; userName: string; toast: (m: string) => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [draft, setDraft] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const submitAnswer = useSubmitAnswer();
  const { data: answers, isLoading: answersLoading } = useAskAnswers(showReplies ? ask.id : undefined);
  const left = daysLeft(ask.expiresAt);
  const replyCount = answers?.length ?? 0;

  const send = async () => {
    if (!draft.trim() || submitAnswer.isPending) return;
    try {
      await submitAnswer.mutateAsync({ id: ask.id, body: draft.trim(), authorFirstName: userName });
      setDraft('');
      setSubmitted(true);
      setShowReplies(true); // auto-show replies after posting
      toast('Sent anonymously.');
    } catch { toast('Could not submit. Try again.'); }
  };

  return (
    <div className="card" style={{ overflow: 'hidden', marginBottom: '.8rem' }}>
      {/* Question row */}
      <div style={{ padding: '1.1rem 1.3rem', display: 'flex', alignItems: 'flex-start', gap: '.8rem' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: 'var(--surf-high)',
          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2
        }}>
          <Icon name="lock" size={15} stroke="var(--ink-4)" sw={1.8} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.5rem' }}>
            <span style={{ fontSize: '.76rem', color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>
              Someone in this space
            </span>
            <span className="chip" style={{
              fontSize: '.62rem', padding: '.12rem .45rem',
              background: left <= 1 ? 'var(--ember-dim)' : 'var(--surf-high)',
              color: left <= 1 ? 'var(--ember-deep)' : 'var(--ink-4)'
            }}>
              {left === 0 ? 'expires today' : `${left}d`}
            </span>
          </div>
          <p className="serif" style={{ fontSize: '1.05rem', fontWeight: 600, lineHeight: 1.35, color: 'var(--ink)' }}>
            &ldquo;{ask.question}&rdquo;
          </p>
        </div>
      </div>

      {/* Action bar: reply + see replies */}
      <div style={{ borderTop: '1px solid var(--border)', display: 'flex', background: 'var(--surf-low)' }}>
        {submitted ? (
          <div style={{
            flex: 1, padding: '.75rem 1.1rem', display: 'flex', alignItems: 'center',
            gap: '.4rem', fontSize: '.82rem', color: 'var(--sage)', fontWeight: 500
          }}>
            <Icon name="check" size={13} stroke="var(--sage)" sw={2.5} /> Sent anonymously
          </div>
        ) : (
          <button onClick={() => setReplyOpen(s => !s)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: '.45rem',
              padding: '.75rem 1.1rem', fontSize: '.84rem', color: 'var(--ink-3)',
              fontWeight: 500, textAlign: 'left', transition: 'background .15s'
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf-high)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Icon name="comment" size={14} stroke="var(--ink-4)" />
            {replyOpen ? 'Cancel reply' : 'Reply anonymously'}
          </button>
        )}
        <button onClick={() => setShowReplies(s => !s)}
          style={{
            display: 'flex', alignItems: 'center', gap: '.35rem', padding: '.75rem 1rem',
            fontSize: '.8rem', fontWeight: 500, borderLeft: '1px solid var(--border)',
            color: showReplies ? 'var(--sage)' : 'var(--ink-4)', transition: 'background .15s'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf-high)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Icon name="eye" size={13} stroke={showReplies ? 'var(--sage)' : 'var(--ink-4)'} />
          {showReplies ? 'Hide' : 'Replies'}
          {replyCount > 0 && (
            <span style={{
              background: showReplies ? 'var(--sage)' : 'var(--surf-high)',
              color: showReplies ? '#fff' : 'var(--ink-3)', borderRadius: 100,
              padding: '0 5px', fontSize: '.7rem', fontWeight: 600, lineHeight: '18px'
            }}>
              {replyCount}
            </span>
          )}
        </button>
      </div>

      {/* Inline reply composer */}
      {replyOpen && !submitted && (
        <div className="fade-in" style={{ padding: '.9rem 1.2rem', borderTop: '1px solid var(--border)' }}>
          <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)}
            placeholder="Write honestly. Your name won't be attached."
            style={{
              width: '100%', minHeight: 68, padding: '.75rem .9rem', background: 'var(--surf-low)',
              border: '1.5px solid var(--border-2)', borderRadius: 'var(--r-md)', fontSize: '.92rem',
              lineHeight: 1.6, resize: 'none', marginBottom: '.7rem', color: 'var(--ink)',
              transition: 'border .15s, box-shadow .15s'
            }}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); }}
            onFocus={e => { e.target.style.borderColor = 'var(--sage)'; e.target.style.boxShadow = '0 0 0 3px rgba(78,125,94,.12)'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none'; }} />
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button onClick={() => { setReplyOpen(false); setDraft(''); }} className="btn btn-soft"
              style={{ padding: '.45rem .8rem', fontSize: '.82rem' }}>Cancel</button>
            <button onClick={send} disabled={!draft.trim() || submitAnswer.isPending}
              style={{
                flex: 1, padding: '.5rem 1rem', borderRadius: 'var(--r-md)', fontWeight: 600,
                fontSize: '.88rem', background: 'var(--sage)', color: '#fff',
                opacity: draft.trim() ? 1 : .5, display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '.4rem', transition: 'opacity .15s'
              }}>
              <Icon name="lock" size={14} stroke="#fff" sw={2} />
              {submitAnswer.isPending ? 'Sending…' : 'Send anonymously'}
            </button>
          </div>
        </div>
      )}

      {/* Replies */}
      {showReplies && (
        <div className="fade-in" style={{
          padding: '0 1.2rem 1.1rem',
          borderTop: '1px solid var(--border)', paddingTop: '1rem'
        }}>
          {answersLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
              <Spinner size={18} color="var(--sage)" />
            </div>
          ) : (answers ?? []).length === 0 ? (
            <p style={{
              fontSize: '.82rem', color: 'var(--ink-4)', fontStyle: 'italic', textAlign: 'center',
              padding: '.5rem 0'
            }}>
              No replies yet. Be the first.
            </p>
          ) : (
            <>
              {(answers ?? []).map((a, i) => <AnswerCard key={a.id} answer={a} index={i} />)}
              <p style={{
                fontSize: '.68rem', color: 'var(--ink-4)', fontStyle: 'italic',
                textAlign: 'center', marginTop: '.4rem'
              }}>
                All replies are fully anonymous.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
