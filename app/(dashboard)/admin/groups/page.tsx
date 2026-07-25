'use client';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { AdminSubNav } from '@/components/admin/AdminSubNav';
import { GroupCard } from '@/components/admin/GroupCard';
import { useToastStore } from '@/store/useToastStore';
import {
  useAdminGroups, useAdminGroupPosts, useRemoveGroupPost, useRemoveGroupMember, useDisbandGroup,
} from '@/hooks/useAdmin';
import { ApiError } from '@/lib/api';

export default function AdminGroupsPage() {
  const { toast } = useToastStore();
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [confirmDisband, setConfirmDisband] = useState<string | null>(null);
  const [removeMemberId, setRemoveMemberId] = useState('');

  const { data: groups, isLoading } = useAdminGroups();
  const { data: posts, isLoading: postsLoading } = useAdminGroupPosts(openGroupId ?? undefined);
  const removePost = useRemoveGroupPost(openGroupId ?? '');
  const removeMember = useRemoveGroupMember(openGroupId ?? '');
  const disband = useDisbandGroup();

  async function handleRemovePost(postId: string) {
    try { await removePost.mutateAsync(postId); toast('Post removed.'); }
    catch (err) { toast(err instanceof ApiError ? err.message : 'Could not remove post.'); }
  }

  async function handleRemoveMember() {
    if (!removeMemberId.trim()) return;
    try {
      await removeMember.mutateAsync(removeMemberId.trim());
      toast('Member removed.');
      setRemoveMemberId('');
    } catch (err) { toast(err instanceof ApiError ? err.message : 'Could not remove member.'); }
  }

  async function handleDisband(id: string) {
    try {
      await disband.mutateAsync(id);
      toast('Group disbanded.');
      setConfirmDisband(null);
      setOpenGroupId(null);
    } catch (err) { toast(err instanceof ApiError ? err.message : 'Could not disband group.'); }
  }

  return (
    <AppShell title="Groups">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 1.6rem 3rem' }}>
        <AdminSubNav/>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner/></div>
        ) : !groups?.length ? (
          <EmptyState variant="groups" title="No Chapter Groups yet." body="Groups will show up here once created."/>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
            {groups.map(g => (
              <GroupCard key={g.id} g={g}
                isOpen={openGroupId === g.id}
                onToggle={() => setOpenGroupId(openGroupId === g.id ? null : g.id)}
                posts={posts} postsLoading={postsLoading}
                removeMemberId={removeMemberId} setRemoveMemberId={setRemoveMemberId}
                onRemoveMember={handleRemoveMember} removeMemberPending={removeMember.isPending}
                onRemovePost={handleRemovePost} removePostPending={removePost.isPending}
                confirming={confirmDisband === g.id}
                onRequestDisband={() => setConfirmDisband(g.id)}
                onConfirmDisband={() => handleDisband(g.id)}
                onCancelDisband={() => setConfirmDisband(null)}
                disbandPending={disband.isPending} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
