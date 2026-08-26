"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { Space } from "@/lib/types";
import type { LogEntry } from "./types";
import { GMark } from "./GMark";

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
    <div
      style={{
        borderRadius: 26,
        padding: "1.9rem 1.2rem 1.6rem",
        background: "linear-gradient(165deg, #F6C078, #E08A3C 60%, #B5611E)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.3)",
      }}
    >
      <div style={{ position: "relative", height: 340, perspective: 1200 }}>
        {entries.map((e, idx) => {
          const off = idx - i;
          if (Math.abs(off) > 2) return null;
          const isC = off === 0;
          return (
            <button
              key={idx}
              onClick={() => (isC ? onOpen(idx) : setI(idx))}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 220,
                height: 288,
                transform: `translate(-50%,-50%) translateX(${off * 82}px) rotateY(${off * -22}deg) scale(${isC ? 1 : 0.84})`,
                zIndex: 10 - Math.abs(off),
                transition: "transform .4s cubic-bezier(.22,.61,.36,1)",
                borderRadius: 20,
                overflow: "hidden",
                transformStyle: "preserve-3d",
                boxShadow: isC
                  ? "0 30px 56px -16px rgba(60,30,8,.6)"
                  : "0 14px 28px -12px rgba(60,30,8,.5)",
                filter: isC ? "none" : "blur(1.5px) brightness(.92)",
                cursor: "pointer",
              }}
            >
              {e.media ? (
                <img
                  src={e.media}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "var(--surf-high)",
                  }}
                />
              )}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(20,12,4,.05) 40%, rgba(20,12,4,.82))",
                }}
              />
              {isC && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    padding: "1.2rem",
                  }}
                >
                  <div
                    className="mono"
                    style={{
                      color: "rgba(255,255,255,.75)",
                      fontSize: ".7rem",
                      marginBottom: ".35rem",
                    }}
                  >
                    DAY {e.day} · {e.date}
                  </div>
                  <div
                    className="serif"
                    style={{
                      color: "#fff",
                      fontSize: "1.28rem",
                      fontWeight: 600,
                      lineHeight: 1.25,
                    }}
                  >
                    {(e.text ?? "").length > 58
                      ? e.text!.slice(0, 58) + "…"
                      : e.text}
                  </div>
                </div>
              )}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 20,
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,.25)",
                }}
              />
            </button>
          );
        })}
      </div>
      <div
        style={{
          marginTop: "1.2rem",
          display: "flex",
          alignItems: "center",
          gap: ".9rem",
          background: "rgba(255,255,255,.22)",
          backdropFilter: "blur(8px)",
          borderRadius: 18,
          padding: ".85rem 1.1rem",
          border: "1px solid rgba(255,255,255,.35)",
        }}
      >
        <button
          onClick={() => go(-1)}
          disabled={i === 0}
          style={{ opacity: i === 0 ? 0.4 : 1, color: "#fff" }}
        >
          <Icon name="back" size={24} stroke="#fff" />
        </button>
        <div
          style={{ flex: 1, minWidth: 0, textAlign: "center", color: "#fff" }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: ".94rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {(cur.text ?? "").slice(0, 34)}
          </div>
          <div style={{ fontSize: ".76rem", opacity: 0.8 }}>
            Day {cur.day} of your chapter
          </div>
        </div>
        <button
          onClick={() => go(1)}
          disabled={i === entries.length - 1}
          style={{
            opacity: i === entries.length - 1 ? 0.4 : 1,
            transform: "scaleX(-1)",
            color: "#fff",
          }}
        >
          <Icon name="back" size={24} stroke="#fff" />
        </button>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
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
    <div
      style={{
        borderRadius: 28,
        padding: "2.4rem 1.2rem 2.6rem",
        background: "linear-gradient(170deg, #FBFBFA, #ECEBE8)",
      }}
    >
      <div
        style={{
          position: "relative",
          height: 340,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {[2, 1].map(
          (d) =>
            entries[i + d] && (
              <div
                key={d}
                style={{
                  position: "absolute",
                  width: 230 - d * 18,
                  height: 288 - d * 12,
                  borderRadius: 22,
                  background: "#fff",
                  transform: `translateY(${-d * 16}px) scale(${1 - d * 0.04})`,
                  boxShadow: "0 12px 34px -16px rgba(40,36,30,.4)",
                  zIndex: 1,
                }}
              />
            ),
        )}
        {(() => {
          const e = entries[Math.min(i, entries.length - 1)] || entries[0];
          return (
            <button
              onClick={() => onOpen(Math.min(i, entries.length - 1))}
              className="swap-in"
              key={i}
              style={{
                position: "relative",
                zIndex: 3,
                width: 240,
                height: 300,
                borderRadius: 22,
                overflow: "hidden",
                background: "#fff",
                boxShadow: "0 26px 52px -18px rgba(40,36,30,.5)",
                textAlign: "left",
              }}
            >
              <div style={{ height: 184, position: "relative" }}>
                {e.media ? (
                  <img
                    src={e.media}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      background: "var(--surf-high)",
                    }}
                  />
                )}
                <div
                  style={{
                    position: "absolute",
                    right: 12,
                    bottom: -18,
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 4px 14px -4px rgba(0,0,0,.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
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
              <div style={{ padding: "1.3rem 1.2rem 1rem" }}>
                <div
                  style={{
                    fontSize: ".72rem",
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    color: "var(--ink-4)",
                    marginBottom: ".35rem",
                  }}
                >
                  Day {e.day} · {e.date}
                </div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "1.02rem",
                    lineHeight: 1.32,
                    color: "var(--ink)",
                  }}
                >
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
        <div
          style={{
            fontSize: "1.7rem",
            fontWeight: 700,
            letterSpacing: ".14em",
            color: "var(--ink-2)",
          }}
        >
          YOUR LOG
        </div>
        <div
          className="chip"
          style={{
            background: "#fff",
            marginTop: ".6rem",
            boxShadow: "var(--shadow-soft)",
            fontSize: ".8rem",
            padding: ".4rem .9rem",
            display: "inline-block",
          }}
        >
          {year}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: ".6rem",
          marginTop: "1.2rem",
        }}
      >
        <button
          onClick={() => go(-1)}
          disabled={i === 0}
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "var(--shadow-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: i === 0 ? 0.4 : 1,
          }}
        >
          <Icon name="back" size={20} stroke="var(--ink-2)" />
        </button>
        <button
          onClick={() => go(1)}
          disabled={i === entries.length - 1}
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "var(--shadow-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: i === entries.length - 1 ? 0.4 : 1,
            transform: "scaleX(-1)",
          }}
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
    <div
      style={{
        borderRadius: 28,
        padding: "2.1rem 1.2rem 1.6rem",
        background: "#FAFAF8",
      }}
    >
      <div
        style={{
          position: "relative",
          height: 460,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {[2, 1].map(
          (d) =>
            entries[i + d] && (
              <div
                key={d}
                style={{
                  position: "absolute",
                  width: 300 - d * 20,
                  height: 416 - d * 16,
                  borderRadius: 24,
                  background: "#15110D",
                  transform: `translateY(${d * 14}px) scale(${1 - d * 0.04})`,
                  opacity: 1 - d * 0.12,
                  boxShadow: "0 18px 40px -18px rgba(0,0,0,.5)",
                  zIndex: 1,
                }}
              />
            ),
        )}
        <div
          className="swap-in"
          key={i}
          style={{
            position: "relative",
            zIndex: 3,
            width: 314,
            minHeight: 424,
            borderRadius: 24,
            background: "#15110D",
            padding: "1.4rem",
            boxShadow: "0 34px 64px -22px rgba(0,0,0,.7)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.1rem",
            }}
          >
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "rgba(255,255,255,.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name={space.icon} size={18} stroke="#fff" sw={1.6} />
            </span>
            <button
              onClick={() => onOpen(Math.min(i, entries.length - 1))}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="arrow" size={17} stroke="rgba(255,255,255,.8)" />
            </button>
          </div>
          <h3
            className="serif"
            style={{
              color: "#fff",
              fontSize: "1.85rem",
              fontWeight: 600,
              lineHeight: 1.16,
              padding: "0 .2rem 1.1rem",
              minHeight: 86,
            }}
          >
            {(e.text ?? "").length > 46 ? e.text!.slice(0, 46) + "…" : e.text}
          </h3>
          <div
            style={{
              position: "relative",
              borderRadius: 16,
              overflow: "hidden",
              height: 192,
            }}
          >
            {e.media ? (
              <img
                src={e.media}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "rgba(255,255,255,.06)",
                }}
              />
            )}
            <div style={{ position: "absolute", left: 10, bottom: 10 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(0,0,0,.55)",
                  color: "#fff",
                  fontSize: ".74rem",
                  padding: ".3rem .65rem",
                  borderRadius: 8,
                }}
              >
                <GMark size={15} bg="var(--ember)" /> Day {e.day}
              </span>
            </div>
          </div>
          <div
            className="mono"
            style={{
              color: "rgba(255,255,255,.5)",
              fontSize: ".72rem",
              margin: "1.1rem .2rem .95rem",
            }}
          >
            {e.date} · {space.name}
          </div>
          <button
            onClick={() => onOpen(Math.min(i, entries.length - 1))}
            style={{
              width: "100%",
              padding: "1rem",
              borderRadius: 14,
              background: "#fff",
              color: "#15110D",
              fontWeight: 600,
              fontSize: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: ".6rem",
            }}
          >
            Open Memory <Icon name="arrow" size={18} stroke="#15110D" />
          </button>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: ".6rem",
          marginTop: ".5rem",
        }}
      >
        <button
          onClick={() => go(-1)}
          disabled={i === 0}
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: "#15110D",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: i === 0 ? 0.35 : 1,
          }}
        >
          <Icon name="back" size={20} stroke="#fff" />
        </button>
        <button
          onClick={() => go(1)}
          disabled={i === entries.length - 1}
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: "#15110D",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: i === entries.length - 1 ? 0.35 : 1,
            transform: "scaleX(-1)",
          }}
        >
          <Icon name="back" size={20} stroke="#fff" />
        </button>
      </div>
    </div>
  );
}
