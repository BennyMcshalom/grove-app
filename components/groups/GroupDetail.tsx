'use client';
import clsx from 'clsx';
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
import styles from './GroupDetail.module.css';

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
    <div className={styles.overlay} onClick={onClose}>
      <div className={clsx('scroll', styles.panel)} onClick={e => e.stopPropagation()}>
        <div className={styles.coverBar} style={{ background: g.coverColor }}/>
        <div className={styles.headBody}>
          <div className={styles.headTop}>
            <span className={styles.emojiCircle} style={{ background: g.coverColor }}><Icon name={groupIcon(g.emoji)} size={26} stroke="#fff" sw={1.4}/></span>
            <button onClick={onClose} className={styles.closeBtn}>
              <Icon name="close" stroke="var(--ink-3)"/>
            </button>
          </div>
          <h2 className={clsx('serif', styles.name)}>{g.name}</h2>
          <div className={styles.chipRow}>
            <span className={clsx('chip', styles.phaseChip)}>{g.lifePhase}</span>
            {isAdmin && <span className={clsx('chip', styles.adminChip)}>You admin this chapter</span>}
          </div>
          <p className={styles.description}>{g.description}</p>

          {g.memberCount > 0 && (
            <div className={styles.membersSection}>
              <div className={styles.membersRow}>
                {/* Roster (avatars, names) is member-only — the backend only sends `members` to members */}
                {members.length > 0 && (
                  <div className={styles.stack}>
                    {members.slice(0, 5).map((m) => (
                      <div key={m.id} className={styles.stackItem}>
                        <Avatar name={m.profile?.displayName ?? 'Member'} size={28} avatarUrl={m.profile?.avatarUrl} aura={m.profile?.aura ?? undefined}/>
                      </div>
                    ))}
                  </div>
                )}
                {isMember ? (
                  <button onClick={() => setShowMembers(v => !v)} className={styles.memberCountLink}>
                    {g.memberCount} member{g.memberCount === 1 ? '' : 's'} · {showMembers ? 'Hide' : 'See all'}
                  </button>
                ) : (
                  <span className={styles.memberCountText}>
                    {g.memberCount} member{g.memberCount === 1 ? '' : 's'}
                  </span>
                )}
                {isMember && (
                  <button onClick={() => setShowInvite(v => !v)} className={styles.inviteBtn}>
                    <Icon name="plus" size={13} stroke="var(--ember)"/> Invite
                  </button>
                )}
              </div>

              {showMembers && isMember && (
                <div className={clsx('fade-in', 'scroll', styles.rosterList)}>
                  {members.map(m => (
                    <div key={m.id} className={styles.rosterRow}>
                      <Avatar name={m.profile?.displayName ?? 'Member'} size={30} avatarUrl={m.profile?.avatarUrl} aura={m.profile?.aura ?? undefined}/>
                      <span className={styles.rosterName}>{m.profile?.displayName ?? 'Member'}</span>
                      {m.role === 'admin' && <span className={clsx('chip', styles.rosterAdminChip)}>Admin</span>}
                    </div>
                  ))}
                </div>
              )}

              {showInvite && isMember && <InvitePicker groupId={g.id} members={members} onClose={() => setShowInvite(false)}/>}
            </div>
          )}

          {/* ── Membership / join state ── */}
          {!isMember && (
            <div className={clsx('card', styles.joinCard)}>
              {g.myRequestStatus === 'pending' ? (
                <>
                  <div className={styles.joinIcon}><Icon name="check" size={22} stroke="var(--sage)"/></div>
                  <p className={styles.joinTitle}>Request sent.</p>
                  <p className={styles.joinSub}>An admin will review it. No rush, no rank.</p>
                </>
              ) : (
                <>
                  <p className={styles.joinTitle}>
                    {g.myRequestStatus === 'denied' ? 'Your last request wasn\'t approved.' : 'Request to join this chapter'}
                  </p>
                  <p className={styles.joinSubSpaced}>An admin reviews every request.</p>
                  <button className={clsx('btn', 'btn-block', styles.joinBtn)} style={{ background: g.coverColor }}
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
            }} className={styles.leaveBtn}>
              Leave this chapter
            </button>
          )}

          {/* ── Admin: delete the chapter (not available for seeded/default groups) ── */}
          {isAdmin && !g.isSeeded && (
            confirmDelete ? (
              <div className={clsx('card', 'fade-in', styles.deleteConfirmCard)}>
                <span className={styles.deleteConfirmText}>Delete this chapter? This can&apos;t be undone.</span>
                <button onClick={async () => {
                  try { await deleteGroup.mutateAsync(g.id); toast(`${g.name} deleted.`); onClose(); }
                  catch { toast('Could not delete chapter.'); }
                }} disabled={deleteGroup.isPending}
                  className={clsx('btn', 'btn-primary', styles.deleteConfirmBtn)}>
                  {deleteGroup.isPending ? 'Deleting…' : 'Delete'}
                </button>
                <button onClick={() => setConfirmDelete(false)} disabled={deleteGroup.isPending} className={clsx('btn', 'btn-soft', styles.deleteCancelBtn)}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className={styles.deleteLink}>
                Delete this chapter
              </button>
            )
          )}

          {/* ── Admin: pending requests queue ── */}
          {isAdmin && pendingRequests && pendingRequests.length > 0 && (
            <div className={clsx('card', styles.requestsCard)}>
              <div className={clsx('label-mono', styles.requestsTitle)}>Pending requests ({pendingRequests.length})</div>
              {pendingRequests.map(r => (
                <div key={r.id} className={styles.requestRow}>
                  <Avatar name={r.profile?.displayName ?? 'Someone'} size={32} avatarUrl={r.profile?.avatarUrl} aura={r.profile?.aura ?? undefined}/>
                  <div className={styles.requestName}>{r.profile?.displayName ?? 'Someone'}</div>
                  <button onClick={() => deny.mutate(r.id)} disabled={deny.isPending || approve.isPending}
                    title="Deny" className={clsx(styles.requestActionBtn, styles.requestDenyBtn)}>
                    <Icon name="close" size={14} stroke="var(--red)"/>
                  </button>
                  <button onClick={() => approve.mutate(r.id)} disabled={deny.isPending || approve.isPending}
                    title="Approve" className={clsx(styles.requestActionBtn, styles.requestApproveBtn)}>
                    <Icon name="check" size={14} stroke="#fff"/>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Conversation ── */}
        <div className={clsx('scroll', styles.conversation)}>
          {isMember ? (
            <div className="fade-in">
              <div className={clsx('label-mono', styles.convoTitle)}>Conversation</div>
              {postsLoading ? (
                <div className={styles.convoLoadingWrap}><Spinner/></div>
              ) : !posts || posts.length === 0 ? (
                <p className={styles.convoEmpty}>No messages yet. Be the first to say something.</p>
              ) : (
                [...posts].reverse().map((m, i, arr) => {
                  const prevSame = i > 0 && arr[i - 1].authorId === m.authorId;
                  const mine = m.authorId === myId;
                  const name = mine ? 'You' : (m.author?.displayName ?? 'Member');
                  const avatarName = mine ? (me.name || 'You') : name;
                  const avatarUrl = mine ? me.avatar_url : m.author?.avatarUrl;
                  return (
                    <div key={m.id} className={styles.messageRow}>
                      <div className={styles.messageAvatarSlot}>{!prevSame && <Avatar name={avatarName} size={34} avatarUrl={avatarUrl}/>}</div>
                      <div className={styles.messageBody}>
                        {!prevSame && (
                          <div className={styles.messageMeta}>
                            <span className={styles.messageAuthor}>{name}</span>
                            <span className={clsx('mono', styles.messageDate)}>{new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                        )}
                        <div className={clsx(styles.bubble, mine && styles.mine)}>
                          {tagText(m.content)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className={styles.lockedWrap}>
              <div className={clsx('card', styles.lockedCard)}>
                <p className={styles.lockedCardText}>Members are talking here.</p>
              </div>
              <div className={styles.lockedOverlay}>
                <span className={clsx('chip', styles.lockedChip)}>
                  <Icon name="lock" size={13} stroke="var(--ink-3)"/>
                  {(g.postCount ?? 0) > 0 ? `${g.postCount} message${g.postCount === 1 ? '' : 's'}, join to read` : 'Join to read the conversation'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Composer — members only ── */}
        {isMember && (
          <div className={styles.composer}>
            <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }}
              placeholder={`Message ${g.name}… try @ to tag someone`}
              className={styles.composerInput}/>
            <button onClick={send} disabled={!draft.trim() || postMsg.isPending} className={clsx('btn', 'btn-primary', styles.sendBtn)} style={{ opacity: draft.trim() ? 1 : .5 }}>
              {postMsg.isPending ? <Spinner size={15} color="#fff"/> : <Icon name="send" size={17} stroke="#fff"/>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
