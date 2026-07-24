'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { RPSection } from '@/components/layout/RightPanel';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { PostCard } from '@/components/ui/RootsPostCard';
import { useUserStore } from '@/store/useUserStore';
import { useToastStore } from '@/store/useToastStore';
import { useSpaceStore } from '@/store/useSpaceStore';
import { usePosts, useCreatePost } from '@/hooks/usePosts';
import { useMySpaces } from '@/hooks/useSpaces';
import { useSuggestions } from '@/hooks/useUsers';
import { useInviteToBond, useSentBondInvitations } from '@/hooks/useBondInvitations';
import { useBonds } from '@/hooks/useBonds';
import { useGroups } from '@/hooks/useGroups';
import { spaceById, groupIcon } from '@/lib/data';
import { SpaceIcon } from '@/components/ui/SpaceIcon';
import type { Post } from '@/lib/types';
import { RootsComposer } from '@/components/home/RootsComposer';
import { JustGrouvCard } from '@/components/home/JustGrouvCard';
import { OverlapCard } from '@/components/home/OverlapCard';
import { useDisplayPosts } from '@/components/home/useDisplayPosts';

export default function HomePage() {
  const router = useRouter();
  const { user } = useUserStore();
  const { toast } = useToastStore();
  const { uuidBySlug } = useSpaceStore();
  const [tab, setTab] = useState('all');

  // Live data
  // user.spaces is a one-time onboarding snapshot, never updated when a
  // space is opened/closed later — mySpaceSlugs is the real, live list.
  const { data: mySpaces } = useMySpaces();
  const mySpaceSlugs = (mySpaces ?? []).map(s => s.space?.slug).filter((s): s is string => !!s);
  const spaceUuid = tab !== 'all' ? uuidBySlug(tab) : undefined;
  const { data: postRecords, isLoading: postsLoading } = usePosts(spaceUuid);
  const { data: bondsData } = useBonds();
  const { data: groupsData } = useGroups();
  const { data: suggestions } = useSuggestions();
  const inviteToBond = useInviteToBond();
  const [invited, setInvited] = useState<string[]>([]);
  const { data: sentInvitations } = useSentBondInvitations();
  const sentIds = new Set((sentInvitations ?? []).filter(i => i.status === 'pending').map(i => i.toUserId));
  const createPost = useCreatePost();

  const posts = useDisplayPosts(postRecords);
  const shown = posts;

  // tabs: [id, name] — space icon rendered by SpaceIcon component
  const tabs = [['all', 'All'], ...mySpaceSlugs.map(id => [id, spaceById(id).name])];

  const right = (
    <>
      <RPSection label="Suggested for you" action="View all →" onAction={() => router.push('/bonds')} suggested>
        {suggestions && suggestions.length > 0 ? (
          suggestions.slice(0, 4).map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '.7rem', padding: '.5rem .4rem' }}>
              <Avatar name={s.displayName} size={38} avatarUrl={s.avatarUrl} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: '.86rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.displayName}</div>
                <div style={{ fontSize: '.7rem', color: 'var(--ember)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.reason}
                </div>
              </div>
              <button disabled={invited.includes(s.id) || sentIds.has(s.id) || inviteToBond.isPending}
                onClick={async () => {
                  try {
                    await inviteToBond.mutateAsync({ recipientId: s.id });
                    setInvited(v => [...v, s.id]);
                    toast(`Bond invitation sent to ${s.displayName.split(' ')[0]}.`);
                  } catch { toast('Could not send.'); }
                }}
                className="btn btn-ghost" style={{ padding: '.3rem .7rem', fontSize: '.72rem', flexShrink: 0 }}>
                {invited.includes(s.id) || sentIds.has(s.id) ? 'Sent' : 'Invite'}
              </button>
            </div>
          ))
        ) : (
          <p style={{ fontSize: '.82rem', color: 'var(--ink-4)', fontStyle: 'italic', padding: '.2rem 0' }}>
            Open a space to meet people in the same chapter.
          </p>
        )}
      </RPSection>
      <RPSection label="Active Bonds" action="View all →" onAction={() => router.push('/bonds')}>
        {bondsData?.length ? bondsData.slice(0, 3).map(b => (
          <button key={b.id} onClick={() => router.push('/bonds')}
            style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '.7rem', padding: '.55rem 0', textAlign: 'left' }}>
            <Avatar name={b.otherUser?.displayName ?? '?'} size={38} avatarUrl={b.otherUser?.avatarUrl} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: '.86rem' }}>{b.otherUser?.displayName ?? 'Bond'}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--ink-3)' }}>
                {new Date(b.formedAt).toLocaleDateString()}
              </div>
            </div>
          </button>
        )) : (
          <div className="card" style={{ background: 'linear-gradient(160deg, var(--ember-dim), var(--slate-dim))' }}>
            <EmptyState variant="bonds" compact
              title="No Bonds yet."
              body="Bonds form when you consistently show up for someone."
              action={{ label: 'See how Bonds work →', onClick: () => router.push('/bonds') }}
            />
          </div>
        )}
      </RPSection>
      <RPSection label="Chapter Groups" action="Browse →" onAction={() => router.push('/groups')}>
        {groupsData && groupsData.length > 0 ? groupsData.slice(0, 3).map(g => (
          <button key={g.id} onClick={() => router.push('/groups')} className="card"
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '.85rem', marginBottom: '.6rem', boxShadow: 'var(--shadow-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.45rem' }}>
              <span style={{ width: 34, height: 34, borderRadius: '50%', background: g.coverColor ?? 'var(--ember-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={groupIcon(g.emoji)} size={17} stroke="#fff" sw={1.5} /></span>
              <div style={{ fontWeight: 600, fontSize: '.86rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
            </div>
            <div style={{ fontSize: '.78rem', color: 'var(--ink-3)' }}>{g.lifePhase}</div>
          </button>
        )) : (
          <div className="card" style={{ background: 'linear-gradient(160deg, var(--slate-dim), var(--green-dim))' }}>
            <EmptyState variant="groups" compact
              title="No chapter groups yet."
              body="Groups form around shared life phases. Start or join one."
              action={{ label: 'Browse groups →', onClick: () => router.push('/groups') }}
            />
          </div>
        )}
      </RPSection>
    </>
  );

  return (
    <AppShell title="Home" right={right}>
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '0 1.6rem 3rem' }}>
        <div className="scroll" style={{ display: 'flex', gap: '.4rem', overflowX: 'auto', marginBottom: '1.1rem', borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          {tabs.map(([id, name]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              padding: '.55rem .85rem', fontSize: '.88rem', fontWeight: 500, whiteSpace: 'nowrap',
              color: tab === id ? 'var(--ember)' : 'var(--ink-3)',
              borderBottom: tab === id ? '2px solid var(--ember)' : '2px solid transparent', marginBottom: -1
            }}>
              {id !== 'all' && <SpaceIcon spaceId={id} size={12} />} {name}
            </button>
          ))}
        </div>
        <RootsComposer onPost={async (p) => {
          const spaceSlug = p.space ?? mySpaceSlugs[0] ?? 'career';
          const spaceUuid2 = uuidBySlug(spaceSlug);
          if (!spaceUuid2) { toast('Open a space first to post.'); throw new Error('No space open'); }

          const extended = p as Post & { _mediaUrl?: string; _mediaType?: string };
          const isJustGrouv = p.kind === 'just_grouw';
          try {
            await createPost.mutateAsync({
              spaceId: spaceUuid2,
              kind: isJustGrouv ? 'just_grouw' : 'roots',
              ...(p.doing && { doing: p.doing }),
              ...(p.progress && { progress: p.progress as Parameters<typeof createPost.mutateAsync>[0]['progress'] }),
              ...(p.honest && { honestThing: p.honest }),
              ...(isJustGrouv && p.caption && { body: p.caption }),
              ...(isJustGrouv && p.location && { authorLocation: p.location }),
              isAnonymous: p.anon,
              ...(extended._mediaUrl && { mediaUrl: extended._mediaUrl }),
              ...(extended._mediaType && { mediaType: extended._mediaType as 'image' | 'video' }),
            });
            toast(isJustGrouv ? 'Posted to Grouv.' : 'Rooted. Your circle will see it.');
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            toast(`Could not post: ${msg}`);
            throw err;
          }
        }} />
        {postsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
            <Spinner size={24} />
          </div>
        ) : shown.length === 0 ? (
          <div className="card" style={{ background: 'linear-gradient(160deg, var(--green-dim), var(--ember-dim))', maxWidth: 480, margin: '0 auto' }}>
            <EmptyState variant="feed"
              body={tab === 'all' ? 'Your circle hasn\'t posted yet. Root a thought above to get things going.' : 'No posts in this space yet. Be the first.'} />
          </div>
        ) : (
          shown.map((p, i) => (
            <React.Fragment key={p.id}>
              {p.kind === 'just_grouw'
                ? <JustGrouvCard post={p} myId={user.id} />
                : <PostCard post={p} myId={user.id} />}
              {i === 1 && tab === 'all' && <OverlapCard />}
            </React.Fragment>
          ))
        )}

        {/* End-of-feed — the feed only ever shows the fresh 48h window, no infinite scroll */}
        {!postsLoading && shown.length > 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem 1.5rem' }}>
            {/* Thin rule with centred mark */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--border-2)', flexShrink: 0 }} />
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            <p className="serif" style={{
              fontSize: '1.35rem', fontWeight: 600, fontStyle: 'italic',
              color: 'var(--ink)', marginBottom: '.5rem', lineHeight: 1.3,
            }}>
              You&apos;re caught up.
            </p>
            <p style={{
              fontSize: '.84rem', color: 'var(--ink-4)',
              letterSpacing: '.015em', lineHeight: 1.6,
            }}>
              Go live something worth posting about.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
