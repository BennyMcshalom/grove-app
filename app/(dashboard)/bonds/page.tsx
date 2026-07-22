'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { RPSection } from '@/components/layout/RightPanel';
import { FeatureGate } from '@/components/layout/FeatureGate';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReportModal } from '@/components/ui/ReportModal';
import { useToastStore } from '@/store/useToastStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSpaceStore } from '@/store/useSpaceStore';
import { useBonds, useBondMessages, useSendBondMessage, useUploadVoice } from '@/hooks/useBonds';
import { usePost } from '@/hooks/usePosts';
import { useBondInvitations, useAcceptBondInvitation, useDeclineBondInvitation, useInviteToBond, useSentBondInvitations } from '@/hooks/useBondInvitations';
import { useSuggestions } from '@/hooks/useUsers';
import { bondsApi } from '@/lib/api';
import { startCall } from '@/lib/calling';
import { humanDuration, formatRelativeTime, formatLastSeen } from '@/lib/mappers';
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

const REACTIONS: { emoji: string; label: string }[] = [
  { emoji: '❤️', label: 'Love'   },
  { emoji: '👍', label: 'Like'   },
  { emoji: '🔥', label: 'Fire'   },
  { emoji: '😂', label: 'Haha'   },
  { emoji: '😮', label: 'Wow'    },
  { emoji: '😢', label: 'Sad'    },
  { emoji: '🙏', label: 'Thanks' },
  { emoji: '💪', label: 'Strong' },
];

// A "Save to a Bond" share, rendered in place of the bubble's plain-text
// body — fetches the actual post (independent of any feed window, same as
// the Search/notification/Grove-profile deep links) and opens it on tap.
function SharedPostPreview({ postId, sent }: { postId: string; sent: boolean }) {
  const router = useRouter();
  const { slugById } = useSpaceStore();
  const { data: post, isLoading, isError } = usePost(postId);

  const open = () => {
    if (!post) return;
    const slug = slugById(post.spaceId);
    if (slug) router.push(`/spaces/${slug}?post=${post.id}`);
  };

  return (
    <button onClick={open} disabled={!post}
      style={{
        display: 'block', width: '100%', maxWidth: 240, textAlign: 'left', borderRadius: 18, overflow: 'hidden',
        border: `1px solid ${sent ? 'rgba(255,255,255,.25)' : 'var(--border)'}`,
        background: sent ? 'var(--ember-deep)' : 'var(--surf-high)', cursor: post ? 'pointer' : 'default'
      }}>
      <div style={{
        padding: '.7rem .8rem .3rem', display: 'flex', alignItems: 'center', gap: '.35rem',
        fontSize: '.66rem', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '.04em',
        color: sent ? 'rgba(255,255,255,.8)' : 'var(--ink-3)'
      }}>
        <Icon name="sprout" size={11} stroke={sent ? 'rgba(255,255,255,.8)' : 'var(--ink-3)'}/> Shared a post
      </div>
      <div style={{ padding: '.2rem .8rem .8rem' }}>
        {isLoading ? (
          <div style={{ padding: '.3rem 0' }}><Spinner size={14} color={sent ? '#fff' : 'var(--ink-3)'}/></div>
        ) : isError || !post ? (
          <p style={{ fontSize: '.8rem', fontStyle: 'italic', color: sent ? 'rgba(255,255,255,.7)' : 'var(--ink-4)' }}>
            This post isn&apos;t available anymore.
          </p>
        ) : (
          <>
            {post.doing && (
              <p style={{ fontSize: '.85rem', fontWeight: 600, lineHeight: 1.35,
                color: sent ? '#fff' : 'var(--ink)', marginBottom: post.honestThing ? '.25rem' : 0 }}>
                {post.doing}
              </p>
            )}
            {post.honestThing && (
              <p style={{ fontSize: '.78rem', fontStyle: 'italic', lineHeight: 1.4,
                color: sent ? 'rgba(255,255,255,.8)' : 'var(--ink-2)' }}>
                &ldquo;{post.honestThing}&rdquo;
              </p>
            )}
          </>
        )}
      </div>
    </button>
  );
}

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

  // System row — a missed call log entry, not a real message: no bubble,
  // no reactions/reply/menu, just a centered pill like WhatsApp/iMessage.
  if (msg.kind === 'call_missed_voice' || msg.kind === 'call_missed_video') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '.7rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', padding: '.35rem .85rem',
          borderRadius: 100, background: 'var(--surf-high)', fontSize: '.76rem', color: 'var(--ink-3)' }}>
          <Icon name={msg.kind === 'call_missed_video' ? 'video' : 'phone'} size={12} stroke="var(--ink-4)"/>
          {msg.kind === 'call_missed_video' ? 'Missed video call' : 'Missed voice call'}
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '.66rem', color: 'var(--ink-4)' }}>
            {formatRelativeTime(msg.createdAt)}
          </span>
        </div>
      </div>
    );
  }

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

          {/* Dropdown chevron — always usable on touch (no hover state there); brightens on hover for desktop */}
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
              opacity: hovered ? 1 : .55,
              transition: 'opacity .15s',
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
          {msg.kind === 'shared_post' && msg.sharedPostId ? (
            <SharedPostPreview postId={msg.sharedPostId} sent={sent}/>
          ) : msg.kind === 'voice' && msg.audioUrl ? (
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
                    <span style={{ fontSize: '.85rem', lineHeight: 1 }}>{emoji}</span>
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
                  <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>{r.emoji}</span>
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, position: 'relative',
      background: 'var(--white)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <header style={{ padding: '1.1rem 1.3rem', borderBottom: '1px solid var(--border)', background: 'var(--white)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
          <button onClick={() => bond.otherUser?.id && router.push(`/grove/${bond.otherUser.id}`)} title="Enter their Grouv" style={{ flexShrink: 0 }}>
            <Avatar name={otherName} size={46} aura={bond.otherUser?.aura ?? undefined} avatarUrl={bond.otherUser?.avatarUrl}/>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <button onClick={() => bond.otherUser?.id && router.push(`/grove/${bond.otherUser.id}`)}
              style={{ display: 'block', width: '100%', textAlign: 'left', fontWeight: 600, fontSize: '.95rem',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{otherName}</button>
            {bond.otherUser?.openTo && (
              <div style={{ fontSize: '.74rem', color: 'var(--ink-4)', marginTop: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {bond.otherUser.openTo}
              </div>
            )}
          </div>
          <button title="Voice call" onClick={() => startCall(bond, 'voice')}
            style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--slate-dim)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Icon name="phone" size={19} stroke="var(--slate)"/>
          </button>
          <button title="Video call" onClick={() => startCall(bond, 'video')}
            style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--slate-dim)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Icon name="video" size={19} stroke="var(--slate)"/>
          </button>
          {bond.status === 'circle'
            ? <span style={{ fontSize: '.74rem', color: 'var(--ink-4)', marginLeft: '.2rem', flexShrink: 0 }}>Circle</span>
            : <button onClick={() => router.push(`/bond-release?bond=${encodeURIComponent(otherName)}&bondId=${bond.id}`)}
                style={{ fontSize: '.74rem', color: 'var(--ink-4)', marginLeft: '.2rem', flexShrink: 0, whiteSpace: 'nowrap' }}>Release</button>}
        </div>

        {bond.status === 'circle' ? (
          <div style={{ marginTop: '.9rem', fontSize: '.74rem', color: 'var(--ink-4)', fontStyle: 'italic' }}>
            You started Grouving recently. Keep showing up, Bonds grow from here.
          </div>
        ) : (
          <div style={{ marginTop: '.9rem', display: 'flex', alignItems: 'center', gap: '.7rem' }}>
            <span className="label-mono">Bond depth</span>
            <div style={{ flex: 1 }}><ProgressBar value={bond.depthScore ?? 0}/></div>
            <span style={{ fontSize: '.72rem', color: 'var(--ink-4)' }}>{humanDuration(bond.formedAt)}</span>
          </div>
        )}
      </header>

      {/* ── Deep Focus banner ── */}
      {bond.otherUser?.deepFocusActive && (
        <div style={{ padding: '.55rem 1.2rem', background: 'var(--ink)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <Icon name="moon" size={13} stroke="var(--cream)" sw={1.8}/>
          <span style={{ fontSize: '.78rem', color: 'var(--cream)', fontWeight: 500 }}>
            {bond.otherUser.displayName?.split(' ')[0]} is in Deep Focus. They&apos;ll see your message when they return.
          </span>
        </div>
      )}

      {/* ── Messages ── */}
      <div ref={threadRef} className="scroll" style={{ flex: 1, overflowY: 'auto',
        padding: '1.3rem', background: 'var(--surf-low)' }}>

        {bond.status === 'bond' && (bond.depthScore ?? 0) > 70 && (
          <div className="card" style={{ padding: '1rem 1.2rem', marginBottom: '1.2rem',
            background: 'var(--ember-dim)', border: '1px solid var(--ember-bdr)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem' }}>🎉</div>
            <p style={{ fontWeight: 600, margin: '.3rem 0' }}>Your Bond with {otherName.split(' ')[0]} is {humanDuration(bond.formedAt)} old.</p>
            <p style={{ fontSize: '.85rem', color: 'var(--ink-2)' }}>Reach out today.</p>
          </div>
        )}

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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// BONDS PAGE
// ─────────────────────────────────────────────────────────────────
function BondsPageInner() {
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
  const [busyInvIds, setBusyInvIds] = useState<Set<string>>(new Set());
  const { data: sentInvitations } = useSentBondInvitations();
  const sentIds = new Set((sentInvitations ?? []).filter(i => i.status === 'pending').map(i => i.toUserId));

  const allConnections = bondsData ?? [];
  const realBonds = allConnections.filter(b => b.status === 'bond');
  // Circle: whoever you spoke to most recently rises to the top.
  const circle    = allConnections.filter(b => b.status === 'circle')
    .sort((a, b) => new Date(b.lastMessageAt ?? b.formedAt).getTime() - new Date(a.lastMessageAt ?? a.formedAt).getTime());
  // Selection index (sel) is a position into THIS list — must stay in lockstep
  // with the order list items render in, not the raw backend order.
  const orderedList = [...realBonds, ...circle];
  const slots     = Math.max(0, 5 - realBonds.length);
  const pending   = (invitations ?? []).filter(i => i.status === 'pending');

  const right = (
    <>
      {pending.length > 0 && (
        <RPSection label={`Bond invitations (${pending.length})`}>
          {pending.map(inv => (
            <div key={inv.id} className="card" style={{ padding: '.85rem', marginBottom: '.6rem', boxShadow: 'var(--shadow-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.7rem' }}>
                <Avatar name={inv.fromUser?.displayName ?? '?'} size={40} avatarUrl={inv.fromUser?.avatarUrl} aura={inv.fromUser?.aura ?? undefined}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '.86rem' }}>{inv.fromUser?.displayName ?? 'Someone'}</div>
                  {inv.message && <div style={{ fontSize: '.72rem', color: 'var(--ink-3)', fontStyle: 'italic' }}>{inv.message}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <button disabled={busyInvIds.has(inv.id)} className="btn btn-primary"
                  style={{ flex: 1, padding: '.4rem', fontSize: '.8rem' }}
                  onClick={async () => {
                    setBusyInvIds(s => new Set(s).add(inv.id));
                    try {
                      const result = await acceptInv.mutateAsync(inv.id);
                      if (result.accepted === false) {
                        toast('This invitation is no longer available.');
                      } else {
                        toast(`${inv.fromUser?.displayName?.split(' ')[0]} is now in your Circle. Chat for 7 days to form a Bond.`);
                      }
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : '';
                      toast(msg ? `Could not accept: ${msg}` : 'Could not accept.');
                    } finally {
                      setBusyInvIds(s => { const n = new Set(s); n.delete(inv.id); return n; });
                    }
                  }}>Accept</button>
                <button disabled={busyInvIds.has(inv.id)} className="btn btn-soft"
                  style={{ flex: 1, padding: '.4rem', fontSize: '.8rem' }}
                  onClick={async () => {
                    setBusyInvIds(s => new Set(s).add(inv.id));
                    try { await declineInv.mutateAsync(inv.id); }
                    catch (err) {
                      const msg = err instanceof Error ? err.message : '';
                      toast(msg ? `Could not decline: ${msg}` : 'Could not decline.');
                    } finally {
                      setBusyInvIds(s => { const n = new Set(s); n.delete(inv.id); return n; });
                    }
                  }}>Decline</button>
              </div>
            </div>
          ))}
        </RPSection>
      )}

      <RPSection label="Suggested for you" suggested>
        {suggestions && suggestions.length > 0 ? suggestions.slice(0, 5).map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.5rem 0' }}>
            <Avatar name={s.displayName} size={38} avatarUrl={s.avatarUrl} aura={s.aura ?? undefined}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: '.84rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.displayName}</div>
              <div style={{ fontSize: '.7rem', color: 'var(--ember)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.reason}</div>
            </div>
            <button disabled={invited.includes(s.id) || sentIds.has(s.id) || inviteToBond.isPending}
              onClick={async () => {
                try { await inviteToBond.mutateAsync({ recipientId: s.id }); setInvited(v => [...v, s.id]); toast(`Bond invitation sent to ${s.displayName.split(' ')[0]}.`); }
                catch { toast('Could not send.'); }
              }}
              className="btn btn-ghost" style={{ padding: '.35rem .75rem', fontSize: '.76rem', flexShrink: 0 }}>
              {invited.includes(s.id) || sentIds.has(s.id) ? 'Sent' : 'Invite'}
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
            style={{ width: '38%', minWidth: 280, maxWidth: 360, flexShrink: 0, overflowY: 'auto' }}>
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
                    <button key={b.id} onClick={() => { setSel(i); setMobileView('thread'); }} className="card" style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '1rem', marginBottom: '.7rem',
                      borderLeft: active ? '4px solid var(--ember)' : '4px solid transparent',
                      boxShadow: active ? 'var(--shadow)' : 'var(--shadow-soft)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', marginBottom: '.7rem' }}>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <Avatar name={name} size={50} aura={b.otherUser?.aura ?? undefined} avatarUrl={b.otherUser?.avatarUrl}/>
                          {inFocus && (
                            <div title="In Deep Focus" style={{ position: 'absolute', bottom: -1, right: -1,
                              width: 16, height: 16, borderRadius: '50%', background: 'var(--ink)',
                              border: '2px solid var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Icon name="moon" size={9} stroke="var(--cream)" sw={1.8}/>
                            </div>
                          )}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                          {inFocus ? (
                            <span style={{ fontSize: '.7rem', color: 'var(--ink-3)', fontStyle: 'italic' }}>in focus</span>
                          ) : b.otherUser?.openTo ? (
                            <div style={{ fontSize: '.74rem', color: 'var(--ink-4)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.otherUser.openTo}</div>
                          ) : null}
                        </div>
                      </div>
                      <ProgressBar value={b.depthScore ?? 0}/>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.5rem', fontSize: '.72rem', color: 'var(--ink-3)' }}>
                        <span>Bond depth</span>
                        <span>{b.lastMessageAt ? `Last message: ${formatRelativeTime(b.lastMessageAt)}` : 'No messages yet'}</span>
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

                {/* ── Circle: recent connections, sorted by last chatted ── */}
                {circle.length > 0 && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      margin: '1.4rem 0 .6rem', padding: '0 .2rem' }}>
                      <div className="label-mono">Your Circle</div>
                      <span style={{ fontSize: '.7rem', color: 'var(--ink-4)' }}>{circle.length} connected</span>
                    </div>
                    <div className="card" style={{ padding: '.3rem .4rem', boxShadow: 'var(--shadow-soft)' }}>
                      {circle.map((b, i) => {
                        const name = b.otherUser?.displayName ?? 'Circle';
                        const idx  = realBonds.length + i;
                        const active = sel === idx;
                        const streak = b.streakDays ?? 0;
                        const pct    = Math.min(100, Math.round((streak / 7) * 100));
                        const unread = b.unreadCount ?? 0;
                        return (
                          <button key={b.id} onClick={() => { setSel(idx); setMobileView('thread'); }} style={{
                            display: 'block', width: '100%', textAlign: 'left', padding: '.6rem .6rem', borderRadius: 'var(--r-md)',
                            background: active ? 'var(--ember-dim)' : 'transparent',
                            borderBottom: i < circle.length - 1 ? '1px solid var(--border)' : 'none',
                          }}
                            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--surf-low)'; }}
                            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem' }}>
                              <div style={{ position: 'relative', flexShrink: 0 }}>
                                <Avatar name={name} size={40} avatarUrl={b.otherUser?.avatarUrl} aura={b.otherUser?.aura ?? undefined}/>
                                {b.otherUser?.deepFocusActive && (
                                  <div title="In Deep Focus" style={{ position: 'absolute', bottom: -1, right: -1,
                                    width: 14, height: 14, borderRadius: '50%', background: 'var(--ink)',
                                    border: '2px solid var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Icon name="moon" size={7} stroke="var(--cream)" sw={1.8}/>
                                  </div>
                                )}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '.86rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                                <div style={{ fontSize: '.72rem', color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {b.otherUser?.deepFocusActive ? 'in focus' : (b.otherUser?.openTo || ' ')}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: '.66rem', color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>
                                  {b.lastMessageAt ? formatRelativeTime(b.lastMessageAt) : 'new'}
                                </div>
                                {unread > 0 && (
                                  <span style={{ display: 'inline-block', marginTop: 3, minWidth: 16, height: 16, lineHeight: '16px',
                                    borderRadius: 100, background: 'var(--ember)', color: '#fff', fontSize: '.6rem', fontWeight: 600,
                                    textAlign: 'center', padding: '0 4px' }}>{unread}</span>
                                )}
                              </div>
                            </div>
                            {/* Streak — fills toward the 7-day Bond threshold */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '.4rem', paddingLeft: 50 }}>
                              <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--surf-high)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`,
                                  background: pct >= 85 ? 'var(--sage)' : 'var(--ink-4)',
                                  transition: 'width .5s ease' }}/>
                              </div>
                              <span style={{ fontSize: '.62rem', color: 'var(--ink-4)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
                                {formatLastSeen(b.otherUser?.lastActiveAt)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <p style={{ fontSize: '.72rem', color: 'var(--ink-4)', fontStyle: 'italic', margin: '.7rem .2rem 0', lineHeight: 1.45 }}>
                      Everyone you&apos;ve started Grouving with. Whoever you spoke to most recently rises to the top.
                    </p>
                  </>
                )}
              </>
            )}
          </div>

          {/* ── Thread ── */}
          <div className={`bonds-thread-col${mobileView === 'list' ? ' bonds-thread-hidden-mobile' : ''}`}
            style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {/* Mobile back button */}
            <button className="bonds-back-btn"
              onClick={() => setMobileView('list')}
              style={{ display: 'none', alignItems: 'center', gap: '.4rem',
                padding: '.5rem 0', marginBottom: '.5rem',
                fontSize: '.86rem', color: 'var(--ink-3)', fontWeight: 500 }}>
              <Icon name="back" size={16} stroke="var(--ink-3)"/> All bonds
            </button>
            {orderedList.length > 0 ? (
              <BondThread bond={orderedList[Math.min(sel, orderedList.length - 1)]}/>
            ) : !isLoading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                <div className="card" style={{
                  background: 'linear-gradient(160deg, var(--ember-dim), var(--slate-dim))',
                  boxShadow: 'var(--shadow-lg)', maxWidth: 420, width: '100%',
                }}>
                  <EmptyState variant="bonds" title="Your first Bond is waiting."
                    body="Show up consistently for someone in your circle. It can't be rushed, but it's worth it."
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

export default function BondsPage() {
  return (
    <FeatureGate flagKey="nav_bonds">
      <BondsPageInner />
    </FeatureGate>
  );
}
