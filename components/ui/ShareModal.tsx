'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { useToastStore } from '@/store/useToastStore';
import { spaceById, avatarFor } from '@/lib/data';
import type { Post } from '@/lib/types';

type PlatformId = 'whatsapp' | 'x' | 'facebook' | 'email';

const PLATFORMS: { id: PlatformId; label: string; bg: string }[] = [
  { id: 'whatsapp', label: 'WhatsApp', bg: '#25D366' },
  { id: 'x',        label: 'X',        bg: '#000' },
  { id: 'facebook', label: 'Facebook', bg: '#1877F2' },
  { id: 'email',    label: 'Email',    bg: 'var(--ink-3)' },
];

function platformUrl(id: PlatformId, shareText: string, shareUrl: string) {
  const t = encodeURIComponent(shareText), u = encodeURIComponent(shareUrl);
  switch (id) {
    case 'whatsapp': return `https://wa.me/?text=${t}`;
    case 'x':        return `https://twitter.com/intent/tweet?text=${t}`;
    case 'facebook': return `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}`;
    case 'email':    return `mailto:?subject=${encodeURIComponent('Something on Grouv')}&body=${t}%20${u}`;
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

export function ShareModal({ post, onClose }: { post: Post; onClose: () => void }) {
  const { toast } = useToastStore();
  const name = post.anon ? 'A connection in your space' : (post.name || 'Someone');
  const isJust = post.kind === 'just_grouw';
  const space = spaceById(post.space);
  const quote = (isJust ? post.caption : (post.honest || post.doing)) || '';

  // No single-post permalink page exists yet, so the link opens the Home
  // feed rather than this specific post.
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/home` : 'https://grouv.app/home';
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
      } catch { /* best-effort — falls back to system sans if it fails */ }
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(26,18,10,.55)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.2rem' }}
      onClick={onClose}>
      <div className="rise" style={{ width: 'min(420px, 94vw)', maxHeight: '90vh', overflowY: 'auto',
        background: 'var(--cream)', borderRadius: 20, boxShadow: 'var(--shadow-lg)', padding: '1.4rem 1.4rem 1.6rem' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
          <h2 className="serif" style={{ fontSize: '1.35rem', fontWeight: 600 }}>Share</h2>
          <button onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="close" size={16} stroke="var(--ink-3)"/>
          </button>
        </div>

        {imgUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgUrl} alt="" style={{ width: '100%', borderRadius: 16, marginBottom: '1rem', boxShadow: 'var(--shadow-soft)', display: 'block' }}/>
        ) : (
          <div style={{ width: '100%', aspectRatio: '640 / 420', borderRadius: 16, marginBottom: '1rem',
            background: 'var(--surf-high)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '.8rem', color: 'var(--ink-4)' }}>Preparing card…</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '.6rem', marginBottom: '1rem' }}>
          {PLATFORMS.map(p => (
            <button key={p.id} onClick={() => openExternal(platformUrl(p.id, shareText, shareUrl))}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.35rem' }}>
              <span style={{ width: 44, height: 44, borderRadius: '50%', background: p.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {p.id === 'whatsapp' && <Icon name="phone" size={19} stroke="#fff" sw={2}/>}
                {p.id === 'x'        && <span style={{ color: '#fff', fontWeight: 700, fontSize: '1.05rem' }}>X</span>}
                {p.id === 'facebook' && <span style={{ color: '#fff', fontWeight: 700, fontSize: '1.2rem', fontFamily: 'Georgia, serif' }}>f</span>}
                {p.id === 'email'    && <Icon name="envelope" size={18} stroke="#fff" sw={2}/>}
              </span>
              <span style={{ fontSize: '.68rem', color: 'var(--ink-3)' }}>{p.label}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '.6rem' }}>
          <button onClick={copyLink} className="btn btn-soft" style={{ flex: 1 }}>{copied ? 'Copied!' : 'Copy link'}</button>
          {imgUrl && (
            <a href={imgUrl} download={`grouv-${post.id}.png`} className="btn btn-primary"
              style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}>
              Download card
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
