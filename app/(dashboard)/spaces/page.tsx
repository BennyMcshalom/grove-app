"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { NotifBell } from "@/components/layout/TopBar";
import { RPSection } from "@/components/layout/RightPanel";
import { FeatureGate } from "@/components/layout/FeatureGate";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToastStore } from "@/store/useToastStore";
import { useSpaceStore } from "@/store/useSpaceStore";
import { useMySpaces, useOpenSpace } from "@/hooks/useSpaces";
import { useGroups } from "@/hooks/useGroups";
import { useSuggestions } from "@/hooks/useUsers";
import {
  useInviteToBond,
  useSentBondInvitations,
} from "@/hooks/useBondInvitations";
import { useBonds } from "@/hooks/useBonds";
import type { BondRecord, GroupRecord } from "@/lib/api";
import { SPACES, spaceById, groupIcon } from "@/lib/data";
import { SpaceCard } from "@/components/spaces-list/SpaceCard";
import { SpaceDirectoryCard } from "@/components/spaces-list/SpaceDirectoryCard";

function SpacesPageInner() {
  const router = useRouter();
  const { toast } = useToastStore();
  const { uuidBySlug } = useSpaceStore();
  const [opening, setOpening] = useState<string | null>(null); // space id being named
  const [chapter, setChapter] = useState("");

  const { data: mySpaces, isLoading } = useMySpaces();
  const { data: groupsData } = useGroups();
  const { data: bondsData } = useBonds();
  const { data: suggestions } = useSuggestions();
  const inviteToBond = useInviteToBond();
  const [invited, setInvited] = useState<string[]>([]);
  const { data: sentInvitations } = useSentBondInvitations();
  const sentIds = new Set(
    (sentInvitations ?? [])
      .filter((i) => i.status === "pending")
      .map((i) => i.toUserId),
  );
  const openSpace = useOpenSpace();

  const activeSlots = mySpaces?.filter((s) => !s.closedAt) ?? [];
  // Spaces not yet opened by this user
  const activeSlugs = activeSlots
    .map((s) => s.space?.slug ?? "")
    .filter(Boolean);
  const dirSpaces = SPACES.filter((s) => !activeSlugs.includes(s.id));

  const openChapter = async (slug: string, label: string) => {
    const uuid = uuidBySlug(slug);
    if (!uuid) {
      toast("Space not available right now.");
      return;
    }
    if (activeSlots.length >= 4) {
      toast("You can have at most 4 open chapters.");
      return;
    }
    try {
      await openSpace.mutateAsync({
        spaceId: uuid,
        stage: label.trim() || undefined,
        isPrimary: activeSlots.length === 0,
      });
      setOpening(null);
      setChapter("");
      toast(`You opened the ${spaceById(slug).name} chapter.`);
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Could not open space.");
    }
  };

  const right = (
    <>
      <RPSection
        label="Your Circle"
        action="View all →"
        onAction={() => router.push("/bonds")}
      >
        {suggestions && suggestions.length > 0 ? (
          suggestions.slice(0, 4).map((s) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: ".7rem",
                padding: ".5rem .4rem",
              }}
            >
              <Avatar name={s.displayName} size={38} avatarUrl={s.avatarUrl} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 500,
                    fontSize: ".86rem",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.displayName}
                </div>
                <span
                  className="chip"
                  style={{
                    background: "var(--surf-high)",
                    marginTop: "2px",
                    fontSize: ".7rem",
                  }}
                >
                  <Icon
                    name="sprout"
                    size={11}
                    stroke="var(--ink-3)"
                    sw={1.6}
                  />
                  {s.reason}
                </span>
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
                className="btn btn-ghost"
                style={{
                  padding: ".3rem .7rem",
                  fontSize: ".72rem",
                  flexShrink: 0,
                }}
              >
                {invited.includes(s.id) || sentIds.has(s.id)
                  ? "Sent"
                  : "Invite"}
              </button>
            </div>
          ))
        ) : (
          <p
            style={{
              fontSize: ".82rem",
              color: "var(--ink-4)",
              fontStyle: "italic",
              padding: ".2rem 0",
            }}
          >
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
              style={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                gap: ".7rem",
                padding: ".55rem 0",
                textAlign: "left",
              }}
            >
              <Avatar
                name={b.otherUser?.displayName ?? "?"}
                size={38}
                avatarUrl={b.otherUser?.avatarUrl}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: ".86rem" }}>
                  {b.otherUser?.displayName ?? "Bond"}
                </div>
                <div style={{ fontSize: ".72rem", color: "var(--ink-3)" }}>
                  {new Date(b.formedAt).toLocaleDateString()}
                </div>
              </div>
            </button>
          ))
        ) : (
          <div
            className="card"
            style={{
              background:
                "linear-gradient(160deg, var(--ember-dim), var(--slate-dim))",
            }}
          >
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
              className="card"
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: ".9rem 1rem",
                marginBottom: ".6rem",
                boxShadow: "var(--shadow-soft)",
                background: `color-mix(in srgb, ${g.coverColor ?? "var(--ember)"} 10%, var(--white))`,
                border: `1px solid color-mix(in srgb, ${g.coverColor ?? "var(--ember)"} 24%, transparent)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: ".65rem",
                  marginBottom: ".5rem",
                }}
              >
                <span
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: g.coverColor ?? "var(--ember-soft)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon
                    name={groupIcon(g.emoji)}
                    size={18}
                    stroke="#fff"
                    sw={1.5}
                  />
                </span>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: ".9rem",
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {g.name}
                </div>
              </div>
              <div style={{ fontSize: ".78rem", color: "var(--ink-3)" }}>
                {g.lifePhase}
              </div>
            </button>
          ))
        ) : (
          <p
            style={{
              fontSize: ".82rem",
              color: "var(--ink-4)",
              fontStyle: "italic",
            }}
          >
            No groups yet. Browse to join one.
          </p>
        )}
      </RPSection>
    </>
  );

  const header = (
    <div className="app-shared-header">
      <div className="app-header-main">
        <h1
          className="serif"
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: "var(--ink)",
            whiteSpace: "nowrap",
          }}
        >
          My Spaces
        </h1>
      </div>
      <div className="app-header-side">
        <div
          style={{ position: "relative", flex: 1, minWidth: 0 }}
          onClick={() => router.push("/search")}
        >
          <input
            readOnly
            placeholder="search............."
            style={{
              width: "100%",
              padding: ".65rem 2.6rem .65rem 1rem",
              borderRadius: 8,
              background: "var(--surf-high)",
              border: "1.5px solid transparent",
              fontSize: ".88rem",
              cursor: "pointer",
            }}
          />
          <span
            style={{
              position: "absolute",
              right: 14,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          >
            <Icon name="search" size={17} stroke="var(--ink-3)" />
          </span>
        </div>
        <NotifBell />
      </div>
    </div>
  );

  return (
    <AppShell title="My Spaces" header={header} right={right}>
      <div style={{ margin: "0 auto", padding: "24px" }}>
        <h2
          className="serif"
          style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0 0 1rem" }}
        >
          Your open chapters
        </h2>

        {isLoading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "3rem",
            }}
          >
            <Spinner />
          </div>
        ) : activeSlots.length === 0 ? (
          <div
            className="card"
            style={{
              background:
                "linear-gradient(160deg, var(--green-dim), var(--ember-dim))",
              maxWidth: 480,
              margin: "0 auto",
            }}
          >
            <EmptyState
              variant="feed"
              title="No open chapters yet."
              body="Open a space from the directory below to start your chapter."
              action={{
                label: "Browse spaces",
                onClick: () =>
                  document
                    .getElementById("spaces-dir")
                    ?.scrollIntoView({ behavior: "smooth" }),
              }}
            />
          </div>
        ) : (
          <div
            className="spaces-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "1rem",
            }}
          >
            {activeSlots.map((slot) => (
              <SpaceCard
                key={slot.id}
                slot={slot}
                onOpen={() => router.push(`/spaces/${slot.space?.slug ?? ""}`)}
                onClose={() =>
                  router.push(
                    `/chapter-close?space=${slot.space?.slug ?? ""}&userSpaceId=${slot.id}`,
                  )
                }
              />
            ))}
          </div>
        )}

        {/* ── Spaces Directory ── */}
        <div id="spaces-dir">
          <h2
            className="serif"
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              margin: "2.4rem 0 .3rem",
            }}
          >
            Spaces Directory
          </h2>
          <p style={{ color: "var(--ink-3)", marginBottom: "1rem" }}>
            Chapters you could open next.
          </p>

          <div
            className="spaces-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "1rem",
            }}
          >
            {dirSpaces.map((s) => (
              <SpaceDirectoryCard
                key={s.id}
                s={s}
                isOpening={opening === s.id}
                chapter={chapter}
                setChapter={setChapter}
                submitting={openSpace.isPending}
                onStartOpen={() => {
                  setOpening(s.id);
                  setChapter("");
                }}
                onCancel={() => {
                  setOpening(null);
                  setChapter("");
                }}
                onSubmit={() => openChapter(s.id, chapter)}
              />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function SpacesPage() {
  return (
    <FeatureGate flagKey="nav_spaces">
      <SpacesPageInner />
    </FeatureGate>
  );
}
