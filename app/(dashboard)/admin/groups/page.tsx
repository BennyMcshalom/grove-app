'use client';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { AdminSubNav } from '@/components/admin/AdminSubNav';
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
              <div key={g.id} className="card" style={{ padding: '1rem 1.2rem' }}>
                <button onClick={() => setOpenGroupId(openGroupId === g.id ? null : g.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '.8rem', width: '100%', textAlign: 'left' }}>
                  <span style={{ width: 34, height: 34, borderRadius: '50%', background: g.coverColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.1rem' }}>
                    {g.emoji}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '.92rem' }}>{g.name}</div>
                    <div style={{ fontSize: '.76rem', color: 'var(--ink-3)' }}>
                      {g.memberCount} members · {g.postCount} posts · {g.lifePhase}
                      {g.isSeeded && ' · default'}
                    </div>
                  </div>
                  <span style={{ display: 'flex', transform: openGroupId === g.id ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s' }}>
                    <Icon name="arrow" size={16} stroke="var(--ink-4)"/>
                  </span>
                </button>

                {openGroupId === g.id && (
                  <div className="fade-in" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem' }}>
                      <input value={removeMemberId} onChange={e => setRemoveMemberId(e.target.value)}
                        placeholder="User id to remove from group…"
                        style={{ flex: 1, padding: '.5rem .7rem', fontSize: '.82rem', borderRadius: 'var(--r-md)',
                          border: '1.5px solid var(--border-2)', background: 'var(--surf-low)' }}/>
                      <button onClick={handleRemoveMember} disabled={removeMember.isPending || !removeMemberId.trim()}
                        className="btn btn-soft" style={{ fontSize: '.8rem', padding: '.5rem .9rem' }}>
                        {removeMember.isPending ? <Spinner size={12}/> : 'Remove member'}
                      </button>
                    </div>

                    <div className="label-mono" style={{ marginBottom: '.6rem' }}>Recent posts</div>
                    {postsLoading ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}><Spinner size={16}/></div>
                    ) : !posts?.length ? (
                      <p style={{ fontSize: '.82rem', color: 'var(--ink-4)', fontStyle: 'italic' }}>No posts in this group yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '1rem' }}>
                        {posts.map(p => (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '.6rem',
                            background: 'var(--surf-low)', borderRadius: 'var(--r-md)', padding: '.6rem .8rem' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '.76rem', fontWeight: 600, marginBottom: '.2rem' }}>{p.authorName}</div>
                              <div style={{ fontSize: '.84rem', color: 'var(--ink-2)' }}>{p.content}</div>
                            </div>
                            <button onClick={() => handleRemovePost(p.id)} disabled={removePost.isPending}
                              title="Remove post" style={{ flexShrink: 0, color: 'var(--red)' }}>
                              <Icon name="close" size={15} stroke="var(--red)"/>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {!g.isSeeded && (
                      confirmDisband === g.id ? (
                        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '.8rem', color: 'var(--red)', fontWeight: 500 }}>Disband this group?</span>
                          <button onClick={() => handleDisband(g.id)} disabled={disband.isPending}
                            className="btn btn-primary" style={{ background: 'var(--red)', boxShadow: 'none', fontSize: '.78rem', padding: '.35rem .8rem' }}>
                            {disband.isPending ? <Spinner size={12} color="#fff"/> : 'Disband'}
                          </button>
                          <button onClick={() => setConfirmDisband(null)} className="btn btn-soft" style={{ fontSize: '.78rem', padding: '.35rem .8rem' }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDisband(g.id)}
                          style={{ fontSize: '.78rem', color: 'var(--red)', fontWeight: 600 }}>
                          Disband group
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
