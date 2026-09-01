"use client";
import clsx from "clsx";
import { useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { SpaceIcon } from "@/components/ui/SpaceIcon";
import { useMyLogEntries } from "@/hooks/useLog";
import { spaceById } from "@/lib/data";
import type { ChapterRecord } from "@/lib/api";
import styles from "./ChapterCard.module.css";

export function ChapterCard({
  chapter: c,
  slug,
}: {
  chapter: ChapterRecord;
  slug: string;
}) {
  const s = spaceById(slug);
  const [open, setOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const { data: logEntries, isLoading: logLoading } = useMyLogEntries(
    logOpen ? c.spaceId : undefined,
  );
  const openedDate = new Date(c.openedAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
  const closedDate = c.closedAt
    ? new Date(c.closedAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <div className={clsx("card", styles.card)} style={{ borderLeft: `6px solid ${s.color}` }}>
      <div className={styles.body}>
        <div className={styles.headerRow}>
          <SpaceIcon spaceId={slug} size={22} pill pillSize={40} />
          <div className={clsx("serif", styles.spaceName)}>
            {s.name}
          </div>
        </div>
        <div className={styles.dateRange}>
          {openedDate} – {closedDate}
        </div>

        <div className={styles.actionsRow}>
          <button onClick={() => setOpen((o) => !o)} className={styles.reflectionsBtn}>
            {open ? "Hide reflections" : "Read reflections"} →
          </button>
          <button onClick={() => setLogOpen((o) => !o)} className={styles.logBtn}>
            {logOpen ? "Hide Grouv Log" : "View Grouv Log"} →
          </button>
        </div>

        {open && (
          <div className={clsx("fade-in", styles.panel)}>
            {!c.closingLearned &&
            !c.closingAdvice &&
            !c.closingCarryForward &&
            !c.reflectionQ1 ? (
              <p className={styles.emptyText}>
                No reflections were recorded for this chapter.
              </p>
            ) : (
              <div className={styles.sectionsCol}>
                {c.closingLearned && (
                  <div>
                    <div className={clsx("label-mono", styles.sectionLabel)}>
                      What this chapter taught me
                    </div>
                    <p className={styles.sectionText}>
                      &apos;{c.closingLearned}&apos;
                    </p>
                  </div>
                )}
                {c.closingAdvice && (
                  <div>
                    <div className={clsx("label-mono", styles.sectionLabel)}>
                      What I&apos;d tell someone starting
                    </div>
                    <p className={styles.sectionText}>
                      &apos;{c.closingAdvice}&apos;
                    </p>
                  </div>
                )}
                {c.closingCarryForward && (
                  <div>
                    <div className={clsx("label-mono", styles.sectionLabel)}>
                      Who I&apos;m carrying forward
                    </div>
                    <p className={styles.sectionText}>
                      &apos;{c.closingCarryForward}&apos;
                    </p>
                  </div>
                )}
                {c.reflectionQ1 &&
                  c.reflectionQ1.split("\n\n—\n\n").map(
                    (entry, i) =>
                      entry.trim() && (
                        <div key={i}>
                          <div className={clsx("label-mono", styles.sectionLabel)}>
                            Extra reflection {i + 1}
                          </div>
                          <p className={styles.sectionText}>
                            {entry.trim()}
                          </p>
                        </div>
                      ),
                  )}
              </div>
            )}
          </div>
        )}

        {logOpen && (
          <div className={clsx("fade-in", styles.panel)}>
            {logLoading ? (
              <div className={styles.logLoadingWrap}>
                <Spinner />
              </div>
            ) : !logEntries || logEntries.length === 0 ? (
              <p className={styles.emptyText}>
                No Grouv Log entries were written during this chapter.
              </p>
            ) : (
              <div className={styles.sectionsCol}>
                {logEntries.map((e) => (
                  <div key={e.id}>
                    <div className={clsx("label-mono", styles.logEntryDate)}>
                      Day {e.dayNumber} ·{" "}
                      {new Date(e.entryDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    <p className={styles.logEntryText}>
                      {e.body}
                    </p>
                    {e.mediaUrl && (
                      <div className={styles.logMedia}>
                        {e.mediaType?.startsWith("video") ? (
                          <video
                            src={e.mediaUrl}
                            controls
                            className={styles.logMediaVisual}
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={e.mediaUrl}
                            alt=""
                            className={styles.logMediaImg}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
