'use client';
import React, { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { SpaceIcon } from '@/components/ui/SpaceIcon';
import { useUserStore } from '@/store/useUserStore';
import { useToastStore } from '@/store/useToastStore';
import { useMySpaces } from '@/hooks/useSpaces';
import { PROGRESS, spaceById } from '@/lib/data';
import { postsApi } from '@/lib/api';
import type { Post } from '@/lib/types';

// ── Roots Composer ──
export function RootsComposer({ onPost }: { onPost?: (p: Post & { _mediaFile?: File }) => void }) {
  const { user } = useUserStore();
  const { toast } = useToastStore();
  // user.spaces is a one-time onboarding snapshot, never updated when a
  // space is opened/closed later — mySpaceSlugs is the real, live list.
  const { data: mySpaces } = useMySpaces();
  const mySpaceSlugs = (mySpaces ?? []).map(s => s.space?.slug).filter((s): s is string => !!s);
  const [selectedSpace, setSelectedSpace] = useState<string | null>(null);
  // Falls back to the first open space if nothing's been picked yet, or if
  // the previously picked one was closed since.
  const activeSpace = selectedSpace && mySpaceSlugs.includes(selectedSpace) ? selectedSpace : (mySpaceSlugs[0] ?? 'career');
  const [mode, setMode] = useState<'root' | 'justgrouw'>('root');
  // Root mode
  const [doing, setDoing] = useState("I'm ");
  const [prog, setProg] = useState<string | null>(null);
  const [honest, setHonest] = useState('');
  // Just Grouv mode
  const [caption, setCaption] = useState('');
  const [anon, setAnon] = useState(false);
  const [media, setMedia] = useState<{ type: 'image' | 'video'; src: string; file: File } | null>(null);
  const [uploading, setUploading] = useState(false);
  const imageRef = React.useRef<HTMLInputElement>(null);
  const videoRef = React.useRef<HTMLInputElement>(null);

  const rootReady = doing.trim().length > 4 && honest.trim().length > 3 && !uploading;
  const grouwReady = !!media && caption.trim().length > 1 && !uploading;
  const ready = mode === 'root' ? rootReady : grouwReady;

  function pickFile(file: File) {
    const isVideo = file.type.startsWith('video/');
    const src = URL.createObjectURL(file);
    setMedia({ type: isVideo ? 'video' : 'image', src, file });
  }

  const nowClock = () => {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };

  const uploadMedia = async () => {
    if (!media?.file) return { mediaUrl: undefined, mediaType: undefined };
    if (media.file.size > 50 * 1024 * 1024) {
      toast('Video is too large (max 50 MB). Try trimming it first.');
      throw new Error('too large');
    }
    const result = await postsApi.uploadViaProxy(media.file);
    return { mediaUrl: result.mediaUrl, mediaType: result.mediaType };
  };

  const submit = async () => {
    if (!ready) return;
    setUploading(true);

    let mediaUrl: string | undefined, mediaType: string | undefined;
    try {
      ({ mediaUrl, mediaType } = await uploadMedia());
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('too large')) {
        if (msg.includes('413')) toast('Video is too large (max 50 MB).');
        else if (msg.includes('Unsupported')) toast("That file type isn't supported. Use MP4, MOV, or WebM.");
        else toast('Upload failed. Check your connection and try again.');
      }
      setUploading(false);
      return;
    }

    try {
      if (mode === 'root') {
        await onPost?.({
          id: Date.now(), name: user.name, anon,
          space: activeSpace, progress: prog ?? '',
          time: 'just now', doing: doing.trim(), honest: honest.trim(),
          media: mediaUrl ? { type: (mediaType?.startsWith('video') ? 'video' : 'image'), src: mediaUrl } : undefined,
          roots: 0, comments: 0, kind: 'roots',
          _mediaFile: media?.file, _mediaUrl: mediaUrl, _mediaType: mediaType,
        } as Post & { _mediaFile?: File; _mediaUrl?: string; _mediaType?: string });
        setDoing("I'm "); setProg(null); setHonest('');
      } else {
        const clock = nowClock();
        const userLocation = user.location;
        await onPost?.({
          id: Date.now(), name: user.name, anon,
          space: activeSpace, progress: '',
          time: 'just now', doing: '', honest: '',
          media: mediaUrl ? { type: (mediaType?.startsWith('video') ? 'video' : 'image'), src: mediaUrl } : undefined,
          roots: 0, comments: 0, kind: 'just_grouw',
          caption: caption.trim(), clock,
          location: userLocation || undefined,
          _mediaFile: media?.file, _mediaUrl: mediaUrl, _mediaType: mediaType,
        } as Post & { _mediaFile?: File; _mediaUrl?: string; _mediaType?: string });
        setCaption('');
      }

      setAnon(false);
      if (media?.src) URL.revokeObjectURL(media.src);
      setMedia(null);
    } catch {
      // onPost already surfaced its own error toast — keep the draft so the user can retry.
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card" style={{ padding: '1.4rem', marginBottom: '1.1rem' }}>
      <input ref={imageRef} type="file" accept="image/png,image/jpeg,image/webp,image/avif" hidden
        onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ''; }} />
      <input ref={videoRef} type="file" accept="video/mp4,video/webm,video/quicktime" hidden
        onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ''; }} />

      {/* Header: avatar + mode toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', marginBottom: '1rem' }}>
        <Avatar name={user.name} size={40} avatarUrl={user.avatar_url} />
        <div style={{ display: 'flex', gap: 4, background: 'var(--surf-high)', borderRadius: 100, padding: 3 }}>
          {([['root', 'Root a thought'], ['justgrouw', 'Just Grouv']] as ['root' | 'justgrouw', string][]).map(([id, l]) => (
            <button key={id} onClick={() => { setMode(id); setMedia(null); }}
              style={{
                padding: '.4rem .85rem', borderRadius: 100, fontSize: '.8rem', fontWeight: 500,
                background: mode === id ? 'var(--white)' : 'transparent',
                color: mode === id ? 'var(--ember)' : 'var(--ink-3)',
                boxShadow: mode === id ? 'var(--shadow-soft)' : 'none'
              }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Which of my open spaces this post goes into — shared by both modes */}
      {mySpaceSlugs.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div className="label-mono" style={{ marginBottom: '.4rem' }}>Posting to</div>
          <div className="scroll" style={{ display: 'flex', gap: '.4rem', overflowX: 'auto', paddingBottom: 2 }}>
            {mySpaceSlugs.map(slug => {
              const sp = spaceById(slug);
              const active = slug === activeSpace;
              return (
                <button key={slug} onClick={() => setSelectedSpace(slug)} className="chip"
                  style={{
                    cursor: 'pointer', flexShrink: 0,
                    background: active ? 'var(--ember-dim)' : 'var(--surf-high)',
                    border: active ? '1.5px solid var(--ember)' : '1.5px solid transparent',
                    color: active ? 'var(--ember-deep)' : 'var(--ink-2)', fontWeight: 500
                  }}>
                  <SpaceIcon spaceId={slug} size={12} pill pillSize={20} /> {sp.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {mode === 'root' ? (
        <>
          <div style={{ marginBottom: '.9rem' }}>
            <div className="label-mono" style={{ marginBottom: '.4rem' }}>What are you doing right now?</div>
            <input value={doing} maxLength={100} onChange={e => setDoing(e.target.value)}
              style={{ width: '100%', padding: '.7rem .9rem', fontSize: '1rem', background: 'var(--surf-low)', border: '1.5px solid var(--border-2)', borderRadius: 'var(--r-md)' }}
              onFocus={e => { e.target.style.borderColor = 'var(--ember)'; e.target.style.boxShadow = '0 0 0 3px var(--ember-dim)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none'; }} />
          </div>
          <div style={{ marginBottom: '.9rem' }}>
            <div className="label-mono" style={{ marginBottom: '.5rem' }}>
              Where are you in it? <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--ink-4)' }}>· optional</span>
            </div>
            <div className="scroll" style={{ display: 'flex', gap: '.5rem', overflowX: 'auto', paddingBottom: 2 }}>
              {PROGRESS.map(p => (
                <button key={p} onClick={() => setProg(prog === p ? null : p)} className="chip"
                  style={{
                    cursor: 'pointer', flexShrink: 0, padding: '.45rem .85rem',
                    background: prog === p ? 'var(--ember)' : 'var(--surf-high)',
                    color: prog === p ? '#fff' : 'var(--ink-2)', fontWeight: 500
                  }}>{p}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: '.8rem' }}>
            <div className="label-mono" style={{ marginBottom: '.4rem' }}>One honest thing about where you are</div>
            <textarea value={honest} maxLength={200} onChange={e => setHonest(e.target.value)}
              placeholder="The honest thing is…"
              style={{ width: '100%', minHeight: 72, resize: 'vertical', padding: '.7rem .9rem', fontSize: '.97rem', lineHeight: 1.55, background: 'var(--surf-low)', border: '1.5px solid var(--border-2)', borderRadius: 'var(--r-md)' }}
              onFocus={e => { e.target.style.borderColor = 'var(--ember)'; e.target.style.boxShadow = '0 0 0 3px var(--ember-dim)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none'; }} />
            <div style={{ textAlign: 'right', fontSize: '.68rem', color: 'var(--ink-4)', fontFamily: 'DM Mono, monospace' }}>{honest.length}/200</div>
          </div>
          {/* Media preview (root mode) */}
          {media && (
            <div style={{ position: 'relative', marginBottom: '.8rem', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
              {media.type === 'image'
                ? <img src={media.src} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', display: 'block' }} />
                : <video src={media.src} style={{ width: '100%', maxHeight: 200, display: 'block' }} controls={false} />}
              {media.type === 'video' && (
                <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.2)' }}>
                  <span style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="play" size={20} stroke="var(--ink)" />
                  </span>
                </span>
              )}
              <button onClick={() => { URL.revokeObjectURL(media.src); setMedia(null); }}
                style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(26,26,26,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={15} stroke="#fff" />
              </button>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.9rem' }}>
            <button onClick={() => imageRef.current?.click()} className="btn btn-soft" style={{ padding: '.45rem .8rem', fontSize: '.8rem', borderRadius: 100 }}>
              <Icon name="image" size={15} stroke="var(--ink-2)" /> Photo
            </button>
            <button onClick={() => videoRef.current?.click()} className="btn btn-soft" style={{ padding: '.45rem .8rem', fontSize: '.8rem', borderRadius: 100 }}>
              <Icon name="video" size={15} stroke="var(--ink-2)" /> Video
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Just Grouv: portrait preview or picker */}
          {!media ? (
            <div style={{ display: 'flex', gap: '.8rem', marginBottom: '.9rem' }}>
              {([['image', 'Photo', 'image'], ['video', 'Video', 'video']] as [string, string, string][]).map(([kind, label, icon]) => (
                <button key={kind} onClick={() => (kind === 'image' ? imageRef : videoRef).current?.click()}
                  style={{
                    flex: 1, padding: '1.6rem 1rem', borderRadius: 'var(--r-md)', border: '1.5px dashed var(--border-2)',
                    background: 'var(--surf-low)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.5rem'
                  }}>
                  <span style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--ember-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={icon} size={20} stroke="var(--ember)" />
                  </span>
                  <span style={{ fontWeight: 600, fontSize: '.88rem' }}>{label}</span>
                  <span style={{ fontSize: '.7rem', color: 'var(--ink-4)' }}>Upload from device</span>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ position: 'relative', marginBottom: '.9rem', borderRadius: 18, overflow: 'hidden', aspectRatio: '4 / 5', maxHeight: 340, background: '#2a1d12' }}>
              {media.type === 'video' ? (
                <video
                  src={media.src}
                  playsInline
                  preload="metadata"
                  muted
                  onLoadedMetadata={e => { (e.target as HTMLVideoElement).currentTime = 0.01; }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <img src={media.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,12,4,.5) 0%, transparent 30%, transparent 55%, rgba(20,12,4,.8) 100%)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', top: 12, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
                <div className="mono" style={{ color: '#fff', fontSize: '.8rem', letterSpacing: '.12em' }}>{nowClock()}</div>
                {user.location && (
                  <div style={{
                    color: 'rgba(255,255,255,.7)', fontSize: '.66rem', marginTop: 3,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3
                  }}>
                    <Icon name="pin" size={11} stroke="rgba(255,255,255,.7)" /> {user.location}
                  </div>
                )}
              </div>
              {media.type === 'video' && (
                <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="play" size={22} stroke="var(--ink)" />
                  </span>
                </span>
              )}
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '1.2rem 1.2rem 1.3rem', textAlign: 'center' }}>
                <p className="serif" style={{ color: '#fff', fontSize: '1.25rem', fontStyle: 'italic', fontWeight: 500, lineHeight: 1.3, minHeight: '1.6em', textShadow: '0 2px 12px rgba(0,0,0,.4)' }}>
                  {caption || 'Your caption appears here…'}
                </p>
              </div>
              <button onClick={() => { URL.revokeObjectURL(media.src); setMedia(null); }}
                style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: '50%', background: 'rgba(26,26,26,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={16} stroke="#fff" />
              </button>
            </div>
          )}
          <div style={{ marginBottom: '.8rem' }}>
            <div className="label-mono" style={{ marginBottom: '.4rem' }}>Caption</div>
            <textarea value={caption} maxLength={120} onChange={e => setCaption(e.target.value)}
              placeholder="Say anything. A line is enough."
              style={{ width: '100%', minHeight: 54, resize: 'vertical', padding: '.7rem .9rem', fontSize: '.97rem', lineHeight: 1.5, background: 'var(--surf-low)', border: '1.5px solid var(--border-2)', borderRadius: 'var(--r-md)' }}
              onFocus={e => { e.target.style.borderColor = 'var(--ember)'; e.target.style.boxShadow = '0 0 0 3px var(--ember-dim)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none'; }} />
            <div style={{ textAlign: 'right', fontSize: '.68rem', color: 'var(--ink-4)', fontFamily: 'DM Mono, monospace' }}>{caption.length}/120</div>
          </div>
        </>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.82rem', color: 'var(--ink-2)', cursor: 'pointer' }}>
          <input type="checkbox" checked={anon} onChange={e => setAnon(e.target.checked)} style={{ accentColor: 'var(--ember)', width: 15, height: 15 }} />
          Post anonymously
        </label>
        <button className="btn btn-primary" disabled={!ready} onClick={submit} style={{ minWidth: 130 }}>
          {uploading ? 'Posting…' : mode === 'root' ? 'Root this' : 'Grouv it'}
        </button>
      </div>
    </div>
  );
}
