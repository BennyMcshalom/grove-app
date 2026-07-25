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
  { emoji: '❤️', label: 'Love' },
  { emoji: '👍', label: 'Like' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '😂', label: 'Haha' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '🙏', label: 'Thanks' },
  { emoji: '💪', label: 'Strong' },
];

// ─────────────────────────────────────────────────────────────────
// MESSAGE BUBBLE
// Desktop: hovering a message reveals a small floating toolbar
// (react / reply / more) above it — no more inline chevron. Right-click
// or the toolbar's "more" button opens a full context menu; long-press
// opens the same menu on touch, where hover doesn't exist.
// Grouping: consecutive messages from the same sender sit tight together
// with the avatar shown only on the last one of the run.
// ─────────────────────────────────────────────────────────────────
export function MessageBubble({ msg, myId, bondId, otherName, otherAvatarUrl, onReply, isLastInGroup }: {
  msg: BondMessage; myId: string; bondId: string; otherName: string;
  otherAvatarUrl?: string | null;
  onReply: (msg: BondMessage) => void;
  isLastInGroup: boolean;
}) {
  const { toast } = useToastStore();
  const sent = msg.senderId === myId;
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [localReactions, setLocalReactions] = useState<Record<string, string[]>>(msg.reactions ?? {});
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reporting, setReporting] = useState(false);

  // System row — a missed call log entry, not a real message: no bubble,
  // no reactions/reply/menu, just a centered pill like WhatsApp/iMessage.
  if (msg.kind === 'call_missed_voice' || msg.kind === 'call_missed_video') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', margin: '.85rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.45rem', padding: '.4rem .95rem',
          borderRadius: 100, background: 'var(--white)', boxShadow: 'var(--shadow-soft)',
          fontSize: '.76rem', color: 'var(--ink-3)' }}>
          <Icon name={msg.kind === 'call_missed_video' ? 'video' : 'phone'} size={12} stroke="var(--ink-4)"/>
          {msg.kind === 'call_missed_video' ? 'Missed video call' : 'Missed voice call'}
          <span style={{ fontFamily: 'var(--font-dm-mono, DM Mono)', fontSize: '.66rem', color: 'var(--ink-4)' }}>
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
    const MENU_H = 220; // emoji row ~50 + up to 3 actions ~120 + padding
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

  // Mobile: long-press (500ms) — the only entry point on touch, since
  // there's no hover toolbar there.
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

  const copyText = () => {
    if (!msg.body) return;
    navigator.clipboard.writeText(msg.body).catch(() => {});
    toast('Copied.');
  };

  const toolbarBtnStyle: React.CSSProperties = {
    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  return (
    <>
      <div
        className="msg-row"
        style={{ display: 'flex', justifyContent: sent ? 'flex-end' : 'flex-start',
          alignItems: 'flex-end', gap: '.45rem', marginBottom: isLastInGroup ? '.85rem' : '.2rem',
          WebkitUserSelect: 'none', userSelect: 'none' }}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={cancelLongPress}
        onTouchMove={cancelLongPress}
      >
        {/* Avatar — received messages only, shown once per group (last message) */}
        {!sent && (isLastInGroup
          ? <Avatar name={otherName} size={28} style={{ flexShrink: 0 }} avatarUrl={otherAvatarUrl}/>
          : <div style={{ width: 28, flexShrink: 0 }}/>)}

        {/* Column: toolbar + bubble + reactions */}
        <div style={{ position: 'relative', maxWidth: '68%' }}>

          {/* Hover toolbar — desktop mouse only (CSS-revealed via .msg-row:hover) */}
          <div className="msg-toolbar" style={{
            position: 'absolute', top: -36, [sent ? 'right' : 'left']: 0,
            display: 'flex', alignItems: 'center', gap: 1, background: 'var(--white)',
            borderRadius: 100, padding: 3, boxShadow: 'var(--shadow)', border: '1px solid var(--border)', zIndex: 5,
          }}>
            <button title="React" style={toolbarBtnStyle}
              onClick={() => setEmojiPickerOpen(v => !v)}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf-low)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <Icon name="smile" size={15} stroke="var(--ink-3)"/>
            </button>
            <button title="Reply" style={toolbarBtnStyle}
              onClick={() => onReply(msg)}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf-low)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <Icon name="reply" size={15} stroke="var(--ink-3)"/>
            </button>
            <button title="More" style={toolbarBtnStyle}
              onClick={e => { const r = e.currentTarget.getBoundingClientRect(); openMenu(r.left, r.bottom + 6); }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf-low)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <Icon name="dots" size={15} stroke="var(--ink-3)"/>
            </button>
          </div>

          {/* Quick-react popover */}
          {emojiPickerOpen && (
            <>
              <button onClick={() => setEmojiPickerOpen(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 5, cursor: 'default' }}/>
              <div style={{
                position: 'absolute', top: -78, [sent ? 'right' : 'left']: 0,
                display: 'flex', gap: 1, background: 'var(--white)', borderRadius: 100, padding: '3px 4px',
                boxShadow: 'var(--shadow)', border: '1px solid var(--border)', zIndex: 6, animation: 'rise .12s ease both',
              }}>
                {REACTIONS.map(r => (
                  <button key={r.emoji} title={r.label}
                    onClick={() => { handleReact(r.emoji); setEmojiPickerOpen(false); }}
                    style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                    <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>{r.emoji}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Reply quote tag — shows who was replied to + preview */}
          {msg.replyPreview && (
            <div style={{
              display: 'flex', alignItems: 'stretch', gap: 0,
              borderRadius: '20px 20px 0 0', overflow: 'hidden',
              background: sent ? 'rgba(0,0,0,0.16)' : 'var(--surf-low)',
            }}>
              <div style={{ width: 3, flexShrink: 0,
                background: sent ? 'rgba(255,255,255,0.8)' : 'var(--ember)' }}/>
              <div style={{ padding: '.5rem .85rem .45rem', minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '.7rem', fontWeight: 700, marginBottom: '.15rem',
                  color: sent ? 'rgba(255,255,255,0.95)' : 'var(--ember)' }}>
                  <Icon name="reply" size={11} stroke={sent ? 'rgba(255,255,255,0.9)' : 'var(--ember)'} sw={2}/>
                  {sent ? otherName.split(' ')[0] : 'You'}
                </div>
                <div style={{ fontSize: '.78rem', lineHeight: 1.35,
                  color: sent ? 'rgba(255,255,255,0.75)' : 'var(--ink-3)',
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
            <div style={{ padding: '.68rem 1rem', borderRadius: 20, fontSize: '.92rem', lineHeight: 1.55,
              background: sent ? 'var(--ember)' : 'var(--white)',
              color: sent ? '#fff' : 'var(--ink)',
              boxShadow: sent ? '0 2px 10px -3px rgba(243,112,30,.4)' : 'var(--shadow-soft)',
              borderBottomRightRadius: sent ? 6 : 20, borderBottomLeftRadius: sent ? 20 : 6,
              borderTopLeftRadius: msg.replyPreview ? 0 : 20, borderTopRightRadius: msg.replyPreview ? 0 : 20 }}>
              {msg.body}
            </div>
          )}

          {/* Reaction pills — below bubble */}
          {reactionList.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap',
              marginTop: 5, justifyContent: sent ? 'flex-end' : 'flex-start' }}>
              {reactionList.map(([emoji, users]) => {
                const r = REACTIONS.find(x => x.emoji === emoji);
                const active = users.includes(myId);
                return (
                  <button key={emoji} onClick={() => handleReact(emoji)}
                    title={r?.label ?? emoji}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: 'var(--white)', borderRadius: 100, padding: '3px 9px',
                      border: active ? '1.5px solid var(--ember)' : '1px solid var(--border-2)',
                      boxShadow: 'var(--shadow-soft)', cursor: 'pointer', transition: 'transform .1s',
                      color: active ? 'var(--ember)' : 'var(--ink-3)' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 3 }}>
              <Icon name="check" size={10} stroke="var(--sage)" sw={2.5}/>
              <span style={{ fontSize: '.6rem', color: 'var(--ink-4)', fontFamily: 'var(--font-dm-mono, DM Mono)' }}>seen</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Full context menu (right-click / long-press / "more" button) ── */}
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
            borderRadius: 16,
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            width: 'min(226px, calc(100vw - 20px))',
            animation: 'rise .12s ease both',
          }}>
            {/* Quick reaction row */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '.55rem .5rem',
              borderBottom: '1px solid var(--border)', gap: 2, flexWrap: 'wrap' }}>
              {REACTIONS.map(r => (
                <button key={r.emoji} onClick={() => { handleReact(r.emoji); closeMenu(); }}
                  title={r.label}
                  style={{ width: 32, height: 32, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: myEmoji === r.emoji ? 'var(--ember-dim)' : 'transparent',
                    outline: myEmoji === r.emoji ? '2px solid var(--ember)' : 'none',
                    cursor: 'pointer', transition: 'transform .1s, background .1s', flexShrink: 0,
                    color: myEmoji === r.emoji ? 'var(--ember)' : 'var(--ink-3)' }}
                  onMouseEnter={ev => (ev.currentTarget.style.transform = 'scale(1.2)')}
                  onMouseLeave={ev => (ev.currentTarget.style.transform = 'scale(1)')}>
                  <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{r.emoji}</span>
                </button>
              ))}
            </div>
            {/* Action rows */}
            <div style={{ padding: '.3rem' }}>
              {[
                { label: 'Reply', icon: 'reply', action: () => { onReply(msg); closeMenu(); } },
                ...(msg.kind !== 'voice' && msg.body ? [{ label: 'Copy', icon: 'copy', action: () => { copyText(); closeMenu(); } }] : []),
                ...(!sent ? [{ label: 'Report', icon: 'flag', action: () => { setReporting(true); closeMenu(); } }] : []),
              ].map(item => (
                <button key={item.label} onClick={item.action}
                  style={{ display: 'flex', alignItems: 'center', gap: '.75rem', width: '100%',
                    padding: '.65rem .8rem', fontSize: '.88rem', fontWeight: 500, borderRadius: 10,
                    color: item.label === 'Report' ? 'var(--red)' : 'var(--ink)', textAlign: 'left', transition: 'background .1s' }}
                  onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--surf-low)')}
                  onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                  <Icon name={item.icon} size={16} stroke={item.label === 'Report' ? 'var(--red)' : 'var(--ink-2)'} sw={1.8}/>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {reporting && (
        <ReportModal contentType="bond_message" contentId={msg.id} onClose={() => setReporting(false)}/>
      )}
    </>
  );
}
