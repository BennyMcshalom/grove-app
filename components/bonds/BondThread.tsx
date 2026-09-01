'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
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
import styles from './BondThread.module.css';

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
    <div className={styles.thread}>

      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <button onClick={() => bond.otherUser?.id && router.push(`/grove/${bond.otherUser.id}`)} title="Enter their Grouv" className={styles.avatarBtn}>
            <Avatar name={otherName} size={46} aura={bond.otherUser?.aura ?? undefined} avatarUrl={bond.otherUser?.avatarUrl} />
          </button>
          <div className={styles.nameCol}>
            <button onClick={() => bond.otherUser?.id && router.push(`/grove/${bond.otherUser.id}`)} className={styles.nameBtn}>
              {otherName}
            </button>
            {bond.otherUser?.openTo && <div className={styles.openTo}>{bond.otherUser.openTo}</div>}
          </div>
          <button title="Voice call" onClick={() => startCall(bond, 'voice')} className={styles.iconBtn}>
            <Icon name="phone" size={19} stroke="var(--slate)" />
          </button>
          <button title="Video call" onClick={() => startCall(bond, 'video')} className={styles.iconBtn}>
            <Icon name="video" size={19} stroke="var(--slate)" />
          </button>
          <button title="Bond info" onClick={onTogglePanel} className={styles.iconBtn}>
            <Icon name="panel" size={19} stroke="var(--slate)" />
          </button>
        </div>

        {bond.status === 'circle' ? (
          <div className={styles.circleNote}>
            You started Grouving recently. Keep showing up, Bonds grow from here.
          </div>
        ) : (
          <div className={styles.depthRow}>
            <span className="label-mono">Bond depth</span>
            <div style={{ flex: 1 }}><ProgressBar value={bond.depthScore ?? 0} /></div>
            <span className={styles.depthAge}>{humanDuration(bond.formedAt)}</span>
          </div>
        )}
      </header>

      {/* ── Deep Focus banner ── */}
      {bond.otherUser?.deepFocusActive && (
        <div className={styles.focusBanner}>
          <Icon name="moon" size={13} stroke="var(--cream)" sw={1.8} />
          <span className={styles.focusBannerText}>
            {bond.otherUser.displayName?.split(' ')[0]} is in Deep Focus. They&apos;ll see your message when they return.
          </span>
        </div>
      )}

      {/* ── Messages ── */}
      <div ref={threadRef} className={clsx('scroll', styles.messagesArea)}>

        {bond.status === 'bond' && (bond.depthScore ?? 0) > 70 && (
          <div className={clsx('card', styles.milestoneCard)}>
            <div className={styles.milestoneEmoji}>🎉</div>
            <p className={styles.milestoneTitle}>Your Bond with {otherName.split(' ')[0]} is {humanDuration(bond.formedAt)} old.</p>
            <p className={styles.milestoneSub}>Reach out today.</p>
          </div>
        )}

        {isLoading ? (
          <div className={styles.loadingWrap}><Spinner /></div>
        ) : !messages || messages.length === 0 ? (
          <div className={styles.emptyWrap}>
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
                    <div className={styles.dateDivider}>
                      <span className={styles.dateDividerPill}>
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
              <div className={styles.voiceSendingRow}>
                <div className={styles.voiceSendingPill}>
                  <Spinner size={12} color="var(--ember)" /> Sending voice note…
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Input area ── */}
      <div className={styles.inputArea}>

        {/* Compose reply tag */}
        {replyTo && (
          <div className={styles.replyBar}>
            <div className={styles.replyBarStripe} />
            <div className={styles.replyBarBody}>
              <div className={styles.replyBarHeader}>
                <Icon name="reply" size={12} stroke="var(--ember)" sw={2} />
                Replying to {replyTo.senderId === myId ? 'yourself' : otherName.split(' ')[0]}
              </div>
              <div className={styles.replyBarPreview}>
                {replyTo.kind === 'voice'
                  ? <span className={styles.replyBarPreviewVoice}><Icon name="mic" size={13} stroke="var(--ink-3)" /> Voice note</span>
                  : replyTo.body?.slice(0, 80)}
              </div>
            </div>
            <button onClick={() => setReplyTo(null)} className={styles.replyBarCloseBtn}>
              <div className={styles.replyBarCloseCircle}>
                <Icon name="close" size={12} stroke="var(--ember)" sw={2} />
              </div>
            </button>
          </div>
        )}

        {/* Recording bar OR compose bar */}
        {recording ? (
          <RecordingBar elapsed={recTime} onSend={sendVoice} onCancel={cancelRec} sending={uploadVoice.isPending} />
        ) : (
          <div className={styles.composeRow}>
            <Avatar name={me.name} avatarUrl={me.avatar_url} aura={me.aura} size={36}
              style={{ flexShrink: 0, marginBottom: 3 }} />
            <div className={clsx(styles.composeBox, composerFocused && styles.focused)}>
              <textarea ref={draftRef} value={draft} rows={1}
                onChange={e => setDraft(e.target.value)}
                onFocus={() => setComposerFocused(true)}
                onBlur={() => setComposerFocused(false)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTextWithOpts(); } }}
                placeholder="Message…"
                className={styles.composeTextarea} />
              {draft.trim() ? (
                <button onClick={sendTextWithOpts} disabled={sendMsg.isPending} className={styles.roundActionBtn}>
                  {sendMsg.isPending ? <Spinner size={15} color="#fff" /> : <Icon name="send" size={16} stroke="#fff" />}
                </button>
              ) : (
                <button onClick={startRec} title="Record a voice note" className={styles.roundActionBtn}>
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
