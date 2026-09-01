"use client";
import { useState, useEffect } from "react";
import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { useToastStore } from "@/store/useToastStore";
import {
  useBondLogToday,
  usePostBondLog,
  useMarkBondResonance,
  useBondLogHistory,
} from "@/hooks/useBondLog";
import type { AuraKey } from "@/lib/types";
import styles from "./BondReveal.module.css";

// ── BondReveal — fully wired ──────────────────────────────────────
export function BondReveal({
  bonds,
}: {
  bonds: { id: string; name: string; avatarUrl?: string | null }[];
}) {
  const { toast } = useToastStore();
  const [selectedBondId, setSelectedBondId] = useState(bonds[0]?.id ?? "");
  const [draft, setDraft] = useState("");

  const { data, isLoading, refetch } = useBondLogToday(
    selectedBondId || undefined,
  );
  const postEntry = usePostBondLog(selectedBondId || undefined);
  const markResonate = useMarkBondResonance(selectedBondId || undefined);
  const { data: history } = useBondLogHistory(selectedBondId || undefined);

  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setDraft("");
  }, [selectedBondId]);

  if (!bonds.length) {
    return (
      <div className={clsx("card", styles.emptyCard)}>
        <p className={styles.emptyText}>
          Form a Bond first. Bond Log unlocks once you have at least one Bond.
        </p>
      </div>
    );
  }

  const partner = data?.partner;
  const session = data?.session;
  const myEntry = data?.myEntry ?? null;
  const partnerEntry = data?.partnerEntry ?? null;
  const revealed = data?.revealed ?? false;
  const iPosted = !!myEntry;
  const theyPosted = !!partnerEntry;

  const myResonance = !!myEntry?.resonanceAt;
  const partnerResonance = !!partnerEntry?.resonanceAt;
  const bothResonant = myResonance && partnerResonance;

  const handlePost = async () => {
    if (!draft.trim() || postEntry.isPending) return;
    try {
      await postEntry.mutateAsync(draft.trim());
      setDraft("");
      toast("Entry posted. Waiting for your Bond to post theirs.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("409"))
        toast("You already posted today. Come back tomorrow.");
      else toast("Could not post. Try again.");
    }
  };

  return (
    <div className={styles.wrap}>
      {bonds.length > 1 && (
        <div className={clsx("card", styles.bondPickerCard)}>
          <div className={clsx("label-mono", styles.bondPickerLabel)}>
            Bond Log with
          </div>
          <div className={styles.bondPickerRow}>
            {bonds.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBondId(b.id)}
                className={clsx(
                  styles.bondPickerBtn,
                  selectedBondId === b.id && styles.active,
                )}
              >
                <Avatar name={b.name} size={22} avatarUrl={b.avatarUrl} />
                {b.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={clsx("card", styles.sessionCard)}>
        {isLoading ? (
          <div className={styles.loadingWrap}>
            <Spinner size={20} color="var(--ember)" />
          </div>
        ) : !session ? null : (
          <>
            <div className={clsx("label-mono", styles.sessionLabel)}>
              Bond Log · with {partner?.name?.split(" ")[0]}
            </div>
            <p className={clsx("serif", styles.prompt)}>{session.prompt}</p>

            {!iPosted && (
              <div>
                <p className={styles.composeHint}>
                  Same prompt, separate entries. Neither of you sees the
                  other&apos;s until both post.
                </p>
                <textarea
                  autoFocus={false}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.slice(0, 300))}
                  placeholder="Your honest entry…"
                  className={styles.composeTextarea}
                />
                <button
                  className={clsx(
                    "btn",
                    "btn-primary",
                    "btn-block",
                    styles.postBtn,
                  )}
                  disabled={draft.trim().length < 3 || postEntry.isPending}
                  onClick={handlePost}
                >
                  {postEntry.isPending ? (
                    <Spinner size={14} color="#fff" />
                  ) : null}
                  {theyPosted ? "Post my entry, reveal both" : "Post my entry"}
                </button>
                {theyPosted && (
                  <p className={styles.theyPostedNote}>
                    {partner?.name?.split(" ")[0]} already posted. Post yours to
                    unlock the reveal.
                  </p>
                )}
              </div>
            )}

            {iPosted && !revealed && (
              <div className={styles.waitingWrap}>
                <div className={styles.avatarsRow}>
                  <div className={styles.avatarCol}>
                    <Avatar name="You" size={52} />
                    <div className={styles.postedLabel}>
                      <Icon
                        name="check"
                        size={11}
                        stroke="var(--green)"
                        sw={2.5}
                      />{" "}
                      Posted
                    </div>
                  </div>
                  <div className={styles.avatarCol}>
                    <Avatar
                      name={partner?.name ?? ""}
                      size={52}
                      avatarUrl={partner?.avatarUrl}
                      aura={partner?.aura ?? undefined}
                    />
                    <div className={styles.notPostedLabel}>
                      Hasn&apos;t posted yet
                    </div>
                  </div>
                </div>
                <p className={styles.sealedText}>
                  Your entry is sealed until {partner?.name?.split(" ")[0]}{" "}
                  posts theirs.
                </p>
                <p className={styles.checkingText}>
                  Checking automatically ·{" "}
                  {new Date().toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <button
                  onClick={() => refetch()}
                  className={clsx("btn", "btn-soft", styles.checkNowBtn)}
                >
                  Check now
                </button>
              </div>
            )}

            {revealed && myEntry && partnerEntry && (
              <div className="fade-in">
                <div className={styles.revealedBadgeWrap}>
                  <span className={clsx("chip", styles.revealedChip)}>
                    <Icon
                      name="check"
                      size={12}
                      stroke="var(--forest)"
                      sw={2.5}
                    />{" "}
                    Both posted, revealed
                  </span>
                </div>
                <div
                  className={clsx("grid-2-mobile-stack", styles.entriesGrid)}
                >
                  {(
                    [
                      [
                        "You",
                        myEntry.body ?? "",
                        true,
                        undefined,
                        myResonance,
                        undefined,
                      ],
                      [
                        partner?.name ?? "",
                        partnerEntry.body ?? "",
                        false,
                        partner?.avatarUrl,
                        partnerResonance,
                        partner?.aura,
                      ],
                    ] as [
                      string,
                      string,
                      boolean,
                      string | null | undefined,
                      boolean,
                      AuraKey | null | undefined,
                    ][]
                  ).map(([who, txt, me, av, res, auraVal], i) => (
                    <div
                      key={i}
                      className={clsx("rise", styles.entryCard)}
                      style={{
                        animationDelay: `${i * 0.1}s`,
                        borderTop: `3px solid ${me ? "var(--ember)" : "var(--sage)"}`,
                      }}
                    >
                      <div className={styles.entryHeader}>
                        <Avatar
                          name={me ? "You" : (who ?? "")}
                          size={28}
                          avatarUrl={me ? undefined : (av ?? undefined)}
                          aura={me ? undefined : (auraVal ?? undefined)}
                        />
                        <div style={{ flex: 1 }}>
                          <span className={styles.entryName}>
                            {me ? "You" : who?.split(" ")[0]}
                          </span>
                        </div>
                        {res && (
                          <Icon
                            name="heart"
                            size={13}
                            stroke="var(--ember)"
                            sw={0}
                          />
                        )}
                      </div>
                      <p
                        className={clsx("serif")}
                        style={{ fontSize: "1rem", lineHeight: 1.55 }}
                      >
                        {txt}
                      </p>
                    </div>
                  ))}
                </div>

                <button
                  disabled={myResonance || markResonate.isPending}
                  onClick={async () => {
                    try {
                      await markResonate.mutateAsync();
                    } catch {
                      toast("Could not mark resonance.");
                    }
                  }}
                  className={styles.resonanceBtn}
                  style={{
                    background: bothResonant
                      ? "var(--green-dim)"
                      : "var(--surf-high)",
                    color: bothResonant
                      ? "var(--green)"
                      : myResonance
                        ? "var(--ink-4)"
                        : "var(--ink-2)",
                  }}
                >
                  <Icon
                    name={bothResonant ? "check" : "heart"}
                    size={16}
                    stroke={
                      bothResonant
                        ? "var(--green)"
                        : myResonance
                          ? "var(--ink-4)"
                          : "var(--ink-2)"
                    }
                    sw={bothResonant ? 2.5 : 1.8}
                  />
                  {bothResonant
                    ? "You both felt this"
                    : myResonance
                      ? `Marked · waiting for ${partner?.name?.split(" ")[0]}`
                      : "Mark resonance"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {(history ?? []).length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory((s) => !s)}
            className={styles.historyToggleBtn}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--ink-4)"
              strokeWidth="2.2"
              strokeLinecap="round"
              className={clsx(
                styles.historyChevron,
                showHistory && styles.open,
              )}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
            {showHistory ? "Hide" : "Show"} past reveals ({history!.length})
          </button>
          {showHistory && (
            <div className={clsx("fade-in", styles.historyList)}>
              {history!.map((item, i) => {
                const d = new Date(item.date);
                const label = d.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
                const bothRes =
                  !!item.myEntry.resonanceAt && !!item.partnerEntry.resonanceAt;
                return (
                  <div key={i} className={clsx("card", styles.historyCard)}>
                    <div className={styles.historyHeader}>
                      <div className="label-mono">{label}</div>
                      {bothRes && (
                        <span className={styles.resonantBadge}>
                          <Icon
                            name="heart"
                            size={12}
                            stroke="var(--green)"
                            sw={0}
                          />{" "}
                          Resonant
                        </span>
                      )}
                    </div>
                    <p className={styles.historyPrompt}>
                      &ldquo;{item.prompt}&rdquo;
                    </p>
                    <div
                      className={clsx(
                        "grid-2-mobile-stack",
                        styles.historyGrid,
                      )}
                    >
                      {[
                        ["You", item.myEntry.body, "var(--ember)"],
                        [
                          partner?.name?.split(" ")[0] ?? "Bond",
                          item.partnerEntry.body,
                          "var(--sage)",
                        ],
                      ].map(([who, body, color]) => (
                        <div
                          key={who as string}
                          className={styles.historyEntry}
                          style={{ borderLeft: `2px solid ${color}` }}
                        >
                          <div className={styles.historyEntryLabel}>
                            {who as string}
                          </div>
                          <p className={clsx("serif", styles.historyEntryText)}>
                            {body as string}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
