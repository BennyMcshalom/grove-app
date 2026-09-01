'use client';
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Icon } from './Icon';
import { useToastStore } from '@/store/useToastStore';
import { spaceById, avatarFor } from '@/lib/data';
import type { Post } from '@/lib/types';
import styles from './ShareModal.module.css';

type PlatformId = 'whatsapp' | 'x' | 'facebook' | 'email';

const PLATFORMS: { id: PlatformId; label: string; bg: string }[] = [
  { id: 'whatsapp', label: 'WhatsApp', bg: '#25D366' },
  { id: 'x', label: 'X', bg: '#000' },
  { id: 'facebook', label: 'Facebook', bg: '#1877F2' },
  { id: 'email', label: 'Email', bg: 'var(--ink-3)' },
];

function platformUrl(id: PlatformId, shareText: string, shareUrl: string) {
  const t = encodeURIComponent(shareText), u = encodeURIComponent(shareUrl);
  switch (id) {
    case 'whatsapp': return `https://wa.me/?text=${t}`;
    case 'x': return `https://twitter.com/intent/tweet?text=${t}`;
    case 'facebook': return `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}`;
    case 'email': return `mailto:?subject=${encodeURIComponent('Something on Grouv')}&body=${t}%20${u}`;
  }
}

// Rounded-rect path helper for the generated share card.
function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function ShareModal({ post, onClose }: { post: Post & { _id?: string }; onClose: () => void }) {
  const { toast } = useToastStore();
  const name = post.anon ? 'A connection in your space' : post.name || 'Someone';
  const isJust = post.kind === 'just_grouw';
  const space = spaceById(post.space);
  const quote = (isJust ? post.caption : post.honest || post.doing) || '';

  // Deep-links straight to the post via the same /spaces/{slug}?post={id}
  // route Search, Notifications, and Grove profiles already use.
  const postPath = `/spaces/${post.space}?post=${post._id ?? post.id}`;
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}${postPath}` : `https://grouv.app${postPath}`;
  const shareText = quote ? `"${quote}", via Grouv` : 'Check this out on Grouv';

  const [copied, setCopied] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Canvas text draws with whatever font is already parsed — without
      // this, the card can silently fall back to a system font on first
      // render since next/font's Outfit hasn't necessarily loaded yet.
      try {
        await Promise.all([
          document.fonts.load('600 15px Outfit'),
          document.fonts.load('700 21px Outfit'),
          document.fonts.load('500 13px Outfit'),
        ]);
      } catch {
        /* best-effort — falls back to system sans if it fails */
      }
      if (cancelled) return;

      const W = 640, H = 420, dpr = 2;
      const canvas = document.createElement('canvas');
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);

      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#FAFAF8');
      bg.addColorStop(1, '#FBE6D6');
      roundedRect(ctx, 0, 0, W, H, 26);
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(243,112,30,.22)';
      roundedRect(ctx, 1, 1, W - 2, H - 2, 26);
      ctx.stroke();

      // Wordmark
      roundedRect(ctx, 40, 40, 28, 28, 9);
      ctx.fillStyle = '#F3701E';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '700 16px Georgia';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('G', 54, 56);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#C9551A';
      ctx.font = '700 21px Georgia';
      ctx.fillText('Grouv', 80, 62);

      // Space chip
      ctx.font = '500 13px Outfit, sans-serif';
      const chip = `${space.emoji} ${space.name}`;
      const cw = ctx.measureText(chip).width + 24;
      roundedRect(ctx, W - 40 - cw, 42, cw, 26, 100);
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.fill();
      ctx.fillStyle = '#4A4642';
      ctx.fillText(chip, W - 40 - cw + 12, 60);

      // Author avatar + name (blank initials for anonymous posts, on purpose)
      const av = avatarFor(post.anon ? '' : name);
      const cx = 40 + 22, cy = 112 + 22, r = 22;
      const ag = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      ag.addColorStop(0, av.grad[0]);
      ag.addColorStop(1, av.grad[1]);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = ag;
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '600 15px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(av.initials, cx, cy + 1);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#1C1B1A';
      ctx.font = '600 17px Outfit, sans-serif';
      ctx.fillText(name, 40 + 56, 112 + 28);

      // Quote, word-wrapped
      if (quote) {
        ctx.fillStyle = '#1C1B1A';
        ctx.font = 'italic 500 27px Georgia';
        const words = `"${quote}"`.split(' ');
        let line = '', y = 204;
        const lh = 36, maxW = W - 80;
        words.forEach(w => {
          const test = line + w + ' ';
          if (ctx.measureText(test).width > maxW && line) {
            ctx.fillText(line, 40, y);
            line = w + ' ';
            y += lh;
          } else {
            line = test;
          }
        });
        ctx.fillText(line, 40, y);
      }

      if (!cancelled) setImgUrl(canvas.toDataURL('image/png'));
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const copyLink = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopied(true);
    toast('Link copied.');
    copyTimer.current = setTimeout(() => setCopied(false), 1800);
  };
  const openExternal = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={clsx('rise', styles.modal)} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={clsx('serif', styles.title)}>Share</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <Icon name="close" size={16} stroke="var(--ink-3)" />
          </button>
        </div>

        {imgUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgUrl} alt="" className={styles.cardImg} />
        ) : (
          <div className={styles.cardPlaceholder}>
            <span className={styles.placeholderText}>Preparing card…</span>
          </div>
        )}

        <div className={styles.platformsGrid}>
          {PLATFORMS.map(p => (
            <button key={p.id} onClick={() => openExternal(platformUrl(p.id, shareText, shareUrl))} className={styles.platformBtn}>
              <span className={styles.platformIcon} style={{ background: p.bg }}>
                {p.id === 'whatsapp' && <Icon name="phone" size={19} stroke="#fff" sw={2} />}
                {p.id === 'x' && <span className={styles.xLabel}>X</span>}
                {p.id === 'facebook' && <span className={styles.fbLabel}>f</span>}
                {p.id === 'email' && <Icon name="envelope" size={18} stroke="#fff" sw={2} />}
              </span>
              <span className={styles.platformName}>{p.label}</span>
            </button>
          ))}
        </div>

        <div className={styles.actionsRow}>
          <button onClick={copyLink} className={clsx('btn', 'btn-soft', styles.actionBtn)}>
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          {imgUrl && (
            <a href={imgUrl} download={`grouv-${post.id}.png`} className={clsx('btn', 'btn-primary', styles.downloadBtn)}>
              Download card
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
