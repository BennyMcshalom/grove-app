'use client';
import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useToastStore } from '@/store/useToastStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUserStore } from '@/store/useUserStore';
import {
  useGroup, useRequestToJoinGroup, useLeaveGroup, useDeleteGroup,
  useGroupJoinRequests, useApproveJoinRequest, useDenyJoinRequest,
  useGroupPosts, usePostToGroup,
} from '@/hooks/useGroups';
import { groupIcon } from '@/lib/data';
import type { GroupRecord } from '@/lib/api';
import { InvitePicker } from './InvitePicker';
import { tagText } from './tagText';

export function GroupDetail({ group: groupStub, onClose }: { group: GroupRecord; onClose: () => void }) {
  const { toast } = useToastStore();
  const { user: authUser } = useAuthStore();
  const { user: me } = useUserStore();
  const myId = authUser?.id ?? '';
  const { data: group } = useGroup(groupStub.id, { pollWhilePending: true });
  const g = group ?? groupStub;
  const isMember = !!g.myRole;
  const isAdmin = g.myRole === 'admin';

  const requestToJoin = useRequestToJoinGroup();
  const leave = useLeaveGroup();
  const deleteGroup = useDeleteGroup();
  const [draft, setDraft] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: posts, isLoading: postsLoading } = useGroupPosts(g.id, isMember);
  const postMsg = usePostToGroup(g.id);

  const { data: pendingRequests } = useGroupJoinRequests(g.id, isAdmin);
  const approve = useApproveJoinRequest(g.id);
  const deny = useDenyJoinRequest(g.id);

  const send = async () => {
    if (!draft.trim() || postMsg.isPending) return;
    const content = draft.trim();
    setDraft('');
    try { await postMsg.mutateAsync(content); }
    catch { toast('Message failed.'); setDraft(content); }
  };

  const members = g.members ?? [];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 7000, background: 'rgba(26,26,26,.4)', display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div className="scroll" style={{ width: 520, maxWidth: '92vw', height: '100%', background: 'var(--white)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ height: 6, background: g.coverColor, flexShrink: 0 }}/>
        <div style={{ padding: '1.6rem 1.8rem 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ width: 56, height: 56, borderRadius: '50%', background: g.coverColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={groupIcon(g.emoji)} size={26} stroke="#fff" sw={1.4}/></span>
            <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="close" stroke="var(--ink-3)"/>
            </button>
          </div>
          <h2 className="serif" style={{ fontSize: '1.7rem', fontWeight: 600, marginTop: '.8rem' }}>{g.name}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', margin: '.4rem 0 .8rem' }}>
            <span className="chip" style={{ background: 'var(--surf-high)' }}>{g.lifePhase}</span>
            {isAdmin && <span className="chip" style={{ background: 'var(--ink)', color: '#fff' }}>You admin this chapter</span>}
          </div>
          <p style={{ color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: '1rem' }}>{g.description}</p>

          {g.memberCount > 0 && (
            <div style={{ marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                {/* Roster (avatars, names) is member-only — the backend only sends `members` to members */}
                {members.length > 0 && (
                  <div style={{ display: 'flex' }}>
                    {members.slice(0, 5).map((m, i) => (
                      <div key={m.id} style={{ marginLeft: i ? -10 : 0 }}>
                        <Avatar name={m.profile?.displayName ?? 'Member'} size={28} avatarUrl={m.profile?.avatarUrl} aura={m.profile?.aura ?? undefined}/>
                      </div>
                    ))}
                  </div>
                )}
                {isMember ? (
                  <button onClick={() => setShowMembers(v => !v)} style={{ fontSize: '.78rem', color: 'var(--ink-3)', textDecoration: 'underline', textUnderlineOffset: 2 }}>
                    {g.memberCount} member{g.memberCount === 1 ? '' : 's'} · {showMembers ? 'Hide' : 'See all'}
                  </button>
                ) : (
                  <span style={{ fontSize: '.78rem', color: 'var(--ink-3)' }}>
                    {g.memberCount} member{g.memberCount === 1 ? '' : 's'}
                  </span>
                )}
                {isMember && (
                  <button onClick={() => setShowInvite(v => !v)}
                    style={{ marginLeft: 'auto', fontSize: '.78rem', color: 'var(--ember)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '.25rem', flexShrink: 0 }}>
                    <Icon name="plus" size={13} stroke="var(--ember)"/> Invite
                  </button>
                )}
              </div>

              {showMembers && isMember && (
                <div className="fade-in scroll" style={{ marginTop: '.7rem', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '.5rem .8rem', maxHeight: 220, overflowY: 'auto' }}>
                  {members.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.4rem 0' }}>
                      <Avatar name={m.profile?.displayName ?? 'Member'} size={30} avatarUrl={m.profile?.avatarUrl} aura={m.profile?.aura ?? undefined}/>
                      <span style={{ flex: 1, minWidth: 0, fontSize: '.86rem', fontWeight: 500 }}>{m.profile?.displayName ?? 'Member'}</span>
                      {m.role === 'admin' && <span className="chip" style={{ background: 'var(--surf-high)', fontSize: '.62rem', flexShrink: 0 }}>Admin</span>}
                    </div>
                  ))}
                </div>
              )}

              {showInvite && isMember && <InvitePicker groupId={g.id} members={members} onClose={() => setShowInvite(false)}/>}
            </div>
          )}

          {/* ── Membership / join state ── */}
          {!isMember && (
            <div className="card" style={{ padding: '1.3rem', background: 'var(--surf-low)', boxShadow: 'none', textAlign: 'center', marginBottom: '1.2rem' }}>
              {g.myRequestStatus === 'pending' ? (
                <>
                  <div style={{ fontSize: '1.5rem', marginBottom: '.4rem' }}><Icon name="check" size={22} stroke="var(--sage)"/></div>
                  <p style={{ fontWeight: 600 }}>Request sent.</p>
                  <p style={{ fontSize: '.85rem', color: 'var(--ink-3)' }}>An admin will review it. No rush, no rank.</p>
                </>
              ) : (
                <>
                  <p style={{ fontWeight: 600, marginBottom: '.3rem' }}>
                    {g.myRequestStatus === 'denied' ? 'Your last request wasn\'t approved.' : 'Request to join this chapter'}
                  </p>
                  <p style={{ fontSize: '.85rem', color: 'var(--ink-3)', marginBottom: '1rem' }}>An admin reviews every request.</p>
                  <button className="btn btn-block" style={{ background: g.coverColor, color: '#3a2a18' }}
                    disabled={requestToJoin.isPending}
                    onClick={async () => {
                      try { await requestToJoin.mutateAsync(g.id); toast('Request sent.'); }
                      catch { toast('Could not send request.'); }
                    }}>
                    {requestToJoin.isPending ? 'Sending…' : g.myRequestStatus === 'denied' ? 'Send another request' : 'Send join request'}
                  </button>
                </>
              )}
            </div>
          )}

          {isMember && !isAdmin && (
            <button onClick={async () => {
              try { await leave.mutateAsync(g.id); toast(`Left ${g.name}.`); onClose(); }
              catch { toast('Could not leave.'); }
            }} style={{ fontSize: '.78rem', color: 'var(--ink-4)', marginBottom: '1rem' }}>
              Leave this chapter
            </button>
          )}

          {/* ── Admin: delete the chapter (not available for seeded/default groups) ── */}
          {isAdmin && !g.isSeeded && (
            confirmDelete ? (
              <div className="card fade-in" style={{ padding: '.9rem 1rem', background: 'var(--red-dim)', border: '1px solid var(--red-bdr)', boxShadow: 'none', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '.7rem' }}>
                <span style={{ flex: 1, fontSize: '.83rem', color: 'var(--red)', fontWeight: 500 }}>Delete this chapter? This can&apos;t be undone.</span>
                <button onClick={async () => {
                  try { await deleteGroup.mutateAsync(g.id); toast(`${g.name} deleted.`); onClose(); }
                  catch { toast('Could not delete chapter.'); }
                }} disabled={deleteGroup.isPending}
                  className="btn btn-primary" style={{ background: 'var(--red)', padding: '.4rem .8rem', fontSize: '.8rem', boxShadow: 'none' }}>
                  {deleteGroup.isPending ? 'Deleting…' : 'Delete'}
                </button>
                <button onClick={() => setConfirmDelete(false)} disabled={deleteGroup.isPending} className="btn btn-soft" style={{ padding: '.4rem .8rem', fontSize: '.8rem' }}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} style={{ fontSize: '.78rem', color: 'var(--red)', marginBottom: '1rem' }}>
                Delete this chapter
              </button>
            )
          )}

          {/* ── Admin: pending requests queue ── */}
          {isAdmin && pendingRequests && pendingRequests.length > 0 && (
            <div className="card" style={{ padding: '1rem 1.1rem', background: 'var(--ember-dim)', border: '1px solid var(--ember-bdr)', boxShadow: 'none', marginBottom: '1.2rem' }}>
              <div className="label-mono" style={{ marginBottom: '.7rem' }}>Pending requests ({pendingRequests.length})</div>
              {pendingRequests.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.6rem' }}>
                  <Avatar name={r.profile?.displayName ?? 'Someone'} size={32} avatarUrl={r.profile?.avatarUrl} aura={r.profile?.aura ?? undefined}/>
                  <div style={{ flex: 1, minWidth: 0, fontSize: '.86rem', fontWeight: 500 }}>{r.profile?.displayName ?? 'Someone'}</div>
                  <button onClick={() => deny.mutate(r.id)} disabled={deny.isPending || approve.isPending}
                    title="Deny" style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--white)' }}>
                    <Icon name="close" size={14} stroke="var(--red)"/>
                  </button>
                  <button onClick={() => approve.mutate(r.id)} disabled={deny.isPending || approve.isPending}
                    title="Approve" style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ink)' }}>
                    <Icon name="check" size={14} stroke="#fff"/>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Conversation ── */}
        <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 1.8rem 1rem', position: 'relative' }}>
          {isMember ? (
            <div className="fade-in">
              <div className="label-mono" style={{ margin: '.2rem 0 .8rem' }}>Conversation</div>
              {postsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}><Spinner/></div>
              ) : !posts || posts.length === 0 ? (
                <p style={{ color: 'var(--ink-4)', fontSize: '.86rem', fontStyle: 'italic' }}>No messages yet. Be the first to say something.</p>
              ) : (
                [...posts].reverse().map((m, i, arr) => {
                  const prevSame = i > 0 && arr[i - 1].authorId === m.authorId;
                  const mine = m.authorId === myId;
                  const name = mine ? 'You' : (m.author?.displayName ?? 'Member');
                  const avatarName = mine ? (me.name || 'You') : name;
                  const avatarUrl = mine ? me.avatar_url : m.author?.avatarUrl;
                  return (
                    <div key={m.id} style={{ display: 'flex', gap: '.7rem', marginBottom: '.9rem' }}>
                      <div style={{ width: 34, flexShrink: 0 }}>{!prevSame && <Avatar name={avatarName} size={34} avatarUrl={avatarUrl}/>}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {!prevSame && (
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '.5rem', marginBottom: '.2rem' }}>
                            <span style={{ fontWeight: 600, fontSize: '.86rem' }}>{name}</span>
                            <span className="mono" style={{ fontSize: '.64rem', color: 'var(--ink-4)' }}>{new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                        )}
                        <div style={{ background: mine ? 'var(--ember-dim)' : 'var(--surf-low)', borderRadius: 'var(--r-md)', padding: '.6rem .85rem', fontSize: '.9rem', lineHeight: 1.5, color: 'var(--ink-2)' }}>
                          {tagText(m.content)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div style={{ position: 'relative', minHeight: 140 }}>
              <div className="card" style={{ padding: '1.1rem', filter: 'blur(4px)', userSelect: 'none', boxShadow: 'var(--shadow-soft)' }}>
                <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--ink-3)' }}>Members are talking here.</p>
              </div>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="chip" style={{ background: 'var(--white)', boxShadow: 'var(--shadow)', padding: '.6rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '.4rem' }}>
                  <Icon name="lock" size={13} stroke="var(--ink-3)"/>
                  {(g.postCount ?? 0) > 0 ? `${g.postCount} message${g.postCount === 1 ? '' : 's'}, join to read` : 'Join to read the conversation'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Composer — members only ── */}
        {isMember && (
          <div style={{ padding: '.9rem 1.4rem', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', gap: '.5rem', alignItems: 'center' }}>
            <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }}
              placeholder={`Message ${g.name}… try @ to tag someone`}
              style={{ flex: 1, padding: '.65rem .95rem', borderRadius: 100, border: '1.5px solid var(--border-2)', background: 'var(--surf-low)', fontSize: '.88rem' }}
              onFocus={e => (e.target.style.borderColor = 'var(--ember)')} onBlur={e => (e.target.style.borderColor = 'var(--border-2)')}/>
            <button onClick={send} disabled={!draft.trim() || postMsg.isPending} className="btn btn-primary" style={{ padding: '.6rem .8rem', opacity: draft.trim() ? 1 : .5 }}>
              {postMsg.isPending ? <Spinner size={15} color="#fff"/> : <Icon name="send" size={17} stroke="#fff"/>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
