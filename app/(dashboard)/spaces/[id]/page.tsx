"use client";
import { useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { RPSection } from "@/components/layout/RightPanel";
import { FeatureGate } from "@/components/layout/FeatureGate";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { SpaceIcon } from "@/components/ui/SpaceIcon";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { PostCard } from "@/components/ui/RootsPostCard";
import { useToastStore } from "@/store/useToastStore";
import { useUserStore } from "@/store/useUserStore";
import { useSpaceStore } from "@/store/useSpaceStore";
import { usePosts } from "@/hooks/usePosts";
import { useSpaceMembers } from "@/hooks/useSpaces";
import { useAllAsks, usePostAsk, useSubmitAnswer } from "@/hooks/useAnonAsks";
import {
  useInviteToBond,
  useSentBondInvitations,
} from "@/hooks/useBondInvitations";
import { spaceById } from "@/lib/data";
import { mapPostRecordToPost } from "@/lib/mappers";
import { REGIONS, type Region } from "@/lib/regions";
import { PostDetailModal } from "@/components/spaces/PostDetailModal";
import { AskBoard } from "@/components/spaces/AskBoard";

function SpaceDetailPageInner() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToastStore();
  const { user } = useUserStore();
  const { uuidBySlug } = useSpaceStore();

  const slug = params.id as string;
  const s = spaceById(slug);
  const spaceUuid = uuidBySlug(slug);
  const highlightPostId = searchParams.get("post");

  const [tab, setTab] = useState("roots");
  const [askText, setAskText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [openRegion, setOpenRegion] = useState<Region | null>(null);
  const [invited, setInvited] = useState<string[]>([]);
  const [openView, setOpenView] = useState<"people" | "posts">("posts");

  // ── Live data ──
  const { data: postRecords, isLoading: postsLoading } = usePosts(spaceUuid);
  const { data: members, isLoading: membersLoading } =
    useSpaceMembers(spaceUuid);
  const { data: openMembers, isLoading: openMembersLoading } = useSpaceMembers(
    spaceUuid,
    {
      region: openRegion ?? undefined,
      enabled: tab === "open" && openView === "people" && !!openRegion,
    },
  );
  const { data: openPosts, isLoading: openPostsLoading } = usePosts(spaceUuid, {
    region: openRegion ?? undefined,
    enabled: tab === "open" && openView === "posts" && !!openRegion,
  });
  const { data: allAsks } = useAllAsks(spaceUuid);
  const myAsk = allAsks?.find((a) => a.isOwn) ?? null;
  const otherAsks = allAsks?.filter((a) => !a.isOwn) ?? [];
  const postAsk = usePostAsk();
  const submitAnswer = useSubmitAnswer();
  const inviteToBond = useInviteToBond();
  const { data: sentInvitations } = useSentBondInvitations();

  const posts = (postRecords ?? []).map((r) => mapPostRecordToPost(r, slug));
  const openSpacePosts = (openPosts ?? []).map((r) =>
    mapPostRecordToPost(r, slug),
  );
  const alreadySentTo = (id: string) =>
    invited.includes(id) ||
    (sentInvitations?.some(
      (i) => i.toUserId === id && i.status === "pending",
    ) ??
      false);

  const right = (
    <RPSection label="In this space">
      {membersLoading ? (
        <div
          style={{ display: "flex", justifyContent: "center", padding: "1rem" }}
        >
          <Spinner size={18} />
        </div>
      ) : members && members.length > 0 ? (
        members.slice(0, 5).map((m) => (
          <button
            key={m.id}
            onClick={() => router.push(`/grove/${m.id}`)}
            style={{
              display: "flex",
              width: "100%",
              textAlign: "left",
              alignItems: "center",
              gap: ".7rem",
              padding: ".45rem .3rem",
              borderRadius: "var(--r-md)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--surf-low)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <Avatar
              name={m.displayName}
              size={36}
              avatarUrl={m.avatarUrl}
              aura={m.aura ?? undefined}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: ".84rem" }}>
                {m.displayName}
              </div>
              {m.stage && (
                <div
                  style={{
                    fontSize: ".72rem",
                    color: "var(--ink-3)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {m.stage}
                </div>
              )}
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
          No one else here yet.
        </p>
      )}
      {members && members.length > 5 && (
        <button
          onClick={() => setTab("members")}
          style={{
            fontSize: ".78rem",
            color: "var(--ember)",
            fontWeight: 500,
            marginTop: ".4rem",
          }}
        >
          View all {members.length} members →
        </button>
      )}
    </RPSection>
  );

  const TABS: [string, string][] = [
    ["roots", "Roots"],
    ["open", "Open"],
    ["ask", "Anonymous Ask"],
    ["members", "Members"],
  ];

  return (
    <AppShell title={s.name} right={right}>
      <div
        style={{ maxWidth: 620, margin: "0 auto", padding: "0 1.6rem 3rem" }}
      >
        {/* Breadcrumb + header */}
        <button
          onClick={() => router.push("/spaces")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: ".3rem",
            fontSize: ".82rem",
            color: "var(--ink-3)",
            marginBottom: ".8rem",
          }}
        >
          <Icon name="back" size={15} stroke="var(--ink-3)" /> My Spaces
        </button>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: ".8rem",
            marginBottom: "1.2rem",
          }}
        >
          <SpaceIcon spaceId={slug} size={22} pill pillSize={44} />
          <div>
            <h2
              className="serif"
              style={{ fontSize: "1.4rem", fontWeight: 600 }}
            >
              {s.name}
            </h2>
            <div style={{ fontSize: ".78rem", color: "var(--ink-4)" }}>
              {members?.length ?? 0} people in this chapter
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div
          className="scroll"
          style={{
            display: "flex",
            gap: ".2rem",
            overflowX: "auto",
            borderBottom: "1px solid var(--border)",
            marginBottom: "1.2rem",
          }}
        >
          {TABS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                padding: ".6rem .9rem",
                fontSize: ".88rem",
                fontWeight: 500,
                whiteSpace: "nowrap",
                color: tab === id ? "var(--ember)" : "var(--ink-3)",
                borderBottom:
                  tab === id
                    ? "2px solid var(--ember)"
                    : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Roots tab ── */}
        {tab === "roots" && (
          <>
            {postsLoading ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "2rem",
                }}
              >
                <Spinner />
              </div>
            ) : posts.length === 0 ? (
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
                  title={`Nothing rooted in ${s.name} yet.`}
                  body="Be the first to root a thought here."
                />
              </div>
            ) : (
              posts.map((p) => <PostCard key={p.id} post={p} myId={user.id} />)
            )}
          </>
        )}

        {/* ── Open tab — browse this space beyond your circle, by region ── */}
        {tab === "open" && (
          <>
            <p
              style={{
                color: "var(--ink-3)",
                marginBottom: "1rem",
                fontSize: ".9rem",
              }}
            >
              Browse this space in another part of the world.
            </p>

            <div
              className="scroll"
              style={{
                display: "flex",
                gap: ".4rem",
                overflowX: "auto",
                marginBottom: ".9rem",
              }}
            >
              {REGIONS.map((r) => (
                <button
                  key={r.key}
                  onClick={() =>
                    setOpenRegion((cur) => (cur === r.key ? null : r.key))
                  }
                  className="chip"
                  style={{
                    cursor: "pointer",
                    flexShrink: 0,
                    background:
                      openRegion === r.key
                        ? "var(--ember)"
                        : "var(--surf-high)",
                    color: openRegion === r.key ? "#fff" : "var(--ink-2)",
                  }}
                >
                  {r.emoji} {r.label}
                </button>
              ))}
            </div>

            {openRegion && (
              <div
                style={{
                  display: "flex",
                  gap: ".4rem",
                  marginBottom: "1.1rem",
                }}
              >
                {(
                  [
                    ["posts", "Roots & Grouvs"],
                    ["people", "People"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setOpenView(id)}
                    style={{
                      flex: 1,
                      padding: ".5rem",
                      borderRadius: "var(--r-md)",
                      fontSize: ".82rem",
                      fontWeight: 600,
                      background:
                        openView === id
                          ? "var(--slate-dim)"
                          : "var(--surf-low)",
                      color: openView === id ? "var(--slate)" : "var(--ink-3)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {!openRegion ? (
              <div
                className="card"
                style={{
                  background:
                    "linear-gradient(160deg, var(--slate-dim), var(--ember-dim))",
                  maxWidth: 480,
                  margin: "0 auto",
                }}
              >
                <EmptyState
                  variant="feed"
                  title="Pick a region."
                  body="Choose a region above to browse people and posts from elsewhere in this space."
                />
              </div>
            ) : openView === "posts" ? (
              openPostsLoading ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: "2rem",
                  }}
                >
                  <Spinner />
                </div>
              ) : openSpacePosts.length === 0 ? (
                <div
                  className="card"
                  style={{
                    background:
                      "linear-gradient(160deg, var(--slate-dim), var(--ember-dim))",
                    maxWidth: 480,
                    margin: "0 auto",
                  }}
                >
                  <EmptyState
                    variant="feed"
                    title="Nothing shared yet."
                    body="No posts from this space in that region yet."
                  />
                </div>
              ) : (
                openSpacePosts.map((p) => (
                  <PostCard key={p.id} post={p} myId={user.id} showViewGrouv />
                ))
              )
            ) : openMembersLoading ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "2rem",
                }}
              >
                <Spinner />
              </div>
            ) : !openMembers || openMembers.length === 0 ? (
              <div
                className="card"
                style={{
                  background:
                    "linear-gradient(160deg, var(--slate-dim), var(--ember-dim))",
                  maxWidth: 480,
                  margin: "0 auto",
                }}
              >
                <EmptyState
                  variant="groups"
                  title="No one here yet."
                  body="No one in this space from that region yet."
                />
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: ".6rem",
                }}
              >
                {openMembers.map((m) => (
                  <div
                    key={m.id}
                    className="card"
                    style={{
                      padding: ".85rem 1.1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: ".8rem",
                      boxShadow: "var(--shadow-soft)",
                    }}
                  >
                    <Avatar
                      name={m.displayName}
                      size={44}
                      avatarUrl={m.avatarUrl}
                      aura={m.aura ?? undefined}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{m.displayName}</div>
                      {m.stage && (
                        <div
                          style={{
                            fontSize: ".76rem",
                            color: "var(--ink-3)",
                            marginTop: 2,
                          }}
                        >
                          {m.stage}
                        </div>
                      )}
                      {m.openTo && (
                        <div
                          style={{
                            fontSize: ".74rem",
                            color: "var(--ink-4)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {m.openTo}
                        </div>
                      )}
                    </div>
                    <button
                      disabled={alreadySentTo(m.id) || inviteToBond.isPending}
                      onClick={async () => {
                        try {
                          await inviteToBond.mutateAsync({ recipientId: m.id });
                          setInvited((v) => [...v, m.id]);
                          toast(
                            `Bond invitation sent to ${m.displayName.split(" ")[0]}.`,
                          );
                        } catch {
                          toast("Could not send invitation.");
                        }
                      }}
                      className="btn btn-soft"
                      style={{ padding: ".45rem .8rem", fontSize: ".8rem" }}
                    >
                      {alreadySentTo(m.id) ? "Sent" : "Connect"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Anonymous Ask tab ── */}
        {tab === "ask" && (
          <AskBoard
            spaceUuid={spaceUuid}
            myAsk={myAsk}
            otherAsks={otherAsks}
            askText={askText}
            setAskText={setAskText}
            answerText={answerText}
            setAnswerText={setAnswerText}
            postAsk={postAsk}
            submitAnswer={submitAnswer}
            userName={user.name}
            toast={toast}
          />
        )}

        {/* ── Members tab ── */}
        {tab === "members" &&
          (membersLoading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "2rem",
              }}
            >
              <Spinner />
            </div>
          ) : !members || members.length === 0 ? (
            <div
              className="card"
              style={{
                background:
                  "linear-gradient(160deg, var(--slate-dim), var(--green-dim))",
                maxWidth: 480,
                margin: "0 auto",
              }}
            >
              <EmptyState
                variant="groups"
                title="No members yet."
                body="Be the first person in this chapter."
              />
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}
            >
              {members.map((m) => (
                <div
                  key={m.id}
                  className="card"
                  style={{
                    padding: ".85rem 1.1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: ".8rem",
                    boxShadow: "var(--shadow-soft)",
                  }}
                >
                  <button onClick={() => router.push(`/grove/${m.id}`)}>
                    <Avatar
                      name={m.displayName}
                      size={44}
                      avatarUrl={m.avatarUrl}
                      aura={m.aura ?? undefined}
                    />
                  </button>
                  <button
                    onClick={() => router.push(`/grove/${m.id}`)}
                    style={{ flex: 1, minWidth: 0, textAlign: "left" }}
                  >
                    <div style={{ fontWeight: 600 }}>{m.displayName}</div>
                    {m.stage && (
                      <div
                        style={{
                          fontSize: ".76rem",
                          color: "var(--ink-3)",
                          marginTop: 2,
                        }}
                      >
                        {m.stage}
                      </div>
                    )}
                    {m.openTo && (
                      <div
                        style={{
                          fontSize: ".74rem",
                          color: "var(--ink-4)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {m.openTo}
                      </div>
                    )}
                  </button>
                  <button
                    onClick={() => router.push(`/grove/${m.id}`)}
                    className="btn btn-soft"
                    style={{ padding: ".45rem .8rem", fontSize: ".8rem" }}
                  >
                    Enter Grouv →
                  </button>
                </div>
              ))}
            </div>
          ))}
      </div>

      {highlightPostId && (
        <PostDetailModal
          postId={highlightPostId}
          myId={user.id}
          slug={slug}
          onClose={() => router.replace(`/spaces/${slug}`)}
        />
      )}
    </AppShell>
  );
}

export default function SpaceDetailPage() {
  return (
    <FeatureGate flagKey="nav_spaces">
      <SpaceDetailPageInner />
    </FeatureGate>
  );
}
