'use client';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { RPSection } from '@/components/layout/RightPanel';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToastStore } from '@/store/useToastStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUserStore } from '@/store/useUserStore';
import {
  useGroups, useGroup, useCreateGroup, useRequestToJoinGroup, useLeaveGroup,
  useGroupJoinRequests, useApproveJoinRequest, useDenyJoinRequest,
  useGroupPosts, usePostToGroup,
} from '@/hooks/useGroups';
import { groupIcon } from '@/lib/data';
import type { GroupRecord } from '@/lib/api';

const CATEGORIES: { emoji: string; icon: string; label: string }[] = [
  { emoji: '🌱', icon: 'group-founders', label: 'Building something new' },
  { emoji: '🧳', icon: 'group-relocate', label: 'Relocating / starting over' },
  { emoji: '👼', icon: 'group-parent',   label: 'Early parenthood' },
  { emoji: '🥀', icon: 'group-burnout',  label: 'Burned out, searching' },
  { emoji: '🎨', icon: 'group-creative', label: 'Going pro with a craft' },
];
const COLORS = ['var(--c-career)', 'var(--c-adventure)', 'var(--c-relation)', 'var(--c-health)', 'var(--c-creative)', 'var(--c-spiritual)', 'var(--c-wealth)', 'var(--c-learning)'];

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'chapter';
}

// Highlight @Name mentions inside a group-chat message.
function tagText(text: string) {
  const parts = text.split(/(@[A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)?)/g);
  return parts.map((p, i) => p.startsWith('@')
    ? <strong key={i} style={{ color: 'var(--ember)', fontWeight: 600, background: 'var(--ember-dim)', padding: '0 .3rem', borderRadius: 6 }}>{p}</strong>
    : <span key={i}>{p}</span>);
}

function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToastStore();
  const create = useCreateGroup();
  const [name, setName] = useState('');
  const [phase, setPhase] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [color, setColor] = useState(COLORS[0]);

  const canSubmit = name.trim().length >= 3 && phase.trim().length > 0 && description.trim().length >= 10;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 7100, background: 'rgba(26,26,26,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.2rem' }} onClick={onClose}>
      <div className="card scroll" style={{ width: 480, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '1.6rem' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <h2 className="serif" style={{ fontSize: '1.4rem', fontWeight: 600 }}>Start a chapter</h2>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={16} stroke="var(--ink-3)"/>
          </button>
        </div>

        <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--ink-3)', marginBottom: '.35rem' }}>Chapter name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Relocating solo" maxLength={80}
          style={{ width: '100%', padding: '.7rem .9rem', borderRadius: 'var(--r-md)', border: '1.5px solid var(--border-2)', fontSize: '.92rem', marginBottom: '.9rem' }}/>

        <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--ink-3)', marginBottom: '.35rem' }}>Where people are in this phase</label>
        <input value={phase} onChange={e => setPhase(e.target.value)} placeholder="e.g. Just moved" maxLength={40}
          style={{ width: '100%', padding: '.7rem .9rem', borderRadius: 'var(--r-md)', border: '1.5px solid var(--border-2)', fontSize: '.92rem', marginBottom: '.9rem' }}/>

        <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--ink-3)', marginBottom: '.35rem' }}>What this chapter is for</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="A sentence or two on who this room is for." maxLength={500}
          style={{ width: '100%', minHeight: 80, padding: '.7rem .9rem', borderRadius: 'var(--r-md)', border: '1.5px solid var(--border-2)', fontSize: '.92rem', resize: 'vertical', marginBottom: '.9rem' }}/>

        <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--ink-3)', marginBottom: '.5rem' }}>Category</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '1rem' }}>
          {CATEGORIES.map(c => (
            <button key={c.emoji} onClick={() => setCategory(c)} title={c.label}
              style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: category.emoji === c.emoji ? color : 'var(--surf-low)',
                border: category.emoji === c.emoji ? '2px solid var(--ink)' : '1.5px solid var(--border-2)' }}>
              <Icon name={c.icon} size={17} stroke={category.emoji === c.emoji ? '#fff' : 'var(--ink-3)'} sw={1.4}/>
            </button>
          ))}
        </div>

        <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--ink-3)', marginBottom: '.5rem' }}>Color</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '1.4rem' }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              style={{ width: 28, height: 28, borderRadius: '50%', background: c,
                border: color === c ? '2.5px solid var(--ink)' : '2.5px solid transparent', boxShadow: 'var(--shadow-soft)' }}/>
          ))}
        </div>

        <button className="btn btn-primary btn-block" disabled={!canSubmit || create.isPending}
          onClick={async () => {
            try {
              await create.mutateAsync({
                name: name.trim(), slug: slugify(name), description: description.trim(),
                lifePhase: phase.trim(), emoji: category.emoji, coverColor: color,
              });
              toast(`${name.trim()} is live. You're its first admin.`);
              onClose();
            } catch { toast('Could not create the chapter.'); }
          }}>
          {create.isPending ? 'Creating…' : 'Create chapter'}
        </button>
      </div>
    </div>
  );
}

function GroupDetail({ group: groupStub, onClose }: { group: GroupRecord; onClose: () => void }) {
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
  const [draft, setDraft] = useState('');

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

          {members.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex' }}>
                {members.slice(0, 5).map((m, i) => (
                  <div key={m.id} style={{ marginLeft: i ? -10 : 0 }}>
                    <Avatar name={m.profile?.displayName ?? 'Member'} size={28} avatarUrl={m.profile?.avatarUrl}/>
                  </div>
                ))}
              </div>
              <span style={{ fontSize: '.78rem', color: 'var(--ink-3)' }}>{g.memberCount} in this chapter&apos;s group chat</span>
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

          {/* ── Admin: pending requests queue ── */}
          {isAdmin && pendingRequests && pendingRequests.length > 0 && (
            <div className="card" style={{ padding: '1rem 1.1rem', background: 'var(--ember-dim)', border: '1px solid var(--ember-bdr)', boxShadow: 'none', marginBottom: '1.2rem' }}>
              <div className="label-mono" style={{ marginBottom: '.7rem' }}>Pending requests ({pendingRequests.length})</div>
              {pendingRequests.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.6rem' }}>
                  <Avatar name={r.profile?.displayName ?? 'Someone'} size={32} avatarUrl={r.profile?.avatarUrl}/>
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
                  {(g.postCount ?? 0) > 0 ? `${g.postCount} message${g.postCount === 1 ? '' : 's'} — join to read` : 'Join to read the conversation'}
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

export default function GroupsPage() {
  const { data: groups, isLoading } = useGroups();
  const [open, setOpen] = useState<GroupRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState('');

  const list = (groups ?? []).filter(g =>
    g.name.toLowerCase().includes(q.toLowerCase()) ||
    g.lifePhase.toLowerCase().includes(q.toLowerCase())
  );

  const right = (
    <RPSection label="Suggested for your chapter">
      {(groups ?? []).slice(0, 3).map(g => (
        <button key={g.id} onClick={() => setOpen(g)} className="card"
          style={{ display: 'flex', width: '100%', textAlign: 'left', padding: '.8rem', marginBottom: '.55rem', boxShadow: 'var(--shadow-soft)', alignItems: 'center', gap: '.6rem' }}>
          <span style={{ width: 32, height: 32, borderRadius: '50%', background: g.coverColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={groupIcon(g.emoji)} size={16} stroke="#fff" sw={1.5}/></span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '.84rem' }}>{g.name}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--ink-3)' }}>{g.lifePhase}</div>
          </div>
        </button>
      ))}
    </RPSection>
  );

  return (
    <AppShell title="Chapter Groups" right={right}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 1.6rem 3rem' }}>
        <p style={{ color: 'var(--ink-3)', marginTop: '-.4rem', marginBottom: '1.2rem' }}>Life-phase rooms. Request to join — an admin lets you in.</p>
        <div style={{ position: 'relative', marginBottom: '1.4rem' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}><Icon name="search" size={17} stroke="var(--ink-4)"/></span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search chapters…"
            style={{ width: '100%', padding: '.8rem 1rem .8rem 2.6rem', borderRadius: 100, border: '1.5px solid var(--border-2)', background: 'var(--white)', fontSize: '.95rem' }}/>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner/></div>
        ) : list.length === 0 ? (
          <div className="card" style={{ background: 'linear-gradient(160deg, var(--slate-dim), var(--green-dim))', maxWidth: 480, margin: '0 auto' }}>
            <EmptyState variant="groups"
              title={q ? `No groups match "${q}".` : 'No chapter groups yet.'}
              body={q ? 'Try a different search, or start a new chapter.' : 'Chapter groups form around shared life phases. Start the first one.'}/>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.8rem' }}>
            {list.map(g => (
              <button key={g.id} onClick={() => setOpen(g)} className="card" style={{ display: 'block', textAlign: 'left', overflow: 'hidden', padding: 0 }}>
                <div style={{ height: 4, background: g.coverColor }}/>
                <div style={{ padding: '1.1rem 1.3rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', marginBottom: '.6rem' }}>
                    <span style={{ width: 42, height: 42, borderRadius: '50%', background: g.coverColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={groupIcon(g.emoji)} size={20} stroke="#fff" sw={1.4}/></span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{g.name}</div>
                      <span className="chip" style={{ background: 'var(--surf-high)', marginTop: 2 }}>{g.lifePhase}</span>
                    </div>
                    <span style={{ fontSize: '.78rem', color: 'var(--ink-4)' }}>{g.memberCount} members</span>
                  </div>
                  <p style={{ fontSize: '.88rem', color: 'var(--ink-2)', marginBottom: '.4rem' }}>{g.description}</p>
                  <span style={{ fontSize: '.82rem', color: 'var(--ember)', fontWeight: 500 }}>
                    {g.myRole ? 'Open →' : g.myRequestStatus === 'pending' ? 'Request pending' : 'Request to join →'}
                  </span>
                </div>
              </button>
            ))}
            <div onClick={() => setCreating(true)}
              style={{ borderRadius: 'var(--r-lg)', border: '1.5px dashed var(--border-2)', padding: '1.2rem', textAlign: 'center', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem', cursor: 'pointer' }}>
              <Icon name="plus" size={18} stroke="var(--ember)"/> Start a chapter
            </div>
          </div>
        )}
      </div>
      {open && <GroupDetail group={open} onClose={() => setOpen(null)}/>}
      {creating && <CreateGroupModal onClose={() => setCreating(false)}/>}
    </AppShell>
  );
}
