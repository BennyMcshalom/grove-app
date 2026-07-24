'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useToastStore } from '@/store/useToastStore';
import { useAuthStore } from '@/store/useAuthStore';
import {
  useAdminUser, useSetUserStatus, useSetUserRole, useVerifyUserEmail, useDeleteUser,
  useAdminSessions, useRevokeSession, useRelatedAccounts,
} from '@/hooks/useAdmin';
import { ApiError, type UserStatus } from '@/lib/api';
import { UserHeaderCard } from '@/components/admin-user-detail/UserHeaderCard';
import { QuickFacts } from '@/components/admin-user-detail/QuickFacts';
import { RelatedAccounts } from '@/components/admin-user-detail/RelatedAccounts';
import { StatusCard } from '@/components/admin-user-detail/StatusCard';
import { RoleCard } from '@/components/admin-user-detail/RoleCard';
import { VerifyEmailCard } from '@/components/admin-user-detail/VerifyEmailCard';
import { SessionsCard } from '@/components/admin-user-detail/SessionsCard';
import { DangerZoneCard } from '@/components/admin-user-detail/DangerZoneCard';
import { RecentActions } from '@/components/admin-user-detail/RecentActions';

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
  const isModeratorUser = roles.includes('moderator');

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
      await setRole.mutateAsync({ role: 'admin', grant: !isAdminUser });
      toast(isAdminUser ? 'Admin access revoked.' : 'Admin access granted.');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not update role.');
    }
  }

  async function toggleModerator() {
    try {
      await setRole.mutateAsync({ role: 'moderator', grant: !isModeratorUser });
      toast(isModeratorUser ? 'Moderator access revoked.' : 'Moderator access granted.');
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

        <UserHeaderCard user={user} profile={profile} isAdminUser={isAdminUser} isSelf={isSelf}/>
        <QuickFacts bondCount={bondCount} spaceCount={spaceCount} subscriptionStatus={subscription?.status}/>

        {!isSelf && !relatedLoading && relatedAccounts && relatedAccounts.length > 0 && (
          <RelatedAccounts accounts={relatedAccounts} onSelect={userId => router.push(`/admin/users/${userId}`)}/>
        )}

        {isSelf ? (
          <div className="card" style={{ padding: '1rem 1.2rem', marginBottom: '1.1rem', background: 'var(--surf-low)' }}>
            <p style={{ fontSize: '.84rem', color: 'var(--ink-3)', lineHeight: 1.55 }}>
              This is your own account. Status, role, and deletion actions are disabled here to
              prevent locking yourself out. Manage your account from Settings instead.
            </p>
          </div>
        ) : (
          <>
            <StatusCard status={user.status} pendingStatus={pendingStatus} setPendingStatus={setPendingStatus}
              reason={reason} setReason={setReason} banConfirm={banConfirm} setBanConfirm={setBanConfirm}
              onApply={applyStatus} applying={setStatus.isPending}/>

            <RoleCard icon="lock" label="Admin access"
              description={isAdminUser ? 'Can see and use the Admin dashboard.' : 'Regular member, no admin access.'}
              granted={isAdminUser} onToggle={toggleAdmin} pending={setRole.isPending}
              grantLabel="Grant admin" revokeLabel="Revoke admin"/>

            <RoleCard icon="flag" label="Moderator access"
              description={isModeratorUser ? 'Can review reports, search content, and moderate Chapter Groups.' : 'No content-moderation access.'}
              granted={isModeratorUser} onToggle={toggleModerator} pending={setRole.isPending}
              grantLabel="Grant moderator" revokeLabel="Revoke moderator"/>

            {!user.emailVerifiedAt && (
              <VerifyEmailCard onVerify={handleVerify} pending={verifyEmail.isPending}/>
            )}

            <SessionsCard sessions={sessions} loading={sessionsLoading} onRevoke={handleRevokeSession} revoking={revokeSession.isPending}/>

            <DangerZoneCard delConfirm={delConfirm} setDelConfirm={setDelConfirm} onDelete={handleDelete} deleting={deleting}/>
          </>
        )}

        {recentAudit.length > 0 && <RecentActions entries={recentAudit}/>}
      </div>
    </AppShell>
  );
}
