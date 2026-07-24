'use client';
import { useState, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { SpaceIcon } from '@/components/ui/SpaceIcon';
import { Spinner } from '@/components/ui/Spinner';
import type { Space } from '@/lib/types';
import type { LogEntry } from './types';
import { GMark } from './GMark';

// ── Daily entry — tactile "greeting card" composer ──────────────────
export function MomentsEntryCard({ space, prompt, onPost, onEdit, posted, todayEntry, submitting }: {
  space: Space;
  prompt: string;
  onPost: (text: string, file?: File) => void;
  onEdit: (entryId: string, text: string, file?: File) => void;
  posted: boolean;
  todayEntry: LogEntry | null;
  submitting?: boolean;
}) {
  const [text, setText] = useState('');
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const ready = text.trim().length > 2 && !submitting;

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const r = new FileReader();
    r.onload = () => setImgSrc(r.result as string);
    r.readAsDataURL(f);
    e.target.value = '';
  };

  const startEdit = () => {
    setText(todayEntry?.text ?? '');
    setImgSrc(todayEntry?.media ?? null);
    setFile(null);
    setEditing(true);
    setOpen(true);
  };

  const cancel = () => { setEditing(false); setOpen(false); setText(''); setImgSrc(null); setFile(null); };

  const save = () => {
    if (editing && todayEntry?.id) onEdit(todayEntry.id, text.trim(), file ?? undefined);
    else onPost(text.trim(), file ?? undefined);
    setText(''); setImgSrc(null); setFile(null); setOpen(false); setEditing(false);
  };

  // ── Sealed state — editable until midnight ──
  if (posted && !editing) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="log-card-shadow" style={{
          width: 316, maxWidth: '100%', borderRadius: 24, overflow: 'hidden',
          background: 'var(--cream)', transform: 'rotate(-1.5deg)'
        }}>
          {todayEntry?.media && (
            <div style={{ height: 170, position: 'relative' }}>
              <img src={todayEntry.media} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          <div style={{ padding: '1.3rem 1.4rem', textAlign: 'center' }}>
            <div style={{
              display: 'inline-block', animation: 'stamp .6s ease both', border: '2.5px solid var(--ember)',
              color: 'var(--ember)', borderRadius: 10, padding: '.35rem .8rem', fontWeight: 700, letterSpacing: '.04em',
              textTransform: 'uppercase', fontSize: '.78rem'
            }}>
              Today&apos;s moment, sealed
            </div>
            {todayEntry?.text && (
              <p className="serif" style={{ fontSize: '1.15rem', fontStyle: 'italic', lineHeight: 1.4, marginTop: '.9rem' }}>{todayEntry.text}</p>
            )}
            <button onClick={startEdit}
              style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '.4rem', fontSize: '.82rem', color: 'var(--ember)', fontWeight: 600 }}>
              <Icon name="image" size={15} stroke="var(--ember)" /> Edit today&apos;s moment
            </button>
          </div>
          <div style={{ background: 'var(--ember)', padding: '.8rem 1.3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '.9rem' }}>Entry sealed</div>
              <div style={{ color: 'rgba(255,255,255,.8)', fontSize: '.72rem' }}>editable until midnight</div>
            </div>
            <GMark size={22} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} style={{ display: 'none' }} />
      <div className="log-card-shadow" style={{
        width: 316, maxWidth: '100%', borderRadius: 24, overflow: 'hidden',
        background: 'var(--cream)', transform: open ? 'rotate(0deg)' : 'rotate(-1.5deg)', transition: 'transform .3s'
      }}>
        <div style={{ padding: '1.5rem 1.5rem 1.2rem' }}>
          <div className="label-mono" style={{ marginBottom: '.9rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.35rem' }}>
            <SpaceIcon spaceId={space.id} size={12} /> {space.name} · {editing ? 'Editing today' : 'Today'}
          </div>
          <p className="serif" style={{
            fontSize: '1.5rem', fontWeight: 600, fontStyle: 'italic', color: 'var(--ember)',
            lineHeight: 1.25, textAlign: 'center', marginBottom: '1.2rem'
          }}>
            {prompt}
          </p>

          {!open ? (
            <button onClick={() => setOpen(true)} className="btn btn-soft btn-block" style={{ background: 'var(--surf-high)', color: 'var(--ink-2)', borderRadius: 14 }}>
              <Icon name="plus" size={17} stroke="var(--ink-2)" /> Write today&apos;s moment
            </button>
          ) : (
            <div className="swap-in">
              {imgSrc ? (
                <div style={{ position: 'relative', marginBottom: '.8rem' }}>
                  <img src={imgSrc} alt="" style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 14, display: 'block' }} />
                  <button onClick={() => { setImgSrc(null); setFile(null); }}
                    style={{
                      position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: '50%',
                      background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                    <Icon name="close" size={13} stroke="#fff" />
                  </button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()}
                  style={{
                    width: '100%', height: 120, borderRadius: 14, border: '1.5px dashed var(--border-2)', background: 'var(--surf-low)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '.4rem', marginBottom: '.8rem'
                  }}>
                  <Icon name="image" size={20} stroke="var(--ember)" />
                  <span style={{ fontSize: '.78rem', color: 'var(--ink-3)', fontWeight: 500 }}>Add a photo</span>
                </button>
              )}
              <textarea autoFocus value={text} onChange={e => setText(e.target.value.slice(0, 140))} placeholder="One honest line about today…"
                style={{
                  width: '100%', minHeight: 74, resize: 'none', padding: '.8rem .9rem', fontSize: '1rem', lineHeight: 1.5,
                  background: 'var(--white)', border: '1.5px solid var(--border-2)', borderRadius: 12
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--ember)'; e.target.style.boxShadow = '0 0 0 3px var(--ember-dim)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none'; }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '.7rem' }}>
                <span className="mono" style={{ fontSize: '.66rem', color: 'var(--ink-4)' }}>{text.length}/140</span>
                <div style={{ display: 'flex', gap: '.5rem' }}>
                  {editing && <button onClick={cancel} className="btn btn-soft" style={{ borderRadius: 12, padding: '.5rem .8rem', fontSize: '.84rem' }}>Cancel</button>}
                  <button className="btn btn-primary" disabled={!ready} onClick={save} style={{ borderRadius: 12 }}>
                    {submitting ? <Spinner size={14} color="#fff" /> : editing ? 'Update' : 'Seal entry'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div style={{ background: 'var(--ember)', padding: '.9rem 1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: '.95rem' }}>{editing ? 'Editing entry' : 'New Entry'}</div>
            <div style={{ color: 'rgba(255,255,255,.8)', fontSize: '.74rem' }}>the story of your life</div>
          </div>
          <GMark size={24} />
        </div>
      </div>
    </div>
  );
}
