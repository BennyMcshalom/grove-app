'use client';
import { useState, useEffect, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { RPSection } from '@/components/layout/RightPanel';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StageChip } from '@/components/ui/StageChip';
import { Spinner } from '@/components/ui/Spinner';
import { useUserStore } from '@/store/useUserStore';
import { useToastStore } from '@/store/useToastStore';
import { useSpaceStore } from '@/store/useSpaceStore';
import { SpaceIcon } from '@/components/ui/SpaceIcon';
import { spaceById, auraFor } from '@/lib/data';
import { postsApi, usersApi } from '@/lib/api';
import { useBonds } from '@/hooks/useBonds';
import { useMyLogEntries, useAddLogEntry, useUpdateLogEntry, useLogSettings, useUpdateLogSettings, useCircleLogs } from '@/hooks/useLog';
import { useBondLogToday, usePostBondLog, useMarkBondResonance, useBondLogHistory } from '@/hooks/useBondLog';
import type { LogEntry as ApiLogEntry, CircleLogUser } from '@/lib/api';
import type { Space, LogStyle } from '@/lib/types';

// ── Types ─────────────────────────────────────────────────────────
type LogEntry = {
  id?: string;
  day: number;
  date: string;
  text?: string;
  media?: string;
  missed?: boolean;
};

type OtherLog = {
  name: string;
  avatarUrl?: string | null;
  space: string;
  phase: string;
  vis: string;
  when: string;
  style: LogStyle;
  entries: LogEntry[];
};

const LOG_PROMPTS: Record<string, string> = {
  career: 'What did you build today — even a little?',
  creative: 'What did you make today, finished or not?',
  health: 'What did your body ask of you today?',
  wealth: 'What did today cost, and what did it buy?',
  spiritual: 'Where did you feel still today?',
  learning: 'What did you not understand today?',
  adventure: 'What did today look like that yesterday didn\'t?',
  relation: 'Who did you actually show up for today?',
};

const LOG_VIS = [
  ['public', 'Everyone', 'Anyone on Grouv in your spaces can scroll your log'],
  ['circle', 'My circle', 'People you\'re connected with can see it'],
  ['bonds', 'Bonds only', 'Only your Bonds can open your log'],
  ['private', 'Private', 'Just you. A closed door.'],
];

const LOG_STYLES: [LogStyle, string][] = [['A', 'Player'], ['B', 'Minimal'], ['C', 'Card']];

// ── G monogram mark ──────────────────────────────────────────────
function GMark({ size = 20, color = '#fff', bg }: { size?: number; color?: string; bg?: string }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.32, background: bg || 'rgba(255,255,255,.18)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
    }}>
      <span className="serif" style={{ color, fontWeight: 700, fontSize: size * 0.62, lineHeight: 1 }}>G</span>
    </div>
  );
}

// ── Memory lightbox — open one entry full, prev/next through the log ──
function MemoryLightbox({ entries, startIndex = 0, space, onClose }: {
  entries: LogEntry[]; startIndex?: number; space: Space; onClose: () => void;
}) {
  const [idx, setIdx] = useState(Math.max(0, Math.min(startIndex, entries.length - 1)));
  const touchX = useRef<number | null>(null);
  const entry = entries[idx];
  const canPrev = idx > 0;
  const canNext = idx < entries.length - 1;
  const prev = () => canPrev && setIdx(i => i - 1);
  const next = () => canNext && setIdx(i => i + 1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, entries.length]);

  if (!entry) return null;

  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 50) { if (dx < 0) next(); else prev(); }
    touchX.current = null;
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 7200, background: 'rgba(20,14,8,.62)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
    }} onClick={onClose}>
      {canPrev && (
        <button onClick={e => { e.stopPropagation(); prev(); }}
          style={{
            position: 'absolute', left: 'max(1rem, calc(50% - 260px))', top: '50%', transform: 'translateY(-50%)',
            width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,.16)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2
          }}>
          <Icon name="back" size={20} stroke="#fff" />
        </button>
      )}
      {canNext && (
        <button onClick={e => { e.stopPropagation(); next(); }}
          style={{
            position: 'absolute', right: 'max(1rem, calc(50% - 260px))', top: '50%', transform: 'translateY(-50%) scaleX(-1)',
            width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,.16)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2
          }}>
          <Icon name="back" size={20} stroke="#fff" />
        </button>
      )}
      <div className="swap-in" key={idx} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
        style={{ width: 'min(400px, 94vw)', background: 'var(--cream)', borderRadius: 26, overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ position: 'relative', height: 320 }}>
          {entry.media
            ? <img src={entry.media} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', background: 'var(--surf-high)' }} />}
          <button onClick={onClose} style={{
            position: 'absolute', top: 12, right: 12, width: 34, height: 34, borderRadius: '50%',
            background: 'rgba(20,14,8,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon name="close" size={17} stroke="#fff" />
          </button>
          <div style={{ position: 'absolute', left: 14, bottom: 12, display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <span style={{
              width: 30, height: 30, borderRadius: 9, background: 'rgba(255,255,255,.92)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Icon name={space.icon} size={15} stroke={space.ink} />
            </span>
            <span className="mono" style={{ color: '#fff', fontSize: '.7rem', textShadow: '0 1px 4px rgba(0,0,0,.5)' }}>Day {entry.day} · {entry.date}</span>
          </div>
          {entries.length > 1 && (
            <span className="mono" style={{ position: 'absolute', right: 14, bottom: 12, color: '#fff', fontSize: '.68rem', textShadow: '0 1px 4px rgba(0,0,0,.5)' }}>
              {idx + 1} / {entries.length}
            </span>
          )}
        </div>
        <div style={{ padding: '1.4rem 1.5rem 1.6rem' }}>
          <p className="serif" style={{ fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.35 }}>{entry.text}</p>
          {entries.length > 1 && (
            <div style={{ display: 'flex', gap: 5, marginTop: '1.1rem', justifyContent: 'center' }}>
              {entries.map((_, i) => (
                <span key={i} style={{
                  width: i === idx ? 16 : 6, height: 6, borderRadius: 100,
                  background: i === idx ? 'var(--ember)' : 'var(--border-2)', transition: 'all .2s', display: 'block'
                }} />
              ))}
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: '.9rem', fontSize: '.72rem', color: 'var(--ink-4)' }}>← → keys or swipe to move between moments</div>
        </div>
      </div>
    </div>
  );
}

// ── Daily entry — tactile "greeting card" composer ──────────────────
function MomentsEntryCard({ space, prompt, onPost, onEdit, posted, todayEntry, submitting }: {
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

// ── shared carousel state for Styles A/B/C ──
function useCarousel(n: number): [number, (d: number) => void, (i: number) => void] {
  const [i, setI] = useState(Math.max(0, n - 1));
  // go() and the returned index both clamp against the current n on every
  // call/render, so i is always in bounds without needing an effect to
  // re-clamp it after n changes.
  const go = (d: number) => setI(p => Math.max(0, Math.min(n - 1, p + d)));
  return [Math.max(0, Math.min(n - 1, i)), go, setI];
}

// ── Style A — Player (3D coverflow) ──
function StyleA({ entries, onOpen }: { entries: LogEntry[]; onOpen: (i: number) => void }) {
  const [i, go, setI] = useCarousel(entries.length);
  if (!entries.length) return null;
  const cur = entries[Math.min(i, entries.length - 1)] || entries[0];
  return (
    <div style={{ borderRadius: 26, padding: '1.9rem 1.2rem 1.6rem', background: 'linear-gradient(165deg, #F6C078, #E08A3C 60%, #B5611E)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.3)' }}>
      <div style={{ position: 'relative', height: 340, perspective: 1200 }}>
        {entries.map((e, idx) => {
          const off = idx - i;
          if (Math.abs(off) > 2) return null;
          const isC = off === 0;
          return (
            <button key={idx} onClick={() => isC ? onOpen(idx) : setI(idx)} style={{
              position: 'absolute', left: '50%', top: '50%', width: 220, height: 288,
              transform: `translate(-50%,-50%) translateX(${off * 82}px) rotateY(${off * -22}deg) scale(${isC ? 1 : 0.84})`,
              zIndex: 10 - Math.abs(off), transition: 'transform .4s cubic-bezier(.22,.61,.36,1)',
              borderRadius: 20, overflow: 'hidden', transformStyle: 'preserve-3d',
              boxShadow: isC ? '0 30px 56px -16px rgba(60,30,8,.6)' : '0 14px 28px -12px rgba(60,30,8,.5)',
              filter: isC ? 'none' : 'blur(1.5px) brightness(.92)', cursor: 'pointer'
            }}>
              {e.media
                ? <img src={e.media} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', background: 'var(--surf-high)' }} />}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,12,4,.05) 40%, rgba(20,12,4,.82))' }} />
              {isC && (
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '1.2rem' }}>
                  <div className="mono" style={{ color: 'rgba(255,255,255,.75)', fontSize: '.7rem', marginBottom: '.35rem' }}>DAY {e.day} · {e.date}</div>
                  <div className="serif" style={{ color: '#fff', fontSize: '1.28rem', fontWeight: 600, lineHeight: 1.25 }}>
                    {(e.text ?? '').length > 58 ? e.text!.slice(0, 58) + '…' : e.text}
                  </div>
                </div>
              )}
              <div style={{ position: 'absolute', inset: 0, borderRadius: 20, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.25)' }} />
            </button>
          );
        })}
      </div>
      <div style={{
        marginTop: '1.2rem', display: 'flex', alignItems: 'center', gap: '.9rem', background: 'rgba(255,255,255,.22)',
        backdropFilter: 'blur(8px)', borderRadius: 18, padding: '.85rem 1.1rem', border: '1px solid rgba(255,255,255,.35)'
      }}>
        <button onClick={() => go(-1)} disabled={i === 0} style={{ opacity: i === 0 ? .4 : 1, color: '#fff' }}><Icon name="back" size={24} stroke="#fff" /></button>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'center', color: '#fff' }}>
          <div style={{ fontWeight: 600, fontSize: '.94rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(cur.text ?? '').slice(0, 34)}</div>
          <div style={{ fontSize: '.76rem', opacity: .8 }}>Day {cur.day} of your chapter</div>
        </div>
        <button onClick={() => go(1)} disabled={i === entries.length - 1} style={{ opacity: i === entries.length - 1 ? .4 : 1, transform: 'scaleX(-1)', color: '#fff' }}><Icon name="back" size={24} stroke="#fff" /></button>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="#B5611E"><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="20" cy="16" r="3" /></svg>
        </div>
      </div>
    </div>
  );
}

// ── Style B — Minimal (stacked story cards) ──
function StyleB({ entries, onOpen }: { entries: LogEntry[]; onOpen: (i: number) => void }) {
  const [i, go] = useCarousel(entries.length);
  if (!entries.length) return null;
  const year = new Date().getFullYear();
  return (
    <div style={{ borderRadius: 28, padding: '2.4rem 1.2rem 2.6rem', background: 'linear-gradient(170deg, #FBFBFA, #ECEBE8)' }}>
      <div style={{ position: 'relative', height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {[2, 1].map(d => entries[i + d] && (
          <div key={d} style={{
            position: 'absolute', width: 230 - d * 18, height: 288 - d * 12, borderRadius: 22, background: '#fff',
            transform: `translateY(${-d * 16}px) scale(${1 - d * 0.04})`, boxShadow: '0 12px 34px -16px rgba(40,36,30,.4)', zIndex: 1
          }} />
        ))}
        {(() => {
          const e = entries[Math.min(i, entries.length - 1)] || entries[0];
          return (
            <button onClick={() => onOpen(Math.min(i, entries.length - 1))} className="swap-in" key={i}
              style={{
                position: 'relative', zIndex: 3, width: 240, height: 300, borderRadius: 22, overflow: 'hidden', background: '#fff',
                boxShadow: '0 26px 52px -18px rgba(40,36,30,.5)', textAlign: 'left'
              }}>
              <div style={{ height: 184, position: 'relative' }}>
                {e.media
                  ? <img src={e.media} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', background: 'var(--surf-high)' }} />}
                <div style={{
                  position: 'absolute', right: 12, bottom: -18, width: 40, height: 40, borderRadius: '50%', background: '#fff',
                  boxShadow: '0 4px 14px -4px rgba(0,0,0,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--ink)"><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="20" cy="16" r="3" /></svg>
                </div>
              </div>
              <div style={{ padding: '1.3rem 1.2rem 1rem' }}>
                <div style={{ fontSize: '.72rem', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-4)', marginBottom: '.35rem' }}>Day {e.day} · {e.date}</div>
                <div style={{ fontWeight: 600, fontSize: '1.02rem', lineHeight: 1.32, color: 'var(--ink)' }}>
                  {(e.text ?? '').length > 54 ? e.text!.slice(0, 54) + '…' : e.text}
                </div>
              </div>
            </button>
          );
        })()}
      </div>
      <div style={{ textAlign: 'center', marginTop: '.5rem' }}>
        <div style={{ fontSize: '1.7rem', fontWeight: 700, letterSpacing: '.14em', color: 'var(--ink-2)' }}>YOUR LOG</div>
        <div className="chip" style={{ background: '#fff', marginTop: '.6rem', boxShadow: 'var(--shadow-soft)', fontSize: '.8rem', padding: '.4rem .9rem', display: 'inline-block' }}>{year}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '.6rem', marginTop: '1.2rem' }}>
        <button onClick={() => go(-1)} disabled={i === 0} style={{ width: 42, height: 42, borderRadius: '50%', background: '#fff', boxShadow: 'var(--shadow-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: i === 0 ? .4 : 1 }}><Icon name="back" size={20} stroke="var(--ink-2)" /></button>
        <button onClick={() => go(1)} disabled={i === entries.length - 1} style={{ width: 42, height: 42, borderRadius: '50%', background: '#fff', boxShadow: 'var(--shadow-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: i === entries.length - 1 ? .4 : 1, transform: 'scaleX(-1)' }}><Icon name="back" size={20} stroke="var(--ink-2)" /></button>
      </div>
    </div>
  );
}

// ── Style C — Card (dark) ──
function StyleC({ entries, space, onOpen }: { entries: LogEntry[]; space: Space; onOpen: (i: number) => void }) {
  const [i, go] = useCarousel(entries.length);
  if (!entries.length) return null;
  const e = entries[Math.min(i, entries.length - 1)] || entries[0];
  return (
    <div style={{ borderRadius: 28, padding: '2.1rem 1.2rem 1.6rem', background: '#FAFAF8' }}>
      <div style={{ position: 'relative', height: 460, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {[2, 1].map(d => entries[i + d] && (
          <div key={d} style={{
            position: 'absolute', width: 300 - d * 20, height: 416 - d * 16, borderRadius: 24, background: '#15110D',
            transform: `translateY(${d * 14}px) scale(${1 - d * 0.04})`, opacity: 1 - d * 0.12, boxShadow: '0 18px 40px -18px rgba(0,0,0,.5)', zIndex: 1
          }} />
        ))}
        <div className="swap-in" key={i} style={{ position: 'relative', zIndex: 3, width: 314, minHeight: 424, borderRadius: 24, background: '#15110D', padding: '1.4rem', boxShadow: '0 34px 64px -22px rgba(0,0,0,.7)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={space.icon} size={18} stroke="#fff" sw={1.6} />
            </span>
            <button onClick={() => onOpen(Math.min(i, entries.length - 1))} style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="arrow" size={17} stroke="rgba(255,255,255,.8)" /></button>
          </div>
          <h3 className="serif" style={{ color: '#fff', fontSize: '1.85rem', fontWeight: 600, lineHeight: 1.16, padding: '0 .2rem 1.1rem', minHeight: 86 }}>
            {(e.text ?? '').length > 46 ? e.text!.slice(0, 46) + '…' : e.text}
          </h3>
          <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', height: 192 }}>
            {e.media
              ? <img src={e.media} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,.06)' }} />}
            <div style={{ position: 'absolute', left: 10, bottom: 10 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,.55)', color: '#fff', fontSize: '.74rem', padding: '.3rem .65rem', borderRadius: 8 }}>
                <GMark size={15} bg="var(--ember)" /> Day {e.day}
              </span>
            </div>
          </div>
          <div className="mono" style={{ color: 'rgba(255,255,255,.5)', fontSize: '.72rem', margin: '1.1rem .2rem .95rem' }}>{e.date} · {space.name}</div>
          <button onClick={() => onOpen(Math.min(i, entries.length - 1))} style={{ width: '100%', padding: '1rem', borderRadius: 14, background: '#fff', color: '#15110D', fontWeight: 600, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.6rem' }}>
            Open Memory <Icon name="arrow" size={18} stroke="#15110D" />
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '.6rem', marginTop: '.5rem' }}>
        <button onClick={() => go(-1)} disabled={i === 0} style={{ width: 42, height: 42, borderRadius: '50%', background: '#15110D', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: i === 0 ? .35 : 1 }}><Icon name="back" size={20} stroke="#fff" /></button>
        <button onClick={() => go(1)} disabled={i === entries.length - 1} style={{ width: 42, height: 42, borderRadius: '50%', background: '#15110D', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: i === entries.length - 1 ? .35 : 1, transform: 'scaleX(-1)' }}><Icon name="back" size={20} stroke="#fff" /></button>
      </div>
    </div>
  );
}

// ── Memories gallery switcher (Style A/B/C) ──
function MemoriesGallery({ entries, space, style, onStyleChange }: {
  entries: LogEntry[]; space: Space; style: LogStyle; onStyleChange: (s: LogStyle) => void;
}) {
  const filled = entries.filter(e => !e.missed);
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '.6rem' }}>
        <div>
          <div className="serif" style={{ fontSize: '1.5rem', fontWeight: 600 }}>Log Memories</div>
          <div style={{ fontSize: '.78rem', color: 'var(--ink-3)' }}>{filled.length} moments · pick how you view them</div>
        </div>
        <div style={{ display: 'flex', gap: 3, background: 'var(--surf-high)', borderRadius: 100, padding: 3 }}>
          {LOG_STYLES.map(([id, l]) => (
            <button key={id} onClick={() => onStyleChange(id)}
              style={{
                padding: '.4rem .85rem', borderRadius: 100, fontSize: '.8rem', fontWeight: 600,
                background: style === id ? 'var(--white)' : 'transparent', color: style === id ? 'var(--ember)' : 'var(--ink-3)',
                boxShadow: style === id ? 'var(--shadow-soft)' : 'none'
              }}>
              {id} · {l}
            </button>
          ))}
        </div>
      </div>
      {filled.length === 0 ? (
        <div className="card" style={{ padding: '2.2rem 1.5rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-3)', fontSize: '.9rem' }}>No moments yet — write today&apos;s entry above to start your Log.</p>
        </div>
      ) : (
        <div className="swap-in" key={space.id + style}>
          {style === 'A' && <StyleA entries={filled} onOpen={setOpen} />}
          {style === 'B' && <StyleB entries={filled} onOpen={setOpen} />}
          {style === 'C' && <StyleC entries={filled} space={space} onOpen={setOpen} />}
        </div>
      )}
      {open != null && <MemoryLightbox entries={filled} startIndex={open} space={space} onClose={() => setOpen(null)} />}
    </section>
  );
}

// ── Artifact ──────────────────────────────────────────────────────
function Artifact({ spaceId, phase, entries, onClose }: {
  spaceId: string; phase: string; entries: LogEntry[]; onClose: () => void;
}) {
  const space = spaceById(spaceId);
  const filled = entries.filter(e => !e.missed);
  const range = filled.length ? `${filled[0].date} — ${filled[filled.length - 1].date} · ` : '';
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 7000, background: 'rgba(26,26,26,.5)',
      backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', padding: '4vh 1rem'
    }}
      onClick={onClose}>
      <div className="scroll" style={{
        width: 'min(620px, 96vw)', maxHeight: '92vh', overflowY: 'auto',
        background: 'var(--cream)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-lg)'
      }}
        onClick={e => e.stopPropagation()}>
        <div style={{
          position: 'sticky', top: 0, background: 'var(--cream)', borderBottom: '1px solid var(--border)',
          padding: '1.1rem 1.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2
        }}>
          <div className="label-mono" style={{ color: 'var(--ember)' }}>Preview · the Artifact</div>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon name="close" stroke="var(--ink-3)" />
          </button>
        </div>
        <div style={{ padding: '2.2rem 2rem 3rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '.4rem' }}><Icon name={space.icon} size={32} stroke={space.ink} sw={1.5} /></div>
            <h1 className="serif" style={{ fontSize: 'clamp(1.6rem, 7.5vw, 2.4rem)', fontWeight: 600, lineHeight: 1.1 }}>
              {space.name} · {phase}
            </h1>
            <div className="mono" style={{ fontSize: '.72rem', color: 'var(--ink-4)', marginTop: '.5rem' }}>
              {range}{filled.length} entries stitched
            </div>
          </div>
          {filled.map((e, i) => (
            <article key={i} style={{
              marginBottom: '2rem', paddingBottom: '2rem',
              borderBottom: i < filled.length - 1 ? '1px solid var(--border)' : 'none'
            }}>
              <div className="label-mono" style={{ marginBottom: '.7rem' }}>Day {e.day} · {e.date}</div>
              {e.media && (
                <div style={{ borderRadius: 'var(--r-md)', overflow: 'hidden', marginBottom: '.9rem', maxHeight: 280 }}>
                  <img src={e.media} alt="" style={{ width: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              )}
              <p className="serif" style={{ fontSize: '1.25rem', lineHeight: 1.5 }}>{e.text}</p>
            </article>
          ))}
          <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontStyle: 'italic', fontSize: '.9rem' }}>
            This is a preview. The Artifact unlocks for real when you close the chapter — then it&apos;s yours, permanently, in your Life Archive.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── BondReveal — fully wired ──────────────────────────────────────
function BondReveal({ bonds }: { bonds: { id: string; name: string; avatarUrl?: string | null }[] }) {
  const { toast } = useToastStore();
  const [selectedBondId, setSelectedBondId] = useState(bonds[0]?.id ?? '');
  const [draft, setDraft] = useState('');

  const { data, isLoading, refetch } = useBondLogToday(selectedBondId || undefined);
  const postEntry = usePostBondLog(selectedBondId || undefined);
  const markResonate = useMarkBondResonance(selectedBondId || undefined);
  const { data: history } = useBondLogHistory(selectedBondId || undefined);

  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => { setDraft(''); }, [selectedBondId]);

  if (!bonds.length) {
    return (
      <div className="card" style={{ padding: '1.5rem 1.6rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--ink-3)', fontSize: '.9rem', lineHeight: 1.6 }}>
          Form a Bond first. Bond Log unlocks once you have at least one Bond.
        </p>
      </div>
    );
  }

  const partner = data?.partner;
  const session = data?.session;
  const myEntry = data?.myEntry ?? null;
  const partnerEntry = data?.partnerEntry ?? null;
  const revealed = data?.revealed ?? false;
  const iPosted = !!myEntry;
  const theyPosted = !!partnerEntry;

  const myResonance = !!myEntry?.resonanceAt;
  const partnerResonance = !!partnerEntry?.resonanceAt;
  const bothResonant = myResonance && partnerResonance;

  const handlePost = async () => {
    if (!draft.trim() || postEntry.isPending) return;
    try {
      await postEntry.mutateAsync(draft.trim());
      setDraft('');
      toast('Entry posted. Waiting for your Bond to post theirs.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('409')) toast('You already posted today. Come back tomorrow.');
      else toast('Could not post. Try again.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>

      {bonds.length > 1 && (
        <div className="card" style={{ padding: '.7rem 1rem' }}>
          <div className="label-mono" style={{ marginBottom: '.5rem' }}>Bond Log with</div>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            {bonds.map(b => (
              <button key={b.id} onClick={() => setSelectedBondId(b.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.45rem .8rem',
                  borderRadius: 100, fontSize: '.84rem', fontWeight: 500,
                  background: selectedBondId === b.id ? 'var(--ember-dim)' : 'var(--surf-high)',
                  color: selectedBondId === b.id ? 'var(--ember)' : 'var(--ink-2)',
                  border: selectedBondId === b.id ? '1.5px solid var(--ember-bdr)' : '1.5px solid transparent'
                }}>
                <Avatar name={b.name} size={22} avatarUrl={b.avatarUrl} />
                {b.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: '1.5rem 1.6rem' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Spinner size={20} color="var(--ember)" /></div>
        ) : !session ? null : (
          <>
            <div className="label-mono" style={{ marginBottom: '.5rem' }}>
              Bond Log · with {partner?.name?.split(' ')[0]}
            </div>
            <p className="serif" style={{ fontSize: '1.35rem', fontWeight: 600, lineHeight: 1.3, marginBottom: '1.1rem' }}>
              {session.prompt}
            </p>

            {!iPosted && (
              <div>
                <p style={{ fontSize: '.84rem', color: 'var(--ink-3)', marginBottom: '.8rem', lineHeight: 1.55 }}>
                  Same prompt, separate entries. Neither of you sees the other&apos;s until both post.
                </p>
                <textarea autoFocus={false} value={draft} onChange={e => setDraft(e.target.value.slice(0, 300))}
                  placeholder="Your honest entry…"
                  style={{
                    width: '100%', minHeight: 90, resize: 'vertical', padding: '.85rem 1rem',
                    background: 'var(--surf-low)', border: '1.5px solid var(--border-2)',
                    borderRadius: 'var(--r-md)', fontSize: '1rem', lineHeight: 1.6,
                    marginBottom: '.8rem', color: 'var(--ink)', transition: 'border .15s, box-shadow .15s'
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--ember)'; e.target.style.boxShadow = '0 0 0 3px var(--ember-dim)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none'; }} />
                <button className="btn btn-primary btn-block"
                  disabled={draft.trim().length < 3 || postEntry.isPending}
                  onClick={handlePost}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem' }}>
                  {postEntry.isPending ? <Spinner size={14} color="#fff" /> : null}
                  {theyPosted ? 'Post my entry — reveal both' : 'Post my entry'}
                </button>
                {theyPosted && (
                  <p style={{ fontSize: '.76rem', color: 'var(--sage)', fontWeight: 500, textAlign: 'center', marginTop: '.5rem' }}>
                    {partner?.name?.split(' ')[0]} already posted. Post yours to unlock the reveal.
                  </p>
                )}
              </div>
            )}

            {iPosted && !revealed && (
              <div style={{ textAlign: 'center', padding: '1.4rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1.2rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <Avatar name="You" size={52} />
                    <div style={{
                      fontSize: '.72rem', color: 'var(--green)', marginTop: 5, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3
                    }}>
                      <Icon name="check" size={11} stroke="var(--green)" sw={2.5} /> Posted
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Avatar name={partner?.name ?? ''} size={52} avatarUrl={partner?.avatarUrl} aura="reflective" />
                    <div style={{ fontSize: '.72rem', color: 'var(--ink-4)', marginTop: 5 }}>
                      Hasn&apos;t posted yet
                    </div>
                  </div>
                </div>
                <p style={{ color: 'var(--ink-3)', fontSize: '.88rem', lineHeight: 1.6 }}>
                  Your entry is sealed until {partner?.name?.split(' ')[0]} posts theirs.
                </p>
                <p style={{ fontSize: '.72rem', color: 'var(--ink-4)', marginTop: '.4rem' }}>
                  Checking automatically · {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <button onClick={() => refetch()} className="btn btn-soft"
                  style={{ marginTop: '.9rem', fontSize: '.8rem', padding: '.4rem .9rem', borderRadius: 100 }}>
                  Check now
                </button>
              </div>
            )}

            {revealed && myEntry && partnerEntry && (
              <div className="fade-in">
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <span className="chip" style={{
                    background: 'var(--mint)', color: 'var(--forest)',
                    display: 'inline-flex', alignItems: 'center', gap: 5
                  }}>
                    <Icon name="check" size={12} stroke="var(--forest)" sw={2.5} /> Both posted — revealed
                  </span>
                </div>
                <div className="grid-2-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.9rem', marginBottom: '1rem' }}>
                  {([
                    ['You', myEntry.body ?? '', true, undefined, myResonance],
                    [partner?.name ?? '', partnerEntry.body ?? '', false, partner?.avatarUrl, partnerResonance],
                  ] as [string, string, boolean, string | null | undefined, boolean][]).map(([who, txt, me, av, res], i) => (
                    <div key={i} className="rise" style={{
                      animationDelay: `${i * 0.1}s`,
                      background: 'var(--surf-low)', borderRadius: 'var(--r-md)', padding: '1rem 1.1rem',
                      borderTop: `3px solid ${me ? 'var(--ember)' : 'var(--sage)'}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.6rem' }}>
                        <Avatar name={me ? 'You' : (who ?? '')} size={28} avatarUrl={me ? undefined : (av ?? undefined)} aura={me ? undefined : 'reflective'} />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 600, fontSize: '.82rem' }}>{me ? 'You' : who?.split(' ')[0]}</span>
                        </div>
                        {res && <Icon name="heart" size={13} stroke="var(--ember)" sw={0} />}
                      </div>
                      <p className="serif" style={{ fontSize: '1rem', lineHeight: 1.55 }}>{txt}</p>
                    </div>
                  ))}
                </div>

                <button
                  disabled={myResonance || markResonate.isPending}
                  onClick={async () => {
                    try { await markResonate.mutateAsync(); }
                    catch { toast('Could not mark resonance.'); }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem',
                    width: '100%', padding: '.85rem', borderRadius: 'var(--r-md)', fontWeight: 500,
                    background: bothResonant ? 'var(--green-dim)' : myResonance ? 'var(--surf-high)' : 'var(--surf-high)',
                    color: bothResonant ? 'var(--green)' : myResonance ? 'var(--ink-4)' : 'var(--ink-2)',
                    transition: 'all .2s'
                  }}>
                  <Icon name={bothResonant ? 'check' : 'heart'} size={16}
                    stroke={bothResonant ? 'var(--green)' : myResonance ? 'var(--ink-4)' : 'var(--ink-2)'}
                    sw={bothResonant ? 2.5 : 1.8} />
                  {bothResonant
                    ? 'You both felt this'
                    : myResonance
                      ? `Marked · waiting for ${partner?.name?.split(' ')[0]}`
                      : 'Mark resonance'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {(history ?? []).length > 0 && (
        <div>
          <button onClick={() => setShowHistory(s => !s)}
            style={{
              display: 'flex', alignItems: 'center', gap: '.5rem', width: '100%',
              padding: '.6rem .2rem', fontSize: '.82rem', color: 'var(--ink-3)', fontWeight: 500
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-4)"
              strokeWidth="2.2" strokeLinecap="round"
              style={{ transform: showHistory ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s' }}>
              <path d="M6 9l6 6 6-6" />
            </svg>
            {showHistory ? 'Hide' : 'Show'} past reveals ({history!.length})
          </button>
          {showHistory && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '.8rem', marginTop: '.4rem' }}>
              {history!.map((item, i) => {
                const d = new Date(item.date);
                const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const bothRes = !!item.myEntry.resonanceAt && !!item.partnerEntry.resonanceAt;
                return (
                  <div key={i} className="card" style={{ padding: '1.1rem 1.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.6rem' }}>
                      <div className="label-mono">{label}</div>
                      {bothRes && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '.72rem', color: 'var(--green)', fontWeight: 500 }}>
                          <Icon name="heart" size={12} stroke="var(--green)" sw={0} /> Resonant
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '.82rem', fontStyle: 'italic', color: 'var(--ink-3)', marginBottom: '.5rem', lineHeight: 1.45 }}>
                      &ldquo;{item.prompt}&rdquo;
                    </p>
                    <div className="grid-2-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
                      {[['You', item.myEntry.body, 'var(--ember)'], [partner?.name?.split(' ')[0] ?? 'Bond', item.partnerEntry.body, 'var(--sage)']].map(([who, body, color]) => (
                        <div key={who as string} style={{
                          background: 'var(--surf-low)', borderRadius: 'var(--r-sm)',
                          padding: '.7rem .8rem', borderLeft: `2px solid ${color}`
                        }}>
                          <div style={{ fontSize: '.68rem', color: 'var(--ink-4)', fontWeight: 600, marginBottom: '.3rem' }}>{who as string}</div>
                          <p className="serif" style={{ fontSize: '.9rem', lineHeight: 1.45, color: 'var(--ink)' }}>{body as string}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── LogViewer — someone else's log, rendered through the styled gallery ──
function LogViewer({ log, onClose }: { log: OtherLog; onClose: () => void }) {
  const space = spaceById(log.space);
  const [open, setOpen] = useState<number | null>(null);
  const filled = log.entries.filter(e => !e.missed);
  const first = log.name.split(' ')[0];
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 7100, background: 'rgba(26,18,10,.55)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', padding: '4vh 1rem'
    }}
      onClick={onClose}>
      <div className="scroll fade-in" style={{
        width: 'min(480px, 96vw)', maxHeight: '92vh', overflowY: 'auto',
        background: 'var(--cream)', borderRadius: 24, boxShadow: 'var(--shadow-lg)'
      }}
        onClick={e => e.stopPropagation()}>
        <div style={{
          position: 'sticky', top: 0, zIndex: 2, background: 'var(--cream)', borderBottom: '1px solid var(--border)',
          padding: '1rem 1.2rem', display: 'flex', alignItems: 'center', gap: '.8rem'
        }}>
          <Avatar name={log.name} size={44} avatarUrl={log.avatarUrl} aura={auraFor(log.name)} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>{first}&apos;s Log</div>
            <div style={{ fontSize: '.76rem', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
              <SpaceIcon spaceId={log.space} size={11} /> {log.phase} · {log.entries.length} moments
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon name="close" stroke="var(--ink-3)" />
          </button>
        </div>
        <div style={{ padding: '1.4rem 1.2rem 1.6rem' }}>
          {filled.length === 0 ? (
            <p style={{ color: 'var(--ink-3)', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>No moments logged yet.</p>
          ) : log.style === 'A' ? (
            <StyleA entries={filled} onOpen={setOpen} />
          ) : log.style === 'C' ? (
            <StyleC entries={filled} space={space} onOpen={setOpen} />
          ) : (
            <StyleB entries={filled} onOpen={setOpen} />
          )}
        </div>
      </div>
      {open != null && <MemoryLightbox entries={filled} startIndex={open} space={space} onClose={() => setOpen(null)} />}
    </div>
  );
}

// ── CircleLogFeed — scroll others' logs ──
function CircleLogFeed({ logs, onOpen }: { logs: OtherLog[]; onOpen: (log: OtherLog) => void }) {
  return (
    <section>
      <div style={{ marginBottom: '1rem' }}>
        <div className="serif" style={{ fontSize: '1.5rem', fontWeight: 600 }}>Logs from your circle</div>
        <div style={{ fontSize: '.78rem', color: 'var(--ink-3)' }}>Different lives, different phases. Scroll through.</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
        {logs.map((log, li) => (
          <article key={li} className="card" style={{ overflow: 'hidden' }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: '.7rem', padding: '.9rem 1.1rem' }}>
              <Avatar name={log.name} size={42} avatarUrl={log.avatarUrl} aura={auraFor(log.name)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '.92rem' }}>{log.name}</div>
                <div style={{ fontSize: '.74rem', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                  <SpaceIcon spaceId={log.space} size={11} /> {log.phase} · {log.when}
                </div>
              </div>
              <span className="chip" style={{ background: 'var(--surf-high)', fontSize: '.66rem' }}>Style {log.style}</span>
            </header>
            <div className="scroll" style={{ display: 'flex', gap: '.6rem', overflowX: 'auto', padding: '0 1.1rem .5rem' }}>
              {log.entries.slice(0, 6).map((e, i) => (
                <button key={i} onClick={() => onOpen(log)} style={{ flexShrink: 0, width: 150, borderRadius: 16, overflow: 'hidden', position: 'relative', textAlign: 'left', boxShadow: 'var(--shadow-soft)' }}>
                  <div style={{ height: 180, position: 'relative' }}>
                    {e.media
                      ? <img src={e.media} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', background: 'var(--surf-high)' }} />}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 45%, rgba(20,14,8,.82))' }} />
                    <div style={{ position: 'absolute', left: 8, right: 8, bottom: 8 }}>
                      <div className="mono" style={{ color: 'rgba(255,255,255,.8)', fontSize: '.6rem', marginBottom: 2 }}>DAY {e.day} · {e.date}</div>
                      <div style={{ color: '#fff', fontSize: '.78rem', fontWeight: 500, lineHeight: 1.3 }}>
                        {(e.text ?? '').length > 44 ? e.text!.slice(0, 44) + '…' : e.text}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => onOpen(log)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem',
              width: '100%', padding: '.8rem', borderTop: '1px solid var(--border)', fontSize: '.85rem', fontWeight: 500, color: 'var(--ember)'
            }}>
              Open {log.name.split(' ')[0]}&apos;s full log <Icon name="arrow" size={15} stroke="var(--ember)" />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

// ── Map API entries to the local LogEntry shape ───────────────────
function apiToLocal(r: ApiLogEntry): LogEntry {
  const d = new Date(r.entryDate);
  return {
    id: r.id,
    day: r.dayNumber,
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    text: r.body,
    media: r.mediaUrl ?? undefined,
  };
}

/** Fill gaps between real entries with missed-day placeholders */
function buildStrip(apiEntries: ApiLogEntry[]): LogEntry[] {
  if (!apiEntries.length) return [];
  const sorted = [...apiEntries].sort((a, b) => a.entryDate.localeCompare(b.entryDate));
  const first = new Date(sorted[0].entryDate);
  const last = new Date();
  const dateMap = new Map(sorted.map(e => [e.entryDate, e]));
  const strip: LogEntry[] = [];
  let day = 1;
  const cur = new Date(first);
  while (cur <= last) {
    const key = cur.toISOString().slice(0, 10);
    const entry = dateMap.get(key);
    if (entry) {
      strip.push(apiToLocal(entry));
    } else {
      strip.push({ day, date: cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), missed: true });
    }
    day++;
    cur.setDate(cur.getDate() + 1);
  }
  return strip;
}

// ── Main page ─────────────────────────────────────────────────────
export default function LogPage() {
  const { user, setUser } = useUserStore();
  const { toast } = useToastStore();
  const { uuidBySlug } = useSpaceStore();

  const userSpaces = user.spaces.length ? user.spaces : ['creative'];
  const [spaceSlug, setSpaceSlug] = useState(userSpaces[0]);
  const activeSpaceSlug = userSpaces.includes(spaceSlug) ? spaceSlug : userSpaces[0];
  const spaceUuid = uuidBySlug(activeSpaceSlug);
  const space = spaceById(activeSpaceSlug);
  const phase = user.stageLabels?.[activeSpaceSlug] ?? 'Mid-project';
  const prompt = LOG_PROMPTS[activeSpaceSlug] ?? 'What was true today?';

  // ── Live data ──
  const { data: bondsData } = useBonds();
  const { data: apiEntries, isLoading: entriesLoading } = useMyLogEntries(spaceUuid);
  const addLogEntry = useAddLogEntry(spaceUuid);
  const updateLogEntry = useUpdateLogEntry(spaceUuid);
  const { data: settingsData } = useLogSettings(spaceUuid);
  const updateSettings = useUpdateLogSettings(spaceUuid);
  const { data: circleData } = useCircleLogs();

  // ── Derived state ──
  const entries: LogEntry[] = apiEntries ? buildStrip(apiEntries) : [];
  const today = new Date().toISOString().slice(0, 10);
  const todayApiEntry = apiEntries?.find(e => e.entryDate === today) ?? null;
  const todayEntry: LogEntry | null = todayApiEntry ? apiToLocal(todayApiEntry) : null;
  const posted = !!todayApiEntry;
  const vis = settingsData?.visibility ?? 'circle';
  const visMeta = LOG_VIS.find(v => v[0] === vis) ?? LOG_VIS[1];
  const filled = entries.filter(e => !e.missed);
  const logStyle: LogStyle = user.logStyle ?? 'A';

  // Map circle data to OtherLog shape
  const circleUsers: OtherLog[] = (circleData ?? []).map((u: CircleLogUser) => ({
    name: u.name,
    avatarUrl: u.avatarUrl,
    space: activeSpaceSlug,
    phase,
    vis: 'public',
    when: u.entries[0]
      ? new Date(u.entries[0].createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '',
    style: (['A', 'B', 'C'].includes(u.logStyle) ? u.logStyle : 'A') as LogStyle,
    entries: u.entries.map(e => apiToLocal(e)),
  }));

  const [mode, setMode] = useState<'solo' | 'bond'>('solo');
  const [artifact, setArtifact] = useState(false);
  const [viewLog, setViewLog] = useState<OtherLog | null>(null);
  const [visMenu, setVisMenu] = useState(false);

  const addEntry = async (text: string, file?: File) => {
    if (!spaceUuid) { toast('Open a space first.'); return; }
    try {
      let mediaUrl: string | undefined;
      let mediaType: string | undefined;
      if (file) {
        const result = await postsApi.uploadViaProxy(file);
        mediaUrl = result.mediaUrl;
        mediaType = result.mediaType;
      }
      await addLogEntry.mutateAsync({ body: text, mediaUrl, mediaType });
      toast('Moment added to your Log.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('409')) toast('You already posted today. Come back tomorrow.');
      else toast('Could not save. Try again.');
    }
  };

  const editEntry = async (entryId: string, text: string, file?: File) => {
    try {
      let mediaUrl: string | undefined;
      let mediaType: string | undefined;
      if (file) {
        const result = await postsApi.uploadViaProxy(file);
        mediaUrl = result.mediaUrl;
        mediaType = result.mediaType;
      }
      await updateLogEntry.mutateAsync({ id: entryId, data: { body: text, mediaUrl, mediaType } });
      toast('Today\'s moment updated.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('409')) toast('That entry is sealed — it can only be edited on the day it was posted.');
      else toast('Could not save. Try again.');
    }
  };

  const changeLogStyle = (s: LogStyle) => {
    setUser(u => ({ ...u, logStyle: s }));
    usersApi.updateMe({ logStyle: s }).catch(() => { });
  };

  const right = (
    <>
      <RPSection label="This log">
        <div className="card" style={{ padding: '1rem 1.1rem', boxShadow: 'var(--shadow-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.7rem' }}>
            <span style={{
              width: 38, height: 38, borderRadius: '50%', background: space.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Icon name={space.icon} size={18} stroke={space.ink} sw={1.6} />
            </span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{space.name}</div>
              <div style={{ fontSize: '.74rem', color: 'var(--ink-3)' }}>{phase}</div>
            </div>
          </div>
          <ProgressBar value={entries.length ? Math.round(filled.length / entries.length * 100) : 0} />
          <div style={{ fontSize: '.74rem', color: 'var(--ink-3)', marginTop: '.5rem' }}>
            {entriesLoading ? 'Loading…' : `${filled.length} of ${entries.length} days logged`}
          </div>
        </div>
      </RPSection>

      <RPSection label="Who can see your log">
        <div style={{ position: 'relative' }}>
          <button onClick={() => setVisMenu(m => !m)} className="card"
            style={{
              display: 'flex', width: '100%', alignItems: 'center', gap: '.6rem',
              padding: '.8rem .9rem', boxShadow: 'var(--shadow-soft)', textAlign: 'left'
            }}>
            <Icon name={vis === 'private' ? 'lock' : 'eye'} size={17} stroke="var(--ember)" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '.86rem' }}>{visMeta[1]}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--ink-3)' }}>{visMeta[2]}</div>
            </div>
            <Icon name="dots" size={16} stroke="var(--ink-4)" />
          </button>
          {visMenu && (
            <div className="card" style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
              zIndex: 20, padding: '.4rem', boxShadow: 'var(--shadow-lg)'
            }}>
              {LOG_VIS.map(([id, l, d]) => (
                <button key={id}
                  onClick={async () => {
                    setVisMenu(false);
                    try {
                      await updateSettings.mutateAsync(id as 'public' | 'circle' | 'bonds' | 'private');
                      toast(`Log visibility: ${l}`);
                    } catch { toast('Could not update.'); }
                  }}
                  style={{
                    display: 'flex', width: '100%', textAlign: 'left', gap: '.5rem',
                    alignItems: 'center', padding: '.6rem .65rem', borderRadius: 'var(--r-sm)',
                    background: vis === id ? 'var(--ember-dim)' : 'transparent'
                  }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: '.84rem', color: vis === id ? 'var(--ember)' : 'var(--ink)' }}>{l}</div>
                    <div style={{ fontSize: '.7rem', color: 'var(--ink-3)' }}>{d}</div>
                  </div>
                  {vis === id && <Icon name="check" size={15} stroke="var(--ember)" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </RPSection>

      <RPSection label="The ritual">
        <p style={{ fontSize: '.84rem', color: 'var(--ink-2)', lineHeight: 1.6 }}>
          One photo. One honest line. Every day you're in this chapter. Choose how you view your past moments
          — and who else gets to scroll them.
        </p>
      </RPSection>
    </>
  );

  return (
    <AppShell title="Grouv Log" right={right}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 1.6rem 3rem' }}>

        {/* Per-chapter log switcher — each space keeps its own separate log archive */}
        {userSpaces.length > 1 && (
          <div className="scroll" style={{ display: 'flex', gap: '.5rem', overflowX: 'auto', marginTop: '-.2rem', marginBottom: '1.1rem', paddingBottom: 2 }}>
            {userSpaces.map(id => {
              const s = spaceById(id);
              const on = id === activeSpaceSlug;
              return (
                <button key={id} onClick={() => setSpaceSlug(id)} className="chip"
                  style={{
                    cursor: 'pointer', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '.4rem',
                    padding: '.5rem .95rem', background: on ? 'var(--ember)' : 'var(--surf-high)', color: on ? '#fff' : 'var(--ink-2)', fontWeight: 500
                  }}>
                  <Icon name={s.icon} size={13} stroke={on ? '#fff' : s.ink} sw={1.6} /> {s.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Phase chip + mode toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '1rem', marginTop: '-.3rem', marginBottom: '1.4rem', flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
            <StageChip space={activeSpaceSlug} stage={phase} />
            <span className="chip" style={{ background: 'var(--surf-high)', fontSize: '.7rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name={vis === 'private' ? 'lock' : 'eye'} size={11} stroke="var(--ink-3)" sw={1.8} /> {visMeta[1]}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--surf-high)', borderRadius: 100, padding: 3 }}>
            {([['solo', 'Solo'], ['bond', 'Bond Log']] as ['solo' | 'bond', string][]).map(([id, l]) => (
              <button key={id} onClick={() => setMode(id)}
                style={{
                  padding: '.4rem .9rem', borderRadius: 100, fontSize: '.82rem', fontWeight: 500,
                  background: mode === id ? 'var(--white)' : 'transparent',
                  color: mode === id ? 'var(--ember)' : 'var(--ink-3)',
                  boxShadow: mode === id ? 'var(--shadow-soft)' : 'none'
                }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Daily entry / Bond reveal */}
        <div style={{ marginBottom: '2rem' }}>
          {mode === 'solo'
            ? <MomentsEntryCard space={space} prompt={prompt} onPost={addEntry} onEdit={editEntry}
              posted={posted} todayEntry={todayEntry} submitting={addLogEntry.isPending || updateLogEntry.isPending} />
            : <BondReveal bonds={(bondsData ?? [])
              .filter(b => b.status === 'bond')
              .map(b => ({ id: b.id, name: b.otherUser?.displayName ?? 'Bond', avatarUrl: b.otherUser?.avatarUrl }))} />}
        </div>

        {/* Memories gallery */}
        <div style={{ marginBottom: '1.4rem' }}>
          <MemoriesGallery entries={entries} space={space} style={logStyle} onStyleChange={changeLogStyle} />
        </div>

        {/* Artifact access */}
        <button onClick={() => setArtifact(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '.7rem', width: '100%',
            padding: '1rem 1.2rem', marginBottom: '2.2rem', borderRadius: 'var(--r-lg)',
            border: '1.5px solid var(--ember-bdr)', background: 'var(--ember-dim)', textAlign: 'left'
          }}>
          <Icon name="lock" size={18} stroke="var(--ember-deep)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '.9rem', color: 'var(--ember-deep)' }}>The Artifact</div>
            <div style={{ fontSize: '.76rem', color: 'var(--ink-3)' }}>
              Unlocks when you close this chapter — your whole log, stitched into one piece.
            </div>
          </div>
          <span style={{ fontSize: '.8rem', color: 'var(--ember)', fontWeight: 500 }}>Preview →</span>
        </button>

        {/* Circle logs */}
        {circleUsers.length > 0 && <CircleLogFeed logs={circleUsers} onOpen={setViewLog} />}
      </div>

      {artifact && (
        <Artifact spaceId={activeSpaceSlug} phase={phase} entries={entries} onClose={() => setArtifact(false)} />
      )}
      {viewLog && <LogViewer log={viewLog} onClose={() => setViewLog(null)} />}
    </AppShell>
  );
}
