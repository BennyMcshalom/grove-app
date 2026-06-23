'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { RPSection } from '@/components/layout/RightPanel';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReportModal } from '@/components/ui/ReportModal';
import { useToastStore } from '@/store/useToastStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useBonds, useBondMessages, useSendBondMessage, useUploadVoice } from '@/hooks/useBonds';
import { useBondInvitations, useAcceptBondInvitation, useDeclineBondInvitation, useInviteToBond } from '@/hooks/useBondInvitations';
import { useSuggestions } from '@/hooks/useUsers';
import { bondsApi } from '@/lib/api';
import type { BondRecord, BondMessage } from '@/lib/api';

// ─────────────────────────────────────────────────────────────────
// VOICE PLAYER — waveform bars + real audio playback
// ─────────────────────────────────────────────────────────────────
function VoicePlayer({ url, dur, sent, myReaction, onReact }: {
  url: string; dur?: number | null; sent: boolean;
  myReaction?: string; onReact?: (e: string) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const barCount = 28;
  const bars = useRef(Array.from({ length: barCount }, () => 0.2 + Math.random() * 0.8));

  const toggle = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => { setPlaying(false); setElapsed(0); };
      audioRef.current.ontimeupdate = () => setElapsed(Math.floor(audioRef.current!.currentTime));
    }
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play().catch(() => {}); setPlaying(true); }
  };

  const total = dur ?? 0;
  const progress = total > 0 ? Math.min(elapsed / total, 1) : 0;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const bg   = sent ? 'var(--ember)' : 'var(--surf-high)';
  const barC = sent ? 'rgba(255,255,255,0.8)' : 'var(--slate)';
  const barP = sent ? '#fff' : 'var(--ember)';
  const txtC = sent ? 'rgba(255,255,255,0.7)' : 'var(--ink-3)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', padding: '.7rem .85rem',
      borderRadius: 20, background: bg, minWidth: 200, maxWidth: 260,
      borderBottomRightRadius: sent ? 4 : 20, borderBottomLeftRadius: sent ? 20 : 4 }}>
      {/* Play / Pause */}
      <button onClick={toggle} style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: sent ? 'rgba(255,255,255,0.2)' : 'var(--ember)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
        {playing
          ? <svg width="12" height="12" viewBox="0 0 24 24" fill={sent ? '#fff' : '#fff'}><rect x="5" y="4" width="5" height="16" rx="1"/><rect x="14" y="4" width="5" height="16" rx="1"/></svg>
          : <svg width="12" height="12" viewBox="0 0 24 24" fill={sent ? '#fff' : '#fff'} style={{ marginLeft: 2 }}><path d="M6 4l14 8-14 8V4z"/></svg>}
      </button>

      {/* Waveform */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2, height: 28 }}>
        {bars.current.map((h, i) => {
          const isFilled = progress > 0 && i / barCount <= progress;
          return (
            <div key={i} style={{
              width: 3, borderRadius: 2, flexShrink: 0,
              height: `${Math.max(4, h * 24)}px`,
              background: isFilled ? barP : barC,
              opacity: playing ? 1 : 0.6,
              transition: 'height .1s ease',
              animation: playing && Math.abs(i / barCount - progress) < 0.15
                ? `wave ${0.5 + (i % 4) * 0.1}s ease-in-out infinite` : 'none',
            }}/>
          );
        })}
      </div>

      {/* Duration */}
      <span style={{ fontSize: '.68rem', color: txtC, fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>
        {playing ? fmt(elapsed) : fmt(total)}
      </span>
    </div>
  );
}

const REACTIONS: { emoji: string; icon: string; label: string }[] = [
  { emoji: '❤️', icon: 'heart',      label: 'Love'   },
  { emoji: '👍', icon: 'thumbs-up',  label: 'Like'   },
  { emoji: '🔥', icon: 'fire',       label: 'Fire'   },
  { emoji: '😂', icon: 'comment',    label: 'Haha'   },
  { emoji: '😮', icon: 'eye',        label: 'Wow'    },
  { emoji: '😢', icon: 'moon',       label: 'Sad'    },
  { emoji: '🙏', icon: 'check',      label: 'Thanks' },
  { emoji: '💪', icon: 'strong',     label: 'Strong' },
];

// ─────────────────────────────────────────────────────────────────
// MESSAGE BUBBLE
// Long-press (mobile) or right-click (desktop) opens a context menu
// with a quick-emoji row and action items — same UX as WhatsApp.
// ─────────────────────────────────────────────────────────────────
function MessageBubble({ msg, myId, bondId, otherName, otherAvatarUrl, onReply }: {
  msg: BondMessage; myId: string; bondId: string; otherName: string;
  otherAvatarUrl?: string | null;
  onReply: (msg: BondMessage) => void;
}) {
  const { toast } = useToastStore();
  const sent = msg.senderId === myId;
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [localReactions, setLocalReactions] = useState<Record<string, string[]>>(msg.reactions ?? {});
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hovered, setHovered] = useState(false);
  const [reporting, setReporting] = useState(false);

  const myEmoji = Object.entries(localReactions).find(([, users]) => users.includes(myId))?.[0];
  const reactionList = Object.entries(localReactions).filter(([, users]) => users.length > 0);

  const openMenu = (clientX: number, clientY: number) => {
    if (typeof window === 'undefined') { setMenu({ x: clientX, y: clientY }); return; }
    const MENU_W = 218;
    const MENU_H = 220; // emoji row ~50 + 2 actions ~80 + padding
    const PAD    = 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Place left of click if it would overflow right edge; clamp to left edge
    const x = clientX + MENU_W > vw - PAD ? Math.max(PAD, clientX - MENU_W) : Math.max(PAD, clientX);
    // Place above click if it would overflow bottom; clamp to top edge
    const y = clientY + MENU_H > vh - PAD ? Math.max(PAD, clientY - MENU_H) : Math.max(PAD, clientY);
    setMenu({ x, y });
  };
  const closeMenu = () => setMenu(null);

  // Desktop: right-click
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    openMenu(e.clientX, e.clientY);
  };

  // Mobile: long-press (500ms)
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    longPressTimer.current = setTimeout(() => openMenu(t.clientX, t.clientY), 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleReact = async (emoji: string) => {
    const updated = { ...localReactions };
    if (myEmoji) {
      updated[myEmoji] = (updated[myEmoji] ?? []).filter(id => id !== myId);
      if (!updated[myEmoji].length) delete updated[myEmoji];
      bondsApi.unreact(bondId, msg.id, myEmoji).catch(() => {});
    }
    if (myEmoji !== emoji) {
      if (!updated[emoji]) updated[emoji] = [];
      updated[emoji] = [...updated[emoji], myId];
      bondsApi.react(bondId, msg.id, emoji).catch(() => {});
    }
    setLocalReactions(updated);
  };

  return (
    <>
      <div
        style={{ display: 'flex', justifyContent: sent ? 'flex-end' : 'flex-start',
          alignItems: 'flex-end', gap: '.45rem', marginBottom: '.5rem',
          WebkitUserSelect: 'none', userSelect: 'none' }}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={cancelLongPress}
        onTouchMove={cancelLongPress}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Avatar — received messages only */}
        {!sent && <Avatar name={otherName} size={28} style={{ flexShrink: 0 }} avatarUrl={otherAvatarUrl}/>}

        {/* Column: bubble + reactions */}
        <div style={{ position: 'relative', maxWidth: '68%' }}>

          {/* Dropdown chevron — fades in on hover at the top corner of the bubble */}
          <button
            onClick={e => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); openMenu(r.left, r.bottom + 4); }}
            style={{
              position: 'absolute',
              top: msg.replyPreview ? 50 : 4,
              ...(sent ? { right: 6 } : { left: 6 }),
              zIndex: 10,
              width: 20, height: 20, borderRadius: '50%',
              background: sent ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              opacity: hovered ? 1 : 0,
              transition: 'opacity .15s',
              pointerEvents: hovered ? 'auto' : 'none',
            }}
          >
            <svg width="9" height="5" viewBox="0 0 9 5" fill="none">
              <path d="M1 1L4.5 4L8 1" stroke={sent ? 'rgba(255,255,255,0.92)' : 'var(--ink-2)'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Reply quote strip — shows who was replied to + preview */}
          {msg.replyPreview && (
            <div style={{
              display: 'flex', alignItems: 'stretch', gap: 0,
              borderRadius: '10px 10px 0 0', overflow: 'hidden',
              background: sent ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.05)',
            }}>
              <div style={{ width: 3, flexShrink: 0,
                background: sent ? 'rgba(255,255,255,0.75)' : 'var(--ember)' }}/>
              <div style={{ padding: '.38rem .65rem', minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '.7rem', fontWeight: 700, marginBottom: '.1rem',
                  color: sent ? 'rgba(255,255,255,0.95)' : 'var(--ember)' }}>
                  {/* In a 2-person chat: if I sent this reply, I'm replying to them; if they sent it, they're replying to me */}
                  {sent ? otherName.split(' ')[0] : 'You'}
                </div>
                <div style={{ fontSize: '.76rem', lineHeight: 1.35,
                  color: sent ? 'rgba(255,255,255,0.72)' : 'var(--ink-3)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {msg.replyPreview}
                </div>
              </div>
            </div>
          )}

          {/* Message bubble */}
          {msg.kind === 'voice' && msg.audioUrl ? (
            <VoicePlayer url={msg.audioUrl} dur={msg.durationSeconds} sent={sent}
              myReaction={myEmoji} onReact={handleReact}/>
          ) : (
            <div style={{ padding: '.6rem .9rem', borderRadius: 18, fontSize: '.92rem', lineHeight: 1.55,
              background: sent ? 'var(--ember)' : 'var(--surf-high)',
              color: sent ? '#fff' : 'var(--ink)',
              borderBottomRightRadius: sent ? 4 : 18, borderBottomLeftRadius: sent ? 18 : 4,
              borderTopLeftRadius: msg.replyPreview ? 0 : 18, borderTopRightRadius: msg.replyPreview ? 0 : 18 }}>
              {msg.body}
            </div>
          )}

          {/* Reaction pills — below bubble */}
          {reactionList.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap',
              marginTop: 5, justifyContent: sent ? 'flex-end' : 'flex-start' }}>
              {reactionList.map(([emoji, users]) => {
                const r = REACTIONS.find(x => x.emoji === emoji);
                const active = users.includes(myId);
                return (
                  <button key={emoji} onClick={() => handleReact(emoji)}
                    title={r?.label ?? emoji}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: 'var(--white)', borderRadius: 100, padding: '2px 8px',
                      border: active ? '1.5px solid var(--ember)' : '1px solid var(--border-2)',
                      boxShadow: 'var(--shadow-soft)', cursor: 'pointer',
                      color: active ? 'var(--ember)' : 'var(--ink-3)' }}>
                    {r ? <Icon name={r.icon} size={13} stroke={active ? 'var(--ember)' : 'var(--ink-3)'} sw={2}/> : null}
                    <span style={{ fontSize: '.72rem', fontWeight: 600 }}>{r?.label ?? emoji}</span>
                    {users.length > 1 && <span style={{ fontSize: '.68rem', fontWeight: 400 }}>{users.length}</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Read receipt */}
          {sent && msg.readAt && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, marginTop: 2 }}>
              <Icon name="check" size={10} stroke="var(--sage)" sw={2.5}/>
              <span style={{ fontSize: '.6rem', color: 'var(--ink-4)', fontFamily: 'DM Mono, monospace' }}>seen</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Context menu (right-click / long-press) ── */}
      {menu && (
        <>
          {/* Backdrop — clicking anywhere outside closes it */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 1000 }}
            onClick={closeMenu}
            onContextMenu={e => { e.preventDefault(); closeMenu(); }}
          />
          <div style={{
            position: 'fixed',
            left: menu.x,
            top: menu.y,
            zIndex: 1001,
            background: 'var(--white)',
            borderRadius: 14,
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            width: 'min(218px, calc(100vw - 20px))',
            animation: 'rise .12s ease both',
          }}>
            {/* Quick reaction row */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '.4rem .5rem',
              borderBottom: '1px solid var(--border)', gap: 2, flexWrap: 'wrap' }}>
              {REACTIONS.map(r => (
                <button key={r.emoji} onClick={() => { handleReact(r.emoji); closeMenu(); }}
                  title={r.label}
                  style={{ width: 34, height: 34, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: myEmoji === r.emoji ? 'var(--ember-dim)' : 'transparent',
                    outline: myEmoji === r.emoji ? '2px solid var(--ember)' : 'none',
                    cursor: 'pointer', transition: 'transform .1s, background .1s', flexShrink: 0,
                    color: myEmoji === r.emoji ? 'var(--ember)' : 'var(--ink-3)' }}
                  onMouseEnter={ev => (ev.currentTarget.style.transform = 'scale(1.2)')}
                  onMouseLeave={ev => (ev.currentTarget.style.transform = 'scale(1)')}>
                  <Icon name={r.icon} size={16} stroke={myEmoji === r.emoji ? 'var(--ember)' : 'var(--ink-3)'} sw={1.8}/>
                </button>
              ))}
            </div>
            {/* Action rows */}
            {[
              { label: 'Reply', icon: 'back', action: () => { onReply(msg); closeMenu(); } },
              ...(msg.kind !== 'voice' && msg.body ? [{ label: 'Copy', icon: 'copy', action: () => { navigator.clipboard.writeText(msg.body!).catch(() => {}); toast('Copied.'); closeMenu(); } }] : []),
              ...(!sent ? [{ label: 'Report', icon: 'flag', action: () => { setReporting(true); closeMenu(); } }] : []),
            ].map(item => (
              <button key={item.label} onClick={item.action}
                style={{ display: 'flex', alignItems: 'center', gap: '.75rem', width: '100%',
                  padding: '.72rem 1.1rem', fontSize: '.9rem', fontWeight: 500,
                  color: 'var(--ink)', textAlign: 'left', transition: 'background .1s' }}
                onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--surf-low)')}
                onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                <Icon name={item.icon} size={16} stroke="var(--ink-2)" sw={1.8}/>
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}

      {reporting && (
        <ReportModal contentType="bond_message" contentId={msg.id} onClose={() => setReporting(false)}/>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// VOICE RECORDER BAR
// ─────────────────────────────────────────────────────────────────
function RecordingBar({ elapsed, onSend, onCancel, sending }: {
  elapsed: number; onSend: () => void; onCancel: () => void; sending: boolean;
}) {
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem',
      background: 'var(--surf-low)', borderRadius: 100, padding: '.5rem .8rem' }}>
      <button onClick={onCancel} style={{ width: 36, height: 36, borderRadius: '50%',
        background: 'var(--red-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name="close" size={16} stroke="var(--red)"/>
      </button>
      <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem', flex: 1 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)',
          animation: 'pulseDot 1s ease infinite', display: 'block', flexShrink: 0 }}/>
        <span style={{ fontSize: '.82rem', color: 'var(--ink-2)', fontFamily: 'DM Mono, monospace' }}>
          {fmt(elapsed)}
        </span>
        <span style={{ flex: 1, height: 2, background: 'var(--border-2)', borderRadius: 1, overflow: 'hidden' }}>
          <span style={{ display: 'block', height: '100%', background: 'var(--ember)',
            width: `${Math.min(elapsed / 120 * 100, 100)}%`, transition: 'width 1s linear' }}/>
        </span>
      </span>
      <button onClick={onSend} disabled={sending} className="btn btn-primary"
        style={{ padding: '.45rem .9rem', fontSize: '.82rem', borderRadius: 100, flexShrink: 0 }}>
        {sending ? <Spinner size={14} color="#fff"/> : 'Send'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// BOND THREAD
// ─────────────────────────────────────────────────────────────────
function BondThread({ bond }: { bond: BondRecord }) {
  const router = useRouter();
  const { toast } = useToastStore();
  const { user: authUser } = useAuthStore();
  const myId = authUser?.id ?? '';
  const otherName = bond.otherUser?.displayName ?? 'Bond';

  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<BondMessage | null>(null);
  const [call, setCall] = useState<'voice' | 'video' | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  // Voice recording
  const [recording, setRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const mrRef    = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recStart  = useRef(0);

  const { data: messages, isLoading } = useBondMessages(bond.id);
  const sendMsg    = useSendBondMessage(bond.id);
  const uploadVoice = useUploadVoice(bond.id);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages?.length]);

  // Mark read on open
  useEffect(() => { bondsApi.markRead(bond.id).catch(() => {}); }, [bond.id]);

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
      // The hook's mutateAsync passes body only; for reply opts we extend bondsApi directly
      // then the useBondMessages polling (every 5s) picks up the new message
      await bondsApi.sendMessage(bond.id, text, replyOpts);
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative',
      background: 'var(--white)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <header style={{ padding: '1rem 1.2rem', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: '.8rem', background: 'var(--white)' }}>
        <button onClick={() => bond.otherUser?.id && router.push(`/grove/${bond.otherUser.id}`)}>
          <Avatar name={otherName} size={42} aura={bond.otherUser ? 'reflective' : undefined} avatarUrl={bond.otherUser?.avatarUrl}/>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '.95rem' }}>{otherName}</div>
          <div style={{ fontSize: '.7rem', color: 'var(--ink-4)', fontFamily: 'DM Mono, monospace' }}>
            Bond since {new Date(bond.formedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}>
          <button title="Voice call" onClick={() => setCall('voice')}
            style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--slate-dim)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Icon name="phone" size={17} stroke="var(--slate)"/>
          </button>
          <button onClick={() => router.push(`/bond-release?bond=${encodeURIComponent(otherName)}&bondId=${bond.id}`)}
            style={{ fontSize: '.72rem', color: 'var(--ink-4)', padding: '.3rem .6rem',
              borderRadius: 100, border: '1px solid var(--border-2)' }}>
            Release
          </button>
        </div>
      </header>

      {/* ── Deep Focus banner ── */}
      {bond.otherUser?.deepFocusActive && (
        <div style={{ padding: '.55rem 1.2rem', background: 'var(--ink)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <Icon name="moon" size={13} stroke="var(--cream)" sw={1.8}/>
          <span style={{ fontSize: '.78rem', color: 'var(--cream)', fontWeight: 500 }}>
            {bond.otherUser.displayName?.split(' ')[0]} is in Deep Focus — they&apos;ll see your message when they return.
          </span>
        </div>
      )}

      {/* ── Messages ── */}
      <div ref={threadRef} className="scroll" style={{ flex: 1, overflowY: 'auto',
        padding: '1rem', background: 'var(--bg)',
        backgroundImage: 'radial-gradient(circle at 20% 80%, var(--ember-soft) 0%, transparent 50%), radial-gradient(circle at 80% 20%, var(--surf-low) 0%, transparent 40%)' }}>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Spinner/></div>
        ) : !messages || messages.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EmptyState variant="thread"
              title={`Start with ${otherName.split(' ')[0]}.`}
              body="Send a message or hold the mic."/>
          </div>
        ) : (
          <>
            {(messages).map((m, i) => {
              const prev = messages[i - 1];
              const showDate = !prev || new Date(m.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
              return (
                <React.Fragment key={m.id}>
                  {showDate && (
                    <div style={{ textAlign: 'center', margin: '.8rem 0' }}>
                      <span style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 100,
                        padding: '.2rem .8rem', fontSize: '.7rem', color: 'var(--ink-3)',
                        fontFamily: 'DM Mono, monospace', backdropFilter: 'blur(8px)' }}>
                        {new Date(m.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )}
                  <MessageBubble msg={m} myId={myId} bondId={bond.id} otherName={otherName}
                    otherAvatarUrl={bond.otherUser?.avatarUrl}
                    onReply={msg => setReplyTo(msg)}/>
                </React.Fragment>
              );
            })}
            {uploadVoice.isPending && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '.4rem' }}>
                <div style={{ background: 'var(--ember-dim)', borderRadius: 18, padding: '.6rem .9rem',
                  display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.82rem', color: 'var(--ember)' }}>
                  <Spinner size={12} color="var(--ember)"/> Sending voice note…
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Input area ── */}
      <div style={{ padding: '.75rem 1rem', borderTop: '1px solid var(--border)',
        background: 'var(--white)', display: 'flex', flexDirection: 'column', gap: '.4rem' }}>

        {/* Compose reply strip */}
        {replyTo && (
          <div style={{ display: 'flex', alignItems: 'stretch',
            background: 'var(--surf-low)', borderRadius: 10,
            border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ width: 3, flexShrink: 0, background: 'var(--ember)' }}/>
            <div style={{ flex: 1, padding: '.42rem .75rem', minWidth: 0 }}>
              <div style={{ fontSize: '.71rem', fontWeight: 700, color: 'var(--ember)', marginBottom: '.1rem' }}>
                Replying to {replyTo.senderId === myId ? 'yourself' : otherName.split(' ')[0]}
              </div>
              <div style={{ fontSize: '.78rem', color: 'var(--ink-3)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {replyTo.kind === 'voice'
                  ? <span style={{ display:'flex', alignItems:'center', gap:4 }}><Icon name="mic" size={13} stroke="var(--ink-3)"/> Voice note</span>
                  : replyTo.body?.slice(0, 80)}
              </div>
            </div>
            <button onClick={() => setReplyTo(null)}
              style={{ padding: '0 .75rem', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0, color: 'var(--ink-3)' }}>
              <Icon name="close" size={14} stroke="var(--ink-3)"/>
            </button>
          </div>
        )}

        {/* Recording bar OR compose bar */}
        {recording ? (
          <RecordingBar elapsed={recTime} onSend={sendVoice} onCancel={cancelRec} sending={uploadVoice.isPending}/>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--surf-low)',
              borderRadius: 100, border: '1.5px solid var(--border-2)', overflow: 'hidden',
              transition: 'border-color .15s' }}
              onFocusCapture={e => (e.currentTarget.style.borderColor = 'var(--ember)')}
              onBlurCapture={e  => (e.currentTarget.style.borderColor = 'var(--border-2)')}>
              <input value={draft} onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTextWithOpts(); } }}
                placeholder="Message…"
                style={{ flex: 1, padding: '.65rem 1rem', fontSize: '.92rem', background: 'transparent', border: 'none' }}/>
            </div>
            {draft.trim() ? (
              <button onClick={sendTextWithOpts} disabled={sendMsg.isPending}
                style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--ember)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  boxShadow: '0 2px 10px -2px rgba(243,112,30,.5)', transition: 'transform .1s' }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                {sendMsg.isPending ? <Spinner size={16} color="#fff"/> : <Icon name="send" size={17} stroke="#fff"/>}
              </button>
            ) : (
              <button onClick={startRec}
                style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--ember)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  boxShadow: '0 2px 10px -2px rgba(243,112,30,.5)' }}>
                <Icon name="mic" size={19} stroke="#fff"/>
              </button>
            )}
          </div>
        )}
      </div>

      {call && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: '#16231C', display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--r-lg)' }}>
          <Avatar name={otherName} size={100} ring={2} style={{ marginBottom: '1.2rem' }} avatarUrl={bond.otherUser?.avatarUrl}/>
          <div className="serif" style={{ fontSize: '1.6rem', fontWeight: 600, color: '#fff' }}>{otherName}</div>
          <div style={{ color: 'rgba(255,255,255,.5)', marginTop: '.3rem', fontSize: '.88rem' }}>
            {call === 'voice' ? 'Voice call' : 'Video call'} · calling…
          </div>
          <button onClick={() => setCall(null)} style={{ marginTop: '2rem', width: 56, height: 56, borderRadius: '50%',
            background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px -4px rgba(186,26,26,.7)' }}>
            <Icon name="phone" size={22} stroke="#fff"/>
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// BONDS PAGE
// ─────────────────────────────────────────────────────────────────
export default function BondsPage() {
  const router = useRouter();
  const { toast } = useToastStore();
  const [sel, setSel] = useState(0);
  // Mobile: 'list' shows the bond list; 'thread' shows the active conversation
  const [mobileView, setMobileView] = useState<'list' | 'thread'>('list');
  const { data: bondsData, isLoading } = useBonds();
  const { data: suggestions } = useSuggestions();
  const { data: invitations } = useBondInvitations();
  const acceptInv = useAcceptBondInvitation();
  const declineInv = useDeclineBondInvitation();
  const inviteToBond = useInviteToBond();
  const [invited, setInvited] = useState<string[]>([]);

  const allConnections = bondsData ?? [];
  const realBonds = allConnections.filter(b => b.status === 'bond');
  const circle    = allConnections.filter(b => b.status === 'circle');
  const bonds     = realBonds; // keep alias for BondThread selection
  const slots     = Math.max(0, 5 - realBonds.length);
  const pending   = (invitations ?? []).filter(i => i.status === 'pending');

  const right = (
    <>
      {pending.length > 0 && (
        <RPSection label={`Bond invitations (${pending.length})`}>
          {pending.map(inv => (
            <div key={inv.id} className="card" style={{ padding: '.85rem', marginBottom: '.6rem', boxShadow: 'var(--shadow-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.7rem' }}>
                <Avatar name={inv.fromUser?.displayName ?? '?'} size={40} avatarUrl={inv.fromUser?.avatarUrl}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '.86rem' }}>{inv.fromUser?.displayName ?? 'Someone'}</div>
                  {inv.message && <div style={{ fontSize: '.72rem', color: 'var(--ink-3)', fontStyle: 'italic' }}>{inv.message}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <button disabled={acceptInv.isPending} className="btn btn-primary"
                  style={{ flex: 1, padding: '.4rem', fontSize: '.8rem' }}
                  onClick={async () => {
                    try { await acceptInv.mutateAsync(inv.id); toast(`${inv.fromUser?.displayName?.split(' ')[0]} is now in your Circle. Chat for 7 days to form a Bond.`); }
                    catch { toast('Could not accept.'); }
                  }}>Accept</button>
                <button disabled={declineInv.isPending} className="btn btn-soft"
                  style={{ flex: 1, padding: '.4rem', fontSize: '.8rem' }}
                  onClick={async () => {
                    try { await declineInv.mutateAsync(inv.id); }
                    catch { toast('Could not decline.'); }
                  }}>Decline</button>
              </div>
            </div>
          ))}
        </RPSection>
      )}

      <RPSection label="Suggested for you">
        {suggestions && suggestions.length > 0 ? suggestions.slice(0, 5).map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.5rem 0' }}>
            <Avatar name={s.displayName} size={38} avatarUrl={s.avatarUrl}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: '.84rem' }}>{s.displayName}</div>
              <div style={{ fontSize: '.7rem', color: 'var(--ember)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.reason}</div>
            </div>
            <button disabled={invited.includes(s.id) || inviteToBond.isPending}
              onClick={async () => {
                try { await inviteToBond.mutateAsync({ recipientId: s.id }); setInvited(v => [...v, s.id]); toast(`Bond invitation sent to ${s.displayName.split(' ')[0]}.`); }
                catch { toast('Could not send.'); }
              }}
              className="btn btn-ghost" style={{ padding: '.35rem .75rem', fontSize: '.76rem', flexShrink: 0 }}>
              {invited.includes(s.id) ? 'Sent' : 'Bond'}
            </button>
          </div>
        )) : (
          <p style={{ fontSize: '.82rem', color: 'var(--ink-4)', fontStyle: 'italic', padding: '.4rem 0' }}>
            Open a space to discover people in the same chapter.
          </p>
        )}
      </RPSection>
    </>
  );

  return (
    <AppShell title="Your Bonds" right={right}>
      <div style={{ padding: '0 1.6rem 1rem', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <p style={{ color: 'var(--ink-3)', marginTop: '-.4rem', marginBottom: '1rem', fontSize: '.88rem' }}>
          Up to five. Earned, not assigned.
        </p>
        <div className="bonds-layout" style={{ display: 'flex', gap: '1rem', flex: 1, minHeight: 0 }}>

          {/* ── Bond list ── */}
          <div className={`bonds-list-col scroll${mobileView === 'thread' ? ' bonds-list-hidden-mobile' : ''}`}
            style={{ width: 260, flexShrink: 0, overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Spinner/></div>
            ) : allConnections.length === 0 ? (
              <div className="card" style={{ background: 'linear-gradient(160deg, var(--ember-dim), var(--slate-dim))' }}>
                <EmptyState variant="bonds" compact
                  title="No connections yet."
                  body="Bonds and Circle members will appear here."
                  action={{ label: 'Explore spaces →', onClick: () => router.push('/spaces') }}/>
              </div>
            ) : (
              <>
                {/* ── Full Bonds (up to 5) ── */}
                {realBonds.map((b, i) => {
                  const name     = b.otherUser?.displayName ?? 'Bond';
                  const active   = sel === i;
                  const inFocus  = !!b.otherUser?.deepFocusActive;
                  return (
                    <button key={b.id} onClick={() => { setSel(i); setMobileView('thread'); }} style={{
                      display: 'flex', alignItems: 'center', gap: '.7rem', width: '100%', textAlign: 'left',
                      padding: '.8rem', borderRadius: 'var(--r-md)', marginBottom: '.4rem',
                      background: active ? 'var(--ember-dim)' : 'transparent', transition: 'background .15s',
                    }}
                      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--surf-low)'; }}
                      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <Avatar name={name} size={44} aura="reflective" avatarUrl={b.otherUser?.avatarUrl}/>
                        {inFocus && (
                          <div title="In Deep Focus" style={{ position: 'absolute', bottom: -1, right: -1,
                            width: 16, height: 16, borderRadius: '50%', background: 'var(--ink)',
                            border: '2px solid var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="moon" size={9} stroke="var(--cream)" sw={1.8}/>
                          </div>
                        )}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '.9rem', color: active ? 'var(--ember)' : 'var(--ink)' }}>{name}</span>
                          {inFocus && <span style={{ fontSize: '.62rem', color: 'var(--ink-3)', fontStyle: 'italic' }}>in focus</span>}
                        </div>
                        <div style={{ fontSize: '.72rem', color: 'var(--ink-4)' }}>
                          Since {new Date(b.formedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </div>
                        <div style={{ marginTop: '.3rem', height: 2, borderRadius: 1, background: 'var(--surf-high)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${b.depthScore ?? 0}%`,
                            background: active ? 'var(--ember)' : 'var(--ink-4)', transition: 'width .5s ease' }}/>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {[...Array(slots)].map((_, i) => (
                  <div key={i} style={{ borderRadius: 'var(--r-md)', border: '1.5px dashed var(--border-2)',
                    padding: '.9rem', marginBottom: '.4rem', fontSize: '.8rem', color: 'var(--ink-4)',
                    fontStyle: 'italic', lineHeight: 1.45 }}>
                    A Bond forms when you consistently show up for someone.
                  </div>
                ))}

                {/* ── Circle ── */}
                {circle.length > 0 && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      margin: '1.1rem 0 .6rem', padding: '0 .2rem' }}>
                      <div className="label-mono">Your Circle</div>
                      <span style={{ fontSize: '.7rem', color: 'var(--ink-4)' }}>{circle.length} connected</span>
                    </div>
                    {circle.map((b, i) => {
                      const name = b.otherUser?.displayName ?? 'Circle';
                      const idx  = realBonds.length + i;
                      const active = sel === idx;
                      const streak = b.streakDays ?? 0;
                      const pct    = Math.min(100, Math.round((streak / 7) * 100));
                      const daysLeft = Math.max(0, 7 - streak);
                      return (
                        <button key={b.id} onClick={() => { setSel(idx); setMobileView('thread'); }} style={{
                          display: 'flex', alignItems: 'center', gap: '.65rem', width: '100%',
                          textAlign: 'left', padding: '.75rem .8rem', borderRadius: 'var(--r-md)',
                          marginBottom: '.3rem',
                          background: active ? 'var(--surf-low)' : 'transparent', transition: 'background .15s',
                          borderLeft: active ? '3px solid var(--ember)' : '3px solid transparent',
                        }}
                          onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--surf-low)'; }}
                          onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <Avatar name={name} size={38} avatarUrl={b.otherUser?.avatarUrl}/>
                            {b.otherUser?.deepFocusActive && (
                              <div title="In Deep Focus" style={{ position: 'absolute', bottom: -1, right: -1,
                                width: 14, height: 14, borderRadius: '50%', background: 'var(--ink)',
                                border: '2px solid var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Icon name="moon" size={7} stroke="var(--cream)" sw={1.8}/>
                              </div>
                            )}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                              <span style={{ fontWeight: 600, fontSize: '.86rem', color: active ? 'var(--ember)' : 'var(--ink)' }}>{name}</span>
                              {b.otherUser?.deepFocusActive && <span style={{ fontSize: '.6rem', color: 'var(--ink-3)', fontStyle: 'italic' }}>in focus</span>}
                            </div>
                            {/* Streak bar — fills toward 7 days */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '.3rem' }}>
                              <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--surf-high)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`,
                                  background: pct >= 85 ? 'var(--sage)' : 'var(--ink-4)',
                                  transition: 'width .5s ease' }}/>
                              </div>
                              <span style={{ fontSize: '.64rem', color: 'var(--ink-4)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
                                {streak}/7d
                              </span>
                            </div>
                            <div style={{ fontSize: '.68rem', color: 'var(--ink-4)', marginTop: '.15rem' }}>
                              {daysLeft === 0 ? 'Becoming a Bond soon…' : `${daysLeft} more day${daysLeft === 1 ? '' : 's'} to Bond`}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>

          {/* ── Thread ── */}
          <div className={`bonds-thread-col${mobileView === 'list' ? ' bonds-thread-hidden-mobile' : ''}`}
            style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {/* Mobile back button */}
            <button className="bonds-back-btn"
              onClick={() => setMobileView('list')}
              style={{ display: 'none', alignItems: 'center', gap: '.4rem',
                padding: '.5rem 0', marginBottom: '.5rem',
                fontSize: '.86rem', color: 'var(--ink-3)', fontWeight: 500 }}>
              <Icon name="back" size={16} stroke="var(--ink-3)"/> All bonds
            </button>
            {allConnections.length > 0 ? (
              <BondThread bond={allConnections[Math.min(sel, allConnections.length - 1)]}/>
            ) : !isLoading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                <div className="card" style={{
                  background: 'linear-gradient(160deg, var(--ember-dim), var(--slate-dim))',
                  boxShadow: 'var(--shadow-lg)', maxWidth: 420, width: '100%',
                }}>
                  <EmptyState variant="bonds" title="Your first Bond is waiting."
                    body="Show up consistently for someone in your circle. It can't be rushed — but it's worth it."
                    action={{ label: 'Explore spaces →', onClick: () => router.push('/spaces') }}/>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
