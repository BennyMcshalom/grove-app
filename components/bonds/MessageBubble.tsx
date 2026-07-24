'use client';
import { useState, useRef } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ReportModal } from '@/components/ui/ReportModal';
import { useToastStore } from '@/store/useToastStore';
import { bondsApi } from '@/lib/api';
import { formatRelativeTime } from '@/lib/mappers';
import type { BondMessage } from '@/lib/api';
import { SharedPostPreview } from './SharedPostPreview';
import { VoicePlayer } from './VoicePlayer';

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

// ─────────────────────────────────────────────────────────────────
// MESSAGE BUBBLE
// Long-press (mobile) or right-click (desktop) opens a context menu
// with a quick-emoji row and action items — same UX as WhatsApp.
// ─────────────────────────────────────────────────────────────────
export function MessageBubble({ msg, myId, bondId, otherName, otherAvatarUrl, onReply }: {
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
