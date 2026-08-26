"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { RPSection } from "@/components/layout/RightPanel";
import { FeatureGate } from "@/components/layout/FeatureGate";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToastStore } from "@/store/useToastStore";
import { useSpaceStore } from "@/store/useSpaceStore";
import { useMySpaces, useOpenSpace } from "@/hooks/useSpaces";
import { useGroups } from "@/hooks/useGroups";
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
    <RPSection label="Suggested for your chapter">
      {groupsData && groupsData.length > 0 ? (
        groupsData.slice(0, 3).map((g) => (
          <button
            key={g.id}
            onClick={() => router.push("/groups")}
            className="card"
            style={{
              display: "flex",
              width: "100%",
              textAlign: "left",
              alignItems: "center",
              gap: ".6rem",
              padding: ".75rem",
              marginBottom: ".55rem",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: g.coverColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon
                name={groupIcon(g.emoji)}
                size={17}
                stroke="#fff"
                sw={1.5}
              />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: ".84rem" }}>
                {g.name}
              </div>
              <div style={{ fontSize: ".72rem", color: "var(--ink-3)" }}>
                {g.lifePhase}
              </div>
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
  );

  return (
    <AppShell title="My Spaces" right={right}>
      <div
        style={{ maxWidth: 720, margin: "0 auto", padding: "0 1.6rem 3rem" }}
      >
        <p
          style={{
            color: "var(--ink-3)",
            marginTop: "-.4rem",
            marginBottom: "1.4rem",
            fontSize: "1.02rem",
          }}
        >
          Your open chapters.
        </p>

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
              gridTemplateColumns: "1fr 1fr",
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
            {activeSlots.length < 4 && (
              <button
                style={{
                  borderRadius: "var(--r-lg)",
                  border: "1.5px dashed var(--border-2)",
                  background: "transparent",
                  minHeight: 230,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: ".6rem",
                  color: "var(--ink-3)",
                }}
                onClick={() =>
                  document
                    .getElementById("spaces-dir")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                <span
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: "50%",
                    background: "var(--surf-high)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="plus" size={22} stroke="var(--ember)" />
                </span>
                Open a new chapter
              </button>
            )}
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
              gridTemplateColumns: "1fr 1fr",
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
