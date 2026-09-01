'use client';
import { useState, useRef } from 'react';
import clsx from 'clsx';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ReportModal } from '@/components/ui/ReportModal';
import { useToastStore } from '@/store/useToastStore';
import { bondsApi } from '@/lib/api';
import { formatRelativeTime } from '@/lib/mappers';
import type { BondMessage } from '@/lib/api';
import { SharedPostPreview } from './SharedPostPreview';
import { VoicePlayer } from './VoicePlayer';
import styles from './MessageBubble.module.css';

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
      <div className={styles.missedCallWrap}>
        <div className={styles.missedCallPill}>
          <Icon name={msg.kind === 'call_missed_video' ? 'video' : 'phone'} size={12} stroke="var(--ink-4)"/>
          {msg.kind === 'call_missed_video' ? 'Missed video call' : 'Missed voice call'}
          <span className={styles.missedCallTime}>
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

  const menuActions = [
    { label: 'Reply', icon: 'reply', danger: false, action: () => { onReply(msg); closeMenu(); } },
    ...(msg.kind !== 'voice' && msg.body ? [{ label: 'Copy', icon: 'copy', danger: false, action: () => { copyText(); closeMenu(); } }] : []),
    ...(!sent ? [{ label: 'Report', icon: 'flag', danger: true, action: () => { setReporting(true); closeMenu(); } }] : []),
  ];

  return (
    <>
      <div
        className={clsx('msg-row', styles.row, sent && styles.sent, !isLastInGroup && styles.grouped)}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={cancelLongPress}
        onTouchMove={cancelLongPress}
      >
        {/* Avatar — received messages only, shown once per group (last message) */}
        {!sent && (isLastInGroup
          ? <Avatar name={otherName} size={28} style={{ flexShrink: 0 }} avatarUrl={otherAvatarUrl}/>
          : <div className={styles.avatarSpacer}/>)}

        {/* Column: toolbar + bubble + reactions */}
        <div className={styles.col}>

          {/* Hover toolbar — desktop mouse only (CSS-revealed via .msg-row:hover) */}
          <div className={clsx('msg-toolbar', styles.toolbar, sent && styles.sent)}>
            <button title="React" className={styles.toolbarBtn} onClick={() => setEmojiPickerOpen(v => !v)}>
              <Icon name="smile" size={15} stroke="var(--ink-3)"/>
            </button>
            <button title="Reply" className={styles.toolbarBtn} onClick={() => onReply(msg)}>
              <Icon name="reply" size={15} stroke="var(--ink-3)"/>
            </button>
            <button title="More" className={styles.toolbarBtn}
              onClick={e => { const r = e.currentTarget.getBoundingClientRect(); openMenu(r.left, r.bottom + 6); }}>
              <Icon name="dots" size={15} stroke="var(--ink-3)"/>
            </button>
          </div>

          {/* Quick-react popover */}
          {emojiPickerOpen && (
            <>
              <button onClick={() => setEmojiPickerOpen(false)} className={styles.emojiPickerBackdrop}/>
              <div className={clsx(styles.emojiPicker, sent && styles.sent)}>
                {REACTIONS.map(r => (
                  <button key={r.emoji} title={r.label}
                    onClick={() => { handleReact(r.emoji); setEmojiPickerOpen(false); }}
                    className={styles.emojiBtn}>
                    <span className={styles.emojiGlyph}>{r.emoji}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Reply quote tag — shows who was replied to + preview */}
          {msg.replyPreview && (
            <div className={clsx(styles.replyTag, sent && styles.sent)}>
              <div className={clsx(styles.replyTagBar, sent && styles.sent)}/>
              <div className={styles.replyTagBody}>
                <div className={clsx(styles.replyTagHeader, sent && styles.sent)}>
                  <Icon name="reply" size={11} stroke={sent ? 'rgba(255,255,255,0.9)' : 'var(--ember)'} sw={2}/>
                  {sent ? otherName.split(' ')[0] : 'You'}
                </div>
                <div className={clsx(styles.replyTagPreview, sent && styles.sent)}>
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
            <div className={clsx(styles.bubble, sent && styles.sent, msg.replyPreview && styles.hasReply)}>
              {msg.body}
            </div>
          )}

          {/* Reaction pills — below bubble */}
          {reactionList.length > 0 && (
            <div className={clsx(styles.reactionsRow, sent && styles.sent)}>
              {reactionList.map(([emoji, users]) => {
                const r = REACTIONS.find(x => x.emoji === emoji);
                const active = users.includes(myId);
                return (
                  <button key={emoji} onClick={() => handleReact(emoji)}
                    title={r?.label ?? emoji}
                    className={clsx(styles.reactionPill, active && styles.active)}>
                    <span className={styles.reactionEmoji}>{emoji}</span>
                    <span className={styles.reactionLabel}>{r?.label ?? emoji}</span>
                    {users.length > 1 && <span className={styles.reactionCount}>{users.length}</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Read receipt */}
          {sent && msg.readAt && (
            <div className={styles.readReceipt}>
              <Icon name="check" size={10} stroke="var(--sage)" sw={2.5}/>
              <span className={styles.readReceiptText}>seen</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Full context menu (right-click / long-press / "more" button) ── */}
      {menu && (
        <>
          {/* Backdrop — clicking anywhere outside closes it */}
          <div
            className={styles.menuBackdrop}
            onClick={closeMenu}
            onContextMenu={e => { e.preventDefault(); closeMenu(); }}
          />
          <div className={styles.menu} style={{ left: menu.x, top: menu.y }}>
            {/* Quick reaction row */}
            <div className={styles.menuReactionsRow}>
              {REACTIONS.map(r => (
                <button key={r.emoji} onClick={() => { handleReact(r.emoji); closeMenu(); }}
                  title={r.label}
                  className={clsx(styles.menuEmojiBtn, myEmoji === r.emoji && styles.active)}>
                  <span className={styles.menuEmojiGlyph}>{r.emoji}</span>
                </button>
              ))}
            </div>
            {/* Action rows */}
            <div className={styles.menuActions}>
              {menuActions.map(item => (
                <button key={item.label} onClick={item.action}
                  className={clsx(styles.menuActionRow, item.danger && styles.danger)}>
                  <Icon name={item.icon} size={16} stroke={item.danger ? 'var(--red)' : 'var(--ink-2)'} sw={1.8}/>
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
