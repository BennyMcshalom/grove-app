'use client';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { VideoPlayer } from '@/components/ui/VideoPlayer';
import { AppShell } from '@/components/layout/AppShell';
import { RPSection } from '@/components/layout/RightPanel';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { StageChip } from '@/components/ui/StageChip';
import { SpaceIcon } from '@/components/ui/SpaceIcon';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReportModal } from '@/components/ui/ReportModal';
import { useToastStore } from '@/store/useToastStore';
import { useUserStore } from '@/store/useUserStore';
import { useSpaceStore } from '@/store/useSpaceStore';
import { usePosts, useCreatePost } from '@/hooks/usePosts';
import { useSpaceMembers } from '@/hooks/useSpaces';
import { useAllAsks, useAskAnswers, usePostAsk, useSubmitAnswer, useLikeAnswer, useAnswerComments, useAddAnswerComment } from '@/hooks/useAnonAsks';
import { spaceById } from '@/lib/data';
import { formatRelativeTime } from '@/lib/mappers';
import type { AnonAsk, AnonAskAnswer } from '@/lib/api';

// ── Answer colors — rotated per reply for visual variation ────────
const ANSWER_COLORS = ['var(--sage)', 'var(--slate)', 'var(--ember)', 'var(--c-spiritual)', 'var(--c-wealth)'];

// ── Single enriched answer with anonymous like + comment ──────────
function AnswerCard({ answer, index }: { answer: AnonAskAnswer; index: number }) {
  const [liked, setLiked]             = useState(answer.userLiked);
  const [likeCount, setLikeCount]     = useState(answer.likeCount ?? 0);
  const [commentCount, setCommentCount] = useState(answer.commentCount ?? 0);
  const [showComments, setShowComments] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [reporting, setReporting] = useState(false);
  const likeAnswer   = useLikeAnswer();
  const addComment   = useAddAnswerComment();
  const { data: comments } = useAnswerComments(showComments ? answer.id : undefined);
  const color = ANSWER_COLORS[index % ANSWER_COLORS.length];

  const toggleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikeCount(n => next ? n + 1 : n - 1);
    try { await likeAnswer.mutateAsync(answer.id); }
    catch { setLiked(!next); setLikeCount(n => next ? n - 1 : n + 1); }
  };

  const submitComment = async () => {
    if (!commentDraft.trim() || addComment.isPending) return;
    const text = commentDraft.trim();
    setCommentDraft('');
    setCommentCount(n => n + 1);
    try { await addComment.mutateAsync({ answerId: answer.id, body: text }); }
    catch { setCommentDraft(text); setCommentCount(n => n - 1); }
  };

  return (
    <div className="rise" style={{ padding: '1rem 1.1rem 0', background: 'var(--white)',
      borderRadius: 'var(--r-md)', borderLeft: `3px solid ${color}`,
      boxShadow: 'var(--shadow-soft)', marginBottom: '.6rem', overflow: 'hidden' }}>

      {/* Body */}
      <p className="serif" style={{ fontSize: '1rem', lineHeight: 1.65, color: 'var(--ink)', marginBottom: '.5rem' }}>
        &ldquo;{answer.body}&rdquo;
      </p>
      <div style={{ fontSize: '.68rem', color: 'var(--ink-4)', display: 'flex', alignItems: 'center',
        gap: '.35rem', marginBottom: '.65rem' }}>
        <Icon name="lock" size={10} stroke="var(--ink-4)" sw={2}/>
        Anonymous · {formatRelativeTime(answer.createdAt)}
      </div>

      {/* Like + comment actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem',
        borderTop: '1px solid var(--border)', paddingTop: '.5rem', paddingBottom: '.55rem' }}>
        <button onClick={toggleLike}
          style={{ display: 'flex', alignItems: 'center', gap: '.3rem', padding: '.35rem .65rem',
            borderRadius: 100, fontSize: '.78rem', fontWeight: 500,
            color: liked ? 'var(--ember)' : 'var(--ink-3)',
            background: liked ? 'var(--ember-dim)' : 'transparent',
            transition: 'all .15s' }}>
          <Icon name="heart" size={13} stroke={liked ? 'var(--ember)' : 'var(--ink-3)'} sw={liked ? 0 : 1.8}/>
          {likeCount > 0 && <span style={{ fontVariantNumeric: 'tabular-nums' }}>{likeCount}</span>}
          {likeCount === 0 && 'Like'}
        </button>
        <button onClick={() => setShowComments(s => !s)}
          style={{ display: 'flex', alignItems: 'center', gap: '.3rem', padding: '.35rem .65rem',
            borderRadius: 100, fontSize: '.78rem', fontWeight: 500,
            color: showComments ? 'var(--slate)' : 'var(--ink-3)',
            background: showComments ? 'var(--slate-dim)' : 'transparent',
            transition: 'all .15s' }}>
          <Icon name="comment" size={13} stroke={showComments ? 'var(--slate)' : 'var(--ink-3)'}/>
          {commentCount > 0 ? <span>{commentCount} {commentCount === 1 ? 'reply' : 'replies'}</span> : 'Reply'}
        </button>
        <button onClick={() => setReporting(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '.3rem', padding: '.35rem .65rem',
            borderRadius: 100, fontSize: '.78rem', fontWeight: 500, color: 'var(--ink-3)' }}>
          <Icon name="flag" size={12} stroke="var(--ink-3)"/> Report
        </button>
      </div>

      {reporting && (
        <ReportModal contentType="anon_answer" contentId={answer.id} onClose={() => setReporting(false)}/>
      )}

      {/* Anonymous comments thread */}
      {showComments && (
        <div className="fade-in" style={{ borderTop: '1px solid var(--border)',
          padding: '.7rem .2rem .7rem', background: 'var(--surf-low)', margin: '0 -1.1rem',
          paddingLeft: '1.1rem', paddingRight: '1.1rem' }}>
          {(comments ?? []).map(c => (
            <div key={c.id} style={{ display: 'flex', gap: '.55rem', marginBottom: '.55rem' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--border-2)',
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                <Icon name="lock" size={10} stroke="var(--ink-4)" sw={1.8}/>
              </div>
              <div style={{ flex: 1, background: 'var(--white)', borderRadius: 'var(--r-md)',
                padding: '.5rem .75rem' }}>
                <p style={{ fontSize: '.86rem', color: 'var(--ink-2)', lineHeight: 1.45 }}>{c.body}</p>
                <div style={{ fontSize: '.66rem', color: 'var(--ink-4)', marginTop: 3 }}>
                  Anonymous · {formatRelativeTime(c.createdAt)}
                </div>
              </div>
            </div>
          ))}
          {(comments ?? []).length === 0 && !addComment.isPending && (
            <p style={{ fontSize: '.78rem', color: 'var(--ink-4)', fontStyle: 'italic', marginBottom: '.5rem' }}>
              No replies yet.
            </p>
          )}
          <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center', marginTop: '.3rem' }}>
            <input value={commentDraft} onChange={e => setCommentDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitComment(); }}
              placeholder="Reply anonymously…"
              style={{ flex: 1, padding: '.55rem .8rem', borderRadius: 100, fontSize: '.84rem',
                border: '1.5px solid var(--border-2)', background: 'var(--white)' }}
              onFocus={e => { e.target.style.borderColor = 'var(--sage)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; }}/>
            <button onClick={submitComment} disabled={!commentDraft.trim() || addComment.isPending}
              style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--sage)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                opacity: commentDraft.trim() ? 1 : .45, transition: 'opacity .15s' }}>
              <Icon name="send" size={14} stroke="#fff"/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function daysLeft(expiresAt: string) {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000));
}

// ── MyAsk section ─────────────────────────────────────────────────
function MyAskSection({ ask, submitAnswer, answerText, setAnswerText, userName, toast }: {
  ask: AnonAsk | null;
  submitAnswer: ReturnType<typeof useSubmitAnswer>;
  answerText: string; setAnswerText: (v: string) => void;
  userName: string; toast: (m: string) => void;
}) {
  const { data: answers } = useAskAnswers(ask?.id);
  const [expanded, setExpanded] = useState(false);
  const replies = answers ?? [];
  const left = ask ? daysLeft(ask.expiresAt) : 0;

  return (
    <section>
      <div className="label-mono" style={{ marginBottom: '.7rem' }}>Your ask</div>

      {ask ? (
        <div className="card" style={{ overflow: 'hidden' }}>
          {/* Question */}
          <div style={{ padding: '1.3rem 1.4rem', borderLeft: '4px solid var(--sage)',
            background: 'linear-gradient(160deg, var(--white) 55%, rgba(78,125,94,.05))' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.8rem', marginBottom: '.8rem' }}>
              <p className="serif" style={{ fontSize: '1.2rem', fontWeight: 600, lineHeight: 1.35, color: 'var(--ink)', flex: 1 }}>
                &ldquo;{ask.question}&rdquo;
              </p>
              <span className="chip" style={{ flexShrink: 0, background: left <= 1 ? 'var(--ember-dim)' : 'rgba(78,125,94,.12)',
                color: left <= 1 ? 'var(--ember-deep)' : 'var(--sage)', fontWeight: 600, fontSize: '.68rem' }}>
                {left === 0 ? 'Expires today' : `${left}d left`}
              </span>
            </div>
            <button onClick={() => setExpanded(e => !e)}
              style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.82rem',
                color: replies.length > 0 ? 'var(--sage)' : 'var(--ink-4)', fontWeight: 500 }}>
              <Icon name="lock" size={13} stroke={replies.length > 0 ? 'var(--sage)' : 'var(--ink-4)'} sw={2}/>
              {replies.length === 0
                ? 'No replies yet — check back soon'
                : `${replies.length} honest repl${replies.length === 1 ? 'y' : 'ies'} · ${expanded ? 'hide' : 'read'}`}
              {replies.length > 0 && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--sage)" strokeWidth="2.5" strokeLinecap="round"
                  style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .2s' }}>
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              )}
            </button>
          </div>

          {/* Expanded replies */}
          {expanded && replies.length > 0 && (
            <div style={{ padding: '0 1.4rem 1.2rem', borderTop: '1px solid var(--border)' }}>
              <div style={{ paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
                {replies.map((a, i) => (
                  <div key={a.id} className="rise" style={{ animationDelay: `${i * 0.05}s`,
                    padding: '1rem 1.1rem', background: 'var(--surf-low)', borderRadius: 'var(--r-md)',
                    borderLeft: `3px solid ${ANSWER_COLORS[i % ANSWER_COLORS.length]}` }}>
                    <p className="serif" style={{ fontSize: '1.02rem', lineHeight: 1.6, color: 'var(--ink)', marginBottom: '.45rem' }}>
                      &ldquo;{a.body}&rdquo;
                    </p>
                    <div style={{ fontSize: '.7rem', color: 'var(--ink-4)', display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                      <Icon name="lock" size={10} stroke="var(--ink-4)" sw={2}/>
                      Anonymous · {formatRelativeTime(a.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '.72rem', color: 'var(--ink-4)', fontStyle: 'italic', textAlign: 'center', marginTop: '.9rem' }}>
                Fully anonymous — even Grouv can&apos;t see who sent which reply.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* ── No active ask: composer ── */
        <div className="card" style={{ padding: '1.3rem 1.4rem' }}>
          <p style={{ fontSize: '.88rem', color: 'var(--ink-3)', lineHeight: 1.55, marginBottom: '1rem' }}>
            Ask the space something you&apos;re sitting with. Replies come back without names.
          </p>
          <textarea value={answerText} onChange={e => setAnswerText(e.target.value)}
            placeholder="What do you actually want to know from this space?"
            style={{ width: '100%', minHeight: 72, padding: '.85rem 1rem', background: 'var(--surf-low)',
              border: '1.5px solid var(--border-2)', borderRadius: 'var(--r-md)', fontSize: '.95rem',
              lineHeight: 1.6, resize: 'vertical', marginBottom: '.8rem', color: 'var(--ink)',
              transition: 'border .15s, box-shadow .15s' }}
            onFocus={e => { e.target.style.borderColor = 'var(--sage)'; e.target.style.boxShadow = '0 0 0 3px rgba(78,125,94,.15)'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none'; }}/>
          <button
            style={{ background: 'var(--sage)', color: '#fff', width: '100%', padding: '.65rem 1rem',
              borderRadius: 'var(--r-md)', fontWeight: 600, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '.45rem', fontSize: '.9rem', opacity: answerText.trim() ? 1 : .55,
              transition: 'opacity .15s' }}
            disabled={!answerText.trim() || submitAnswer.isPending}
            onClick={async () => {
              toast('This section posts your question, not a reply — use the space feed for replies.');
            }}>
            <Icon name="lock" size={15} stroke="#fff" sw={2}/>
            Ask the space
          </button>
          <p style={{ fontSize: '.72rem', color: 'var(--ink-4)', textAlign: 'center', marginTop: '.5rem' }}>
            Live for 7 days · Replies come back without names
          </p>
        </div>
      )}
    </section>
  );
}

// ── Single ask card for "From the Space" feed ─────────────────────
function SpaceAskCard({ ask, userName, toast }: {
  ask: AnonAsk; userName: string; toast: (m: string) => void;
}) {
  const [replyOpen,  setReplyOpen]  = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [draft, setDraft]           = useState('');
  const [submitted, setSubmitted]   = useState(false);
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
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surf-high)',
          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
          <Icon name="lock" size={15} stroke="var(--ink-4)" sw={1.8}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.5rem' }}>
            <span style={{ fontSize: '.76rem', color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>
              Someone in this space
            </span>
            <span className="chip" style={{ fontSize: '.62rem', padding: '.12rem .45rem',
              background: left <= 1 ? 'var(--ember-dim)' : 'var(--surf-high)',
              color: left <= 1 ? 'var(--ember-deep)' : 'var(--ink-4)' }}>
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
          <div style={{ flex: 1, padding: '.75rem 1.1rem', display: 'flex', alignItems: 'center',
            gap: '.4rem', fontSize: '.82rem', color: 'var(--sage)', fontWeight: 500 }}>
            <Icon name="check" size={13} stroke="var(--sage)" sw={2.5}/> Sent anonymously
          </div>
        ) : (
          <button onClick={() => setReplyOpen(s => !s)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '.45rem',
              padding: '.75rem 1.1rem', fontSize: '.84rem', color: 'var(--ink-3)',
              fontWeight: 500, textAlign: 'left', transition: 'background .15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf-high)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Icon name="comment" size={14} stroke="var(--ink-4)"/>
            {replyOpen ? 'Cancel reply' : 'Reply anonymously'}
          </button>
        )}
        <button onClick={() => setShowReplies(s => !s)}
          style={{ display: 'flex', alignItems: 'center', gap: '.35rem', padding: '.75rem 1rem',
            fontSize: '.8rem', fontWeight: 500, borderLeft: '1px solid var(--border)',
            color: showReplies ? 'var(--sage)' : 'var(--ink-4)', transition: 'background .15s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf-high)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Icon name="eye" size={13} stroke={showReplies ? 'var(--sage)' : 'var(--ink-4)'}/>
          {showReplies ? 'Hide' : 'Replies'}
          {replyCount > 0 && (
            <span style={{ background: showReplies ? 'var(--sage)' : 'var(--surf-high)',
              color: showReplies ? '#fff' : 'var(--ink-3)', borderRadius: 100,
              padding: '0 5px', fontSize: '.7rem', fontWeight: 600, lineHeight: '18px' }}>
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
            style={{ width: '100%', minHeight: 68, padding: '.75rem .9rem', background: 'var(--surf-low)',
              border: '1.5px solid var(--border-2)', borderRadius: 'var(--r-md)', fontSize: '.92rem',
              lineHeight: 1.6, resize: 'none', marginBottom: '.7rem', color: 'var(--ink)',
              transition: 'border .15s, box-shadow .15s' }}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); }}
            onFocus={e => { e.target.style.borderColor = 'var(--sage)'; e.target.style.boxShadow = '0 0 0 3px rgba(78,125,94,.12)'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none'; }}/>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button onClick={() => { setReplyOpen(false); setDraft(''); }} className="btn btn-soft"
              style={{ padding: '.45rem .8rem', fontSize: '.82rem' }}>Cancel</button>
            <button onClick={send} disabled={!draft.trim() || submitAnswer.isPending}
              style={{ flex: 1, padding: '.5rem 1rem', borderRadius: 'var(--r-md)', fontWeight: 600,
                fontSize: '.88rem', background: 'var(--sage)', color: '#fff',
                opacity: draft.trim() ? 1 : .5, display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '.4rem', transition: 'opacity .15s' }}>
              <Icon name="lock" size={14} stroke="#fff" sw={2}/>
              {submitAnswer.isPending ? 'Sending…' : 'Send anonymously'}
            </button>
          </div>
        </div>
      )}

      {/* Replies */}
      {showReplies && (
        <div className="fade-in" style={{ padding: '0 1.2rem 1.1rem',
          borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          {answersLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
              <Spinner size={18} color="var(--sage)"/>
            </div>
          ) : (answers ?? []).length === 0 ? (
            <p style={{ fontSize: '.82rem', color: 'var(--ink-4)', fontStyle: 'italic', textAlign: 'center',
              padding: '.5rem 0' }}>
              No replies yet — be the first.
            </p>
          ) : (
            <>
              {(answers ?? []).map((a, i) => <AnswerCard key={a.id} answer={a} index={i}/>)}
              <p style={{ fontSize: '.68rem', color: 'var(--ink-4)', fontStyle: 'italic',
                textAlign: 'center', marginTop: '.4rem' }}>
                All replies are fully anonymous.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Full board ────────────────────────────────────────────────────
function AskBoard({ spaceUuid, myAsk, otherAsks, askText, setAskText, answerText, setAnswerText,
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
              style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.8rem',
                color: 'var(--sage)', fontWeight: 600 }}>
              <Icon name="plus" size={14} stroke="var(--sage)" sw={2}/> Ask something
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
              style={{ width: '100%', minHeight: 72, padding: '.85rem 1rem', background: 'var(--surf-low)',
                border: '1.5px solid var(--border-2)', borderRadius: 'var(--r-md)', fontSize: '.95rem',
                lineHeight: 1.6, resize: 'vertical', marginBottom: '.8rem', color: 'var(--ink)',
                transition: 'border .15s, box-shadow .15s' }}
              onFocus={e => { e.target.style.borderColor = 'var(--sage)'; e.target.style.boxShadow = '0 0 0 3px rgba(78,125,94,.15)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none'; }}/>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <button onClick={() => { setAskOpen(false); setAskText(''); }} className="btn btn-soft"
                style={{ padding: '.5rem .9rem', fontSize: '.84rem' }}>Cancel</button>
              <button
                style={{ flex: 1, background: 'var(--sage)', color: '#fff', padding: '.6rem 1rem',
                  borderRadius: 'var(--r-md)', fontWeight: 600, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '.45rem', fontSize: '.9rem',
                  opacity: askText.trim() && !postAsk.isPending ? 1 : .55, transition: 'opacity .15s' }}
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
                <Icon name="lock" size={15} stroke="#fff" sw={2}/>
                {postAsk.isPending ? 'Posting…' : 'Ask the space'}
              </button>
            </div>
            <p style={{ fontSize: '.72rem', color: 'var(--ink-4)', textAlign: 'center', marginTop: '.5rem' }}>
              Live for 7 days · Replies come back without names
            </p>
          </div>
        ) : (
          <button onClick={() => setAskOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '.8rem', width: '100%',
              padding: '1rem 1.2rem', borderRadius: 'var(--r-lg)', border: '1.5px dashed var(--border-2)',
              background: 'var(--surf-low)', textAlign: 'left', transition: 'border-color .15s, background .15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--sage)'; (e.currentTarget as HTMLElement).style.background = 'rgba(78,125,94,.04)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-2)'; (e.currentTarget as HTMLElement).style.background = 'var(--surf-low)'; }}>
            <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--white)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'var(--shadow-soft)' }}>
              <Icon name="comment" size={16} stroke="var(--sage)" sw={1.8}/>
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
            <SpaceAskCard key={ask.id} ask={ask} userName={userName} toast={toast}/>
          ))}
          <p style={{ fontSize: '.72rem', color: 'var(--ink-4)', fontStyle: 'italic',
            textAlign: 'center', lineHeight: 1.5 }}>
            Your replies are anonymous — no one in the space, including the asker, knows it&apos;s you.
          </p>
        </section>
      )}

      {/* ── Empty: no asks at all ── */}
      {!myAsk && otherAsks.length === 0 && !askOpen && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--ink-3)' }}>
          <p style={{ fontSize: '.88rem', lineHeight: 1.6 }}>
            No active questions in this space yet.<br/>Be the first to ask something honest.
          </p>
        </div>
      )}
    </div>
  );
}

// ── MyAskCard — used inside AskBoard ─────────────────────────────
function MyAskCard({ ask }: { ask: AnonAsk }) {
  const { data: answers } = useAskAnswers(ask.id);
  const [expanded, setExpanded] = useState(false);
  const replies = answers ?? [];
  const left = daysLeft(ask.expiresAt);

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '1.2rem 1.4rem', borderLeft: '4px solid var(--sage)',
        background: 'linear-gradient(160deg, var(--white) 55%, rgba(78,125,94,.05))' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.8rem', marginBottom: '.7rem' }}>
          <p className="serif" style={{ fontSize: '1.15rem', fontWeight: 600, lineHeight: 1.35, color: 'var(--ink)', flex: 1 }}>
            &ldquo;{ask.question}&rdquo;
          </p>
          <span className="chip" style={{ flexShrink: 0,
            background: left <= 1 ? 'var(--ember-dim)' : 'rgba(78,125,94,.12)',
            color: left <= 1 ? 'var(--ember-deep)' : 'var(--sage)', fontWeight: 600, fontSize: '.66rem' }}>
            {left === 0 ? 'Today' : `${left}d left`}
          </span>
        </div>
        <button onClick={() => setExpanded(e => !e)}
          style={{ display: 'flex', alignItems: 'center', gap: '.45rem', fontSize: '.8rem',
            color: replies.length > 0 ? 'var(--sage)' : 'var(--ink-4)', fontWeight: 500 }}>
          <Icon name="lock" size={12} stroke={replies.length > 0 ? 'var(--sage)' : 'var(--ink-4)'} sw={2}/>
          {replies.length === 0
            ? 'No replies yet'
            : `${replies.length} honest repl${replies.length === 1 ? 'y' : 'ies'} · ${expanded ? 'collapse' : 'read'}`}
          {replies.length > 0 && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--sage)" strokeWidth="2.5" strokeLinecap="round"
              style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .2s' }}>
              <path d="M9 18l6-6-6-6"/>
            </svg>
          )}
        </button>
      </div>

      {expanded && replies.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '.9rem 1.4rem 1.2rem' }}>
          {replies.map((a, i) => <AnswerCard key={a.id} answer={a} index={i}/>)}
          <p style={{ fontSize: '.7rem', color: 'var(--ink-4)', fontStyle: 'italic', textAlign: 'center', marginTop: '.3rem' }}>
            Fully anonymous — even Grouv can&apos;t see who sent which reply.
          </p>
        </div>
      )}
    </div>
  );
}

export default function SpaceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToastStore();
  const { user } = useUserStore();
  const { uuidBySlug } = useSpaceStore();

  const slug = params.id as string;
  const s = spaceById(slug);
  const spaceUuid = uuidBySlug(slug);

  const [tab, setTab] = useState('roots');
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("I'm ");
  const [honest, setHonest] = useState('');
  const [askText, setAskText] = useState('');
  const [answerText, setAnswerText] = useState('');

  // ── Live data ──
  const { data: postRecords, isLoading: postsLoading } = usePosts(spaceUuid);
  const { data: openPostRecords, isLoading: openLoading } = usePosts(spaceUuid);
  const { data: members, isLoading: membersLoading } = useSpaceMembers(spaceUuid);
  const { data: allAsks } = useAllAsks(spaceUuid);
  const myAsk    = allAsks?.find(a => a.isOwn) ?? null;
  const otherAsks = allAsks?.filter(a => !a.isOwn) ?? [];
  const createPost   = useCreatePost();
  const postAsk      = usePostAsk();
  const submitAnswer = useSubmitAnswer();

  const posts = (postRecords ?? []).map(r => ({
    id: r.id, anon: r.isAnonymous,
    name: r.isAnonymous ? undefined : (r.authorName ?? r.userId),
    userId: r.userId,
    avatarUrl: r.isAnonymous ? null : (r.authorAvatar ?? null),
    time: formatRelativeTime(r.createdAt), doing: r.doing ?? '', honest: r.honestThing ?? '',
    progress: r.progress ?? '',
    media: r.mediaUrl ? { type: (r.mediaType?.startsWith('video') ? 'video' : 'image') as 'image'|'video', src: r.mediaUrl } : undefined,
  }));

  const right = (
    <RPSection label="In this space">
      {membersLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}><Spinner size={18}/></div>
      ) : members && members.length > 0 ? (
        members.slice(0, 6).map(m => (
          <button key={m.id} onClick={() => router.push(`/grove/${m.id}`)}
            style={{ display: 'flex', width: '100%', textAlign: 'left', alignItems: 'center',
              gap: '.7rem', padding: '.45rem .3rem', borderRadius: 'var(--r-md)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf-low)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Avatar name={m.displayName} size={36} avatarUrl={m.avatarUrl}/>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: '.84rem' }}>{m.displayName}</div>
              {m.stage && <div style={{ fontSize: '.72rem', color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.stage}</div>}
            </div>
          </button>
        ))
      ) : (
        <p style={{ fontSize: '.82rem', color: 'var(--ink-4)', fontStyle: 'italic' }}>No one else here yet.</p>
      )}
      {members && members.length > 6 && (
        <button onClick={() => setTab('members')} style={{ fontSize: '.78rem', color: 'var(--ember)', fontWeight: 500, marginTop: '.4rem' }}>
          View all {members.length} members →
        </button>
      )}
    </RPSection>
  );

  const TABS: [string, string][] = [['roots','Roots'],['open','Open'],['ask','Anonymous Ask'],['members','Members']];

  return (
    <AppShell title={s.name} right={right}>
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '0 1.6rem 3rem' }}>
        {/* Breadcrumb + header */}
        <button onClick={() => router.push('/spaces')} style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.82rem', color: 'var(--ink-3)', marginBottom: '.8rem' }}>
          <Icon name="back" size={15} stroke="var(--ink-3)"/> My Spaces
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.8rem', marginBottom: '1.2rem' }}>
          <SpaceIcon spaceId={slug} size={22} pill pillSize={44}/>
          <div>
            <h2 className="serif" style={{ fontSize: '1.4rem', fontWeight: 600 }}>{s.name}</h2>
            <div style={{ fontSize: '.78rem', color: 'var(--ink-4)' }}>
              {members?.length ?? 0} people in this chapter
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="scroll" style={{ display: 'flex', gap: '.2rem', overflowX: 'auto', borderBottom: '1px solid var(--border)', marginBottom: '1.2rem' }}>
          {TABS.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding: '.6rem .9rem', fontSize: '.88rem', fontWeight: 500, whiteSpace: 'nowrap',
              color: tab === id ? 'var(--ember)' : 'var(--ink-3)',
              borderBottom: tab === id ? '2px solid var(--ember)' : '2px solid transparent', marginBottom: -1 }}>{label}</button>
          ))}
        </div>

        {/* ── Roots tab ── */}
        {tab === 'roots' && (
          <>
            {/* Quick composer */}
            {!composing ? (
              <button onClick={() => setComposing(true)} className="card"
                style={{ display: 'flex', alignItems: 'center', gap: '.8rem', width: '100%', textAlign: 'left',
                  padding: '1rem 1.2rem', marginBottom: '1rem', boxShadow: 'var(--shadow-soft)' }}>
                <Avatar name={user.name} size={36} avatarUrl={user.avatar_url}/>
                <span style={{ color: 'var(--ink-4)', fontSize: '.9rem' }}>Root a thought in {s.name}…</span>
              </button>
            ) : (
              <div className="card" style={{ padding: '1.2rem', marginBottom: '1rem', boxShadow: 'var(--shadow-soft)' }}>
                <textarea value={draft} onChange={e => setDraft(e.target.value)}
                  placeholder="What are you doing right now?"
                  style={{ width: '100%', minHeight: 60, resize: 'vertical', border: 'none', background: 'transparent', fontSize: '.95rem', lineHeight: 1.5, marginBottom: '.6rem' }}/>
                <textarea value={honest} onChange={e => setHonest(e.target.value)}
                  placeholder="The honest thing is…"
                  style={{ width: '100%', minHeight: 60, resize: 'vertical', border: 'none', background: 'transparent', fontSize: '.95rem', lineHeight: 1.5, borderTop: '1px solid var(--border)', paddingTop: '.6rem' }}/>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.5rem', marginTop: '.8rem' }}>
                  <button onClick={() => { setComposing(false); setDraft("I'm "); setHonest(''); }} className="btn btn-soft" style={{ padding: '.4rem .8rem', fontSize: '.82rem' }}>Cancel</button>
                  <button
                    disabled={!draft.trim() || !honest.trim() || createPost.isPending || !spaceUuid}
                    onClick={async () => {
                      if (!spaceUuid) return;
                      try {
                        await createPost.mutateAsync({ spaceId: spaceUuid, kind: 'roots', doing: draft.trim(), honestThing: honest.trim() });
                        setComposing(false); setDraft("I'm "); setHonest('');
                        toast('Rooted in ' + s.name);
                      } catch { toast('Could not post.'); }
                    }}
                    className="btn btn-primary" style={{ padding: '.4rem .9rem', fontSize: '.82rem' }}>
                    {createPost.isPending ? 'Posting…' : 'Root this'}
                  </button>
                </div>
              </div>
            )}

            {postsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Spinner/></div>
            ) : posts.length === 0 ? (
              <div className="card" style={{ background: 'linear-gradient(160deg, var(--green-dim), var(--ember-dim))', maxWidth: 480, margin: '0 auto' }}>
                <EmptyState variant="feed" title={`Nothing rooted in ${s.name} yet.`} body="Be the first to root a thought here."/>
              </div>
            ) : posts.map(p => (
              <article key={p.id} className="card" style={{ padding: '1.1rem 1.2rem', marginBottom: '.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', marginBottom: '.7rem' }}>
                  <Avatar name={p.name ?? ''} anon={p.anon} size={38} avatarUrl={p.anon ? undefined : p.avatarUrl}/>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '.88rem' }}>{p.anon ? 'Someone in your space' : p.name}</div>
                    <div style={{ fontSize: '.7rem', color: 'var(--ink-4)', fontFamily: 'DM Mono, monospace' }}>{p.time}</div>
                  </div>
                </div>
                <p style={{ fontWeight: 500, marginBottom: '.25rem', fontSize: '.92rem' }}>{p.doing}</p>
                <p style={{ fontStyle: 'italic', color: 'var(--ink-2)', fontSize: '.88rem', lineHeight: 1.55 }}>{p.honest}</p>
                {p.media && (
                  <div style={{ marginTop: '.8rem' }}>
                    {p.media.type === 'video'
                      ? <VideoPlayer src={p.media.src} maxHeight={280}/>
                      : <div style={{ borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surf-high)' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={p.media.src} alt="" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', display: 'block' }}/>
                        </div>}
                  </div>
                )}
              </article>
            ))}
          </>
        )}

        {/* ── Open tab — posts visible to all (from anyone in this space) ── */}
        {tab === 'open' && (
          <>
            <p style={{ color: 'var(--ink-3)', marginBottom: '1rem', fontSize: '.9rem' }}>
              Posts from everyone in this space — not just your circle.
            </p>
            {openLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Spinner/></div>
            ) : posts.length === 0 ? (
              <div className="card" style={{ background: 'linear-gradient(160deg, var(--slate-dim), var(--ember-dim))', maxWidth: 480, margin: '0 auto' }}>
                <EmptyState variant="feed" title="Nothing shared yet." body="Posts from this space will appear here."/>
              </div>
            ) : posts.map(p => (
              <article key={p.id} className="card" style={{ padding: '1.1rem 1.2rem', marginBottom: '.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', marginBottom: '.7rem' }}>
                  <Avatar name={p.name ?? ''} anon={p.anon} size={38} avatarUrl={p.anon ? undefined : p.avatarUrl}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '.88rem' }}>{p.anon ? 'Someone in this chapter' : p.name}</div>
                    <div style={{ fontSize: '.7rem', color: 'var(--ink-4)', fontFamily: 'DM Mono, monospace' }}>{p.time}</div>
                  </div>
                  {!p.anon && p.userId && (
                    <button onClick={() => router.push(`/grove/${p.userId}`)}
                      className="btn btn-ghost" style={{ padding: '.35rem .8rem', fontSize: '.76rem' }}>
                      View Grove
                    </button>
                  )}
                </div>
                <p style={{ fontWeight: 500, marginBottom: '.25rem', fontSize: '.92rem' }}>{p.doing}</p>
                <p style={{ fontStyle: 'italic', color: 'var(--ink-2)', fontSize: '.88rem', lineHeight: 1.55 }}>{p.honest}</p>
              </article>
            ))}
          </>
        )}

        {/* ── Anonymous Ask tab ── */}
        {tab === 'ask' && (
          <AskBoard
            spaceUuid={spaceUuid}
            myAsk={myAsk}
            otherAsks={otherAsks}
            askText={askText}
            setAskText={setAskText}
            answerText={answerText}
            setAnswerText={setAnswerText}
            postAsk={postAsk}
            submitAnswer={submitAnswer}
            userName={user.name}
            toast={toast}
          />
        )}

        {/* ── Members tab ── */}
        {tab === 'members' && (
          membersLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Spinner/></div>
          ) : !members || members.length === 0 ? (
            <div className="card" style={{ background: 'linear-gradient(160deg, var(--slate-dim), var(--green-dim))', maxWidth: 480, margin: '0 auto' }}>
              <EmptyState variant="groups" title="No members yet." body="Be the first person in this chapter."/>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
              {members.map(m => (
                <div key={m.id} className="card" style={{ padding: '.85rem 1.1rem', display: 'flex', alignItems: 'center', gap: '.8rem', boxShadow: 'var(--shadow-soft)' }}>
                  <button onClick={() => router.push(`/grove/${m.id}`)}>
                    <Avatar name={m.displayName} size={44} avatarUrl={m.avatarUrl}/>
                  </button>
                  <button onClick={() => router.push(`/grove/${m.id}`)}
                    style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <div style={{ fontWeight: 600 }}>{m.displayName}</div>
                    {m.stage && <div style={{ fontSize: '.76rem', color: 'var(--ink-3)', marginTop: 2 }}>{m.stage}</div>}
                    {m.openTo && <div style={{ fontSize: '.74rem', color: 'var(--ink-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.openTo}</div>}
                  </button>
                  <button onClick={() => router.push(`/grove/${m.id}`)}
                    className="btn btn-soft" style={{ padding: '.45rem .8rem', fontSize: '.8rem' }}>
                    Enter Grove →
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </AppShell>
  );
}
