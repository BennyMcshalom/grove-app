"use client";
import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { SpaceIcon } from "@/components/ui/SpaceIcon";
import type { OtherLog } from "./types";
import styles from "./CircleLogFeed.module.css";

// ── CircleLogFeed — scroll others' logs ──
export function CircleLogFeed({
  logs,
  onOpen,
}: {
  logs: OtherLog[];
  onOpen: (log: OtherLog) => void;
}) {
  return (
    <section>
      <div className={styles.headerWrap}>
        <div className={clsx("serif", styles.title)}>Logs from your circle</div>
        <div className={styles.subtitle}>
          Different lives, different phases. Scroll through.
        </div>
      </div>
      <div className={styles.list}>
        {logs.map((log, li) => (
          <article key={li} className={clsx("card", styles.logCard)}>
            <header className={styles.logHeader}>
              <Avatar
                name={log.name}
                size={42}
                avatarUrl={log.avatarUrl}
                aura={log.aura ?? undefined}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={styles.logName}>{log.name}</div>
                <div className={styles.logMeta}>
                  <SpaceIcon spaceId={log.space} size={11} /> {log.phase} ·{" "}
                  {log.when}
                </div>
              </div>
            </header>
            <div className={clsx("scroll", styles.entryScroll)}>
              {log.entries.slice(0, 6).map((e, i) => (
                <button
                  key={i}
                  onClick={() => onOpen(log)}
                  className={styles.entryCard}
                >
                  <div className={styles.entryMediaWrap}>
                    {e.media ? (
                      <img src={e.media} alt="" className={styles.entryMedia} />
                    ) : (
                      <div className={styles.entryPlaceholder} />
                    )}
                    <div className={styles.entryGradient} />
                    <div className={styles.entryCaption}>
                      <div className={clsx("mono", styles.entryDay)}>
                        DAY {e.day} · {e.date}
                      </div>
                      <div className={styles.entryText}>
                        {(e.text ?? "").length > 44
                          ? e.text!.slice(0, 44) + "…"
                          : e.text}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => onOpen(log)} className={styles.openFullBtn}>
              Open {log.name.split(" ")[0]}&apos;s full log{" "}
              <Icon name="arrow" size={15} stroke="var(--ember)" />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
