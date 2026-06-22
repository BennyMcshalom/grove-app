'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useToastStore } from '@/store/useToastStore';
import { useAuthStore } from '@/store/useAuthStore';
import {
  useAdminUser, useSetUserStatus, useSetUserRole, useVerifyUserEmail, useDeleteUser,
  useAdminSessions, useRevokeSession, useRelatedAccounts,
} from '@/hooks/useAdmin';
import { ApiError, type UserStatus } from '@/lib/api';

const STATUS_COLOR: Record<UserStatus, string> = {
  active: 'var(--green)', suspended: 'var(--amber)', banned: 'var(--red)',
};
const STATUS_BG: Record<UserStatus, string> = {
  active: 'var(--green-dim)', suspended: 'var(--amber-dim)', banned: 'var(--red-dim)',
};
const STATUS_GRADIENT: Record<UserStatus, string> = {
  active: 'linear-gradient(160deg, var(--white), var(--green-dim))',
  suspended: 'linear-gradient(160deg, var(--white), var(--amber-dim))',
  banned: 'linear-gradient(160deg, var(--white), var(--red-dim))',
};
const ACTION_LABEL: Record<string, string> = {
  suspend: 'Suspended', unsuspend: 'Reactivated', ban: 'Banned', unban: 'Reactivated',
  grant_admin: 'Granted admin', revoke_admin: 'Revoked admin',
  verify_email: 'Force-verified email', delete_user: 'Deleted account',
};

function friendlyDevice(ua: string | null): string {
  if (!ua) return 'Unknown device';
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android'
    : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'an unknown OS';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) && !/Chrome/.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : 'a browser';
  return `${browser} on ${os}`;
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToastStore();
  const { user: me } = useAuthStore();
  const isSelf = me?.id === id;

  const { data, isLoading } = useAdminUser(id);
  const { data: sessions, isLoading: sessionsLoading } = useAdminSessions(isSelf ? undefined : id);
  const { data: relatedAccounts, isLoading: relatedLoading } = useRelatedAccounts(isSelf ? undefined : id);
  const setStatus = useSetUserStatus(id);
  const setRole = useSetUserRole(id);
  const verifyEmail = useVerifyUserEmail(id);
  const deleteUser = useDeleteUser();
  const revokeSession = useRevokeSession(id);

  const [pendingStatus, setPendingStatus] = useState<UserStatus | null>(null);
  const [reason, setReason] = useState('');
  const [banConfirm, setBanConfirm] = useState('');
  const [delConfirm, setDelConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  if (isLoading || !data) {
    return (
      <AppShell title="User">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner/></div>
      </AppShell>
    );
  }

  const { user, profile, roles, subscription, bondCount, spaceCount, recentAudit } = data;
  const isAdminUser = roles.includes('admin');
  const needsTypeConfirm = pendingStatus === 'banned';
  const statusConfirmReady = !needsTypeConfirm || banConfirm === 'BAN';

  async function applyStatus(status: UserStatus) {
    try {
      await setStatus.mutateAsync({ status, reason: reason.trim() || undefined });
      toast(`Account ${status === 'active' ? 'reactivated' : status}.`);
      setPendingStatus(null);
      setReason('');
      setBanConfirm('');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not update status.');
    }
  }

  async function toggleAdmin() {
    try {
      await setRole.mutateAsync(isAdminUser ? 'user' : 'admin');
      toast(isAdminUser ? 'Admin access revoked.' : 'Admin access granted.');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not update role.');
    }
  }

  async function handleVerify() {
    try {
      await verifyEmail.mutateAsync();
      toast('Email marked verified.');
    } catch {
      toast('Could not verify email.');
    }
  }

  async function handleRevokeSession(sessionId: string) {
    try {
      await revokeSession.mutateAsync(sessionId);
      toast('Device logged out.');
    } catch {
      toast('Could not log out that device.');
    }
  }

  async function handleDelete() {
    if (delConfirm !== 'DELETE') return;
    setDeleting(true);
    try {
      await deleteUser.mutateAsync(id);
      toast('Account deleted.');
      router.push('/admin/users');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not delete account.');
      setDeleting(false);
    }
  }

  return (
    <AppShell title="User">
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 1.6rem 3rem' }}>
        <button onClick={() => router.push('/admin/users')}
          style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.82rem', color: 'var(--ink-3)', marginBottom: '1rem' }}>
          <Icon name="back" size={16} stroke="var(--ink-3)"/> All users
        </button>

        {/* ── Header ── */}
        <div className="card rise" style={{ padding: '1.4rem 1.5rem', marginBottom: '1.1rem', display: 'flex', gap: '1.1rem',
          alignItems: 'center', background: STATUS_GRADIENT[user.status] }}>
          <Avatar name={profile?.displayName ?? user.email} size={60} avatarUrl={profile?.avatarUrl}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
              <span className="serif" style={{ fontSize: '1.3rem', fontWeight: 600 }}>{profile?.displayName ?? 'Unnamed'}</span>
              <span className="chip" style={{ background: '#fff', boxShadow: 'var(--shadow-soft)', color: STATUS_COLOR[user.status], fontSize: '.66rem', textTransform: 'capitalize', fontWeight: 600 }}>
                {user.status}
              </span>
              {isAdminUser && <span className="chip" style={{ background: '#fff', boxShadow: 'var(--shadow-soft)', color: 'var(--slate)', fontSize: '.66rem', fontWeight: 600 }}>Admin</span>}
              {isSelf && <span className="chip" style={{ background: '#fff', boxShadow: 'var(--shadow-soft)', color: 'var(--ink-3)', fontSize: '.66rem' }}>You</span>}
            </div>
            <div style={{ fontSize: '.84rem', color: 'var(--ink-2)', marginTop: '.25rem' }}>{user.email}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--ink-4)', marginTop: '.25rem', fontFamily: 'var(--font-dm-mono, DM Mono)' }}>
              Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {!user.emailVerifiedAt && ' · Email unverified'}
            </div>
          </div>
        </div>

        {/* ── Quick facts ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.7rem', marginBottom: '1.4rem' }}>
          <div className="card" style={{ padding: '.9rem 1rem', textAlign: 'center' }}>
            <div className="serif" style={{ fontSize: '1.4rem', fontWeight: 600 }}>{bondCount}</div>
            <div className="label-mono" style={{ marginTop: '.2rem' }}>Connections</div>
          </div>
          <div className="card" style={{ padding: '.9rem 1rem', textAlign: 'center' }}>
            <div className="serif" style={{ fontSize: '1.4rem', fontWeight: 600 }}>{spaceCount}</div>
            <div className="label-mono" style={{ marginTop: '.2rem' }}>Spaces</div>
          </div>
          <div className="card" style={{ padding: '.9rem 1rem', textAlign: 'center' }}>
            <div className="serif" style={{ fontSize: '1.05rem', fontWeight: 600, textTransform: 'capitalize' }}>
              {subscription?.status ?? 'None'}
            </div>
            <div className="label-mono" style={{ marginTop: '.2rem' }}>Subscription</div>
          </div>
        </div>

        {/* ── Related accounts (passive ban-evasion signal) ── */}
        {!isSelf && !relatedLoading && relatedAccounts && relatedAccounts.length > 0 && (
          <div className="card" style={{ padding: '1.2rem 1.3rem', marginBottom: '1.1rem', border: '1px solid var(--amber-bdr)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.4rem' }}>
              <Icon name="eye" size={14} stroke="var(--amber)"/>
              <div className="label-mono" style={{ color: 'var(--amber)' }}>Possibly related accounts</div>
            </div>
            <p style={{ fontSize: '.8rem', color: 'var(--ink-3)', marginBottom: '.8rem', lineHeight: 1.5 }}>
              These accounts have logged in from the same IP at least once. Could be a shared
              network, a VPN, or a family member — not proof on its own.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {relatedAccounts.map(r => (
                <button key={r.userId} onClick={() => router.push(`/admin/users/${r.userId}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '.7rem', padding: '.6rem .8rem', textAlign: 'left',
                    width: '100%', borderRadius: 'var(--r-md)', background: 'var(--surf-low)' }}>
                  <Avatar name={r.displayName ?? r.email ?? '?'} size={32} avatarUrl={r.avatarUrl}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '.84rem' }}>{r.displayName ?? 'Unnamed'}</div>
                    <div style={{ fontSize: '.72rem', color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.email}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {r.status && (
                      <span className="chip" style={{ background: STATUS_BG[r.status], color: STATUS_COLOR[r.status], fontSize: '.62rem', textTransform: 'capitalize' }}>
                        {r.status}
                      </span>
                    )}
                    <div style={{ fontSize: '.68rem', color: 'var(--ink-4)', marginTop: '.25rem' }}>
                      {r.sharedIpCount} shared IP{r.sharedIpCount > 1 ? 's' : ''}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {isSelf ? (
          <div className="card" style={{ padding: '1rem 1.2rem', marginBottom: '1.1rem', background: 'var(--surf-low)' }}>
            <p style={{ fontSize: '.84rem', color: 'var(--ink-3)', lineHeight: 1.55 }}>
              This is your own account — status, role, and deletion actions are disabled here to
              prevent locking yourself out. Manage your account from Settings instead.
            </p>
          </div>
        ) : (
          <>
            {/* ── Status ── */}
            <div className="card" style={{ padding: '1.2rem 1.3rem', marginBottom: '1.1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.8rem' }}>
                <Icon name="shield" size={14} stroke="var(--ink-3)"/>
                <div className="label-mono">Account status</div>
              </div>
              <div style={{ display: 'flex', gap: '.5rem', marginBottom: pendingStatus && pendingStatus !== user.status ? '.9rem' : 0 }}>
                {(['active', 'suspended', 'banned'] as const).map(s => (
                  <button key={s} onClick={() => setPendingStatus(s)} className="chip"
                    style={{ cursor: 'pointer', flex: 1, justifyContent: 'center', padding: '.5rem', fontWeight: 600, textTransform: 'capitalize',
                      background: (pendingStatus ?? user.status) === s ? STATUS_BG[s] : 'var(--surf-high)',
                      color: (pendingStatus ?? user.status) === s ? STATUS_COLOR[s] : 'var(--ink-3)',
                      border: user.status === s ? `1.5px solid ${STATUS_COLOR[s]}` : '1.5px solid transparent',
                      transition: 'all .15s' }}>
                    {s}
                  </button>
                ))}
              </div>

              {pendingStatus && pendingStatus !== user.status && (
                <div className="fade-in">
                  {pendingStatus !== 'active' && (
                    <textarea value={reason} onChange={e => setReason(e.target.value)}
                      placeholder="Reason (shown to the user on login)…"
                      style={{ width: '100%', minHeight: 60, padding: '.7rem .85rem', fontSize: '.86rem',
                        border: '1px solid var(--border-2)', borderRadius: 'var(--r-sm)', marginBottom: '.7rem', resize: 'vertical' }}/>
                  )}
                  {needsTypeConfirm && (
                    <input value={banConfirm} onChange={e => setBanConfirm(e.target.value.toUpperCase())}
                      placeholder='Type "BAN" to confirm'
                      style={{ width: '100%', padding: '.6rem .85rem', fontSize: '.84rem', marginBottom: '.7rem',
                        border: '1.5px solid var(--red-bdr)', borderRadius: 'var(--r-sm)', background: 'var(--red-dim)' }}/>
                  )}
                  <div style={{ display: 'flex', gap: '.5rem' }}>
                    <button className="btn btn-soft" style={{ fontSize: '.82rem', padding: '.5rem .9rem' }}
                      onClick={() => { setPendingStatus(null); setReason(''); setBanConfirm(''); }}>
                      Cancel
                    </button>
                    <button disabled={!statusConfirmReady || setStatus.isPending}
                      onClick={() => applyStatus(pendingStatus)}
                      style={{ padding: '.5rem 1rem', borderRadius: 'var(--r-md)', fontSize: '.84rem', fontWeight: 600,
                        background: statusConfirmReady ? STATUS_COLOR[pendingStatus] : 'var(--surf-high)',
                        color: statusConfirmReady ? '#fff' : 'var(--ink-4)', opacity: setStatus.isPending ? .7 : 1 }}>
                      {setStatus.isPending ? <Spinner size={14} color="#fff"/> : `Confirm ${pendingStatus}`}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Role ── */}
            <div className="card" style={{ padding: '1.2rem 1.3rem', marginBottom: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.3rem' }}>
                  <Icon name="lock" size={13} stroke="var(--ink-3)"/>
                  <div className="label-mono">Admin access</div>
                </div>
                <p style={{ fontSize: '.82rem', color: 'var(--ink-3)' }}>
                  {isAdminUser ? 'Can see and use the Admin dashboard.' : 'Regular member — no admin access.'}
                </p>
              </div>
              <button disabled={setRole.isPending} onClick={toggleAdmin} className={isAdminUser ? 'btn btn-soft' : 'btn btn-primary'}
                style={{ fontSize: '.82rem', flexShrink: 0 }}>
                {setRole.isPending ? <Spinner size={14}/> : isAdminUser ? 'Revoke admin' : 'Grant admin'}
              </button>
            </div>

            {/* ── Verify email ── */}
            {!user.emailVerifiedAt && (
              <div className="card" style={{ padding: '1.2rem 1.3rem', marginBottom: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.3rem' }}>
                    <Icon name="envelope" size={13} stroke="var(--ink-3)"/>
                    <div className="label-mono">Email unverified</div>
                  </div>
                  <p style={{ fontSize: '.82rem', color: 'var(--ink-3)' }}>Skip the verification email and mark it verified directly.</p>
                </div>
                <button disabled={verifyEmail.isPending} onClick={handleVerify} className="btn btn-soft" style={{ fontSize: '.82rem', flexShrink: 0 }}>
                  {verifyEmail.isPending ? <Spinner size={14}/> : 'Force-verify'}
                </button>
              </div>
            )}

            {/* ── Sessions ── */}
            <div className="card" style={{ padding: '1.2rem 1.3rem', marginBottom: '1.1rem' }}>
              <div className="label-mono" style={{ marginBottom: '.8rem' }}>Active sessions</div>
              {sessionsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}><Spinner size={16}/></div>
              ) : !sessions?.length ? (
                <p style={{ fontSize: '.82rem', color: 'var(--ink-4)', fontStyle: 'italic' }}>No active sessions.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                  {sessions.map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '.7rem', padding: '.65rem .8rem',
                      borderRadius: 'var(--r-sm)', background: 'var(--surf-low)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '.82rem', fontWeight: 500 }}>{friendlyDevice(s.userAgent)}</div>
                        <div style={{ fontSize: '.7rem', color: 'var(--ink-4)', marginTop: '.1rem' }}>
                          {s.ip ?? 'Unknown IP'} · started {timeAgo(s.createdAt)}
                        </div>
                      </div>
                      <button onClick={() => handleRevokeSession(s.id)} disabled={revokeSession.isPending}
                        className="btn btn-soft" style={{ fontSize: '.74rem', padding: '.35rem .75rem', flexShrink: 0 }}>
                        Log out
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Danger zone ── */}
            <div className="card" style={{ padding: '1.2rem 1.5rem', marginBottom: '1.1rem', border: '1px solid var(--red-bdr)' }}>
              <div className="label-mono" style={{ color: 'var(--red)', marginBottom: '.7rem' }}>Danger zone</div>
              <div style={{ fontSize: '.84rem', color: 'var(--ink-3)', marginBottom: '.9rem', lineHeight: 1.55 }}>
                Permanently deletes this account and its profile. This cannot be undone.
              </div>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <input value={delConfirm} onChange={e => setDelConfirm(e.target.value.toUpperCase())}
                  placeholder='Type "DELETE" to confirm'
                  style={{ flex: 1, padding: '.6rem .9rem', borderRadius: 'var(--r-md)', fontSize: '.86rem',
                    border: '1.5px solid var(--red-bdr)', background: 'var(--red-dim)', color: 'var(--ink)' }}/>
                <button onClick={handleDelete} disabled={delConfirm !== 'DELETE' || deleting}
                  style={{ padding: '.6rem 1rem', borderRadius: 'var(--r-md)', fontSize: '.84rem', fontWeight: 600,
                    cursor: delConfirm === 'DELETE' ? 'pointer' : 'default',
                    background: delConfirm === 'DELETE' ? 'var(--red)' : 'var(--surf-high)',
                    color: delConfirm === 'DELETE' ? '#fff' : 'var(--ink-4)', transition: 'all .2s', opacity: deleting ? .6 : 1 }}>
                  {deleting ? <Spinner size={14} color="#fff"/> : 'Delete'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Recent actions on this account ── */}
        {recentAudit.length > 0 && (
          <div>
            <div className="label-mono" style={{ marginBottom: '.7rem' }}>Recent actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
              {recentAudit.map(a => (
                <div key={a.id} className="card" style={{ padding: '.7rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow-soft)' }}>
                  <div style={{ fontSize: '.82rem' }}>
                    {ACTION_LABEL[a.action] ?? a.action}
                    {a.reason && <span style={{ color: 'var(--ink-3)' }}> — &ldquo;{a.reason}&rdquo;</span>}
                  </div>
                  <div style={{ fontSize: '.7rem', color: 'var(--ink-4)', flexShrink: 0, fontFamily: 'var(--font-dm-mono, DM Mono)' }}>
                    {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
