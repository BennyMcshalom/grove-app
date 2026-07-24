'use client';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useAskAnswers } from '@/hooks/useAnonAsks';
import type { AnonAsk } from '@/lib/api';
import { daysLeft } from './helpers';
import { AnswerCard } from './AnswerCard';

// ── MyAskCard — used inside AskBoard ─────────────────────────────
export function MyAskCard({ ask }: { ask: AnonAsk }) {
  const { data: answers } = useAskAnswers(ask.id);
  const [expanded, setExpanded] = useState(false);
  const replies = answers ?? [];
  const left = daysLeft(ask.expiresAt);

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{
        padding: '1.2rem 1.4rem', borderLeft: '4px solid var(--sage)',
        background: 'linear-gradient(160deg, var(--white) 55%, rgba(78,125,94,.05))'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.8rem', marginBottom: '.7rem' }}>
          <p className="serif" style={{ fontSize: '1.15rem', fontWeight: 600, lineHeight: 1.35, color: 'var(--ink)', flex: 1 }}>
            &ldquo;{ask.question}&rdquo;
          </p>
          <span className="chip" style={{
            flexShrink: 0,
            background: left <= 1 ? 'var(--ember-dim)' : 'rgba(78,125,94,.12)',
            color: left <= 1 ? 'var(--ember-deep)' : 'var(--sage)', fontWeight: 600, fontSize: '.66rem'
          }}>
            {left === 0 ? 'Today' : `${left}d left`}
          </span>
        </div>
        <button onClick={() => setExpanded(e => !e)}
          style={{
            display: 'flex', alignItems: 'center', gap: '.45rem', fontSize: '.8rem',
            color: replies.length > 0 ? 'var(--sage)' : 'var(--ink-4)', fontWeight: 500
          }}>
          <Icon name="lock" size={12} stroke={replies.length > 0 ? 'var(--sage)' : 'var(--ink-4)'} sw={2} />
          {replies.length === 0
            ? 'No replies yet'
            : `${replies.length} honest repl${replies.length === 1 ? 'y' : 'ies'} · ${expanded ? 'collapse' : 'read'}`}
          {replies.length > 0 && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--sage)" strokeWidth="2.5" strokeLinecap="round"
              style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .2s' }}>
              <path d="M9 18l6-6-6-6" />
            </svg>
          )}
        </button>
      </div>

      {expanded && replies.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '.9rem 1.4rem 1.2rem' }}>
          {replies.map((a, i) => <AnswerCard key={a.id} answer={a} index={i} />)}
          <p style={{ fontSize: '.7rem', color: 'var(--ink-4)', fontStyle: 'italic', textAlign: 'center', marginTop: '.3rem' }}>
            Fully anonymous. Even Grouv can&apos;t see who sent which reply.
          </p>
        </div>
      )}
    </div>
  );
}
