"use client";
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { AppShell } from "@/components/layout/AppShell";
import { RPSection } from "@/components/layout/RightPanel";
import { FeatureGate } from "@/components/layout/FeatureGate";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToastStore } from "@/store/useToastStore";
import { useBonds } from "@/hooks/useBonds";
import {
  useBondInvitations,
  useAcceptBondInvitation,
  useDeclineBondInvitation,
  useInviteToBond,
  useSentBondInvitations,
} from "@/hooks/useBondInvitations";
import { useSuggestions } from "@/hooks/useUsers";
import { BondThread } from "@/components/bonds/BondThread";
import { BondListRow } from "@/components/bonds/BondListRow";
import { CircleRow } from "@/components/bonds/CircleRow";
import { BondInfoPanel } from "@/components/bonds/BondInfoPanel";
import styles from "./page.module.css";

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false, // SSR-safe default
  );
}

function BondsPageInner() {
  const router = useRouter();
  const { toast } = useToastStore();
  const [sel, setSel] = useState(0);
  const [mobileView, setMobileView] = useState<"list" | "thread">("list");
  const [search, setSearch] = useState("");
  const isDesktopPanel = useMediaQuery("(min-width: 1180px)");
  const [panelOverride, setPanelOverride] = useState<boolean | null>(null);
  const panelOpen = panelOverride ?? isDesktopPanel;
  const togglePanel = () => setPanelOverride((v) => !(v ?? isDesktopPanel));
  const { data: bondsData, isLoading } = useBonds();
  const { data: suggestions } = useSuggestions();
  const { data: invitations } = useBondInvitations();
  const acceptInv = useAcceptBondInvitation();
  const declineInv = useDeclineBondInvitation();
  const inviteToBond = useInviteToBond();
  const [invited, setInvited] = useState<string[]>([]);
  const [busyInvIds, setBusyInvIds] = useState<Set<string>>(new Set());
  const { data: sentInvitations } = useSentBondInvitations();
  const sentIds = new Set(
    (sentInvitations ?? [])
      .filter((i) => i.status === "pending")
      .map((i) => i.toUserId),
  );

  const allConnections = bondsData ?? [];
  const realBonds = allConnections.filter((b) => b.status === "bond");
  // Circle: whoever you spoke to most recently rises to the top.
  const circle = allConnections
    .filter((b) => b.status === "circle")
    .sort(
      (a, b) =>
        new Date(b.lastMessageAt ?? b.formedAt).getTime() -
        new Date(a.lastMessageAt ?? a.formedAt).getTime(),
    );
  // Selection index (sel) is a position into THIS list — must stay in lockstep
  // with the order list items render in, not the raw backend order.
  const orderedList = [...realBonds, ...circle];
  const slots = Math.max(0, 5 - realBonds.length);
  const pending = (invitations ?? []).filter((i) => i.status === "pending");

  const q = search.trim().toLowerCase();
  const visibleRealBonds = q
    ? realBonds.filter((b) =>
        (b.otherUser?.displayName ?? "").toLowerCase().includes(q),
      )
    : realBonds;
  const visibleCircle = q
    ? circle.filter((b) =>
        (b.otherUser?.displayName ?? "").toLowerCase().includes(q),
      )
    : circle;
  const noMatches =
    q && visibleRealBonds.length === 0 && visibleCircle.length === 0;

  const selectedBond =
    orderedList[Math.min(sel, Math.max(orderedList.length - 1, 0))];

  const right = (
    <>
      {pending.length > 0 && (
        <RPSection label={`Bond invitations (${pending.length})`}>
          {pending.map((inv) => (
            <div key={inv.id} className={clsx("card", styles.invCard)}>
              <div className={styles.invHeader}>
                <Avatar
                  name={inv.fromUser?.displayName ?? "?"}
                  size={40}
                  avatarUrl={inv.fromUser?.avatarUrl}
                  aura={inv.fromUser?.aura ?? undefined}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={styles.invName}>
                    {inv.fromUser?.displayName ?? "Someone"}
                  </div>
                  {inv.message && (
                    <div className={styles.invMessage}>{inv.message}</div>
                  )}
                </div>
              </div>
              <div className={styles.invActions}>
                <button
                  disabled={busyInvIds.has(inv.id)}
                  className={clsx("btn", "btn-primary", styles.invActionBtn)}
                  onClick={async () => {
                    setBusyInvIds((s) => new Set(s).add(inv.id));
                    try {
                      const result = await acceptInv.mutateAsync(inv.id);
                      if (result.accepted === false) {
                        toast("This invitation is no longer available.");
                      } else {
                        toast(
                          `${inv.fromUser?.displayName?.split(" ")[0]} is now in your Circle. Chat for 7 days to form a Bond.`,
                        );
                      }
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : "";
                      toast(
                        msg ? `Could not accept: ${msg}` : "Could not accept.",
                      );
                    } finally {
                      setBusyInvIds((s) => {
                        const n = new Set(s);
                        n.delete(inv.id);
                        return n;
                      });
                    }
                  }}
                >
                  Accept
                </button>
                <button
                  disabled={busyInvIds.has(inv.id)}
                  className={clsx("btn", "btn-soft", styles.invActionBtn)}
                  onClick={async () => {
                    setBusyInvIds((s) => new Set(s).add(inv.id));
                    try {
                      await declineInv.mutateAsync(inv.id);
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : "";
                      toast(
                        msg
                          ? `Could not decline: ${msg}`
                          : "Could not decline.",
                      );
                    } finally {
                      setBusyInvIds((s) => {
                        const n = new Set(s);
                        n.delete(inv.id);
                        return n;
                      });
                    }
                  }}
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </RPSection>
      )}

      <RPSection label="Suggested for you" suggested>
        {suggestions && suggestions.length > 0 ? (
          suggestions.slice(0, 5).map((s) => (
            <div key={s.id} className={styles.suggestionRow}>
              <Avatar
                name={s.displayName}
                size={38}
                avatarUrl={s.avatarUrl}
                aura={s.aura ?? undefined}
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
            Open a space to discover people in the same chapter.
          </p>
        )}
      </RPSection>
    </>
  );

  return (
    <AppShell title="Your Bonds" right={panelOpen ? undefined : right}>
      <div className={styles.page}>
        <p className={styles.subtitle}>Up to five. Earned, not assigned.</p>
        <div className={clsx("bonds-layout", styles.layout)}>
          {/* ── Bond list ── */}
          <div
            className={clsx(
              "bonds-list-col",
              "scroll",
              styles.listCol,
              mobileView === "thread" && "bonds-list-hidden-mobile",
            )}
          >
            {allConnections.length > 0 && (
              <div className={styles.searchWrap}>
                <span className={styles.searchIcon}>
                  <Icon name="search" size={16} stroke="var(--ink-4)" />
                </span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search Bonds & Circle…"
                  className={styles.searchInput}
                />
              </div>
            )}

            {isLoading ? (
              <div className={styles.loadingWrap}>
                <Spinner />
              </div>
            ) : allConnections.length === 0 ? (
              <div className={clsx("card", styles.emptyCard)}>
                <EmptyState
                  variant="bonds"
                  compact
                  title="No connections yet."
                  body="Bonds and Circle members will appear here."
                  action={{
                    label: "Explore spaces →",
                    onClick: () => router.push("/spaces"),
                  }}
                />
              </div>
            ) : noMatches ? (
              <p className={styles.noMatches}>
                No matches for &ldquo;{search}&rdquo;.
              </p>
            ) : (
              <>
                {/* ── Full Bonds (up to 5) ── */}
                {visibleRealBonds.map((b) => (
                  <BondListRow
                    key={b.id}
                    bond={b}
                    active={sel === realBonds.findIndex((x) => x.id === b.id)}
                    onClick={() => {
                      setSel(realBonds.findIndex((x) => x.id === b.id));
                      setMobileView("thread");
                    }}
                  />
                ))}
                {!q &&
                  [...Array(slots)].map((_, i) => (
                    <div key={i} className={styles.slotPlaceholder}>
                      A Bond forms when you consistently show up for someone.
                    </div>
                  ))}

                {/* ── Circle: recent connections, sorted by last chatted ── */}
                {visibleCircle.length > 0 && (
                  <>
                    <div className={styles.circleHeader}>
                      <div className="label-mono">Your Circle</div>
                      <span className={styles.circleCount}>
                        {circle.length} connected
                      </span>
                    </div>
                    <div className={clsx("card", styles.circleCard)}>
                      {visibleCircle.map((b, i) => (
                        <CircleRow
                          key={b.id}
                          bond={b}
                          showDivider={i < visibleCircle.length - 1}
                          active={
                            sel ===
                            realBonds.length +
                              circle.findIndex((x) => x.id === b.id)
                          }
                          onClick={() => {
                            setSel(
                              realBonds.length +
                                circle.findIndex((x) => x.id === b.id),
                            );
                            setMobileView("thread");
                          }}
                        />
                      ))}
                    </div>
                    {!q && (
                      <p className={styles.circleNote}>
                        Everyone you&apos;ve started Grouving with. Whoever you
                        spoke to most recently rises to the top.
                      </p>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* ── Thread ── */}
          <div
            className={clsx(
              "bonds-thread-col",
              styles.threadCol,
              mobileView === "list" && "bonds-thread-hidden-mobile",
            )}
          >
            {/* Mobile back button */}
            <button
              className={clsx("bonds-back-btn", styles.backBtn)}
              onClick={() => setMobileView("list")}
            >
              <Icon name="back" size={16} stroke="var(--ink-3)" /> All bonds
            </button>
            {selectedBond ? (
              <BondThread
                key={selectedBond.id}
                bond={selectedBond}
                onTogglePanel={togglePanel}
              />
            ) : !isLoading ? (
              <div className={styles.threadEmptyWrap}>
                <div className={clsx("card", styles.threadEmptyCard)}>
                  <EmptyState
                    variant="bonds"
                    title="Your first Bond is waiting."
                    body="Show up consistently for someone in your circle. It can't be rushed, but it's worth it."
                    action={{
                      label: "Explore spaces →",
                      onClick: () => router.push("/spaces"),
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          {/* ── Bond Info panel ── */}
          {panelOpen && selectedBond && (
            <>
              <div
                className="bonds-info-backdrop"
                onClick={() => setPanelOverride(false)}
              />
              <div className="bonds-info-col" key={selectedBond.id}>
                <BondInfoPanel
                  bond={selectedBond}
                  onClose={() => setPanelOverride(false)}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default function BondsPage() {
  return (
    <FeatureGate flagKey="nav_bonds">
      <BondsPageInner />
    </FeatureGate>
  );
}
