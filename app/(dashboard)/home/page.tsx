"use client";
import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { AppShell } from "@/components/layout/AppShell";
import { NotifBell } from "@/components/layout/TopBar";
import { RPSection } from "@/components/layout/RightPanel";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { PostCard } from "@/components/ui/RootsPostCard";
import { useUserStore } from "@/store/useUserStore";
import { useToastStore } from "@/store/useToastStore";
import { useSpaceStore } from "@/store/useSpaceStore";
import { usePosts, useCreatePost } from "@/hooks/usePosts";
import { useMySpaces } from "@/hooks/useSpaces";
import { useSuggestions } from "@/hooks/useUsers";
import {
  useInviteToBond,
  useSentBondInvitations,
} from "@/hooks/useBondInvitations";
import { useBonds } from "@/hooks/useBonds";
import type { BondRecord, GroupRecord } from "@/lib/api";
import { useGroups } from "@/hooks/useGroups";
import { spaceById, groupIcon } from "@/lib/data";
import { SpaceIcon } from "@/components/ui/SpaceIcon";
import type { Post, AuraKey } from "@/lib/types";
import {
  RootsComposer,
  type RootsComposerHandle,
} from "@/components/home/RootsComposer";
import { JustGrouvCard } from "@/components/home/JustGrouvCard";
import { OverlapCard } from "@/components/home/OverlapCard";
import { PostFab } from "@/components/home/PostFab";
import { useDisplayPosts } from "@/components/home/useDisplayPosts";
import styles from "./page.module.css";

export default function HomePage() {
  const router = useRouter();
  const { user } = useUserStore();
  const { toast } = useToastStore();
  const { uuidBySlug } = useSpaceStore();
  const [tab, setTab] = useState("all");
  const { data: mySpaces } = useMySpaces();
  const mySpaceSlugs = (mySpaces ?? [])
    .map((s) => s.space?.slug)
    .filter((s): s is string => !!s);
  const spaceUuid = tab !== "all" ? uuidBySlug(tab) : undefined;
  const { data: postRecords, isLoading: postsLoading } = usePosts(spaceUuid);
  const { data: bondsData } = useBonds();
  const { data: groupsData } = useGroups();
  const { data: suggestions } = useSuggestions();
  const inviteToBond = useInviteToBond();
  const [invited, setInvited] = useState<string[]>([]);
  const { data: sentInvitations } = useSentBondInvitations();
  const sentIds = new Set(
    (sentInvitations ?? [])
      .filter((i) => i.status === "pending")
      .map((i) => i.toUserId),
  );
  const createPost = useCreatePost();
  const composerRef = useRef<RootsComposerHandle>(null);
  const [fabVisible, setFabVisible] = useState(false);

  // Show the floating "+" once the feed's been scrolled down a bit — the
  // always-visible composer bar at the top covers the "just landed" case.
  React.useEffect(() => {
    const el = document.querySelector(".app-content");
    if (!el) return;
    const onScroll = () => setFabVisible(el.scrollTop > 240);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const posts = useDisplayPosts(postRecords);
  const shown = posts;

  // tabs: [id, name] — space icon rendered by SpaceIcon component
  const tabs = [
    ["all", "All"],
    ...mySpaceSlugs.map((id) => [id, spaceById(id).name]),
  ];

  const right = (
    <>
      <RPSection
        label="Suggested for you"
        action="View all →"
        onAction={() => router.push("/bonds")}
        suggested
      >
        {suggestions && suggestions.length > 0 ? (
          suggestions.slice(0, 4).map((s) => (
            <div key={s.id} className={styles.suggestionRow}>
              <Avatar
                name={s.displayName}
                size={38}
                avatarUrl={s.avatarUrl}
                aura={(s.aura as AuraKey | undefined) ?? undefined}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={styles.suggestionName}>{s.displayName}</div>
                <div className={styles.suggestionReason}>{s.reason}</div>
              </div>
              <button
                disabled={
                  invited.includes(s.id) ||
                  sentIds.has(s.id) ||
                  inviteToBond.isPending
                }
                onClick={async () => {
                  try {
                    await inviteToBond.mutateAsync({ recipientId: s.id });
                    setInvited((v) => [...v, s.id]);
                    toast(
                      `Bond invitation sent to ${s.displayName.split(" ")[0]}.`,
                    );
                  } catch {
                    toast("Could not send.");
                  }
                }}
                className={clsx("btn", "btn-ghost", styles.inviteBtn)}
              >
                {invited.includes(s.id) || sentIds.has(s.id)
                  ? "Sent"
                  : "Invite"}
              </button>
            </div>
          ))
        ) : (
          <p className={styles.emptyNote}>
            Open a space to meet people in the same chapter.
          </p>
        )}
      </RPSection>
      <RPSection
        label="Active Bonds"
        action="View all →"
        onAction={() => router.push("/bonds")}
      >
        {bondsData?.length ? (
          bondsData.slice(0, 3).map((b: BondRecord) => (
            <button
              key={b.id}
              onClick={() => router.push("/bonds")}
              className={styles.bondRow}
            >
              <Avatar
                name={b.otherUser?.displayName ?? "?"}
                size={38}
                avatarUrl={b.otherUser?.avatarUrl}
                aura={(b.otherUser?.aura as AuraKey | undefined) ?? undefined}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={styles.bondName}>
                  {b.otherUser?.displayName ?? "Bond"}
                </div>
                <div className={styles.bondDate}>
                  {new Date(b.formedAt).toLocaleDateString()}
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className={clsx("card", styles.emptyBonds)}>
            <EmptyState
              variant="bonds"
              compact
              title="No Bonds yet."
              body="Bonds form when you consistently show up for someone."
              action={{
                label: "See how Bonds work →",
                onClick: () => router.push("/bonds"),
              }}
            />
          </div>
        )}
      </RPSection>
      <RPSection
        label="Chapter Groups"
        action="Browse →"
        onAction={() => router.push("/groups")}
      >
        {groupsData && groupsData.length > 0 ? (
          groupsData.slice(0, 3).map((g: GroupRecord) => (
            <button
              key={g.id}
              onClick={() => router.push("/groups")}
              className={clsx("card", styles.groupCard)}
              style={{
                background: `color-mix(in srgb, ${g.coverColor ?? "var(--ember)"} 10%, var(--white))`,
                border: `1px solid color-mix(in srgb, ${g.coverColor ?? "var(--ember)"} 24%, transparent)`,
              }}
            >
              <div className={styles.groupHeader}>
                <span
                  className={styles.groupIcon}
                  style={{ background: g.coverColor ?? "var(--ember-soft)" }}
                >
                  <Icon
                    name={groupIcon(g.emoji)}
                    size={18}
                    stroke="#fff"
                    sw={1.5}
                  />
                </span>
                <div className={styles.groupName}>{g.name}</div>
              </div>
              <div className={styles.groupPhase}>{g.lifePhase}</div>
            </button>
          ))
        ) : (
          <div className={clsx("card", styles.emptyGroups)}>
            <EmptyState
              variant="groups"
              compact
              title="No chapter groups yet."
              body="Groups form around shared life phases. Start or join one."
              action={{
                label: "Browse groups →",
                onClick: () => router.push("/groups"),
              }}
            />
          </div>
        )}
      </RPSection>
    </>
  );

  const header = (
    <div className="app-shared-header">
      <div className="app-header-main">
        <div className={clsx("scroll", styles.tabsScroll)}>
          {tabs.map(([id, name]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={clsx(styles.tabBtn, tab === id && styles.active)}
            >
              {id !== "all" && <SpaceIcon spaceId={id} size={12} />} {name}
            </button>
          ))}
        </div>
      </div>
      <div className="app-header-side">
        <div
          className={styles.searchWrap}
          onClick={() => router.push("/search")}
        >
          <input
            readOnly
            placeholder="search............."
            className={styles.searchInput}
          />
          <span className={styles.searchIcon}>
            <Icon name="search" size={17} stroke="var(--ink-3)" />
          </span>
        </div>
        <NotifBell />
      </div>
    </div>
  );

  return (
    <AppShell
      title="Home"
      header={header}
      right={right}
      fab={
        <PostFab
          visible={fabVisible}
          onClick={() => composerRef.current?.open()}
        />
      }
    >
      <div className={styles.pageWrap}>
        <RootsComposer
          ref={composerRef}
          hideTrigger={!postsLoading && shown.length === 0}
          onPost={async (p) => {
            const spaceSlug = p.space ?? mySpaceSlugs[0] ?? "career";
            const spaceUuid2 = uuidBySlug(spaceSlug);
            if (!spaceUuid2) {
              toast("Open a space first to post.");
              throw new Error("No space open");
            }

            const extended = p as Post & {
              _mediaUrl?: string;
              _mediaType?: string;
            };
            const isJustGrouv = p.kind === "just_grouw";
            try {
              await createPost.mutateAsync({
                spaceId: spaceUuid2,
                kind: isJustGrouv ? "just_grouw" : "roots",
                ...(p.doing && { doing: p.doing }),
                ...(p.progress && {
                  progress: p.progress as Parameters<
                    typeof createPost.mutateAsync
                  >[0]["progress"],
                }),
                ...(p.honest && { honestThing: p.honest }),
                ...(isJustGrouv && p.caption && { body: p.caption }),
                ...(isJustGrouv &&
                  p.location && { authorLocation: p.location }),
                isAnonymous: p.anon,
                ...(extended._mediaUrl && { mediaUrl: extended._mediaUrl }),
                ...(extended._mediaType && {
                  mediaType: extended._mediaType as "image" | "video",
                }),
              });
              toast(
                isJustGrouv
                  ? "Posted to Grouv."
                  : "Rooted. Your circle will see it.",
              );
            } catch (err) {
              const msg = err instanceof Error ? err.message : "Unknown error";
              toast(`Could not post: ${msg}`);
              throw err;
            }
          }}
        />
        {postsLoading ? (
          <div className={styles.loadingWrap}>
            <Spinner size={24} />
          </div>
        ) : shown.length === 0 ? (
          <div className={styles.emptyFeedCard}>
            <EmptyState
              variant="feed"
              image="/media/home-empty.png"
              title="No Post"
              body={
                tab === "all"
                  ? "There are no post hosting for you yet, add a post to start engaging with others"
                  : "No posts in this space yet. Add a post to start engaging with others"
              }
              action={{
                label: "Root a Thought",
                icon: "plus",
                onClick: () => composerRef.current?.open(),
              }}
              actionVariant="link"
            />
          </div>
        ) : (
          shown.map((p, i) => (
            <React.Fragment key={p.id}>
              {p.kind === "just_grouw" ? (
                <JustGrouvCard post={p} myId={user.id} />
              ) : (
                <PostCard post={p} myId={user.id} />
              )}
              {i === 1 && tab === "all" && <OverlapCard />}
            </React.Fragment>
          ))
        )}

        {/* End-of-feed — the feed only ever shows the fresh 48h window, no infinite scroll */}
        {!postsLoading && shown.length > 0 && (
          <div className={styles.endOfFeedWrap}>
            {/* Thin rule with centred mark */}
            <div className={styles.endRuleRow}>
              <div className={styles.ruleLine} />
              <div className={styles.ruleDot} />
              <div className={styles.ruleLine} />
            </div>
            <p className={clsx("serif", styles.endTitle)}>
              You&apos;re caught up.
            </p>
            <p className={styles.endSub}>
              Go live something worth posting about.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
