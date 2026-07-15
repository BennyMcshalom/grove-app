'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Avatar } from '@/components/ui/Avatar';
import { SpaceIcon } from '@/components/ui/SpaceIcon';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useUserStore } from '@/store/useUserStore';
import { useToastStore } from '@/store/useToastStore';
import { gatheringApi, type NearbyUser, type GatheringRoom, ApiError } from '@/lib/api';

// ── Geohash encoder ────────────────────────────────────────────────
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
function encodeGeohash(lat: number, lng: number, precision = 5): string {
  let idx = 0, bit = 0, evenBit = true, hash = '';
  let latMin = -90, latMax = 90, lngMin = -180, lngMax = 180;
  while (hash.length < precision) {
    if (evenBit) {
      const mid = (lngMin + lngMax) / 2;
      if (lng >= mid) { idx = idx * 2 + 1; lngMin = mid; }
      else            { idx = idx * 2;     lngMax = mid; }
    } else {
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) { idx = idx * 2 + 1; latMin = mid; }
      else            { idx = idx * 2;     latMax = mid; }
    }
    evenBit = !evenBit;
    if (++bit === 5) { hash += BASE32[idx]; bit = 0; idx = 0; }
  }
  return hash;
}

// ── Person card ────────────────────────────────────────────────────
function NearbyCard({ person, mySpaces, onWave }: {
  person: NearbyUser;
  mySpaces: string[];
  onWave: (id: string) => Promise<void>;
}) {
  const router = useRouter();
  const [waveState, setWaveState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const sharedSpaces = [...new Set(person.spaces)].filter(s => mySpaces.includes(s));
  const hasShared = sharedSpaces.length > 0;

  const handleWave = async () => {
    if (waveState !== 'idle') return;
    setWaveState('sending');
    try { await onWave(person.userId); setWaveState('sent'); }
    catch { setWaveState('idle'); }
  };

  return (
    <div className="card" style={{ padding: '1rem 1.1rem', marginBottom: '.65rem',
      boxShadow: 'var(--shadow-soft)',
      borderLeft: hasShared ? '3px solid var(--sage)' : '3px solid transparent' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.85rem' }}>
        <button onClick={() => router.push(`/grove/${person.userId}`)}>
          <Avatar name={person.displayName} size={46} avatarUrl={person.avatarUrl} aura={person.aura ?? undefined}/>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '.92rem' }}>{person.displayName}</div>
          {hasShared ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', marginTop: '.2rem' }}>
              {sharedSpaces.slice(0, 3).map((s, i) => <SpaceIcon key={`${s}-${i}`} spaceId={s} size={12}/>)}
              <span style={{ fontSize: '.72rem', color: 'var(--sage)', fontWeight: 500 }}>
                Same {sharedSpaces.length === 1 ? 'chapter' : `${sharedSpaces.length} chapters`}
              </span>
            </div>
          ) : (
            <div style={{ fontSize: '.72rem', color: 'var(--ink-4)', marginTop: '.2rem' }}>
              {person.spaces.slice(0, 2).map((s, i) => (
                <span key={i} style={{ marginRight: '.3rem' }}><SpaceIcon spaceId={s} size={11}/></span>
              ))}
            </div>
          )}
          {person.openTo && (
            <div style={{ fontSize: '.72rem', color: 'var(--ink-3)', marginTop: '.15rem', lineHeight: 1.35,
              overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' as const }}>
              Open to: {person.openTo}
            </div>
          )}
        </div>
        <button onClick={handleWave} disabled={waveState !== 'idle'}
          style={{ padding: '.42rem .85rem', borderRadius: 100, fontSize: '.8rem', fontWeight: 600,
            flexShrink: 0, transition: 'all .2s', cursor: waveState === 'idle' ? 'pointer' : 'default',
            background: waveState === 'sent' ? 'var(--ember)' : 'transparent',
            color: waveState === 'sent' ? '#fff' : 'var(--ember)',
            border: '1.5px solid var(--ember)', opacity: waveState === 'sending' ? .6 : 1 }}>
          {waveState === 'sending'
            ? <Spinner size={12} color="var(--ember)"/>
            : <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="wave" size={13} stroke={waveState === 'sent' ? '#fff' : 'var(--ember)'} sw={1.6}/>
                {waveState === 'sent' ? 'Waved' : 'Wave'}
              </span>}
        </button>
      </div>
    </div>
  );
}

// ── Gathering room card ────────────────────────────────────────────
function RoomCard({ room, joined, onJoin, onLeave, onAlreadyJoined }: {
  room: GatheringRoom; joined: boolean;
  onJoin: () => Promise<void>; onLeave: () => Promise<void>;
  onAlreadyJoined?: () => void;
}) {
  const { toast } = useToastStore();
  const [busy, setBusy] = useState(false);
  const hoursLeft = Math.max(0, Math.round((new Date(room.expiresAt).getTime() - Date.now()) / 3_600_000));

  const handle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      joined ? await onLeave() : await onJoin();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Already a member — sync local state silently
        onAlreadyJoined?.();
      } else {
        toast('Something went wrong. Try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ padding: '1rem 1.2rem', marginBottom: '.7rem', boxShadow: 'var(--shadow-soft)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.8rem' }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: joined ? 'var(--green-dim)' : 'var(--ember-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .2s' }}>
          <Icon name="pin" size={19} stroke={joined ? 'var(--green)' : 'var(--ember)'}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '.94rem' }}>{room.gatheringTag}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '.2rem' }}>
            <span className="chip" style={{ fontSize: '.64rem', padding: '.1rem .45rem', background: 'var(--surf-high)' }}>
              {room.memberCount} going
            </span>
            <span style={{ fontSize: '.68rem', color: 'var(--ink-4)' }}>
              {hoursLeft > 0 ? `${hoursLeft}h left` : 'Expiring soon'}
            </span>
          </div>
          {room.pinnedPrompt && (
            <p style={{ fontSize: '.8rem', color: 'var(--ink-3)', fontStyle: 'italic', marginTop: '.4rem', lineHeight: 1.4 }}>
              &ldquo;{room.pinnedPrompt}&rdquo;
            </p>
          )}
        </div>
        <button onClick={handle} disabled={busy}
          style={{ padding: '.42rem .9rem', borderRadius: 100, fontSize: '.8rem', fontWeight: 600,
            flexShrink: 0, cursor: busy ? 'default' : 'pointer', transition: 'all .2s', whiteSpace: 'nowrap',
            background: joined ? 'var(--green-dim)' : 'var(--ember)',
            color: joined ? 'var(--green)' : '#fff',
            border: joined ? '1px solid rgba(46,107,58,.2)' : 'none',
            opacity: busy ? .6 : 1 }}>
          {busy
            ? <Spinner size={12} color={joined ? 'var(--green)' : '#fff'}/>
            : joined ? '✓ Going' : "I'll be there"}
        </button>
      </div>
    </div>
  );
}

// ── Radar visual ───────────────────────────────────────────────────
function Radar({ isOn, count }: { isOn: boolean; count: number }) {
  return (
    <div style={{ position: 'relative', height: 260, display: 'flex',
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
      {/* Rings — pointerEvents:none so they never block clicks */}
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', pointerEvents: 'none',
          width: 56 + i * 56, height: 56 + i * 56, borderRadius: '50%',
          border: `1.5px solid ${isOn ? 'rgba(78,125,94,.35)' : 'rgba(78,125,94,.1)'}`,
          transition: 'border-color .5s',
          animation: isOn ? `ringPulse 4s ease-out ${i * 0.65}s infinite` : 'none' }}/>
      ))}
      {/* Center glow */}
      <div style={{ position: 'absolute', pointerEvents: 'none',
        width: isOn ? 48 : 24, height: isOn ? 48 : 24, borderRadius: '50%',
        background: isOn ? 'radial-gradient(circle, rgba(78,125,94,.3), transparent)' : 'transparent',
        transition: 'all .5s' }}/>
      {/* Center dot */}
      <div style={{ position: 'relative', pointerEvents: 'none', zIndex: 2,
        width: isOn ? 14 : 10, height: isOn ? 14 : 10, borderRadius: '50%',
        background: isOn ? 'var(--sage)' : 'var(--border-2)',
        boxShadow: isOn ? '0 0 18px 5px rgba(78,125,94,.5)' : 'none',
        transition: 'all .4s' }}/>
      {/* Live badge */}
      {isOn && (
        <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: '.4rem', pointerEvents: 'none',
          background: 'var(--green-dim)', border: '1px solid rgba(46,107,58,.2)',
          borderRadius: 100, padding: '.28rem .75rem', fontSize: '.74rem', fontWeight: 600, color: 'var(--green)',
          whiteSpace: 'nowrap' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--sage)',
            animation: 'pulseDot 1.4s infinite', display: 'block', flexShrink: 0 }}/>
          {count > 0 ? `${count} nearby` : 'Scanning…'}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────
type Status = 'off' | 'requesting' | 'fallback' | 'active' | 'denied';
type Mode   = 'open' | 'stage' | 'event';

export default function NearbyPage() {
  const { user, setUser } = useUserStore();
  const { toast }         = useToastStore();

  const [status, setStatus]       = useState<Status>('off');
  const [mode, setMode]           = useState<Mode>('open');
  const [nearby, setNearby]       = useState<NearbyUser[]>([]);
  const [rooms, setRooms]         = useState<GatheringRoom[]>([]);
  const [joinedRooms, setJoined]  = useState<Set<string>>(new Set());
  const [newRoom, setNewRoom]     = useState('');
  const [geohash, setGeohash]     = useState<string | null>(null);
  const [coords, setCoords]       = useState<{ lat: number; lng: number } | null>(null);
  const [approximate, setApprox]  = useState(false);

  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef    = useRef(false);

  const stopProximity = useCallback(async (silent = false) => {
    activeRef.current = false;
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setStatus('off');
    setNearby([]);
    setRooms([]);
    setGeohash(null);
    // NOTE: we don't set proximity:false here on silent stop (unmount/refresh)
    // so on next mount it auto-restarts. Only explicit "Turn off" clears it.
    if (!silent) {
      setUser(u => ({ ...u, proximity: false }));
      toast('Proximity off.');
    }
    try { await gatheringApi.removePresence(); } catch {}
  }, [setUser, toast]);

  const refreshAll = useCallback(async (hash: string, lat: number, lng: number) => {
    if (!activeRef.current) return;
    try {
      await gatheringApi.publishPresence(hash, lat, lng);
      const [people, roomList] = await Promise.all([
        gatheringApi.nearby(hash),
        gatheringApi.rooms(hash),
      ]);
      if (!activeRef.current) return;
      setNearby(people);
      setRooms(roomList);
      // Seed joined state from API so buttons are correct on first load and after refetch
      setJoined(new Set(roomList.filter(r => r.isJoined).map(r => r.id)));
    } catch { /* silent, retries on next interval */ }
  }, []);

  const activateWithCoords = useCallback(async (lat: number, lng: number, approx: boolean) => {
    const precision = approx ? 4 : 5;
    const hash = encodeGeohash(lat, lng, precision);
    setGeohash(hash);
    setCoords({ lat, lng });
    setApprox(approx);
    setStatus('active');
    setUser(u => ({ ...u, proximity: true }));
    activeRef.current = true;
    await refreshAll(hash, lat, lng);
    intervalRef.current = setInterval(() => refreshAll(hash, lat, lng), 30_000);
  }, [refreshAll, setUser]);

  const startProximity = useCallback(() => {
    setStatus('requesting');
    const tryIPFallback = async () => {
      setStatus('fallback');
      try {
        const res = await fetch('/api/locate');
        if (!res.ok) throw new Error();
        const { lat, lng } = await res.json();
        if (typeof lat === 'number' && typeof lng === 'number') {
          await activateWithCoords(lat, lng, true); return;
        }
      } catch {}
      setStatus('denied');
    };
    if (!navigator.geolocation) { tryIPFallback(); return; }
    navigator.geolocation.getCurrentPosition(
      async pos => { await activateWithCoords(pos.coords.latitude, pos.coords.longitude, false); },
      () => tryIPFallback(),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 120_000 },
    );
  }, [activateWithCoords]);

  // Auto-restart on mount if proximity was previously on (survives page refresh)
  useEffect(() => {
    if (user.proximity) startProximity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount — silent so proximity flag stays true for next mount
  useEffect(() => {
    return () => { stopProximity(true); };
  }, [stopProximity]);

  const isOn  = status === 'active';
  const shown = mode === 'stage'
    ? nearby.filter(p => p.spaces.some(s => user.spaces.includes(s)))
    : nearby;

  const createRoom = async () => {
    if (!newRoom.trim() || !geohash || !coords) return;
    try {
      const room = await gatheringApi.createRoom({ gatheringTag: newRoom.trim(), geohash, cellLat: coords.lat, cellLng: coords.lng });
      setRooms(r => [room, ...r]);
      setJoined(j => new Set([...j, room.id]));
      setNewRoom('');
      toast('Gathering created. Others nearby can find it.');
    } catch { toast('Could not create gathering.'); }
  };

  return (
    <AppShell title="Nearby">
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 1.6rem 3rem' }}>

        {/* ── Radar — always visible ── */}
        <Radar isOn={isOn} count={nearby.length}/>

        {/* ── Off state ── */}
        {!isOn && status !== 'requesting' && status !== 'fallback' && (
          <div style={{ textAlign: 'center', marginTop: '-1rem', marginBottom: '2rem' }}>
            {status !== 'denied' ? (
              <>
                <h2 className="serif" style={{ fontSize: '1.6rem', fontWeight: 600, marginBottom: '.5rem' }}>
                  Grouv Nearby
                </h2>
                <p style={{ color: 'var(--ink-3)', fontSize: '.9rem', lineHeight: 1.65,
                  maxWidth: 360, margin: '0 auto 1.4rem' }}>
                  See who&apos;s in your chapter, right here, right now.<br/>No background tracking, ever.
                </p>
                <button onClick={startProximity} className="btn btn-primary btn-lg btn-pill"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem',
                    boxShadow: '0 8px 24px -8px rgba(78,125,94,.5)' }}>
                  <Icon name="pin" size={17} stroke="#fff"/> Turn on Proximity
                </button>
                <p style={{ fontSize: '.72rem', color: 'var(--ink-4)', marginTop: '.8rem' }}>
                  Turns off when you leave this page
                </p>
              </>
            ) : (
              <div className="card" style={{ padding: '1.3rem 1.5rem', border: '1px solid var(--red-bdr)',
                textAlign: 'left', maxWidth: 400, margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.6rem' }}>
                  <Icon name="pin" size={20} stroke="var(--red)"/>
                  <span style={{ fontWeight: 600 }}>Location unavailable</span>
                </div>
                <p style={{ fontSize: '.82rem', color: 'var(--ink-3)', lineHeight: 1.65, marginBottom: '.9rem' }}>
                  <strong>macOS:</strong> System Settings → Privacy &amp; Security → Location Services → your browser → <em>While Using</em>.<br/>Then reload and try again.
                </p>
                <button onClick={() => setStatus('off')} className="btn btn-soft btn-block"
                  style={{ fontSize: '.84rem' }}>Try again</button>
              </div>
            )}
          </div>
        )}

        {/* ── Requesting / fallback ── */}
        {(status === 'requesting' || status === 'fallback') && (
          <div style={{ textAlign: 'center', padding: '.5rem 0 2rem' }}>
            <Spinner size={24} color="var(--sage)"/>
            <p style={{ marginTop: '.9rem', fontSize: '.9rem', color: 'var(--ink-3)' }}>
              {status === 'fallback' ? 'Using approximate location…' : 'Requesting your location…'}
            </p>
          </div>
        )}

        {/* ── Active state ── */}
        {isOn && (
          <div style={{ marginTop: '-1rem' }}>
            {approximate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem',
                background: 'var(--surf-low)', borderRadius: 'var(--r-sm)',
                padding: '.5rem .9rem', marginBottom: '1.1rem', border: '1px solid var(--border)' }}>
                <Icon name="pin" size={14} stroke="var(--ink-3)"/>
                <span style={{ fontSize: '.76rem', color: 'var(--ink-3)', lineHeight: 1.4 }}>
                  Approximate location — nearby radius is wider than usual.
                </span>
              </div>
            )}

            {/* Mode tabs */}
            <div style={{ display: 'flex', gap: 3, background: 'var(--surf-high)', borderRadius: 100,
              padding: 3, marginBottom: '1.3rem', width: 'fit-content', margin: '0 auto 1.3rem' }}>
              {([['open', 'Open'], ['stage', 'My Chapter'], ['event', 'Gatherings']] as [Mode, string][]).map(([id, label]) => (
                <button key={id} onClick={() => setMode(id)}
                  style={{ padding: '.42rem 1rem', borderRadius: 100, fontSize: '.82rem', fontWeight: 500,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    background: mode === id ? 'var(--white)' : 'transparent',
                    color: mode === id ? 'var(--ember)' : 'var(--ink-3)',
                    boxShadow: mode === id ? 'var(--shadow-soft)' : 'none',
                    transition: 'all .15s' }}>
                  {label}
                </button>
              ))}
            </div>

            {/* ── Open / My Chapter: people list ── */}
            {(mode === 'open' || mode === 'stage') && (
              shown.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '.7rem' }}>
                    <Icon name="search" size={28} stroke="var(--ink-3)" sw={1.4}/>
                  </div>
                  <p style={{ fontWeight: 600, color: 'var(--ink-2)', marginBottom: '.35rem' }}>
                    No one nearby right now
                  </p>
                  <p style={{ fontSize: '.84rem', color: 'var(--ink-3)', lineHeight: 1.55 }}>
                    {mode === 'stage'
                      ? 'No one in your exact chapter nearby. Try "Open" to see everyone.'
                      : 'Refreshes every 30 seconds. Share the app to grow your local circle.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="label-mono" style={{ marginBottom: '.8rem' }}>
                    {shown.length} {shown.length === 1 ? 'person' : 'people'} in this ring
                  </div>
                  {shown.map(p => (
                    <NearbyCard key={p.userId} person={p} mySpaces={user.spaces}
                      onWave={id => gatheringApi.wave(id, p.spaces[0]).then(() => {})}/>
                  ))}
                </>
              )
            )}

            {/* ── Gatherings ── */}
            {mode === 'event' && (
              <div>
                <div className="card" style={{ padding: '1.1rem 1.3rem', marginBottom: '1rem',
                  border: '1.5px dashed var(--ember-bdr)', background: 'var(--ember-dim)', boxShadow: 'none' }}>
                  <div className="label-mono" style={{ marginBottom: '.55rem', color: 'var(--ember-deep)' }}>
                    Start a gathering here
                  </div>
                  <div style={{ display: 'flex', gap: '.5rem' }}>
                    <input value={newRoom} onChange={e => setNewRoom(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') createRoom(); }}
                      placeholder="Name it — e.g. &quot;founders breakfast&quot;"
                      style={{ flex: 1, padding: '.65rem .9rem', borderRadius: 'var(--r-md)', fontSize: '.9rem',
                        border: '1.5px solid var(--ember-bdr)', background: 'var(--white)' }}
                      onFocus={e => { e.target.style.borderColor = 'var(--ember)'; }}
                      onBlur={e => { e.target.style.borderColor = 'var(--ember-bdr)'; }}/>
                    <button onClick={createRoom} disabled={!newRoom.trim()} className="btn btn-primary"
                      style={{ padding: '.6rem 1rem', flexShrink: 0, opacity: newRoom.trim() ? 1 : .5 }}>
                      Create
                    </button>
                  </div>
                </div>

                {rooms.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--ink-3)' }}>
                    <p style={{ fontSize: '.88rem', lineHeight: 1.6 }}>
                      No gatherings nearby yet.<br/>Start one to let others find you.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="label-mono" style={{ marginBottom: '.8rem' }}>
                      {rooms.length} gathering{rooms.length !== 1 ? 's' : ''} nearby
                    </div>
                    {rooms.map(r => (
                      <RoomCard key={r.id} room={r} joined={joinedRooms.has(r.id)}
                        onAlreadyJoined={() => setJoined(j => new Set([...j, r.id]))}
                        onJoin={async () => {
                          await gatheringApi.joinRoom(r.id);
                          setJoined(j => new Set([...j, r.id]));
                          setRooms(rs => rs.map(x => x.id === r.id ? { ...x, memberCount: x.memberCount + 1 } : x));
                          toast('Joined the gathering.');
                        }}
                        onLeave={async () => {
                          await gatheringApi.leaveRoom(r.id);
                          setJoined(j => { const n = new Set(j); n.delete(r.id); return n; });
                          setRooms(rs => rs.map(x => x.id === r.id ? { ...x, memberCount: Math.max(0, x.memberCount - 1) } : x));
                        }}/>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Turn off */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.6rem' }}>
              <button onClick={() => stopProximity(false)} className="btn btn-soft btn-pill"
                style={{ fontSize: '.84rem', display: 'inline-flex', alignItems: 'center', gap: '.4rem', cursor: 'pointer' }}>
                <Icon name="close" size={14} stroke="var(--ink-3)"/> Turn off Proximity
              </button>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
