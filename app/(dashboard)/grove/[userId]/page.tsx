'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { StageChip } from '@/components/ui/StageChip';
import { Waveform } from '@/components/ui/Waveform';
import { Spinner } from '@/components/ui/Spinner';
import { AURAS, STAGES, nowPhase, PHASE, spaceById } from '@/lib/data';
import { useToastStore } from '@/store/useToastStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUserStore } from '@/store/useUserStore';
import { groveApi, logApi, usersApi, spacesApi, postsApi } from '@/lib/api';
import { formatRelativeTime } from '@/lib/mappers';
import { useInviteToBond, useSentBondInvitations } from '@/hooks/useBondInvitations';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuraKey } from '@/lib/types';

const RINGS = [
  { key: 'inner',  label: 'Struggling with', field: 'struggling', color: '#B1454F', r: 0.30 },
  { key: 'middle', label: 'Building',         field: 'building',   color: '#F3701E', r: 0.50 },
  { key: 'outer',  label: 'Open to',          field: 'openTo',     color: '#4E7D5E', r: 0.70 },
];

function LogViewer({ title, entries, onClose }: {
  title: string;
  entries: { date: string; mediaUrl: string | null; body: string }[];
  onClose: () => void;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 7000, background: 'rgba(26,26,26,.5)',
      backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end' }}
      onClick={onClose}>
      <div className="scroll" style={{ width: 'min(520px, 94vw)', height: '100%', background: 'var(--white)',
        overflowY: 'auto', animation: 'slideIn .3s ease both' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ position: 'sticky', top: 0, background: 'var(--white)', zIndex: 2,
          borderBottom: '1px solid var(--border)', padding: '1.1rem 1.4rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="label-mono">{title}</div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" stroke="var(--ink-3)"/>
          </button>
        </div>
        <div style={{ padding: '1.4rem' }}>
          {entries.length === 0 && (
            <p style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>No log entries yet.</p>
          )}
          {entries.map((e, i) => (
            <article key={i} style={{ marginBottom: '1.8rem', paddingBottom: '1.8rem',
              borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div className="label-mono" style={{ marginBottom: '.6rem' }}>Day {entries.length - i} · {e.date}</div>
              {e.mediaUrl && (
                <div style={{ borderRadius: 'var(--r-md)', overflow: 'hidden', marginBottom: '.8rem' }}>
                  <img src={e.mediaUrl} alt="" style={{ width: '100%', objectFit: 'cover', display: 'block', maxHeight: 240 }}/>
                </div>
              )}
              <p className="serif" style={{ fontSize: '1.15rem', lineHeight: 1.5 }}>{e.body}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GrovePage() {
  const router = useRouter();
  const params = useParams();
  const qc = useQueryClient();
  const { toast } = useToastStore();
  const { user: authUser } = useAuthStore();
  const { setUser } = useUserStore();
  const userId = params.userId as string;
  const isOwnProfile = !!authUser?.id && authUser.id === userId;

  const [active, setActive] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [showOverlap, setShowOverlap] = useState(false);
  const [sentLocal, setSent] = useState(false);
  const [viewLog, setViewLog] = useState(false);
  const [ambience, setAmbience] = useState(false);
  const [ci, setCi] = useState(0);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [editingRing, setEditingRing] = useState(false);
  const [ringDraft, setRingDraft] = useState('');
  const [savingRing, setSavingRing] = useState(false);

  // The orbit stage's own width is CSS-responsive (width:STAGE, maxWidth:92vw),
  // but the center avatar was a fixed 150px regardless — on any container
  // narrower than ~500px that made the avatar's radius bigger than the inner
  // ring's radius, so the avatar (z-index above the rings) covered the inner
  // ring's "Struggling with" label entirely. Track viewport width so the
  // avatar can shrink in step with the rings instead.
  const [viewportW, setViewportW] = useState(1024);
  useEffect(() => {
    const update = () => setViewportW(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const { data: grove, isLoading } = useQuery({
    queryKey: ['grove', userId],
    queryFn:  () => groveApi.get(userId),
    staleTime: 5 * 60_000,
  });

  const primarySpaceId = grove?.activeSpaces?.[0]?.spaceId ?? null;
  const { data: logResult } = useQuery({
    queryKey: ['grove-log', userId, primarySpaceId],
    queryFn:  () => logApi.userEntries(primarySpaceId!, userId),
    enabled:  !!primarySpaceId,
    staleTime: 5 * 60_000,
  });
  const logEntries = logResult?.entries ?? [];
  const logVisible = logResult?.visible ?? true;

  const { data: userPosts, isLoading: postsLoading } = useQuery({
    queryKey: ['grove-posts', userId],
    queryFn:  () => postsApi.byUser(userId),
    staleTime: 60_000,
  });

  const inviteToBond = useInviteToBond();
  const { data: sentInvitations } = useSentBondInvitations();
  const alreadySent = sentInvitations?.some(i => i.toUserId === userId && i.status === 'pending') ?? false;
  const sent = sentLocal || alreadySent;
  const phase = nowPhase();
  const STAGE = 540;
  // Mirrors the CSS `width:STAGE, maxWidth:92vw` the stage itself uses, so the
  // avatar can be sized as a safe fraction of the SAME effective width — 0.28
  // keeps it just inside the inner ring's radius (0.30) at every size, matching
  // the ~150px desktop avatar exactly at STAGE=540 while actually shrinking on
  // narrow viewports instead of staying fixed.
  const stageWidth = Math.min(STAGE, viewportW * 0.92);
  const avatarSize = Math.round(Math.min(150, stageWidth * 0.28));

  const name      = grove?.profile?.displayName ?? '';
  const firstName = name.split(' ')[0] || '…';
  const realAura  = (grove?.profile?.aura ?? undefined) as AuraKey | undefined;
  const avatarUrl = grove?.profile?.avatarUrl ?? null;
  const possessiveCap = isOwnProfile ? 'Your' : `${firstName}'s`;
  const hasntFilled    = isOwnProfile ? "You haven't filled this in yet." : `${firstName} hasn't filled this in yet.`;
  const hasntPosted     = isOwnProfile ? "You haven't posted any log entries yet." : `${firstName} hasn't posted any log entries yet.`;

  const uniqueSpaceIds = (
    grove?.activeSpaces.map(s => s.space?.slug).filter(Boolean) as string[] | undefined
    ?? ['career', 'learning', 'spiritual', 'adventure']
  ).filter((v, i, a) => a.indexOf(v) === i).slice(0, 4);

  const closedChapters = grove?.closedChapters ?? [];
  const chapter        = closedChapters[Math.min(ci, Math.max(closedChapters.length - 1, 0))];

  const logForViewer = logEntries.slice(0, 10).map(e => ({
    date:     new Date(e.entryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    mediaUrl: e.mediaUrl,
    body:     e.body,
  }));

  const primarySpace = grove?.activeSpaces?.[0];
  const primarySpaceSlug = primarySpace?.space?.slug;
  const stageOptions = STAGES[primarySpaceSlug ?? 'career'] ?? STAGES.career;

  function getRingContent(key: 'inner' | 'middle' | 'outer'): string | null {
    if (!grove?.rings) return null;
    return { inner: grove.rings.struggling, middle: grove.rings.building, outer: grove.rings.openTo }[key] ?? null;
  }

  const startEditName = () => { setNameDraft(name); setEditingName(true); };
  const saveName = async () => {
    const value = nameDraft.trim();
    if (!value) return;
    setSavingName(true);
    try {
      await usersApi.updateMe({ displayName: value });
      setUser(u => ({ ...u, name: value }));
      qc.setQueryData(['grove', userId], (old: typeof grove) => old && { ...old, profile: { ...old.profile, displayName: value } });
      setEditingName(false);
      toast('Name updated.');
    } catch { toast('Could not save. Try again.'); }
    finally { setSavingName(false); }
  };

  const startEditRing = () => { setRingDraft(getRingContent(active as 'inner' | 'middle' | 'outer') ?? ''); setEditingRing(true); };
  const saveRing = async () => {
    const ring = RINGS.find(r => r.key === active);
    if (!ring) return;
    setSavingRing(true);
    try {
      if (ring.field === 'struggling') {
        await usersApi.updateMe({ honestTension: ringDraft.trim() || null });
      } else if (ring.field === 'openTo') {
        await usersApi.updateMe({ openTo: ringDraft.trim() || null });
      } else if (ring.field === 'building' && primarySpace) {
        await spacesApi.update(primarySpace.id, { stage: ringDraft || undefined });
      }
      await qc.invalidateQueries({ queryKey: ['grove', userId] });
      setEditingRing(false);
      toast('Updated.');
    } catch { toast('Could not save. Try again.'); }
    finally { setSavingRing(false); }
  };

  const selectRing = (key: string | null) => { setActive(key); setEditingRing(false); };

  return (
    <div className="scroll" style={{ height: '100vh', width: '100vw', overflowY: 'auto', overflowX: 'hidden',
      background: 'radial-gradient(circle at 50% 38%, #FBF8F3, var(--bg) 70%)' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.6rem', padding: '1.2rem clamp(1rem, 4vw, 1.6rem)' }}>
        <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: 'var(--ink-3)', fontSize: '.9rem', flexShrink: 0 }}>
          <Icon name="back" size={18} stroke="var(--ink-3)"/> Back
        </button>
        <div className="label-mono" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem',
          flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isLoading ? <Spinner size={12}/> : isOwnProfile ? (
            <span style={{ color: 'var(--ember)', fontWeight: 600 }}>This is your Grouv</span>
          ) : (
            <><span>You're inside</span> <span style={{ color: 'var(--ember)', fontWeight: 600 }}>{firstName}'s Grouv</span></>
          )}
        </div>
        {!isOwnProfile && (
          <button onClick={() => setShowOverlap(s => !s)} className="chip"
            style={{ cursor: 'pointer', flexShrink: 0, background: showOverlap ? 'var(--ember-dim)' : 'var(--surf-high)', color: showOverlap ? 'var(--ember-deep)' : 'var(--ink-2)' }}>
            <Icon name="dots" size={14} stroke={showOverlap ? 'var(--ember-deep)' : 'var(--ink-2)'} sw={2}/> Overlap
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', maxWidth: 1100, margin: '0 auto', padding: '0 clamp(1rem, 4vw, 1.6rem) 3rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Orbit stage */}
        <div style={{ flex: '1 1 540px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="grove-orbit-stage" style={{ position: 'relative', width: STAGE, maxWidth: '92vw', aspectRatio: '1' }}>

            {/* Rings — sized as % of the container so they scale with maxWidth/aspectRatio on mobile,
                instead of a fixed pixel diameter that ignored the responsive container size. */}
            {[...RINGS].reverse().map(ring => {
              const dPct = ring.r * 100; // diameter as % of container — matches rrPct below, which treats r=0.70 as literally 70%
              const on = active === ring.key;
              const hov = hover === ring.key;
              return (
                <div key={ring.key} onClick={() => selectRing(on ? null : ring.key)}
                  onMouseEnter={() => setHover(ring.key)} onMouseLeave={() => setHover(null)}
                  style={{ position: 'absolute', left: '50%', top: '50%', width: `${dPct}%`, height: `${dPct}%`, transform: 'translate(-50%,-50%)',
                    borderRadius: '50%', border: `2px solid ${ring.color}`, opacity: on || hov ? 1 : .5, cursor: 'pointer',
                    boxShadow: on ? `0 0 26px -2px ${ring.color}99, inset 0 0 26px -6px ${ring.color}66` : 'none',
                    background: hov && !on ? `radial-gradient(circle, transparent 60%, ${ring.color}14)` : 'transparent',
                    transition: 'opacity .25s, box-shadow .25s, background .2s' }}>
                  <div style={{ position: 'absolute', left: '50%', top: -1, transform: 'translate(-50%,-55%)',
                    background: 'var(--white)', borderRadius: 100, padding: '.25rem .7rem', boxShadow: 'var(--shadow-soft)',
                    fontSize: '.66rem', fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' as const, color: ring.color, whiteSpace: 'nowrap' as const }}>
                    {ring.label}
                  </div>
                </div>
              );
            })}

            {/* Orbiting spaces — positioned with %-based coordinates (also fixes the
                same fixed-pixel-vs-responsive-container mismatch as the rings above) */}
            <div style={{ position: 'absolute', inset: 0, animation: 'orbit 48s linear infinite', pointerEvents: 'none' }}>
              {uniqueSpaceIds.map((id, i) => {
                // Offset by half a segment so icons land between the cardinal points
                // instead of at top/bottom-center, where the ring labels and the
                // ambience indicator already sit.
                const ang = (i / uniqueSpaceIds.length) * Math.PI * 2 - Math.PI / 2 + Math.PI / uniqueSpaceIds.length;
                // The outer ring's r (0.70) is its diameter as a fraction of the
                // container — i.e. the ring itself is rendered at width/height:70%.
                // Orbit radius is half that. Using 70 directly here (instead of 35)
                // put icons at 50±70% — up to 120%, well outside the container —
                // which scattered them across the page instead of on the ring.
                const rrPct = (RINGS.find(r => r.key === 'outer')!.r * 100) / 2;
                const xPct = 50 + Math.cos(ang) * rrPct, yPct = 50 + Math.sin(ang) * rrPct;
                const s = spaceById(id);
                return (
                  <div key={id} style={{ position: 'absolute', left: `${xPct}%`, top: `${yPct}%`, transform: 'translate(-50%,-50%)', animation: 'orbitR 48s linear infinite' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow)', animation: 'groveFloat 4s ease-in-out infinite' }}>
                      <Icon name={s.icon} size={20} stroke={s.ink} sw={1.6}/>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Center portrait */}
            <button onMouseDown={() => setAmbience(true)} onMouseUp={() => setAmbience(false)} onMouseLeave={() => setAmbience(false)}
              style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', borderRadius: '50%', zIndex: 6 }}>
              <Avatar name={name || '?'} size={avatarSize} timePhase={phase} aura={realAura} ring={2} avatarUrl={avatarUrl}/>
            </button>

            {ambience && (
              <div style={{ position: 'absolute', left: '50%', bottom: 8, transform: 'translateX(-50%)', zIndex: 7,
                display: 'flex', alignItems: 'center', gap: '.5rem', background: 'var(--white)', borderRadius: 100, padding: '.4rem .8rem', boxShadow: 'var(--shadow)' }}>
                <div style={{ width: 54 }}><Waveform color="var(--sage)" playing bars={14} height={18}/></div>
                <span style={{ fontSize: '.72rem', color: 'var(--ink-2)' }}>{possessiveCap} ambience</span>
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: '.4rem' }}>
            <div className="label-mono" style={{ marginBottom: '.9rem' }}>
              Tap a ring to enter · hold the portrait to hear them · {PHASE[phase].label.toLowerCase()} light
            </div>
            {closedChapters.length > 1 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.9rem', justifyContent: 'center' }}>
                  <span style={{ fontSize: '.72rem', color: 'var(--ink-3)' }}>Now</span>
                  <input type="range" min="0" max={closedChapters.length - 1} value={ci}
                    onChange={e => { setCi(+e.target.value); selectRing(null); }}
                    style={{ width: 'min(240px, 60vw)', accentColor: 'var(--ember)' }}/>
                  <span style={{ fontSize: '.72rem', color: 'var(--ink-3)' }}>Earlier</span>
                </div>
                {chapter && (
                  <div style={{ marginTop: '.5rem', fontSize: '.85rem', color: 'var(--ink-2)' }}>
                    Chapter in <strong style={{ color: 'var(--ink)' }}>{chapter.space?.name ?? 'Unknown'}</strong>
                    {chapter.closedAt && <> · closed {new Date(chapter.closedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ flex: '1 1 300px', minWidth: 'min(280px, 100%)', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '.5rem' }}>

          <div className="card" style={{ padding: '1.3rem 1.4rem' }}>
            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                <div style={{ height: 28, width: '65%', background: 'var(--surf-high)', borderRadius: 6, animation: 'pulse 1.5s ease infinite' }}/>
                <div style={{ height: 18, width: '40%', background: 'var(--surf-high)', borderRadius: 6, animation: 'pulse 1.5s ease infinite' }}/>
              </div>
            ) : (
              <>
                {editingName ? (
                  <div style={{ marginBottom: '.6rem' }}>
                    <input autoFocus value={nameDraft} onChange={e => setNameDraft(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                      style={{ width: '100%', padding: '.5rem .7rem', fontSize: '1.1rem', fontFamily: 'inherit',
                        border: '1.5px solid var(--ember)', borderRadius: 'var(--r-md)', background: 'var(--surf-low)' }}/>
                    <div style={{ display: 'flex', gap: '.5rem', marginTop: '.5rem' }}>
                      <button onClick={saveName} disabled={savingName || !nameDraft.trim()} className="btn btn-primary"
                        style={{ padding: '.35rem .8rem', fontSize: '.8rem' }}>
                        {savingName ? <Spinner size={12} color="#fff"/> : 'Save'}
                      </button>
                      <button onClick={() => setEditingName(false)} disabled={savingName} className="btn btn-soft"
                        style={{ padding: '.35rem .8rem', fontSize: '.8rem' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.6rem' }}>
                    <div className="serif" style={{ fontSize: '1.7rem', fontWeight: 600, lineHeight: 1.15, marginBottom: '.6rem' }}>{name}</div>
                    {isOwnProfile && (
                      <button onClick={startEditName}
                        style={{ fontSize: '.8rem', color: 'var(--ember)', fontWeight: 500, flexShrink: 0, marginTop: '.2rem' }}>
                        Edit
                      </button>
                    )}
                  </div>
                )}
                {primarySpace?.space?.slug && (
                  <StageChip space={primarySpace.space.slug} stage={primarySpace.stage ?? primarySpace.space.name}/>
                )}
                {realAura && (
                  <div style={{ marginTop: '.8rem', display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.8rem', color: 'var(--ink-3)' }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
                      background: AURAS[realAura].color,
                      boxShadow: `0 0 8px ${AURAS[realAura].color}`, display: 'block' }}/>
                    {AURAS[realAura].label} — <span style={{ fontStyle: 'italic' }}>{AURAS[realAura].hint}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {active ? (() => {
            const ring    = RINGS.find(r => r.key === active)!;
            const content = getRingContent(active as 'inner' | 'middle' | 'outer');
            const chapterLearning = active === 'inner' && chapter?.closingLearned;
            const canEditRing = isOwnProfile && (ring.field !== 'building' || !!primarySpace);
            return (
              <div className="card fade-in" style={{ padding: '1.3rem 1.4rem', borderLeft: `4px solid ${ring.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.5rem' }}>
                  <div className="label-mono" style={{ color: ring.color }}>{ring.label}</div>
                  {canEditRing && !editingRing && (
                    <button onClick={startEditRing} style={{ fontSize: '.78rem', color: 'var(--ember)', fontWeight: 500 }}>Edit</button>
                  )}
                </div>

                {editingRing ? (
                  <div style={{ marginBottom: '1rem' }}>
                    {ring.field === 'building' ? (
                      <select value={ringDraft} onChange={e => setRingDraft(e.target.value)} autoFocus
                        style={{ width: '100%', padding: '.6rem .7rem', fontSize: '.92rem', fontFamily: 'inherit',
                          border: '1.5px solid var(--ember)', borderRadius: 'var(--r-md)', background: 'var(--surf-low)' }}>
                        {stageOptions.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <textarea autoFocus value={ringDraft} onChange={e => setRingDraft(e.target.value)} maxLength={300}
                        placeholder="Only your Bonds will see this…"
                        style={{ width: '100%', minHeight: 80, resize: 'vertical', padding: '.6rem .7rem', fontSize: '.92rem',
                          fontFamily: 'inherit', lineHeight: 1.5, border: '1.5px solid var(--ember)', borderRadius: 'var(--r-md)',
                          background: 'var(--surf-low)' }}/>
                    )}
                    <div style={{ display: 'flex', gap: '.5rem', marginTop: '.6rem' }}>
                      <button onClick={saveRing} disabled={savingRing} className="btn btn-primary"
                        style={{ padding: '.35rem .8rem', fontSize: '.8rem' }}>
                        {savingRing ? <Spinner size={12} color="#fff"/> : 'Save'}
                      </button>
                      <button onClick={() => setEditingRing(false)} disabled={savingRing} className="btn btn-soft"
                        style={{ padding: '.35rem .8rem', fontSize: '.8rem' }}>Cancel</button>
                    </div>
                  </div>
                ) : content ? (
                  <p className="serif" style={{ fontSize: '1.3rem', fontWeight: 600, lineHeight: 1.3, marginBottom: '1rem' }}>"{content}"</p>
                ) : (
                  <p style={{ color: 'var(--ink-3)', fontStyle: 'italic', marginBottom: '1rem' }}>
                    {hasntFilled}
                  </p>
                )}
                {chapterLearning && (
                  <>
                    <div className="label-mono" style={{ marginBottom: '.6rem' }}>What they learned in this chapter</div>
                    <div style={{ background: 'var(--surf-low)', borderRadius: 'var(--r-md)', padding: '.7rem .9rem', fontSize: '.88rem', color: 'var(--ink-2)', fontStyle: 'italic' }}>
                      "{chapter.closingLearned}"
                    </div>
                  </>
                )}
                <button onClick={() => selectRing(null)} style={{ marginTop: '1rem', fontSize: '.8rem', color: 'var(--ink-3)' }}>← Step back out</button>
              </div>
            );
          })() : (
            <div className="card" style={{ padding: '1.3rem 1.4rem', background: 'linear-gradient(160deg, var(--white), var(--surf-low))' }}>
              <p style={{ color: 'var(--ink-2)', lineHeight: 1.6, fontSize: '.95rem' }}>
                {isOwnProfile
                  ? "You're standing in the middle of your own Grouv."
                  : `You're standing in the middle of ${firstName}'s Grouv.`} Each ring is a layer of where {isOwnProfile ? 'you are' : 'they are'} —{' '}
                <span style={{ color: '#B1454F' }}>struggling</span>, <span style={{ color: 'var(--ember)' }}>building</span>,{' '}
                <span style={{ color: 'var(--sage)' }}>open to</span>. Step into one.
              </p>
            </div>
          )}

          {showOverlap && (
            <div className="card fade-in" style={{ padding: '1.2rem 1.4rem', background: 'var(--ember-dim)', border: '1px solid var(--ember-bdr)' }}>
              <div className="label-mono" style={{ color: 'var(--ember-deep)', marginBottom: '.4rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                <Icon name="dots" size={12} stroke="var(--ember-deep)" sw={2}/> Where your Grouvs overlap
              </div>
              {grove?.activeSpaces?.length ? (
                <p style={{ color: 'var(--ink-2)', lineHeight: 1.55, fontSize: '.92rem' }}>
                  You're both navigating{' '}
                  {grove.activeSpaces.slice(0, 2).map(s => s.space?.name).filter(Boolean).join(' and ')}.
                </p>
              ) : (
                <p style={{ color: 'var(--ink-3)', fontStyle: 'italic', fontSize: '.92rem' }}>No shared spaces found yet.</p>
              )}
            </div>
          )}

          {/* Grouv Log */}
          <div className="card" style={{ padding: '1.1rem 1.2rem' }}>
            <div className="label-mono" style={{ marginBottom: '.7rem' }}>{possessiveCap} Grouv Log</div>
            {logForViewer.length > 0 ? (
              <div className="scroll" style={{ display: 'flex', gap: '.5rem', overflowX: 'auto', marginBottom: '.7rem' }}>
                {logForViewer.map((e, i) => (
                  <button key={i} onClick={() => setViewLog(true)}
                    style={{ flexShrink: 0, width: 96, borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-soft)' }}>
                    <div style={{ height: 120, position: 'relative', background: 'var(--surf-high)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {e.mediaUrl ? (
                        <>
                          <img src={e.mediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(20,14,8,.75))' }}/>
                        </>
                      ) : (
                        <span style={{ fontSize: '.65rem', color: 'var(--ink-3)', padding: '.3rem', textAlign: 'center', lineHeight: 1.4 }}>
                          {e.body.slice(0, 40)}…
                        </span>
                      )}
                      <span className="mono" style={{ position: 'absolute', left: 6, bottom: 5, color: e.mediaUrl ? '#fff' : 'var(--ink-3)', fontSize: '.58rem' }}>{e.date}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '.83rem', color: 'var(--ink-4)', fontStyle: 'italic', marginBottom: '.7rem' }}>
                {isLoading
                  ? 'Loading…'
                  : !logVisible
                    ? `${possessiveCap} Grouv Log is private.`
                    : hasntPosted}
              </p>
            )}
            <button onClick={() => setViewLog(true)} disabled={logForViewer.length === 0}
              className="btn btn-soft btn-block" style={{ fontSize: '.85rem' }}>
              {isOwnProfile ? 'Scroll your log →' : 'Scroll their log →'}
            </button>
          </div>

          {/* Posts — everything posted (excluding anonymous ones, which stay anonymous here too) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 .2rem .6rem' }}>
              <div className="label-mono">{possessiveCap} Posts</div>
              {!!userPosts?.length && <span style={{ fontSize: '.7rem', color: 'var(--ink-4)' }}>{userPosts.length} shared</span>}
            </div>

            {postsLoading ? (
              <div className="card" style={{ padding: '1.4rem', display: 'flex', justifyContent: 'center' }}>
                <Spinner size={18}/>
              </div>
            ) : userPosts && userPosts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.7rem' }}>
                {userPosts.slice(0, 5).map(p => {
                  const isGrouv = p.kind === 'just_grouw';
                  return (
                    <article key={p.id} className="card" style={{ overflow: 'hidden', padding: 0 }}>
                      {p.mediaUrl && (
                        <div style={{ position: 'relative', height: 150, background: 'var(--surf-high)' }}>
                          {p.mediaType?.startsWith('video') ? (
                            <video src={p.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} muted/>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.mediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}/>
                          )}
                          {p.mediaType?.startsWith('video') && (
                            <span style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%',
                              background: 'rgba(20,14,8,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Icon name="video" size={13} stroke="#fff"/>
                            </span>
                          )}
                        </div>
                      )}
                      <div style={{ padding: '.9rem 1.1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.5rem' }}>
                          <span className="mono" style={{ fontSize: '.66rem', color: 'var(--ink-4)' }}>{formatRelativeTime(p.createdAt)}</span>
                          {isGrouv && <span className="chip" style={{ background: 'var(--ember-dim)', color: 'var(--ember-deep)', fontSize: '.62rem' }}>Just Grouv</span>}
                        </div>

                        {isGrouv ? (
                          p.body && <p className="serif" style={{ fontSize: '1.05rem', fontWeight: 500, lineHeight: 1.4, color: 'var(--ink)' }}>{p.body}</p>
                        ) : (
                          <>
                            {p.doing && <p style={{ fontSize: '.95rem', fontWeight: 600, lineHeight: 1.35, marginBottom: p.honestThing ? '.35rem' : 0 }}>{p.doing}</p>}
                            {p.honestThing && (
                              <p style={{ fontSize: '.87rem', color: 'var(--ink-3)', fontStyle: 'italic', lineHeight: 1.45 }}>&ldquo;{p.honestThing}&rdquo;</p>
                            )}
                          </>
                        )}

                        {((p.rootCount ?? 0) > 0 || (p.commentCount ?? 0) > 0) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '.7rem', paddingTop: '.6rem', borderTop: '1px solid var(--border)' }}>
                            {(p.rootCount ?? 0) > 0 && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.78rem', color: 'var(--ink-3)' }}>
                                <Icon name="sprout" size={14} stroke="var(--sage)"/> {p.rootCount}
                              </span>
                            )}
                            {(p.commentCount ?? 0) > 0 && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.78rem', color: 'var(--ink-3)' }}>
                                <Icon name="comment" size={13} stroke="var(--ink-3)"/> {p.commentCount}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="card" style={{ padding: '1.6rem 1.4rem', textAlign: 'center', background: 'linear-gradient(160deg, var(--white), var(--surf-low))' }}>
                <div style={{ fontSize: '1.3rem', marginBottom: '.3rem' }}>🌱</div>
                <p style={{ fontSize: '.85rem', color: 'var(--ink-3)', fontStyle: 'italic' }}>
                  {isOwnProfile ? "You haven't posted anything yet." : `${firstName} hasn't posted anything yet.`}
                </p>
              </div>
            )}
          </div>

          {!isOwnProfile && (
            <>
              <button
                disabled={sent || inviteToBond.isPending}
                className="btn btn-primary btn-lg btn-block"
                style={{ opacity: sent ? .8 : 1 }}
                onClick={async () => {
                  try {
                    await inviteToBond.mutateAsync({ recipientId: userId });
                    setSent(true);
                    toast(`Bond invitation sent to ${firstName}.`);
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : 'Could not send';
                    if (msg.includes('409') || msg.toLowerCase().includes('already')) {
                      setSent(true);
                      toast('You already have a Bond or pending invitation with this person.');
                    } else {
                      toast(`Failed: ${msg}`);
                    }
                  }
                }}>
                {inviteToBond.isPending ? (
                  <><Spinner size={16} color="#fff"/> Sending…</>
                ) : sent ? (
                  <><Icon name="check" size={16} stroke="#fff" sw={2.5}/> Bond invitation sent</>
                ) : (
                  <>Bond with {firstName} <Icon name="arrow" stroke="#fff"/></>
                )}
              </button>
              <p style={{ textAlign: 'center', fontSize: '.76rem', color: 'var(--ink-4)', marginTop: '-.4rem' }}>
                {sent ? 'They\'ll see it in their notifications.' : 'A Bond is earned, not requested lightly.'}
              </p>
            </>
          )}
        </div>
      </div>

      {viewLog && <LogViewer title={`${possessiveCap} Grouv Log`} entries={logForViewer} onClose={() => setViewLog(false)}/>}
    </div>
  );
}
