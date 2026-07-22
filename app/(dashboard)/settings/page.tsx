'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { SpaceIcon } from '@/components/ui/SpaceIcon';
import { Spinner } from '@/components/ui/Spinner';
import { useToastStore } from '@/store/useToastStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUserStore } from '@/store/useUserStore';
import { useMySpaces } from '@/hooks/useSpaces';
import { useTheme } from '@/hooks/useTheme';
import { toggleTheme } from '@/lib/theme';
import { authApi, profilesApi, usersApi, subscriptionsApi } from '@/lib/api';
import { stopCalling } from '@/lib/calling';
import { spaceById } from '@/lib/data';

// ── Toggle component ───────────────────────────────────────────────
function Toggle({ on, onChange, locked }: { on: boolean; onChange?: (v: boolean) => void; locked?: boolean }) {
  return (
    <button onClick={() => !locked && onChange?.(!on)}
      aria-label={on ? 'On' : 'Off'}
      style={{ width: 44, height: 26, borderRadius: 100,
        background: on ? 'var(--ember)' : 'var(--border-2)',
        position: 'relative', flexShrink: 0, opacity: locked ? .55 : 1,
        transition: 'background .2s', cursor: locked ? 'default' : 'pointer' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 21 : 3, width: 20, height: 20,
        borderRadius: '50%', background: '#fff', transition: 'left .2s',
        boxShadow: '0 1px 3px rgba(0,0,0,.2)', display: 'block' }}/>
    </button>
  );
}

// ── Row + Group layout helpers ─────────────────────────────────────
function Row({ label, sub, children, onClick, danger }: {
  label: string; sub?: string | React.ReactNode;
  children?: React.ReactNode; onClick?: () => void; danger?: boolean;
}) {
  return (
    <div onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '1rem', padding: '.9rem 0', borderBottom: '1px solid var(--border)',
        cursor: onClick ? 'pointer' : 'default' }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.opacity = '.7'; }}
      onMouseLeave={e => { if (onClick) (e.currentTarget as HTMLElement).style.opacity = '1'; }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: '.92rem', color: danger ? 'var(--red)' : 'var(--ink)' }}>{label}</div>
        {sub && <div style={{ fontSize: '.78rem', color: 'var(--ink-3)', marginTop: '.1rem' }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '1.2rem 1.5rem', marginBottom: '1.1rem' }}>
      <div className="label-mono" style={{ marginBottom: '.4rem' }}>{label}</div>
      {children}
    </div>
  );
}

// ── Subscription label helpers ─────────────────────────────────────
function subLabel(status: string): string {
  const map: Record<string, string> = {
    active:   'Active', trialing: 'Trial', past_due: 'Payment overdue',
    canceled: 'Canceled', incomplete: 'Incomplete', none: 'No active plan',
  };
  return map[status] ?? status;
}

function subColor(status: string): string {
  if (status === 'active' || status === 'trialing') return 'var(--green)';
  if (status === 'past_due') return 'var(--amber)';
  return 'var(--ink-3)';
}

// ── Main page ──────────────────────────────────────────────────────
export default function SettingsPage() {
  const router        = useRouter();
  const { toast }     = useToastStore();
  const { user, clear: clearUser } = useUserStore();
  const { clear: clearAuth } = useAuthStore();
  const theme  = useTheme();
  const isDark = theme === 'dark';

  // ── Server state ──
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean> | null>(null);
  const [deepFocusActive, setDeepFocusActive] = useState(false);
  const [deepFocusEndsAt, setDeepFocusEndsAt] = useState<string | null>(null);
  const [sub, setSub]         = useState<{ status: string; currentPeriodEnd?: string | null; cancelAtPeriodEnd?: boolean; trialEnd?: string | null } | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);

  // ── Account deletion ──
  const [delConfirm, setDelConfirm] = useState('');
  const [deleting,   setDeleting]   = useState(false);

  // ── Load profile prefs + subscription on mount ──
  useEffect(() => {
    profilesApi.me().then(p => {
      setNotifPrefs(p.notificationPrefs ?? {});
      setDeepFocusActive(!!p.deepFocusActive);
    }).catch(() => {});

    subscriptionsApi.me().then(s => setSub(s)).catch(() => {});
  }, []);

  const prefs = notifPrefs ?? {
    morning_curio: true, chapter_prompt: false,
    bond_invitation: true, wave: true,
  };

  function updatePref(key: string, value: boolean) {
    const updated = { ...prefs, [key]: value };
    setNotifPrefs(updated);
    profilesApi.updateMe({ preferences: updated }).catch(() => {});
  }

  async function openBillingPortal() {
    setLoadingPortal(true);
    try {
      const { url } = await subscriptionsApi.portal();
      window.location.href = url;
    } catch {
      toast('Could not open billing portal. Try again.');
    } finally {
      setLoadingPortal(false);
    }
  }

  async function handleDelete() {
    if (delConfirm !== 'DELETE') return;
    setDeleting(true);
    try {
      await usersApi.deleteMe();
      clearAuth();
      clearUser();
      router.push('/auth');
    } catch {
      toast('Could not delete account. Contact support.');
      setDeleting(false);
    }
  }

  async function handleLogout() {
    try { await authApi.logout(); } catch {}
    stopCalling();
    clearAuth();
    clearUser();
    router.push('/auth');
  }

  // user.spaces is a one-time onboarding snapshot, never updated when a
  // space is opened/closed later — mySpaceSlugs is the real, live list.
  const { data: mySpaces } = useMySpaces();
  const mySpaceSlugs = (mySpaces ?? []).map(s => s.space?.slug).filter((s): s is string => !!s);
  const firstSpace  = mySpaceSlugs[0];
  const spaceLabel  = firstSpace
    ? user.stageLabels?.[firstSpace] || spaceById(firstSpace).name
    : 'Your chapter';

  const hasSub    = sub && sub.status !== 'none' && sub.status !== 'incomplete';
  const periodEnd = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const trialEndDate = sub?.trialEnd
    ? new Date(sub.trialEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  const focusEndsLabel = deepFocusEndsAt
    ? `Active, ends ${new Date(deepFocusEndsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
    : deepFocusActive ? 'Active' : 'Off';

  return (
    <AppShell title="Settings">
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 1.6rem 3rem' }}>

        {/* ── Profile card ── */}
        <button onClick={() => router.push('/profile')}
          className="card"
          style={{ display: 'flex', alignItems: 'center', gap: '1rem',
            padding: '1.2rem 1.4rem', width: '100%', textAlign: 'left',
            marginBottom: '1.4rem', transition: 'opacity .15s' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
          <Avatar name={user.name} size={56} avatarUrl={user.avatar_url} ring={2} aura={user.aura ?? 'open'}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '.18rem' }}>{user.name}</div>
            <div style={{ fontSize: '.78rem', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: '.35rem', flexWrap: 'wrap' }}>
              {firstSpace && <SpaceIcon spaceId={firstSpace} size={11}/>}
              {spaceLabel}
            </div>
            {user.open && (
              <div style={{ fontSize: '.74rem', color: 'var(--ink-4)', marginTop: '.2rem',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Open to: {user.open}
              </div>
            )}
          </div>
          <Icon name="arrow" size={16} stroke="var(--ink-4)"/>
        </button>

        {/* ── Appearance ── */}
        <Group label="Appearance">
          <Row label={isDark ? 'Dark mode' : 'Light mode'}
            sub={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
              <Icon name={isDark ? 'sun' : 'moon'} size={16} stroke="var(--ink-3)"/>
              <Toggle on={isDark} onChange={() => toggleTheme()}/>
            </div>
          </Row>
        </Group>

        {/* ── Account ── */}
        <Group label="Account">
          <Row label="Edit profile" sub="Name, photo, honest fields"
            onClick={() => router.push('/editprofile')}>
            <Icon name="arrow" size={16} stroke="var(--ink-4)"/>
          </Row>
          <Row label="Change password"
            onClick={() => { router.push('/auth/forgot'); toast('Check your inbox for a reset link.'); }}>
            <Icon name="arrow" size={16} stroke="var(--ink-4)"/>
          </Row>
        </Group>

        {/* ── Notifications ── */}
        <Group label="Notifications">
          {notifPrefs === null ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
              <Spinner size={16} color="var(--ember)"/>
            </div>
          ) : (
            <>
              <Row label="Morning Curio" sub="Daily reading card">
                <Toggle on={prefs.morning_curio ?? true}
                  onChange={v => updatePref('morning_curio', v)}/>
              </Row>
<Row label="Chapter prompt" sub="Weekly reflection nudge">
                <Toggle on={prefs.chapter_prompt ?? false}
                  onChange={v => updatePref('chapter_prompt', v)}/>
              </Row>
              <Row label="Wave received" sub="When someone waves at you nearby">
                <Toggle on={prefs.wave ?? true}
                  onChange={v => updatePref('wave', v)}/>
              </Row>
              <Row label="Bond invitation" sub="Always on, required for safety">
                <Toggle on={true} locked/>
              </Row>
            </>
          )}
        </Group>

        {/* ── Deep Focus ── */}
        <Group label="Deep Focus">
          <Row label="Status" sub={focusEndsLabel}>
            <button className="btn btn-soft" style={{ padding: '.45rem .9rem', fontSize: '.82rem', cursor: 'pointer' }}
              onClick={() => router.push('/deep-focus')}>
              {deepFocusActive ? 'End early' : 'Start'}
            </button>
          </Row>
        </Group>

        {/* ── Subscription ── */}
        <Group label="Subscription">
          {sub === null ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
              <Spinner size={16} color="var(--ember)"/>
            </div>
          ) : hasSub ? (
            <>
              <Row label="Grouv membership"
                sub={
                  <span>
                    <span style={{ color: subColor(sub.status), fontWeight: 600 }}>
                      {subLabel(sub.status)}
                    </span>
                    {sub.status === 'trialing' && trialEndDate && ` · trial ends ${trialEndDate}`}
                    {sub.status === 'active' && periodEnd && ` · renews ${periodEnd}`}
                    {sub.cancelAtPeriodEnd && periodEnd && (
                      <span style={{ color: 'var(--amber)' }}> · cancels ${periodEnd}</span>
                    )}
                  </span>
                }>
                <button className="btn btn-soft" style={{ padding: '.45rem .9rem', fontSize: '.82rem', cursor: 'pointer' }}
                  disabled={loadingPortal}
                  onClick={openBillingPortal}>
                  {loadingPortal ? <Spinner size={12} color="var(--ink-3)"/> : 'Manage'}
                </button>
              </Row>
            </>
          ) : (
            <Row label="No active plan" sub="Start a free trial to unlock everything.">
              <button className="btn btn-primary" style={{ padding: '.45rem .9rem', fontSize: '.82rem', cursor: 'pointer' }}
                onClick={() => router.push('/subscribe')}>
                Start trial
              </button>
            </Row>
          )}
        </Group>

        {/* ── Privacy ── */}
        <Group label="Privacy">
          <Row label="Log visibility" sub="Who can see your Grouv Log"
            onClick={() => router.push('/log')}>
            <Icon name="arrow" size={16} stroke="var(--ink-4)"/>
          </Row>
          <Row label="Grouv&apos;s Promise" onClick={() => router.push('/legal')}>
            <Icon name="arrow" size={16} stroke="var(--ink-4)"/>
          </Row>
        </Group>

        {/* ── Danger zone ── */}
        <div className="card" style={{ padding: '1.2rem 1.5rem', marginBottom: '1.1rem',
          border: '1px solid var(--red-bdr)' }}>
          <div className="label-mono" style={{ color: 'var(--red)', marginBottom: '.7rem' }}>
            Danger zone
          </div>
          <div style={{ fontSize: '.84rem', color: 'var(--ink-3)', marginBottom: '.9rem', lineHeight: 1.55 }}>
            Permanently deletes your account, all your data, bonds, and posts. This cannot be undone.
          </div>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <input value={delConfirm} onChange={e => setDelConfirm(e.target.value.toUpperCase())}
              placeholder='Type "DELETE" to confirm'
              style={{ flex: 1, padding: '.6rem .9rem', borderRadius: 'var(--r-md)', fontSize: '.86rem',
                border: '1.5px solid var(--red-bdr)', background: 'var(--red-dim)',
                color: 'var(--ink)' }}/>
            <button onClick={handleDelete}
              disabled={delConfirm !== 'DELETE' || deleting}
              style={{ padding: '.6rem 1rem', borderRadius: 'var(--r-md)', fontSize: '.84rem',
                fontWeight: 600, cursor: delConfirm === 'DELETE' ? 'pointer' : 'default',
                background: delConfirm === 'DELETE' ? 'var(--red)' : 'var(--surf-high)',
                color: delConfirm === 'DELETE' ? '#fff' : 'var(--ink-4)',
                transition: 'all .2s', opacity: deleting ? .6 : 1 }}>
              {deleting ? <Spinner size={14} color="#fff"/> : 'Delete'}
            </button>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ display: 'flex', gap: '1.2rem', justifyContent: 'center',
          fontSize: '.82rem', color: 'var(--ink-3)', flexWrap: 'wrap', marginBottom: '.8rem' }}>
          <button onClick={() => router.push('/legal')}>Privacy</button>
          <button onClick={() => router.push('/legal')}>Terms</button>
          <button onClick={() => router.push('/legal')}>Our Promise</button>
        </div>
        <div className="mono" style={{ textAlign: 'center', fontSize: '.68rem', color: 'var(--ink-4)' }}>
          Grouv v1.0.0
        </div>

        <button onClick={handleLogout} className="btn btn-ghost btn-block"
          style={{ marginTop: '1.2rem' }}>
          Sign out
        </button>

      </div>
    </AppShell>
  );
}
