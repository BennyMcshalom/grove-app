"use client";
import { useState } from "react";
import clsx from "clsx";
import type { Space, LogStyle } from "@/lib/types";
import type { LogEntry } from "./types";
import { MemoryLightbox } from "./MemoryLightbox";
import { StyleA, StyleB, StyleC } from "./LogStyles";
import styles from "./MemoriesGallery.module.css";

const LOG_STYLES: [LogStyle, string][] = [
  ["A", "Player"],
  ["B", "Minimal"],
  ["C", "Card"],
];

// ── Memories gallery switcher (Style A/B/C) ──
export function MemoriesGallery({
  entries,
  space,
  style,
  onStyleChange,
}: {
  entries: LogEntry[];
  space: Space;
  style: LogStyle;
  onStyleChange: (s: LogStyle) => void;
}) {
  const filled = entries.filter((e) => !e.missed);
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section>
      <div className={styles.header}>
        <div>
          <div className={clsx("serif", styles.title)}>Log Memories</div>
          <div className={styles.subtitle}>
            {filled.length} moments · pick how you view them
          </div>
        </div>
        <div className={styles.switcher}>
          {LOG_STYLES.map(([id, l]) => (
            <button
              key={id}
              onClick={() => onStyleChange(id)}
              className={clsx(
                styles.switcherBtn,
                style === id && styles.active,
              )}
            >
              {id} · {l}
            </button>
          ))}
        </div>
      </div>
      {filled.length === 0 ? (
        <div className={clsx("card", styles.emptyCard)}>
          <p className={styles.emptyText}>
            No moments yet. Write today&apos;s entry above to start your Log.
          </p>
        </div>
      ) : (
        <div className="swap-in" key={space.id + style}>
          {style === "A" && <StyleA entries={filled} onOpen={setOpen} />}
          {style === "B" && <StyleB entries={filled} onOpen={setOpen} />}
          {style === "C" && (
            <StyleC entries={filled} space={space} onOpen={setOpen} />
          )}
        </div>
      )}
      {open != null && (
        <MemoryLightbox
          entries={filled}
          startIndex={open}
          space={space}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  );
}
