"use client";
import { useState } from "react";
import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { SpaceIcon } from "@/components/ui/SpaceIcon";
import { spaceById } from "@/lib/data";
import type { OtherLog } from "./types";
import { MemoryLightbox } from "./MemoryLightbox";
import { StyleA, StyleB, StyleC } from "./LogStyles";
import styles from "./LogViewer.module.css";

export function LogViewer({
  log,
  onClose,
}: {
  log: OtherLog;
  onClose: () => void;
}) {
  const space = spaceById(log.space);
  const [open, setOpen] = useState<number | null>(null);
  const filled = log.entries.filter((e) => !e.missed);
  const first = log.name.split(" ")[0];
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={clsx("scroll", "fade-in", styles.modal)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <Avatar
            name={log.name}
            size={44}
            avatarUrl={log.avatarUrl}
            aura={log.aura ?? undefined}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className={styles.title}>{first}&apos;s Log</div>
            <div className={styles.meta}>
              <SpaceIcon spaceId={log.space} size={11} /> {log.phase} ·{" "}
              {log.entries.length} moments
            </div>
          </div>
          <button onClick={onClose} className={styles.closeBtn}>
            <Icon name="close" stroke="var(--ink-3)" />
          </button>
        </div>
        <div className={styles.body}>
          {filled.length === 0 ? (
            <p className={styles.emptyText}>No moments logged yet.</p>
          ) : log.style === "A" ? (
            <StyleA entries={filled} onOpen={setOpen} />
          ) : log.style === "C" ? (
            <StyleC entries={filled} space={space} onOpen={setOpen} />
          ) : (
            <StyleB entries={filled} onOpen={setOpen} />
          )}
        </div>
      </div>
      {open != null && (
        <MemoryLightbox
          entries={filled}
          startIndex={open}
          space={space}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
