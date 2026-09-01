"use client";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { Waveform } from "@/components/ui/Waveform";
import { spaceById } from "@/lib/data";
import type { AuraKey, TimePhase } from "@/lib/types";
import type { Ring } from "./rings";
import styles from "./OrbitStage.module.css";

export function OrbitStage({
  stage,
  rings,
  active,
  hover,
  onSelectRing,
  onHover,
  uniqueSpaceIds,
  name,
  avatarSize,
  phase,
  realAura,
  avatarUrl,
  ambience,
  setAmbience,
  possessiveCap,
}: {
  stage: number;
  rings: Ring[];
  active: string | null;
  hover: string | null;
  onSelectRing: (key: string | null) => void;
  onHover: (key: string | null) => void;
  uniqueSpaceIds: string[];
  name: string;
  avatarSize: number;
  phase: TimePhase;
  realAura: AuraKey | undefined;
  avatarUrl: string | null;
  ambience: boolean;
  setAmbience: (v: boolean) => void;
  possessiveCap: string;
}) {
  return (
    <div
      className={`grove-orbit-stage ${styles.stage}`}
      style={{ width: stage }}
    >
      {[...rings].reverse().map((ring) => {
        const dPct = ring.r * 100;
        const on = active === ring.key;
        const hov = hover === ring.key;
        return (
          <div
            key={ring.key}
            onClick={() => onSelectRing(on ? null : ring.key)}
            onMouseEnter={() => onHover(ring.key)}
            onMouseLeave={() => onHover(null)}
            className={styles.ring}
            style={{
              width: `${dPct}%`,
              height: `${dPct}%`,
              border: `2px solid ${ring.color}`,
              opacity: on || hov ? 1 : 0.5,
              boxShadow: on
                ? `0 0 26px -2px ${ring.color}99, inset 0 0 26px -6px ${ring.color}66`
                : "none",
              background:
                hov && !on
                  ? `radial-gradient(circle, transparent 60%, ${ring.color}14)`
                  : "transparent",
            }}
          >
            <div className={styles.ringLabel} style={{ color: ring.color }}>
              {ring.label}
            </div>
          </div>
        );
      })}

      <div className={styles.orbitLayer}>
        {uniqueSpaceIds.map((id, i) => {
          const ang =
            (i / uniqueSpaceIds.length) * Math.PI * 2 -
            Math.PI / 2 +
            Math.PI / uniqueSpaceIds.length;
          const rrPct = (rings.find((r) => r.key === "outer")!.r * 100) / 2;
          const xPct = 50 + Math.cos(ang) * rrPct,
            yPct = 50 + Math.sin(ang) * rrPct;
          const s = spaceById(id);
          return (
            <div
              key={id}
              className={styles.spaceOrbitItem}
              style={{ left: `${xPct}%`, top: `${yPct}%` }}
            >
              <div
                className={styles.spaceIconCircle}
                style={{ background: s.color }}
              >
                <Icon name={s.icon} size={20} stroke={s.ink} sw={1.6} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Center portrait */}
      <button
        onMouseDown={() => setAmbience(true)}
        onMouseUp={() => setAmbience(false)}
        onMouseLeave={() => setAmbience(false)}
        className={styles.centerBtn}
      >
        <Avatar
          name={name || "?"}
          size={avatarSize}
          timePhase={phase}
          aura={realAura}
          ring={2}
          avatarUrl={avatarUrl}
        />
      </button>

      {ambience && (
        <div className={styles.ambienceWrap}>
          <div className={styles.waveformWrap}>
            <Waveform color="var(--sage)" playing bars={14} height={18} />
          </div>
          <span className={styles.ambienceLabel}>{possessiveCap} ambience</span>
        </div>
      )}
    </div>
  );
}
