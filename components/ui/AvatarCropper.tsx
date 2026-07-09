'use client';
import { useRef, useState, useCallback, useEffect } from 'react';
import { Icon } from './Icon';
import { Spinner } from './Spinner';

interface AvatarCropperProps {
  file: File;
  onCancel: () => void;
  onSave: (file: File) => void;
  saving?: boolean;
}

const FRAME = 280;
const OUTPUT = 512;

/** Lets the user pan and zoom a chosen photo before it's uploaded as their avatar. */
export function AvatarCropper({ file, onCancel, onSave, saving }: AvatarCropperProps) {
  const [imgUrl] = useState(() => URL.createObjectURL(file));
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; offX: number; offY: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => () => URL.revokeObjectURL(imgUrl), [imgUrl]);

  // Base scale so the image fully covers the circular frame at zoom = 1
  const baseScale = natural.w && natural.h ? Math.max(FRAME / natural.w, FRAME / natural.h) : 1;
  const scale = baseScale * zoom;
  const dispW = natural.w * scale;
  const dispH = natural.h * scale;

  const clampFor = useCallback((ox: number, oy: number, w: number, h: number) => {
    const maxX = Math.max(0, (w - FRAME) / 2);
    const maxY = Math.max(0, (h - FRAME) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, ox)), y: Math.min(maxY, Math.max(-maxY, oy)) };
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, offX: offset.x, offY: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(clampFor(dragRef.current.offX + dx, dragRef.current.offY + dy, dispW, dispH));
  };
  const onPointerUp = () => { dragRef.current = null; setDragging(false); };

  const handleZoom = (z: number) => {
    setZoom(z);
    const s = baseScale * z;
    setOffset(o => clampFor(o.x, o.y, natural.w * s, natural.h * s));
  };

  const handleSave = () => {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT; canvas.height = OUTPUT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const outScale = OUTPUT / FRAME;
    const drawW = dispW * outScale;
    const drawH = dispH * outScale;
    const drawX = (OUTPUT - drawW) / 2 + offset.x * outScale;
    const drawY = (OUTPUT - drawH) / 2 + offset.y * outScale;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    canvas.toBlob(blob => {
      if (!blob) return;
      onSave(new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(20,20,20,.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
      onClick={onCancel}>
      <div className="card" style={{ padding: '1.4rem', width: 'min(360px, 100%)' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '.3rem', textAlign: 'center' }}>Adjust photo</div>
        <p style={{ fontSize: '.78rem', color: 'var(--ink-3)', textAlign: 'center', marginBottom: '1rem' }}>
          Drag to reposition · use the slider to zoom
        </p>
        <div
          style={{ width: FRAME, height: FRAME, margin: '0 auto 1.2rem', borderRadius: '50%', overflow: 'hidden',
            position: 'relative', background: 'var(--surf-high)', cursor: dragging ? 'grabbing' : 'grab',
            touchAction: 'none', boxShadow: 'inset 0 0 0 2px var(--border-2)' }}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={imgRef} src={imgUrl} alt="" draggable={false}
            onLoad={e => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            style={{ position: 'absolute', left: '50%', top: '50%', width: dispW || undefined, height: dispH || undefined,
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`, userSelect: 'none',
              maxWidth: 'none' }}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', marginBottom: '1.3rem' }}>
          <Icon name="image" size={13} stroke="var(--ink-3)"/>
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={e => handleZoom(+e.target.value)}
            style={{ flex: 1, accentColor: 'var(--ember)' }}/>
          <Icon name="image" size={21} stroke="var(--ink-3)"/>
        </div>
        <div style={{ display: 'flex', gap: '.6rem' }}>
          <button onClick={onCancel} className="btn btn-soft" style={{ flex: 1 }} disabled={saving}>Cancel</button>
          <button onClick={handleSave} className="btn btn-primary" style={{ flex: 1 }} disabled={saving || !natural.w}>
            {saving ? <Spinner size={14} color="#fff"/> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
