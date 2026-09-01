"use client";
import { useState } from "react";
import clsx from "clsx";
import { AppShell } from "@/components/layout/AppShell";
import { RPSection } from "@/components/layout/RightPanel";
import { FeatureGate } from "@/components/layout/FeatureGate";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StageChip } from "@/components/ui/StageChip";
import { useUserStore } from "@/store/useUserStore";
import { useToastStore } from "@/store/useToastStore";
import { useSpaceStore } from "@/store/useSpaceStore";
import { spaceById } from "@/lib/data";
import { postsApi, usersApi } from "@/lib/api";
import { useBonds } from "@/hooks/useBonds";
import { useMySpaces } from "@/hooks/useSpaces";
import {
  useMyLogEntries,
  useAddLogEntry,
  useUpdateLogEntry,
  useLogSettings,
  useUpdateLogSettings,
  useCircleLogs,
} from "@/hooks/useLog";
import type { CircleLogUser } from "@/lib/api";
import type { LogStyle } from "@/lib/types";
import type { LogEntry, OtherLog } from "@/components/log/types";
import { MomentsEntryCard } from "@/components/log/MomentsEntryCard";
import { MemoriesGallery } from "@/components/log/MemoriesGallery";
import { Artifact } from "@/components/log/Artifact";
import { BondReveal } from "@/components/log/BondReveal";
import { LogViewer } from "@/components/log/LogViewer";
import { CircleLogFeed } from "@/components/log/CircleLogFeed";
import { apiToLocal, buildStrip } from "@/components/log/mappers";
import styles from "./page.module.css";

const LOG_PROMPTS: Record<string, string> = {
  career: "What did you build today, even a little?",
  creative: "What did you make today, finished or not?",
  health: "What did your body ask of you today?",
  wealth: "What did today cost, and what did it buy?",
  spiritual: "Where did you feel still today?",
  learning: "What did you not understand today?",
  adventure: "What did today look like that yesterday didn't?",
  relation: "Who did you actually show up for today?",
};

const LOG_VIS = [
  ["public", "Everyone", "Anyone on Grouv in your spaces can scroll your log"],
  ["circle", "My circle", "People you're connected with can see it"],
  ["bonds", "Bonds only", "Only your Bonds can open your log"],
  ["private", "Private", "Just you. A closed door."],
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
  const mySpaceSlugs = (mySpaces ?? [])
    .map((s) => s.space?.slug)
    .filter((s): s is string => !!s);
  const userSpaces = mySpaceSlugs.length ? mySpaceSlugs : ["creative"];
  const [spaceSlug, setSpaceSlug] = useState(userSpaces[0]);
  const activeSpaceSlug = userSpaces.includes(spaceSlug)
    ? spaceSlug
    : userSpaces[0];
  const spaceUuid = uuidBySlug(activeSpaceSlug);
  const space = spaceById(activeSpaceSlug);
  const phase = user.stageLabels?.[activeSpaceSlug] ?? "Mid-project";
  const prompt = LOG_PROMPTS[activeSpaceSlug] ?? "What was true today?";

  // ── Live data ──
  const { data: bondsData } = useBonds();
  const { data: apiEntries, isLoading: entriesLoading } =
    useMyLogEntries(spaceUuid);
  const addLogEntry = useAddLogEntry(spaceUuid);
  const updateLogEntry = useUpdateLogEntry(spaceUuid);
  const { data: settingsData } = useLogSettings(spaceUuid);
  const updateSettings = useUpdateLogSettings(spaceUuid);
  const { data: circleData } = useCircleLogs();

  // ── Derived state ──
  const entries: LogEntry[] = apiEntries ? buildStrip(apiEntries) : [];
  const today = new Date().toISOString().slice(0, 10);
  const todayApiEntry = apiEntries?.find((e) => e.entryDate === today) ?? null;
  const todayEntry: LogEntry | null = todayApiEntry
    ? apiToLocal(todayApiEntry)
    : null;
  const posted = !!todayApiEntry;
  const vis = settingsData?.visibility ?? "circle";
  const visMeta = LOG_VIS.find((v) => v[0] === vis) ?? LOG_VIS[1];
  const filled = entries.filter((e) => !e.missed);
  const logStyle: LogStyle = user.logStyle ?? "A";

  // Map circle data to OtherLog shape
  const circleUsers: OtherLog[] = (circleData ?? []).map(
    (u: CircleLogUser) => ({
      name: u.name,
      avatarUrl: u.avatarUrl,
      aura: u.aura,
      space: activeSpaceSlug,
      phase,
      vis: "public",
      when: u.entries[0]
        ? new Date(u.entries[0].createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "",
      style: (["A", "B", "C"].includes(u.logStyle)
        ? u.logStyle
        : "A") as LogStyle,
      entries: u.entries.map((e) => apiToLocal(e)),
    }),
  );

  const [mode, setMode] = useState<"solo" | "bond">("solo");
  const [artifact, setArtifact] = useState(false);
  const [viewLog, setViewLog] = useState<OtherLog | null>(null);
  const [visMenu, setVisMenu] = useState(false);

  const addEntry = async (text: string, file?: File) => {
    if (!spaceUuid) {
      toast("Open a space first.");
      return;
    }
    try {
      let mediaUrl: string | undefined;
      let mediaType: string | undefined;
      if (file) {
        const result = await postsApi.uploadViaProxy(file);
        mediaUrl = result.mediaUrl;
        mediaType = result.mediaType;
      }
      await addLogEntry.mutateAsync({ body: text, mediaUrl, mediaType });
      toast("Moment added to your Log.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("409"))
        toast("You already posted today. Come back tomorrow.");
      else toast("Could not save. Try again.");
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
      await updateLogEntry.mutateAsync({
        id: entryId,
        data: { body: text, mediaUrl, mediaType },
      });
      toast("Today's moment updated.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("409"))
        toast(
          "That entry is sealed, it can only be edited on the day it was posted.",
        );
      else toast("Could not save. Try again.");
    }
  };

  const changeLogStyle = (s: LogStyle) => {
    setUser((u) => ({ ...u, logStyle: s }));
    usersApi.updateMe({ logStyle: s }).catch(() => {});
  };

  const right = (
    <>
      <RPSection label="This log">
        <div className={clsx("card", styles.thisLogCard)}>
          <div className={styles.thisLogHeader}>
            <span
              className={styles.spaceIconCircle}
              style={{ background: space.color }}
            >
              <Icon name={space.icon} size={18} stroke={space.ink} sw={1.6} />
            </span>
            <div>
              <div className={styles.spaceName}>{space.name}</div>
              <div className={styles.spacePhase}>{phase}</div>
            </div>
          </div>
          <ProgressBar
            value={
              entries.length
                ? Math.round((filled.length / entries.length) * 100)
                : 0
            }
          />
          <div className={styles.progressNote}>
            {entriesLoading
              ? "Loading…"
              : `${filled.length} of ${entries.length} days logged`}
          </div>
        </div>
      </RPSection>

      <RPSection label="Who can see your log">
        <div className={styles.visMenuWrap}>
          <button
            onClick={() => setVisMenu((m) => !m)}
            className={clsx("card", styles.visTrigger)}
          >
            <Icon
              name={vis === "private" ? "lock" : "eye"}
              size={17}
              stroke="var(--ember)"
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={styles.visTitle}>{visMeta[1]}</div>
              <div className={styles.visDesc}>{visMeta[2]}</div>
            </div>
            <Icon name="dots" size={16} stroke="var(--ink-4)" />
          </button>
          {visMenu && (
            <div className={clsx("card", styles.visMenu)}>
              {LOG_VIS.map(([id, l, d]) => (
                <button
                  key={id}
                  onClick={async () => {
                    setVisMenu(false);
                    try {
                      await updateSettings.mutateAsync(
                        id as "public" | "circle" | "bonds" | "private",
                      );
                      toast(`Log visibility: ${l}`);
                    } catch {
                      toast("Could not update.");
                    }
                  }}
                  className={clsx(
                    styles.visOption,
                    vis === id && styles.active,
                  )}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      className={clsx(
                        styles.visOptionTitle,
                        vis === id && styles.active,
                      )}
                    >
                      {l}
                    </div>
                    <div className={styles.visOptionDesc}>{d}</div>
                  </div>
                  {vis === id && (
                    <Icon name="check" size={15} stroke="var(--ember)" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </RPSection>

      <RPSection label="The ritual">
        <p className={styles.ritualText}>
          One photo. One honest line. Every day you&apos;re in this chapter.
          Choose how you view your past moments, and who else gets to scroll
          them.
        </p>
      </RPSection>
    </>
  );

  return (
    <AppShell title="Grouv Log" right={right}>
      <div className={styles.page}>
        {/* Per-chapter log switcher — each space keeps its own separate log archive */}
        {userSpaces.length > 1 && (
          <div className={clsx("scroll", styles.spaceSwitcher)}>
            {userSpaces.map((id) => {
              const s = spaceById(id);
              const on = id === activeSpaceSlug;
              return (
                <button
                  key={id}
                  onClick={() => setSpaceSlug(id)}
                  className={clsx(
                    "chip",
                    styles.spaceChip,
                    on && styles.active,
                  )}
                >
                  <Icon
                    name={s.icon}
                    size={13}
                    stroke={on ? "#fff" : s.ink}
                    sw={1.6}
                  />{" "}
                  {s.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Phase chip + mode toggle */}
        <div className={styles.metaRow}>
          <div className={styles.metaLeft}>
            <StageChip space={activeSpaceSlug} stage={phase} />
            <span className={clsx("chip", styles.visBadge)}>
              <Icon
                name={vis === "private" ? "lock" : "eye"}
                size={11}
                stroke="var(--ink-3)"
                sw={1.8}
              />{" "}
              {visMeta[1]}
            </span>
          </div>
          <div className={styles.modeSwitcher}>
            {(
              [
                ["solo", "Solo"],
                ["bond", "Bond Log"],
              ] as ["solo" | "bond", string][]
            ).map(([id, l]) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={clsx(styles.modeBtn, mode === id && styles.active)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Daily entry / Bond reveal */}
        <div className={styles.entrySection}>
          {mode === "solo" ? (
            <MomentsEntryCard
              space={space}
              prompt={prompt}
              onPost={addEntry}
              onEdit={editEntry}
              posted={posted}
              todayEntry={todayEntry}
              submitting={addLogEntry.isPending || updateLogEntry.isPending}
            />
          ) : (
            <BondReveal
              bonds={(bondsData ?? [])
                .filter((b) => b.status === "bond")
                .map((b) => ({
                  id: b.id,
                  name: b.otherUser?.displayName ?? "Bond",
                  avatarUrl: b.otherUser?.avatarUrl,
                }))}
            />
          )}
        </div>

        {/* Memories gallery */}
        <div className={styles.gallerySection}>
          <MemoriesGallery
            entries={entries}
            space={space}
            style={logStyle}
            onStyleChange={changeLogStyle}
          />
        </div>

        {/* Artifact access */}
        <button
          onClick={() => setArtifact(true)}
          className={styles.artifactBtn}
        >
          <Icon name="lock" size={18} stroke="var(--ember-deep)" />
          <div style={{ flex: 1 }}>
            <div className={styles.artifactTitle}>The Artifact</div>
            <div className={styles.artifactDesc}>
              Unlocks when you close this chapter, your whole log, stitched into
              one piece.
            </div>
          </div>
          <span className={styles.artifactCta}>Preview →</span>
        </button>

        {/* Circle logs */}
        {circleUsers.length > 0 && (
          <CircleLogFeed logs={circleUsers} onOpen={setViewLog} />
        )}
      </div>

      {artifact && (
        <Artifact
          spaceId={activeSpaceSlug}
          phase={phase}
          entries={entries}
          onClose={() => setArtifact(false)}
        />
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
