'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type AdminUsersQuery, type UserStatus } from '@/lib/api';

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn:  adminApi.stats,
    refetchInterval: 60_000,
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
    mutationFn: (role: 'admin' | 'user') => adminApi.setRole(id, role),
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
