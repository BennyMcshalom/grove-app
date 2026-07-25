'use client';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { RPSection } from '@/components/layout/RightPanel';
import { FeatureGate } from '@/components/layout/FeatureGate';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StageChip } from '@/components/ui/StageChip';
import { useUserStore } from '@/store/useUserStore';
import { useToastStore } from '@/store/useToastStore';
import { useSpaceStore } from '@/store/useSpaceStore';
import { spaceById } from '@/lib/data';
import { postsApi, usersApi } from '@/lib/api';
import { useBonds } from '@/hooks/useBonds';
import { useMySpaces } from '@/hooks/useSpaces';
import { useMyLogEntries, useAddLogEntry, useUpdateLogEntry, useLogSettings, useUpdateLogSettings, useCircleLogs } from '@/hooks/useLog';
import type { CircleLogUser } from '@/lib/api';
import type { LogStyle } from '@/lib/types';
import type { LogEntry, OtherLog } from '@/components/log/types';
import { MomentsEntryCard } from '@/components/log/MomentsEntryCard';
import { MemoriesGallery } from '@/components/log/MemoriesGallery';
import { Artifact } from '@/components/log/Artifact';
import { BondReveal } from '@/components/log/BondReveal';
import { LogViewer } from '@/components/log/LogViewer';
import { CircleLogFeed } from '@/components/log/CircleLogFeed';
import { apiToLocal, buildStrip } from '@/components/log/mappers';

const LOG_PROMPTS: Record<string, string> = {
  career: 'What did you build today, even a little?',
  creative: 'What did you make today, finished or not?',
  health: 'What did your body ask of you today?',
  wealth: 'What did today cost, and what did it buy?',
  spiritual: 'Where did you feel still today?',
  learning: 'What did you not understand today?',
  adventure: 'What did today look like that yesterday didn\'t?',
  relation: 'Who did you actually show up for today?',
};

const LOG_VIS = [
  ['public', 'Everyone', 'Anyone on Grouv in your spaces can scroll your log'],
  ['circle', 'My circle', 'People you\'re connected with can see it'],
  ['bonds', 'Bonds only', 'Only your Bonds can open your log'],
  ['private', 'Private', 'Just you. A closed door.'],
];

// ── Main page ─────────────────────────────────────────────────────
function LogPageInner() {
  const { user, setUser } = useUserStore();
  const { toast } = useToastStore();
  const { uuidBySlug } = useSpaceStore();

  // user.spaces is a one-time onboarding snapshot, never updated when a
  // space is opened/closed later — a closed chapter's tab (and its log
  // entries) would otherwise keep showing here forever. mySpaceSlugs is the
  // real, live list; closed chapters live in the Archive instead.
  const { data: mySpaces } = useMySpaces();
  const mySpaceSlugs = (mySpaces ?? []).map(s => s.space?.slug).filter((s): s is string => !!s);
  const userSpaces = mySpaceSlugs.length ? mySpaceSlugs : ['creative'];
  const [spaceSlug, setSpaceSlug] = useState(userSpaces[0]);
  const activeSpaceSlug = userSpaces.includes(spaceSlug) ? spaceSlug : userSpaces[0];
  const spaceUuid = uuidBySlug(activeSpaceSlug);
  const space = spaceById(activeSpaceSlug);
  const phase = user.stageLabels?.[activeSpaceSlug] ?? 'Mid-project';
  const prompt = LOG_PROMPTS[activeSpaceSlug] ?? 'What was true today?';

  // ── Live data ──
  const { data: bondsData } = useBonds();
  const { data: apiEntries, isLoading: entriesLoading } = useMyLogEntries(spaceUuid);
  const addLogEntry = useAddLogEntry(spaceUuid);
  const updateLogEntry = useUpdateLogEntry(spaceUuid);
  const { data: settingsData } = useLogSettings(spaceUuid);
  const updateSettings = useUpdateLogSettings(spaceUuid);
  const { data: circleData } = useCircleLogs();

  // ── Derived state ──
  const entries: LogEntry[] = apiEntries ? buildStrip(apiEntries) : [];
  const today = new Date().toISOString().slice(0, 10);
  const todayApiEntry = apiEntries?.find(e => e.entryDate === today) ?? null;
  const todayEntry: LogEntry | null = todayApiEntry ? apiToLocal(todayApiEntry) : null;
  const posted = !!todayApiEntry;
  const vis = settingsData?.visibility ?? 'circle';
  const visMeta = LOG_VIS.find(v => v[0] === vis) ?? LOG_VIS[1];
  const filled = entries.filter(e => !e.missed);
  const logStyle: LogStyle = user.logStyle ?? 'A';

  // Map circle data to OtherLog shape
  const circleUsers: OtherLog[] = (circleData ?? []).map((u: CircleLogUser) => ({
    name: u.name,
    avatarUrl: u.avatarUrl,
    aura: u.aura,
    space: activeSpaceSlug,
    phase,
    vis: 'public',
    when: u.entries[0]
      ? new Date(u.entries[0].createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '',
    style: (['A', 'B', 'C'].includes(u.logStyle) ? u.logStyle : 'A') as LogStyle,
    entries: u.entries.map(e => apiToLocal(e)),
  }));

  const [mode, setMode] = useState<'solo' | 'bond'>('solo');
  const [artifact, setArtifact] = useState(false);
  const [viewLog, setViewLog] = useState<OtherLog | null>(null);
  const [visMenu, setVisMenu] = useState(false);

  const addEntry = async (text: string, file?: File) => {
    if (!spaceUuid) { toast('Open a space first.'); return; }
    try {
      let mediaUrl: string | undefined;
      let mediaType: string | undefined;
      if (file) {
        const result = await postsApi.uploadViaProxy(file);
        mediaUrl = result.mediaUrl;
        mediaType = result.mediaType;
      }
      await addLogEntry.mutateAsync({ body: text, mediaUrl, mediaType });
      toast('Moment added to your Log.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('409')) toast('You already posted today. Come back tomorrow.');
      else toast('Could not save. Try again.');
    }
  };

  const editEntry = async (entryId: string, text: string, file?: File) => {
    try {
      let mediaUrl: string | undefined;
      let mediaType: string | undefined;
      if (file) {
        const result = await postsApi.uploadViaProxy(file);
        mediaUrl = result.mediaUrl;
        mediaType = result.mediaType;
      }
      await updateLogEntry.mutateAsync({ id: entryId, data: { body: text, mediaUrl, mediaType } });
      toast('Today\'s moment updated.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('409')) toast('That entry is sealed, it can only be edited on the day it was posted.');
      else toast('Could not save. Try again.');
    }
  };

  const changeLogStyle = (s: LogStyle) => {
    setUser(u => ({ ...u, logStyle: s }));
    usersApi.updateMe({ logStyle: s }).catch(() => { });
  };

  const right = (
    <>
      <RPSection label="This log">
        <div className="card" style={{ padding: '1rem 1.1rem', boxShadow: 'var(--shadow-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.7rem' }}>
            <span style={{
              width: 38, height: 38, borderRadius: '50%', background: space.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Icon name={space.icon} size={18} stroke={space.ink} sw={1.6} />
            </span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{space.name}</div>
              <div style={{ fontSize: '.74rem', color: 'var(--ink-3)' }}>{phase}</div>
            </div>
          </div>
          <ProgressBar value={entries.length ? Math.round(filled.length / entries.length * 100) : 0} />
          <div style={{ fontSize: '.74rem', color: 'var(--ink-3)', marginTop: '.5rem' }}>
            {entriesLoading ? 'Loading…' : `${filled.length} of ${entries.length} days logged`}
          </div>
        </div>
      </RPSection>

      <RPSection label="Who can see your log">
        <div style={{ position: 'relative' }}>
          <button onClick={() => setVisMenu(m => !m)} className="card"
            style={{
              display: 'flex', width: '100%', alignItems: 'center', gap: '.6rem',
              padding: '.8rem .9rem', boxShadow: 'var(--shadow-soft)', textAlign: 'left'
            }}>
            <Icon name={vis === 'private' ? 'lock' : 'eye'} size={17} stroke="var(--ember)" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '.86rem' }}>{visMeta[1]}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--ink-3)' }}>{visMeta[2]}</div>
            </div>
            <Icon name="dots" size={16} stroke="var(--ink-4)" />
          </button>
          {visMenu && (
            <div className="card" style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
              zIndex: 20, padding: '.4rem', boxShadow: 'var(--shadow-lg)'
            }}>
              {LOG_VIS.map(([id, l, d]) => (
                <button key={id}
                  onClick={async () => {
                    setVisMenu(false);
                    try {
                      await updateSettings.mutateAsync(id as 'public' | 'circle' | 'bonds' | 'private');
                      toast(`Log visibility: ${l}`);
                    } catch { toast('Could not update.'); }
                  }}
                  style={{
                    display: 'flex', width: '100%', textAlign: 'left', gap: '.5rem',
                    alignItems: 'center', padding: '.6rem .65rem', borderRadius: 'var(--r-sm)',
                    background: vis === id ? 'var(--ember-dim)' : 'transparent'
                  }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: '.84rem', color: vis === id ? 'var(--ember)' : 'var(--ink)' }}>{l}</div>
                    <div style={{ fontSize: '.7rem', color: 'var(--ink-3)' }}>{d}</div>
                  </div>
                  {vis === id && <Icon name="check" size={15} stroke="var(--ember)" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </RPSection>

      <RPSection label="The ritual">
        <p style={{ fontSize: '.84rem', color: 'var(--ink-2)', lineHeight: 1.6 }}>
          One photo. One honest line. Every day you're in this chapter. Choose how you view your past moments,
          and who else gets to scroll them.
        </p>
      </RPSection>
    </>
  );

  return (
    <AppShell title="Grouv Log" right={right}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 1.6rem 3rem' }}>

        {/* Per-chapter log switcher — each space keeps its own separate log archive */}
        {userSpaces.length > 1 && (
          <div className="scroll" style={{ display: 'flex', gap: '.5rem', overflowX: 'auto', marginBottom: '1.1rem', paddingBottom: 2 }}>
            {userSpaces.map(id => {
              const s = spaceById(id);
              const on = id === activeSpaceSlug;
              return (
                <button key={id} onClick={() => setSpaceSlug(id)} className="chip"
                  style={{
                    cursor: 'pointer', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '.4rem',
                    padding: '.5rem .95rem', background: on ? 'var(--ember)' : 'var(--surf-high)', color: on ? '#fff' : 'var(--ink-2)', fontWeight: 500
                  }}>
                  <Icon name={s.icon} size={13} stroke={on ? '#fff' : s.ink} sw={1.6} /> {s.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Phase chip + mode toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '1rem', marginTop: '-.3rem', marginBottom: '1.4rem', flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
            <StageChip space={activeSpaceSlug} stage={phase} />
            <span className="chip" style={{ background: 'var(--surf-high)', fontSize: '.7rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name={vis === 'private' ? 'lock' : 'eye'} size={11} stroke="var(--ink-3)" sw={1.8} /> {visMeta[1]}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--surf-high)', borderRadius: 100, padding: 3 }}>
            {([['solo', 'Solo'], ['bond', 'Bond Log']] as ['solo' | 'bond', string][]).map(([id, l]) => (
              <button key={id} onClick={() => setMode(id)}
                style={{
                  padding: '.4rem .9rem', borderRadius: 100, fontSize: '.82rem', fontWeight: 500,
                  background: mode === id ? 'var(--white)' : 'transparent',
                  color: mode === id ? 'var(--ember)' : 'var(--ink-3)',
                  boxShadow: mode === id ? 'var(--shadow-soft)' : 'none'
                }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Daily entry / Bond reveal */}
        <div style={{ marginBottom: '2rem' }}>
          {mode === 'solo'
            ? <MomentsEntryCard space={space} prompt={prompt} onPost={addEntry} onEdit={editEntry}
              posted={posted} todayEntry={todayEntry} submitting={addLogEntry.isPending || updateLogEntry.isPending} />
            : <BondReveal bonds={(bondsData ?? [])
              .filter(b => b.status === 'bond')
              .map(b => ({ id: b.id, name: b.otherUser?.displayName ?? 'Bond', avatarUrl: b.otherUser?.avatarUrl }))} />}
        </div>

        {/* Memories gallery */}
        <div style={{ marginBottom: '1.4rem' }}>
          <MemoriesGallery entries={entries} space={space} style={logStyle} onStyleChange={changeLogStyle} />
        </div>

        {/* Artifact access */}
        <button onClick={() => setArtifact(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '.7rem', width: '100%',
            padding: '1rem 1.2rem', marginBottom: '2.2rem', borderRadius: 'var(--r-lg)',
            border: '1.5px solid var(--ember-bdr)', background: 'var(--ember-dim)', textAlign: 'left'
          }}>
          <Icon name="lock" size={18} stroke="var(--ember-deep)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '.9rem', color: 'var(--ember-deep)' }}>The Artifact</div>
            <div style={{ fontSize: '.76rem', color: 'var(--ink-3)' }}>
              Unlocks when you close this chapter, your whole log, stitched into one piece.
            </div>
          </div>
          <span style={{ fontSize: '.8rem', color: 'var(--ember)', fontWeight: 500 }}>Preview →</span>
        </button>

        {/* Circle logs */}
        {circleUsers.length > 0 && <CircleLogFeed logs={circleUsers} onOpen={setViewLog} />}
      </div>

      {artifact && (
        <Artifact spaceId={activeSpaceSlug} phase={phase} entries={entries} onClose={() => setArtifact(false)} />
      )}
      {viewLog && <LogViewer log={viewLog} onClose={() => setViewLog(null)} />}
    </AppShell>
  );
}

export default function LogPage() {
  return (
    <FeatureGate flagKey="nav_log">
      <LogPageInner />
    </FeatureGate>
  );
}
