'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToastStore } from '@/store/useToastStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUserStore } from '@/store/useUserStore';
import { useBondMessages, useSendBondMessage, useUploadVoice } from '@/hooks/useBonds';
import { bondsApi } from '@/lib/api';
import { startCall } from '@/lib/calling';
import { humanDuration } from '@/lib/mappers';
import type { BondRecord, BondMessage } from '@/lib/api';
import { MessageBubble } from './MessageBubble';
import { RecordingBar } from './RecordingBar';


export function BondThread({ bond, onTogglePanel }: { bond: BondRecord; onTogglePanel: () => void }) {
  const router = useRouter();
  const { toast } = useToastStore();
  const { user: authUser } = useAuthStore();
  const { user: me } = useUserStore();
  const myId = authUser?.id ?? '';
  const otherName = bond.otherUser?.displayName ?? 'Bond';

  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<BondMessage | null>(null);
  const [composerFocused, setComposerFocused] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow the composer up to a capped height, then let it scroll.
  useEffect(() => {
    const el = draftRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 110)}px`;
  }, [draft]);

  // Voice recording
  const [recording, setRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recStart = useRef(0);

  const { data: messages, isLoading } = useBondMessages(bond.id);
  const sendMsg = useSendBondMessage(bond.id);
  const uploadVoice = useUploadVoice(bond.id);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages?.length]);

  // On mobile the list/thread panes toggle via CSS display:none rather than
  // unmount — a hidden element reports scrollHeight 0, so the effect above
  // silently no-ops while messages load off-screen. Re-anchor to the bottom
  // the moment this pane actually becomes visible (but only on that reveal,
  // not on every resize, so it doesn't yank a mid-read scroll position).
  const wasHiddenRef = useRef(true);
  useEffect(() => {
    const el = threadRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      const visible = entry.contentRect.height > 0;
      if (visible && wasHiddenRef.current) el.scrollTop = el.scrollHeight;
      wasHiddenRef.current = !visible;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Mark read on open
  useEffect(() => { bondsApi.markRead(bond.id).catch(() => { }); }, [bond.id]);

  // Recording timer
  useEffect(() => {
    if (!recording) { setRecTime(0); return; }
    const id = setInterval(() => setRecTime(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  const sendTextWithOpts = async () => {
    if (!draft.trim() || sendMsg.isPending) return;
    const text = draft.trim();
    const replyOpts = replyTo
      ? { replyToId: replyTo.id, replyPreview: (replyTo.body ?? 'Voice note').slice(0, 80) }
      : undefined;
    setDraft(''); setReplyTo(null);
    try {
      await sendMsg.mutateAsync({ body: text, ...replyOpts });
    } catch { toast('Message failed.'); setDraft(text); }
  };

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mr = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => stream.getTracks().forEach(t => t.stop());
      mr.start(100);
      mrRef.current = mr;
      recStart.current = Date.now();
      setRecording(true);
    } catch { toast('Microphone access denied.'); }
  };

  const cancelRec = () => { mrRef.current?.stop(); mrRef.current = null; chunksRef.current = []; setRecording(false); };

  // Bonds are now remounted (key={bond.id}) on every switch — make sure an
  // in-progress recording's mic actually stops rather than staying hot.
  useEffect(() => () => { mrRef.current?.stop(); mrRef.current = null; }, []);

  const sendVoice = async () => {
    const mr = mrRef.current;
    if (!mr) return;
    mrRef.current = null;
    setRecording(false);
    const dur = Math.round((Date.now() - recStart.current) / 1000);
    // Wait for the onstop event — guarantees all ondataavailable chunks have arrived
    const blob = await new Promise<Blob>(resolve => {
      mr.addEventListener('stop', () => {
        resolve(new Blob(chunksRef.current, { type: mr.mimeType }));
      }, { once: true });
      mr.stop();
    });
    try { await uploadVoice.mutateAsync({ blob, duration: dur }); }
    catch { toast('Voice note failed.'); }
  };

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, position: 'relative',
      background: 'var(--white)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', overflow: 'hidden'
    }}>

      {/* ── Header ── */}
      <header style={{ padding: '1.1rem 1.3rem', borderBottom: '1px solid var(--border)', background: 'var(--white)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
          <button onClick={() => bond.otherUser?.id && router.push(`/grove/${bond.otherUser.id}`)} title="Enter their Grouv" style={{ flexShrink: 0 }}>
            <Avatar name={otherName} size={46} aura={bond.otherUser?.aura ?? undefined} avatarUrl={bond.otherUser?.avatarUrl} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <button onClick={() => bond.otherUser?.id && router.push(`/grove/${bond.otherUser.id}`)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', fontWeight: 600, fontSize: '.95rem',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>{otherName}</button>
            {bond.otherUser?.openTo && (
              <div style={{
                fontSize: '.74rem', color: 'var(--ink-4)', marginTop: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {bond.otherUser.openTo}
              </div>
            )}
          </div>
          <button title="Voice call" onClick={() => startCall(bond, 'voice')}
            style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--slate-dim)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Icon name="phone" size={19} stroke="var(--slate)" />
          </button>
          <button title="Video call" onClick={() => startCall(bond, 'video')}
            style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--slate-dim)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Icon name="video" size={19} stroke="var(--slate)" />
          </button>
          <button title="Bond info" onClick={onTogglePanel}
            style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--slate-dim)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Icon name="panel" size={19} stroke="var(--slate)" />
          </button>
        </div>

        {bond.status === 'circle' ? (
          <div style={{ marginTop: '.9rem', fontSize: '.74rem', color: 'var(--ink-4)', fontStyle: 'italic' }}>
            You started Grouving recently. Keep showing up, Bonds grow from here.
          </div>
        ) : (
          <div style={{ marginTop: '.9rem', display: 'flex', alignItems: 'center', gap: '.7rem' }}>
            <span className="label-mono">Bond depth</span>
            <div style={{ flex: 1 }}><ProgressBar value={bond.depthScore ?? 0} /></div>
            <span style={{ fontSize: '.72rem', color: 'var(--ink-4)' }}>{humanDuration(bond.formedAt)}</span>
          </div>
        )}
      </header>

      {/* ── Deep Focus banner ── */}
      {bond.otherUser?.deepFocusActive && (
        <div style={{
          padding: '.55rem 1.2rem', background: 'var(--ink)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '.5rem'
        }}>
          <Icon name="moon" size={13} stroke="var(--cream)" sw={1.8} />
          <span style={{ fontSize: '.78rem', color: 'var(--cream)', fontWeight: 500 }}>
            {bond.otherUser.displayName?.split(' ')[0]} is in Deep Focus. They&apos;ll see your message when they return.
          </span>
        </div>
      )}

      {/* ── Messages ── */}
      <div ref={threadRef} className="scroll" style={{
        flex: 1, overflowY: 'auto',
        padding: '1.3rem', background: 'var(--surf-low)'
      }}>

        {bond.status === 'bond' && (bond.depthScore ?? 0) > 70 && (
          <div className="card" style={{
            padding: '1rem 1.2rem', marginBottom: '1.2rem',
            background: 'var(--ember-dim)', border: '1px solid var(--ember-bdr)', textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.4rem' }}>🎉</div>
            <p style={{ fontWeight: 600, margin: '.3rem 0' }}>Your Bond with {otherName.split(' ')[0]} is {humanDuration(bond.formedAt)} old.</p>
            <p style={{ fontSize: '.85rem', color: 'var(--ink-2)' }}>Reach out today.</p>
          </div>
        )}

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Spinner /></div>
        ) : !messages || messages.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EmptyState variant="thread"
              title={`Start with ${otherName.split(' ')[0]}.`}
              body="Send a message or hold the mic." />
          </div>
        ) : (
          <>
            {(messages).map((m, i) => {
              const prev = messages[i - 1];
              const next = messages[i + 1];
              const showDate = !prev || new Date(m.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
              // Consecutive messages from the same sender within 5 minutes sit
              // together as one visual group — a system row (missed call) or a
              // day boundary always breaks the group, same as most chat apps.
              const isSystemKind = (k?: string) => k === 'call_missed_voice' || k === 'call_missed_video';
              const sameDayAsNext = next && new Date(m.createdAt).toDateString() === new Date(next.createdAt).toDateString();
              const isLastInGroup = !next || !sameDayAsNext || next.senderId !== m.senderId || isSystemKind(next.kind) ||
                (new Date(next.createdAt).getTime() - new Date(m.createdAt).getTime()) > 5 * 60_000;
              return (
                <React.Fragment key={m.id}>
                  {showDate && (
                    <div style={{ textAlign: 'center', margin: '.8rem 0' }}>
                      <span style={{
                        background: 'rgba(255,255,255,0.7)', borderRadius: 100,
                        padding: '.2rem .8rem', fontSize: '.7rem', color: 'var(--ink-3)',
                        fontFamily: 'DM Mono, monospace', backdropFilter: 'blur(8px)'
                      }}>
                        {new Date(m.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )}
                  <MessageBubble msg={m} myId={myId} bondId={bond.id} otherName={otherName}
                    otherAvatarUrl={bond.otherUser?.avatarUrl}
                    isLastInGroup={isLastInGroup}
                    onReply={msg => setReplyTo(msg)} />
                </React.Fragment>
              );
            })}
            {uploadVoice.isPending && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '.4rem' }}>
                <div style={{
                  background: 'var(--ember-dim)', borderRadius: 18, padding: '.6rem .9rem',
                  display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.82rem', color: 'var(--ember)'
                }}>
                  <Spinner size={12} color="var(--ember)" /> Sending voice note…
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Input area ── */}
      <div style={{
        padding: '.9rem 1.2rem 1.1rem', borderTop: '1px solid var(--border)',
        background: 'var(--white)', display: 'flex', flexDirection: 'column', gap: '.55rem'
      }}>

        {/* Compose reply tag */}
        {replyTo && (
          <div style={{
            display: 'flex', alignItems: 'stretch', marginLeft: 46,
            background: 'var(--ember-dim)', borderRadius: 14,
            border: '1px solid var(--ember-bdr)', overflow: 'hidden'
          }}>
            <div style={{ width: 3, flexShrink: 0, background: 'var(--ember)' }} />
            <div style={{ flex: 1, padding: '.5rem .85rem', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '.72rem', fontWeight: 700, color: 'var(--ember)', marginBottom: '.15rem' }}>
                <Icon name="reply" size={12} stroke="var(--ember)" sw={2} />
                Replying to {replyTo.senderId === myId ? 'yourself' : otherName.split(' ')[0]}
              </div>
              <div style={{
                fontSize: '.8rem', color: 'var(--ink-2)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {replyTo.kind === 'voice'
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="mic" size={13} stroke="var(--ink-3)" /> Voice note</span>
                  : replyTo.body?.slice(0, 80)}
              </div>
            </div>
            <button onClick={() => setReplyTo(null)}
              style={{
                padding: '0 .7rem', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(243,112,30,.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={12} stroke="var(--ember)" sw={2} />
              </div>
            </button>
          </div>
        )}

        {/* Recording bar OR compose bar */}
        {recording ? (
          <RecordingBar elapsed={recTime} onSend={sendVoice} onCancel={cancelRec} sending={uploadVoice.isPending} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '.65rem' }}>
            <Avatar name={me.name} avatarUrl={me.avatar_url} aura={me.aura} size={36}
              style={{ flexShrink: 0, marginBottom: 3 }} />
            <div style={{
              flex: 1, display: 'flex', alignItems: 'flex-end', gap: '.3rem',
              background: 'var(--surf-low)', borderRadius: 22,
              border: `1.5px solid ${composerFocused ? 'var(--ember)' : 'var(--border-2)'}`,
              boxShadow: composerFocused ? '0 0 0 3px var(--ember-dim)' : 'var(--shadow-soft)',
              padding: '.3rem .3rem .3rem 1.1rem', transition: 'border-color .15s, box-shadow .15s'
            }}>
              <textarea ref={draftRef} value={draft} rows={1}
                onChange={e => setDraft(e.target.value)}
                onFocus={() => setComposerFocused(true)}
                onBlur={() => setComposerFocused(false)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTextWithOpts(); } }}
                placeholder="Message…"
                style={{
                  flex: 1, resize: 'none', padding: '.55rem 0', fontSize: '.92rem', lineHeight: 1.45,
                  background: 'transparent', border: 'none', fontFamily: 'inherit', maxHeight: 110, overflowY: 'auto'
                }} />
              {draft.trim() ? (
                <button onClick={sendTextWithOpts} disabled={sendMsg.isPending}
                  style={{
                    width: 38, height: 38, borderRadius: '50%', background: 'var(--ember)', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '.15rem',
                    boxShadow: '0 2px 10px -2px rgba(243,112,30,.5)', transition: 'transform .1s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                  {sendMsg.isPending ? <Spinner size={15} color="#fff" /> : <Icon name="send" size={16} stroke="#fff" />}
                </button>
              ) : (
                <button onClick={startRec} title="Record a voice note"
                  style={{
                    width: 38, height: 38, borderRadius: '50%', background: 'var(--ember)', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '.15rem',
                    boxShadow: '0 2px 10px -2px rgba(243,112,30,.5)', transition: 'transform .1s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                  <Icon name="mic" size={17} stroke="#fff" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
