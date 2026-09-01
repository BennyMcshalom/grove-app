"use client";
import { useState } from "react";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import type { Space } from "@/lib/types";
import type { LogEntry } from "./types";
import { GMark } from "./GMark";
import styles from "./LogStyles.module.css";

// ── shared carousel state for Styles A/B/C ──
export function useCarousel(
  n: number,
): [number, (d: number) => void, (i: number) => void] {
  const [i, setI] = useState(Math.max(0, n - 1));
  const go = (d: number) => setI((p) => Math.max(0, Math.min(n - 1, p + d)));
  return [Math.max(0, Math.min(n - 1, i)), go, setI];
}

// ── Style A — Player (3D coverflow) ──
export function StyleA({
  entries,
  onOpen,
}: {
  entries: LogEntry[];
  onOpen: (i: number) => void;
}) {
  const [i, go, setI] = useCarousel(entries.length);
  if (!entries.length) return null;
  const cur = entries[Math.min(i, entries.length - 1)] || entries[0];
  return (
    <div className={styles.wrapA}>
      <div className={styles.stageA}>
        {entries.map((e, idx) => {
          const off = idx - i;
          if (Math.abs(off) > 2) return null;
          const isC = off === 0;
          return (
            <button
              key={idx}
              onClick={() => (isC ? onOpen(idx) : setI(idx))}
              className={styles.cardA}
              style={{
                transform: `translate(-50%,-50%) translateX(${off * 82}px) rotateY(${off * -22}deg) scale(${isC ? 1 : 0.84})`,
                zIndex: 10 - Math.abs(off),
                boxShadow: isC
                  ? "0 30px 56px -16px rgba(60,30,8,.6)"
                  : "0 14px 28px -12px rgba(60,30,8,.5)",
                filter: isC ? "none" : "blur(1.5px) brightness(.92)",
              }}
            >
              {e.media ? (
                <img src={e.media} alt="" className={styles.media} />
              ) : (
                <div className={styles.mediaPlaceholder} />
              )}
              <div className={styles.cardGradientA} />
              {isC && (
                <div className={styles.captionA}>
                  <div className={clsx("mono", styles.captionDayA)}>
                    DAY {e.day} · {e.date}
                  </div>
                  <div className={clsx("serif", styles.captionTextA)}>
                    {(e.text ?? "").length > 58
                      ? e.text!.slice(0, 58) + "…"
                      : e.text}
                  </div>
                </div>
              )}
              <div className={styles.cardRingA} />
            </button>
          );
        })}
      </div>
      <div className={styles.controlsA}>
        <button
          onClick={() => go(-1)}
          disabled={i === 0}
          className={styles.navBtnA}
          style={{ opacity: i === 0 ? 0.4 : 1 }}
        >
          <Icon name="back" size={24} stroke="#fff" />
        </button>
        <div className={styles.infoA}>
          <div className={styles.infoTitleA}>
            {(cur.text ?? "").slice(0, 34)}
          </div>
          <div className={styles.infoSubA}>Day {cur.day} of your chapter</div>
        </div>
        <button
          onClick={() => go(1)}
          disabled={i === entries.length - 1}
          className={clsx(styles.navBtnA, styles.flipped)}
          style={{ opacity: i === entries.length - 1 ? 0.4 : 1 }}
        >
          <Icon name="back" size={24} stroke="#fff" />
        </button>
        <div className={styles.bookmarkCircleA}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="#B5611E">
            <path d="M9 18V5l11-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="20" cy="16" r="3" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ── Style B — Minimal (stacked story cards) ──
export function StyleB({
  entries,
  onOpen,
}: {
  entries: LogEntry[];
  onOpen: (i: number) => void;
}) {
  const [i, go] = useCarousel(entries.length);
  if (!entries.length) return null;
  const year = new Date().getFullYear();
  return (
    <div className={styles.wrapB}>
      <div className={styles.stageB}>
        {[2, 1].map(
          (d) =>
            entries[i + d] && (
              <div
                key={d}
                className={styles.stackCardB}
                style={{
                  width: 230 - d * 18,
                  height: 288 - d * 12,
                  transform: `translateY(${-d * 16}px) scale(${1 - d * 0.04})`,
                }}
              />
            ),
        )}
        {(() => {
          const e = entries[Math.min(i, entries.length - 1)] || entries[0];
          return (
            <button
              onClick={() => onOpen(Math.min(i, entries.length - 1))}
              className={clsx("swap-in", styles.frontCardB)}
              key={i}
            >
              <div className={styles.mediaWrapB}>
                {e.media ? (
                  <img src={e.media} alt="" className={styles.media} />
                ) : (
                  <div className={styles.mediaPlaceholder} />
                )}
                <div className={styles.bookmarkCircleB}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="var(--ink)"
                  >
                    <path d="M9 18V5l11-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="20" cy="16" r="3" />
                  </svg>
                </div>
              </div>
              <div className={styles.textBlockB}>
                <div className={styles.dayLabelB}>
                  Day {e.day} · {e.date}
                </div>
                <div className={styles.captionB}>
                  {(e.text ?? "").length > 54
                    ? e.text!.slice(0, 54) + "…"
                    : e.text}
                </div>
              </div>
            </button>
          );
        })()}
      </div>
      <div style={{ textAlign: "center", marginTop: ".5rem" }}>
        <div className={styles.logoLabelB}>YOUR LOG</div>
        <div className={clsx("chip", styles.yearChipB)}>{year}</div>
      </div>
      <div className={styles.navRowB}>
        <button
          onClick={() => go(-1)}
          disabled={i === 0}
          className={styles.navBtnB}
          style={{ opacity: i === 0 ? 0.4 : 1 }}
        >
          <Icon name="back" size={20} stroke="var(--ink-2)" />
        </button>
        <button
          onClick={() => go(1)}
          disabled={i === entries.length - 1}
          className={clsx(styles.navBtnB, styles.flipped)}
          style={{ opacity: i === entries.length - 1 ? 0.4 : 1 }}
        >
          <Icon name="back" size={20} stroke="var(--ink-2)" />
        </button>
      </div>
    </div>
  );
}

// ── Style C — Card (dark) ──
export function StyleC({
  entries,
  space,
  onOpen,
}: {
  entries: LogEntry[];
  space: Space;
  onOpen: (i: number) => void;
}) {
  const [i, go] = useCarousel(entries.length);
  if (!entries.length) return null;
  const e = entries[Math.min(i, entries.length - 1)] || entries[0];
  return (
    <div className={styles.wrapC}>
      <div className={styles.stageC}>
        {[2, 1].map(
          (d) =>
            entries[i + d] && (
              <div
                key={d}
                className={styles.stackCardC}
                style={{
                  width: 300 - d * 20,
                  height: 416 - d * 16,
                  transform: `translateY(${d * 14}px) scale(${1 - d * 0.04})`,
                  opacity: 1 - d * 0.12,
                }}
              />
            ),
        )}
        <div className={clsx("swap-in", styles.frontCardC)} key={i}>
          <div className={styles.headerC}>
            <span className={styles.iconBadgeC}>
              <Icon name={space.icon} size={18} stroke="#fff" sw={1.6} />
            </span>
            <button
              onClick={() => onOpen(Math.min(i, entries.length - 1))}
              className={styles.arrowBtnC}
            >
              <Icon name="arrow" size={17} stroke="rgba(255,255,255,.8)" />
            </button>
          </div>
          <h3 className={clsx("serif", styles.titleC)}>
            {(e.text ?? "").length > 46 ? e.text!.slice(0, 46) + "…" : e.text}
          </h3>
          <div className={styles.mediaWrapC}>
            {e.media ? (
              <img src={e.media} alt="" className={styles.media} />
            ) : (
              <div className={styles.mediaPlaceholderC} />
            )}
            <div className={styles.dayBadgeWrapC}>
              <span className={styles.dayPillC}>
                <GMark size={15} bg="var(--ember)" /> Day {e.day}
              </span>
            </div>
          </div>
          <div className={clsx("mono", styles.dateLineC)}>
            {e.date} · {space.name}
          </div>
          <button
            onClick={() => onOpen(Math.min(i, entries.length - 1))}
            className={styles.openBtnC}
          >
            Open Memory <Icon name="arrow" size={18} stroke="#15110D" />
          </button>
        </div>
      </div>
      <div className={styles.navRowC}>
        <button
          onClick={() => go(-1)}
          disabled={i === 0}
          className={styles.navBtnC}
          style={{ opacity: i === 0 ? 0.35 : 1 }}
        >
          <Icon name="back" size={20} stroke="#fff" />
        </button>
        <button
          onClick={() => go(1)}
          disabled={i === entries.length - 1}
          className={clsx(styles.navBtnC, styles.flipped)}
          style={{ opacity: i === entries.length - 1 ? 0.35 : 1 }}
        >
          <Icon name="back" size={20} stroke="#fff" />
        </button>
      </div>
    </div>
  );
}
