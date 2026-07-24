'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { RPSection } from '@/components/layout/RightPanel';
import { FeatureGate } from '@/components/layout/FeatureGate';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToastStore } from '@/store/useToastStore';
import { useBonds } from '@/hooks/useBonds';
import { useBondInvitations, useAcceptBondInvitation, useDeclineBondInvitation, useInviteToBond, useSentBondInvitations } from '@/hooks/useBondInvitations';
import { useSuggestions } from '@/hooks/useUsers';
import { formatRelativeTime, formatLastSeen } from '@/lib/mappers';
import { BondThread } from '@/components/bonds/BondThread';

// ─────────────────────────────────────────────────────────────────
// BONDS PAGE
// ─────────────────────────────────────────────────────────────────
function BondsPageInner() {
  const router = useRouter();
  const { toast } = useToastStore();
  const [sel, setSel] = useState(0);
  // Mobile: 'list' shows the bond list; 'thread' shows the active conversation
  const [mobileView, setMobileView] = useState<'list' | 'thread'>('list');
  const { data: bondsData, isLoading } = useBonds();
  const { data: suggestions } = useSuggestions();
  const { data: invitations } = useBondInvitations();
  const acceptInv = useAcceptBondInvitation();
  const declineInv = useDeclineBondInvitation();
  const inviteToBond = useInviteToBond();
  const [invited, setInvited] = useState<string[]>([]);
  const [busyInvIds, setBusyInvIds] = useState<Set<string>>(new Set());
  const { data: sentInvitations } = useSentBondInvitations();
  const sentIds = new Set((sentInvitations ?? []).filter(i => i.status === 'pending').map(i => i.toUserId));

  const allConnections = bondsData ?? [];
  const realBonds = allConnections.filter(b => b.status === 'bond');
  // Circle: whoever you spoke to most recently rises to the top.
  const circle    = allConnections.filter(b => b.status === 'circle')
    .sort((a, b) => new Date(b.lastMessageAt ?? b.formedAt).getTime() - new Date(a.lastMessageAt ?? a.formedAt).getTime());
  // Selection index (sel) is a position into THIS list — must stay in lockstep
  // with the order list items render in, not the raw backend order.
  const orderedList = [...realBonds, ...circle];
  const slots     = Math.max(0, 5 - realBonds.length);
  const pending   = (invitations ?? []).filter(i => i.status === 'pending');

  const right = (
    <>
      {pending.length > 0 && (
        <RPSection label={`Bond invitations (${pending.length})`}>
          {pending.map(inv => (
            <div key={inv.id} className="card" style={{ padding: '.85rem', marginBottom: '.6rem', boxShadow: 'var(--shadow-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.7rem' }}>
                <Avatar name={inv.fromUser?.displayName ?? '?'} size={40} avatarUrl={inv.fromUser?.avatarUrl} aura={inv.fromUser?.aura ?? undefined}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '.86rem' }}>{inv.fromUser?.displayName ?? 'Someone'}</div>
                  {inv.message && <div style={{ fontSize: '.72rem', color: 'var(--ink-3)', fontStyle: 'italic' }}>{inv.message}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <button disabled={busyInvIds.has(inv.id)} className="btn btn-primary"
                  style={{ flex: 1, padding: '.4rem', fontSize: '.8rem' }}
                  onClick={async () => {
                    setBusyInvIds(s => new Set(s).add(inv.id));
                    try {
                      const result = await acceptInv.mutateAsync(inv.id);
                      if (result.accepted === false) {
                        toast('This invitation is no longer available.');
                      } else {
                        toast(`${inv.fromUser?.displayName?.split(' ')[0]} is now in your Circle. Chat for 7 days to form a Bond.`);
                      }
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : '';
                      toast(msg ? `Could not accept: ${msg}` : 'Could not accept.');
                    } finally {
                      setBusyInvIds(s => { const n = new Set(s); n.delete(inv.id); return n; });
                    }
                  }}>Accept</button>
                <button disabled={busyInvIds.has(inv.id)} className="btn btn-soft"
                  style={{ flex: 1, padding: '.4rem', fontSize: '.8rem' }}
                  onClick={async () => {
                    setBusyInvIds(s => new Set(s).add(inv.id));
                    try { await declineInv.mutateAsync(inv.id); }
                    catch (err) {
                      const msg = err instanceof Error ? err.message : '';
                      toast(msg ? `Could not decline: ${msg}` : 'Could not decline.');
                    } finally {
                      setBusyInvIds(s => { const n = new Set(s); n.delete(inv.id); return n; });
                    }
                  }}>Decline</button>
              </div>
            </div>
          ))}
        </RPSection>
      )}

      <RPSection label="Suggested for you" suggested>
        {suggestions && suggestions.length > 0 ? suggestions.slice(0, 5).map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.5rem 0' }}>
            <Avatar name={s.displayName} size={38} avatarUrl={s.avatarUrl} aura={s.aura ?? undefined}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: '.84rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.displayName}</div>
              <div style={{ fontSize: '.7rem', color: 'var(--ember)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.reason}</div>
            </div>
            <button disabled={invited.includes(s.id) || sentIds.has(s.id) || inviteToBond.isPending}
              onClick={async () => {
                try { await inviteToBond.mutateAsync({ recipientId: s.id }); setInvited(v => [...v, s.id]); toast(`Bond invitation sent to ${s.displayName.split(' ')[0]}.`); }
                catch { toast('Could not send.'); }
              }}
              className="btn btn-ghost" style={{ padding: '.35rem .75rem', fontSize: '.76rem', flexShrink: 0 }}>
              {invited.includes(s.id) || sentIds.has(s.id) ? 'Sent' : 'Invite'}
            </button>
          </div>
        )) : (
          <p style={{ fontSize: '.82rem', color: 'var(--ink-4)', fontStyle: 'italic', padding: '.4rem 0' }}>
            Open a space to discover people in the same chapter.
          </p>
        )}
      </RPSection>
    </>
  );

  return (
    <AppShell title="Your Bonds" right={right}>
      <div style={{ padding: '0 1.6rem 1rem', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <p style={{ color: 'var(--ink-3)', marginTop: '-.4rem', marginBottom: '1rem', fontSize: '.88rem' }}>
          Up to five. Earned, not assigned.
        </p>
        <div className="bonds-layout" style={{ display: 'flex', gap: '1rem', flex: 1, minHeight: 0 }}>

          {/* ── Bond list ── */}
          <div className={`bonds-list-col scroll${mobileView === 'thread' ? ' bonds-list-hidden-mobile' : ''}`}
            style={{ width: '38%', minWidth: 280, maxWidth: 360, flexShrink: 0, overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Spinner/></div>
            ) : allConnections.length === 0 ? (
              <div className="card" style={{ background: 'linear-gradient(160deg, var(--ember-dim), var(--slate-dim))' }}>
                <EmptyState variant="bonds" compact
                  title="No connections yet."
                  body="Bonds and Circle members will appear here."
                  action={{ label: 'Explore spaces →', onClick: () => router.push('/spaces') }}/>
              </div>
            ) : (
              <>
                {/* ── Full Bonds (up to 5) ── */}
                {realBonds.map((b, i) => {
                  const name     = b.otherUser?.displayName ?? 'Bond';
                  const active   = sel === i;
                  const inFocus  = !!b.otherUser?.deepFocusActive;
                  return (
                    <button key={b.id} onClick={() => { setSel(i); setMobileView('thread'); }} className="card" style={{
                      display: 'block', width: '100%', textAlign: 'left', padding: '1rem', marginBottom: '.7rem',
                      borderLeft: active ? '4px solid var(--ember)' : '4px solid transparent',
                      boxShadow: active ? 'var(--shadow)' : 'var(--shadow-soft)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', marginBottom: '.7rem' }}>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                          <Avatar name={name} size={50} aura={b.otherUser?.aura ?? undefined} avatarUrl={b.otherUser?.avatarUrl}/>
                          {inFocus && (
                            <div title="In Deep Focus" style={{ position: 'absolute', bottom: -1, right: -1,
                              width: 16, height: 16, borderRadius: '50%', background: 'var(--ink)',
                              border: '2px solid var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Icon name="moon" size={9} stroke="var(--cream)" sw={1.8}/>
                            </div>
                          )}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                          {inFocus ? (
                            <span style={{ fontSize: '.7rem', color: 'var(--ink-3)', fontStyle: 'italic' }}>in focus</span>
                          ) : b.otherUser?.openTo ? (
                            <div style={{ fontSize: '.74rem', color: 'var(--ink-4)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.otherUser.openTo}</div>
                          ) : null}
                        </div>
                      </div>
                      <ProgressBar value={b.depthScore ?? 0}/>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.5rem', fontSize: '.72rem', color: 'var(--ink-3)' }}>
                        <span>Bond depth</span>
                        <span>{b.lastMessageAt ? `Last message: ${formatRelativeTime(b.lastMessageAt)}` : 'No messages yet'}</span>
                      </div>
                    </button>
                  );
                })}
                {[...Array(slots)].map((_, i) => (
                  <div key={i} style={{ borderRadius: 'var(--r-md)', border: '1.5px dashed var(--border-2)',
                    padding: '.9rem', marginBottom: '.4rem', fontSize: '.8rem', color: 'var(--ink-4)',
                    fontStyle: 'italic', lineHeight: 1.45 }}>
                    A Bond forms when you consistently show up for someone.
                  </div>
                ))}

                {/* ── Circle: recent connections, sorted by last chatted ── */}
                {circle.length > 0 && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      margin: '1.4rem 0 .6rem', padding: '0 .2rem' }}>
                      <div className="label-mono">Your Circle</div>
                      <span style={{ fontSize: '.7rem', color: 'var(--ink-4)' }}>{circle.length} connected</span>
                    </div>
                    <div className="card" style={{ padding: '.3rem .4rem', boxShadow: 'var(--shadow-soft)' }}>
                      {circle.map((b, i) => {
                        const name = b.otherUser?.displayName ?? 'Circle';
                        const idx  = realBonds.length + i;
                        const active = sel === idx;
                        const streak = b.streakDays ?? 0;
                        const pct    = Math.min(100, Math.round((streak / 7) * 100));
                        const unread = b.unreadCount ?? 0;
                        return (
                          <button key={b.id} onClick={() => { setSel(idx); setMobileView('thread'); }} style={{
                            display: 'block', width: '100%', textAlign: 'left', padding: '.6rem .6rem', borderRadius: 'var(--r-md)',
                            background: active ? 'var(--ember-dim)' : 'transparent',
                            borderBottom: i < circle.length - 1 ? '1px solid var(--border)' : 'none',
                          }}
                            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--surf-low)'; }}
                            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem' }}>
                              <div style={{ position: 'relative', flexShrink: 0 }}>
                                <Avatar name={name} size={40} avatarUrl={b.otherUser?.avatarUrl} aura={b.otherUser?.aura ?? undefined}/>
                                {b.otherUser?.deepFocusActive && (
                                  <div title="In Deep Focus" style={{ position: 'absolute', bottom: -1, right: -1,
                                    width: 14, height: 14, borderRadius: '50%', background: 'var(--ink)',
                                    border: '2px solid var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Icon name="moon" size={7} stroke="var(--cream)" sw={1.8}/>
                                  </div>
                                )}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '.86rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                                <div style={{ fontSize: '.72rem', color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {b.otherUser?.deepFocusActive ? 'in focus' : (b.otherUser?.openTo || ' ')}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: '.66rem', color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>
                                  {b.lastMessageAt ? formatRelativeTime(b.lastMessageAt) : 'new'}
                                </div>
                                {unread > 0 && (
                                  <span style={{ display: 'inline-block', marginTop: 3, minWidth: 16, height: 16, lineHeight: '16px',
                                    borderRadius: 100, background: 'var(--ember)', color: '#fff', fontSize: '.6rem', fontWeight: 600,
                                    textAlign: 'center', padding: '0 4px' }}>{unread}</span>
                                )}
                              </div>
                            </div>
                            {/* Streak — fills toward the 7-day Bond threshold */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '.4rem', paddingLeft: 50 }}>
                              <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--surf-high)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`,
                                  background: pct >= 85 ? 'var(--sage)' : 'var(--ink-4)',
                                  transition: 'width .5s ease' }}/>
                              </div>
                              <span style={{ fontSize: '.62rem', color: 'var(--ink-4)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
                                {formatLastSeen(b.otherUser?.lastActiveAt)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <p style={{ fontSize: '.72rem', color: 'var(--ink-4)', fontStyle: 'italic', margin: '.7rem .2rem 0', lineHeight: 1.45 }}>
                      Everyone you&apos;ve started Grouving with. Whoever you spoke to most recently rises to the top.
                    </p>
                  </>
                )}
              </>
            )}
          </div>

          {/* ── Thread ── */}
          <div className={`bonds-thread-col${mobileView === 'list' ? ' bonds-thread-hidden-mobile' : ''}`}
            style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {/* Mobile back button */}
            <button className="bonds-back-btn"
              onClick={() => setMobileView('list')}
              style={{ display: 'none', alignItems: 'center', gap: '.4rem',
                padding: '.5rem 0', marginBottom: '.5rem',
                fontSize: '.86rem', color: 'var(--ink-3)', fontWeight: 500 }}>
              <Icon name="back" size={16} stroke="var(--ink-3)"/> All bonds
            </button>
            {orderedList.length > 0 ? (
              <BondThread bond={orderedList[Math.min(sel, orderedList.length - 1)]}/>
            ) : !isLoading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                <div className="card" style={{
                  background: 'linear-gradient(160deg, var(--ember-dim), var(--slate-dim))',
                  boxShadow: 'var(--shadow-lg)', maxWidth: 420, width: '100%',
                }}>
                  <EmptyState variant="bonds" title="Your first Bond is waiting."
                    body="Show up consistently for someone in your circle. It can't be rushed, but it's worth it."
                    action={{ label: 'Explore spaces →', onClick: () => router.push('/spaces') }}/>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function BondsPage() {
  return (
    <FeatureGate flagKey="nav_bonds">
      <BondsPageInner />
    </FeatureGate>
  );
}
