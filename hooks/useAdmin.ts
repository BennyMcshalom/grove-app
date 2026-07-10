'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type AdminUsersQuery, type UserStatus, type ReportStatus } from '@/lib/api';

// enabled defaults true; pass false for viewers who shouldn't hit the
// admin-only (not staff-accessible) /admin/stats endpoint, e.g. moderators.
export function useAdminStats(enabled = true) {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn:  adminApi.stats,
    refetchInterval: 60_000,
    enabled,
  });
}

export function useAdminSignupSeries(days: number) {
  return useQuery({
    queryKey: ['admin-signups', days],
    queryFn:  () => adminApi.signups(days),
  });
}

export function useAdminActivitySeries(days: number) {
  return useQuery({
    queryKey: ['admin-activity', days],
    queryFn:  () => adminApi.activity(days),
  });
}

export function useAdminUsers(params: AdminUsersQuery) {
  return useQuery({
    queryKey: ['admin-users', params],
    queryFn:  () => adminApi.users(params),
  });
}

export function useAdminUser(id: string | undefined) {
  return useQuery({
    queryKey: ['admin-user', id],
    queryFn:  () => adminApi.user(id!),
    enabled:  !!id,
  });
}

export function useRelatedAccounts(id: string | undefined) {
  return useQuery({
    queryKey: ['admin-related-accounts', id],
    queryFn:  () => adminApi.relatedAccounts(id!),
    enabled:  !!id,
  });
}

export function useAdminAuditLog(params: { limit?: number; offset?: number } = {}) {
  return useQuery({
    queryKey: ['admin-audit-log', params],
    queryFn:  () => adminApi.auditLog(params),
  });
}

export function useAdminSpaceStats() {
  return useQuery({
    queryKey: ['admin-space-stats'],
    queryFn:  adminApi.spaceStats,
  });
}

export function useAdminWaitlist(params: { limit?: number; offset?: number } = {}) {
  return useQuery({
    queryKey: ['admin-waitlist', params],
    queryFn:  () => adminApi.waitlist(params),
  });
}

export function useAdminSessions(id: string | undefined) {
  return useQuery({
    queryKey: ['admin-sessions', id],
    queryFn:  () => adminApi.sessions(id!),
    enabled:  !!id,
  });
}

export function useRevokeSession(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => adminApi.revokeSession(id, sessionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-sessions', id] }),
  });
}

export function useSetUserStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ status, reason }: { status: UserStatus; reason?: string }) =>
      adminApi.setStatus(id, status, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-audit-log'] });
    },
  });
}

export function useSetUserRole(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ role, grant }: { role: 'admin' | 'moderator'; grant: boolean }) => adminApi.setRole(id, role, grant),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-audit-log'] });
    },
  });
}

export function useVerifyUserEmail(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminApi.verifyEmail(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-user', id] });
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-audit-log'] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-audit-log'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });
}

export function useAdminReports(params: { limit?: number; offset?: number; status?: ReportStatus } = {}) {
  return useQuery({
    queryKey: ['admin-reports', params],
    queryFn:  () => adminApi.reports(params),
  });
}

function invalidateReports(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['admin-reports'] });
  qc.invalidateQueries({ queryKey: ['admin-stats'] });
}

export function useDismissReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.dismissReport(id),
    onSuccess: () => invalidateReports(qc),
  });
}

export function useRemoveReportedContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.removeReportedContent(id),
    onSuccess: () => {
      invalidateReports(qc);
      qc.invalidateQueries({ queryKey: ['admin-audit-log'] });
    },
  });
}

// ── Billing (read-only) ────────────────────────────────────────────────────
export function useAdminBillingStats() {
  return useQuery({ queryKey: ['admin-billing-stats'], queryFn: adminApi.billingStats });
}

export function useAdminSubscriptions(params: { limit?: number; offset?: number; status?: string } = {}) {
  return useQuery({ queryKey: ['admin-subscriptions', params], queryFn: () => adminApi.subscriptions(params) });
}

// ── Content search ──────────────────────────────────────────────────────────
export function useAdminContentSearch(params: { q: string; type?: string }) {
  return useQuery({
    queryKey: ['admin-content-search', params],
    queryFn:  () => adminApi.searchContent(params),
    enabled:  !!params.q.trim(),
  });
}

// ── Chapter Groups moderation ───────────────────────────────────────────────
export function useAdminGroups() {
  return useQuery({ queryKey: ['admin-groups'], queryFn: adminApi.groups });
}

export function useAdminGroupPosts(groupId: string | undefined) {
  return useQuery({
    queryKey: ['admin-group-posts', groupId],
    queryFn:  () => adminApi.groupPosts(groupId!),
    enabled:  !!groupId,
  });
}

export function useRemoveGroupPost(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => adminApi.removeGroupPost(groupId, postId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-group-posts', groupId] });
      qc.invalidateQueries({ queryKey: ['admin-groups'] });
    },
  });
}

export function useRemoveGroupMember(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => adminApi.removeGroupMember(groupId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-groups'] }),
  });
}

export function useDisbandGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => adminApi.disbandGroup(groupId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-groups'] }),
  });
}

// ── Feature flags ────────────────────────────────────────────────────────────
export function useAdminFeatureFlags() {
  return useQuery({ queryKey: ['admin-feature-flags'], queryFn: adminApi.featureFlags });
}

export function useSetFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) => adminApi.setFeatureFlag(key, enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-feature-flags'] }),
  });
}

// ── Email delivery log ───────────────────────────────────────────────────────
export function useAdminEmailLog(params: { limit?: number; offset?: number; status?: 'sent' | 'failed' } = {}) {
  return useQuery({ queryKey: ['admin-email-log', params], queryFn: () => adminApi.emailLog(params) });
}
