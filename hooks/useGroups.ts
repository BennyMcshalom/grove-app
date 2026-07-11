'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupsApi } from '@/lib/api';

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn:  groupsApi.list,
  });
}

export function useGroup(id: string | undefined, opts?: { pollWhilePending?: boolean }) {
  return useQuery({
    queryKey: ['group', id],
    queryFn:  () => groupsApi.get(id!),
    enabled:  !!id,
    refetchInterval: (query) => (opts?.pollWhilePending && query.state.data?.myRequestStatus === 'pending') ? 5000 : false,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: groupsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useRequestToJoinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => groupsApi.requestToJoin(id),
    onSuccess: (_, id) => qc.invalidateQueries({ queryKey: ['group', id] }),
  });
}

export function useInviteToGroup(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => groupsApi.invite(id, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['group', id] });
    },
  });
}

export function useLeaveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => groupsApi.leave(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['group', id] });
    },
  });
}

export function useGroupJoinRequests(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['group-join-requests', id],
    queryFn:  () => groupsApi.joinRequests(id!),
    enabled:  !!id && enabled,
  });
}

export function useApproveJoinRequest(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => groupsApi.approveRequest(id, requestId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-join-requests', id] });
      qc.invalidateQueries({ queryKey: ['group', id] });
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useDenyJoinRequest(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => groupsApi.denyRequest(id, requestId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group-join-requests', id] }),
  });
}

export function useGroupPosts(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['group-posts', id],
    queryFn:  () => groupsApi.posts(id!),
    enabled:  !!id && enabled,
  });
}

export function usePostToGroup(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => groupsApi.postMsg(id, content),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group-posts', id] }),
  });
}
