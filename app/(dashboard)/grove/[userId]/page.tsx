'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { STAGES, nowPhase } from '@/lib/data';
import { useToastStore } from '@/store/useToastStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUserStore } from '@/store/useUserStore';
import { groveApi, logApi, usersApi, spacesApi, postsApi } from '@/lib/api';
import { useInviteToBond, useSentBondInvitations } from '@/hooks/useBondInvitations';
import { useBonds } from '@/hooks/useBonds';
import { useTheme } from '@/hooks/useTheme';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuraKey } from '@/lib/types';
import { LogViewer } from '@/components/grove/LogViewer';
import { RING_COLORS, RINGS_BASE } from '@/components/grove/rings';
import { TopBar } from '@/components/grove/TopBar';
import { OrbitStage } from '@/components/grove/OrbitStage';
import { ChapterTimeline } from '@/components/grove/ChapterTimeline';
import { IdentityCard } from '@/components/grove/IdentityCard';
import { RingDetailPanel } from '@/components/grove/RingDetailPanel';
import { OverlapPanel } from '@/components/grove/OverlapPanel';
import { GroveLogPanel } from '@/components/grove/GroveLogPanel';
import { BondCTA } from '@/components/grove/BondCTA';
import { PostsSection } from '@/components/grove/PostsSection';

export default function GrovePage() {
  const router = useRouter();
  const params = useParams();
  const qc = useQueryClient();
  const { toast } = useToastStore();
  const { user: authUser } = useAuthStore();
  const { setUser } = useUserStore();
  const userId = params.userId as string;
  const isOwnProfile = !!authUser?.id && authUser.id === userId;
  const isDark = useTheme() === 'dark';
  const RINGS = RINGS_BASE.map(r => ({ ...r, color: RING_COLORS[r.key][isDark ? 'dark' : 'light'] }));

  const [active, setActive] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [showOverlap, setShowOverlap] = useState(false);
  const [sentLocal, setSent] = useState(false);
  const [viewLog, setViewLog] = useState(false);
  const [ambience, setAmbience] = useState(false);
  const [ci, setCi] = useState(0);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [editingRing, setEditingRing] = useState(false);
  const [ringDraft, setRingDraft] = useState('');
  const [savingRing, setSavingRing] = useState(false);

  const [viewportW, setViewportW] = useState(1024);
  useEffect(() => {
    const update = () => setViewportW(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const { data: grove, isLoading } = useQuery({
    queryKey: ['grove', userId],
    queryFn: () => groveApi.get(userId),
    staleTime: 5 * 60_000,
  });

  const primarySpaceId = grove?.activeSpaces?.[0]?.spaceId ?? null;
  const { data: logResult } = useQuery({
    queryKey: ['grove-log', userId, primarySpaceId],
    queryFn: () => logApi.userEntries(primarySpaceId!, userId),
    enabled: !!primarySpaceId,
    staleTime: 5 * 60_000,
  });
  const logEntries = logResult?.entries ?? [];
  const logVisible = logResult?.visible ?? true;

  const { data: userPosts, isLoading: postsLoading } = useQuery({
    queryKey: ['grove-posts', userId],
    queryFn: () => postsApi.byUser(userId),
    staleTime: 60_000,
  });

  const inviteToBond = useInviteToBond();
  const { data: sentInvitations } = useSentBondInvitations();
  const { data: bondsData } = useBonds();
  const alreadySent = sentInvitations?.some(i => i.toUserId === userId && i.status === 'pending') ?? false;
  const alreadyConnected = bondsData?.some(b => b.otherUser?.id === userId) ?? false;
  const sent = sentLocal || alreadySent;
  const phase = nowPhase();
  const STAGE = 540;
  // Mirrors the CSS `width:STAGE, maxWidth:92vw` the stage itself uses, so the
  // avatar can be sized as a safe fraction of the SAME effective width — 0.28
  // keeps it just inside the inner ring's radius (0.30) at every size, matching
  // the ~150px desktop avatar exactly at STAGE=540 while actually shrinking on
  // narrow viewports instead of staying fixed.
  const stageWidth = Math.min(STAGE, viewportW * 0.92);
  const avatarSize = Math.round(Math.min(150, stageWidth * 0.28));

  const name = grove?.profile?.displayName ?? '';
  const firstName = name.split(' ')[0] || '…';
  const realAura = (grove?.profile?.aura ?? undefined) as AuraKey | undefined;
  const avatarUrl = grove?.profile?.avatarUrl ?? null;
  const possessiveCap = isOwnProfile ? 'Your' : `${firstName}'s`;
  const hasntFilled = isOwnProfile ? "You haven't filled this in yet." : `${firstName} hasn't filled this in yet.`;
  const hasntPosted = isOwnProfile ? "You haven't posted any log entries yet." : `${firstName} hasn't posted any log entries yet.`;

  const uniqueSpaceIds = (
    grove?.activeSpaces.map(s => s.space?.slug).filter(Boolean) as string[] | undefined
    ?? ['career', 'learning', 'spiritual', 'adventure']
  ).filter((v, i, a) => a.indexOf(v) === i).slice(0, 4);

  const closedChapters = grove?.closedChapters ?? [];
  const chapter = closedChapters[Math.min(ci, Math.max(closedChapters.length - 1, 0))];

  const logForViewer = logEntries.slice(0, 10).map(e => ({
    date: new Date(e.entryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    mediaUrl: e.mediaUrl,
    body: e.body,
  }));

  const primarySpace = grove?.activeSpaces?.[0];
  const primarySpaceSlug = primarySpace?.space?.slug;
  const stageOptions = STAGES[primarySpaceSlug ?? 'career'] ?? STAGES.career;

  function getRingContent(key: 'inner' | 'middle' | 'outer'): string | null {
    if (!grove?.rings) return null;
    return { inner: grove.rings.struggling, middle: grove.rings.building, outer: grove.rings.openTo }[key] ?? null;
  }

  const startEditName = () => { setNameDraft(name); setEditingName(true); };
  const saveName = async () => {
    const value = nameDraft.trim();
    if (!value) return;
    setSavingName(true);
    try {
      await usersApi.updateMe({ displayName: value });
      setUser(u => ({ ...u, name: value }));
      qc.setQueryData(['grove', userId], (old: typeof grove) => old && { ...old, profile: { ...old.profile, displayName: value } });
      setEditingName(false);
      toast('Name updated.');
    } catch { toast('Could not save. Try again.'); }
    finally { setSavingName(false); }
  };

  const startEditRing = () => { setRingDraft(getRingContent(active as 'inner' | 'middle' | 'outer') ?? ''); setEditingRing(true); };
  const saveRing = async () => {
    const ring = RINGS.find(r => r.key === active);
    if (!ring) return;
    setSavingRing(true);
    try {
      if (ring.field === 'struggling') {
        await usersApi.updateMe({ honestTension: ringDraft.trim() || null });
      } else if (ring.field === 'openTo') {
        await usersApi.updateMe({ openTo: ringDraft.trim() || null });
      } else if (ring.field === 'building' && primarySpace) {
        await spacesApi.update(primarySpace.id, { stage: ringDraft || undefined });
      }
      await qc.invalidateQueries({ queryKey: ['grove', userId] });
      setEditingRing(false);
      toast('Updated.');
    } catch { toast('Could not save. Try again.'); }
    finally { setSavingRing(false); }
  };

  const selectRing = (key: string | null) => { setActive(key); setEditingRing(false); };

  return (
    <div className="scroll" style={{
      height: '100vh', width: '100vw', overflowY: 'auto', overflowX: 'hidden',
      background: 'radial-gradient(circle at 50% 38%, var(--surf-high), var(--bg) 70%)'
    }}>

      <TopBar isLoading={isLoading} isOwnProfile={isOwnProfile} firstName={firstName}
        showOverlap={showOverlap} setShowOverlap={setShowOverlap} onBack={() => router.back()} />

      <div style={{ display: 'flex', gap: '1.5rem', maxWidth: 1100, margin: '0 auto', padding: '0 clamp(1rem, 4vw, 1.6rem) 3rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Orbit stage */}
        <div style={{ flex: '1 1 540px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <OrbitStage stage={STAGE} rings={RINGS} active={active} hover={hover}
            onSelectRing={selectRing} onHover={setHover} uniqueSpaceIds={uniqueSpaceIds}
            name={name} avatarSize={avatarSize} phase={phase} realAura={realAura} avatarUrl={avatarUrl}
            ambience={ambience} setAmbience={setAmbience} possessiveCap={possessiveCap} />

          <ChapterTimeline phase={phase} closedChapters={closedChapters} ci={ci} setCi={setCi}
            chapter={chapter} onSelectRing={selectRing} />
        </div>

        {/* Right column */}
        <div style={{ flex: '1 1 300px', minWidth: 'min(280px, 100%)', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '.5rem' }}>

          <IdentityCard isLoading={isLoading} name={name} isOwnProfile={isOwnProfile} primarySpace={primarySpace}
            realAura={realAura} editingName={editingName} setEditingName={setEditingName}
            nameDraft={nameDraft} setNameDraft={setNameDraft} savingName={savingName}
            onStartEditName={startEditName} onSaveName={saveName} />

          <RingDetailPanel active={active} rings={RINGS} getRingContent={getRingContent} chapter={chapter}
            isOwnProfile={isOwnProfile} primarySpace={primarySpace}
            editingRing={editingRing} setEditingRing={setEditingRing}
            ringDraft={ringDraft} setRingDraft={setRingDraft} savingRing={savingRing}
            stageOptions={stageOptions} hasntFilled={hasntFilled} firstName={firstName}
            onStartEditRing={startEditRing} onSaveRing={saveRing} onSelectRing={selectRing} />

          {showOverlap && <OverlapPanel activeSpaces={grove?.activeSpaces} />}

          <GroveLogPanel possessiveCap={possessiveCap} entries={logForViewer} isLoading={isLoading}
            logVisible={logVisible} hasntPosted={hasntPosted} isOwnProfile={isOwnProfile}
            onViewLog={() => setViewLog(true)} />

          <BondCTA isOwnProfile={isOwnProfile} alreadyConnected={alreadyConnected} sent={sent} setSent={setSent}
            inviteToBond={inviteToBond} userId={userId} firstName={firstName} />
        </div>
      </div>

      <PostsSection possessiveCap={possessiveCap} posts={userPosts} isLoading={postsLoading}
        isOwnProfile={isOwnProfile} firstName={firstName} />

      {viewLog && <LogViewer title={`${possessiveCap} Grouv Log`} entries={logForViewer} onClose={() => setViewLog(false)} />}
    </div>
  );
}
