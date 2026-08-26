"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { richText } from "@/lib/richText";
import {
  useNotifications,
  useMarkNotifRead,
  useMarkAllNotifsRead,
  useClearAllNotifs,
} from "@/hooks/useNotifications";
import { useSpaceStore } from "@/store/useSpaceStore";
import type { NotifRecord } from "@/lib/api";
import { formatRelativeTime } from "@/lib/mappers";

interface TopBarProps {
  title: string;
  dark?: boolean;
}

interface NotifMeta {
  title: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
}

function notifMeta(n: NotifRecord): NotifMeta {
  const p = n.payload as Record<string, string>;
  switch (n.type) {
    case "bond_invitation":
      return {
        title: "You have a new Bond invitation",
        label: `**${p.fromName ?? "Someone"}** invited you into a Bond.`,
        icon: "bonds",
        color: "var(--ember-deep)",
        bg: "var(--ember-dim)",
      };
    case "circle_promoted":
      return {
        title: "You formed a new Bond",
        label: `You and **${p.otherName ?? "a connection"}** just became a Bond.`,
        icon: "sprout",
        color: "var(--sage)",
        bg: "var(--green-dim)",
      };
    case "bond_anniversary":
      return {
        title: "A Bond milestone was reached",
        label: `Your Bond with **${p.otherName ?? "a connection"}** hit a milestone.`,
        icon: "sprout",
        color: "var(--sage)",
        bg: "var(--green-dim)",
      };
    case "connection_request":
      return {
        title: "We found someone you might connect with",
        label: `**${p.fromName ?? "Someone"}** wants to connect.`,
        icon: "bonds",
        color: "var(--ember-deep)",
        bg: "var(--ember-dim)",
      };
    case "new_message":
      return {
        title: "You have a new message",
        label: `New message from **${p.fromName ?? "a Bond"}**.`,
        icon: "comment",
        color: "var(--slate)",
        bg: "var(--slate-dim)",
      };
    case "post_comment":
      return {
        title: "New comment on your post",
        label: `**${p.fromName ?? "Someone"}** commented on your post.`,
        icon: "comment",
        color: "var(--sage)",
        bg: "var(--green-dim)",
      };
    case "post_reaction":
      return {
        title: "Someone rooted your post",
        label: `**${p.fromName ?? "Someone"}** rooted your post${p.emoji ? ` ${p.emoji}` : ""}.`,
        icon: "sprout",
        color: "var(--ember)",
        bg: "var(--ember-dim)",
      };
    case "introduction":
      return {
        title: "You were introduced to someone",
        label: `**${p.introducerName ?? "Someone"}** introduced you to **${p.otherName ?? "someone"}**.`,
        icon: "wave",
        color: "var(--amber)",
        bg: "var(--amber-dim)",
      };
    case "proximity_wave":
    case "wave":
      return {
        title: "Someone waved at you nearby",
        label: "Someone nearby waved at you.",
        icon: "pin",
        color: "var(--amber)",
        bg: "var(--amber-dim)",
      };
    case "morning_curio":
      return {
        title: "Your morning card is ready",
        label: "Open it while it's still fresh.",
        icon: "sun",
        color: "var(--amber)",
        bg: "var(--amber-dim)",
      };
    case "content_removed":
      return {
        title: "A post was removed",
        label: "One of your posts was removed for violating our guidelines.",
        icon: "flag",
        color: "var(--red)",
        bg: "var(--red-dim)",
      };
    default:
      return {
        title: "Notification",
        label: (p.message as string) ?? n.type,
        icon: "bell",
        color: "var(--ink-3)",
        bg: "var(--surf-high)",
      };
  }
}

function notifHref(
  n: NotifRecord,
  slugById: (id: string) => string | undefined,
): string {
  const p = n.payload as Record<string, string>;
  switch (n.type) {
    case "post_comment":
    case "post_reaction": {
      const slug = p.spaceId ? slugById(p.spaceId) : undefined;
      return p.postId && slug ? `/spaces/${slug}?post=${p.postId}` : "/home";
    }
    case "proximity_wave":
    case "wave":
      return "/nearby";
    case "morning_curio":
      return "/morning";
    case "content_removed":
      return "/archive";
    default:
      return "/bonds";
  }
}

function NotifPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { data: notifs, isLoading } = useNotifications();
  const { slugById } = useSpaceStore();
  const markRead = useMarkNotifRead();
  const markAll = useMarkAllNotifsRead();
  const clearAll = useClearAllNotifs();

  const items = notifs ?? [];
  const unreadCount = items.filter((n) => !n.readAt).length;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 8000,
        background: "rgba(26,26,26,.35)",
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 400,
          maxWidth: "92vw",
          height: "100%",
          background: "var(--white)",
          display: "flex",
          flexDirection: "column",
          animation: "slideIn .28s ease both",
          borderLeft: "1px solid var(--border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "1.5rem 1.4rem 1.1rem",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-.01em" }}>
              Notifications
            </h2>
            {unreadCount > 0 && (
              <button
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                style={{
                  fontSize: ".78rem",
                  color: "var(--ember)",
                  fontWeight: 500,
                  marginTop: 4,
                }}
              >
                Mark all read
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="close" size={22} stroke="var(--ink)" />
          </button>
        </div>

        <div className="scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 1.1rem 1rem" }}>
          {isLoading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "2rem",
              }}
            >
              <Spinner />
            </div>
          ) : items.length === 0 ? (
            <div
              className="card"
              style={{
                background:
                  "linear-gradient(160deg, var(--amber-dim), var(--slate-dim))",
                margin: ".5rem",
              }}
            >
              <EmptyState variant="notifications" />
            </div>
          ) : (
            items.map((n) => {
              const meta = notifMeta(n);
              const unread = !n.readAt;
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    if (unread) markRead.mutate(n.id);
                    router.push(notifHref(n, slugById));
                    onClose();
                  }}
                  style={{
                    position: "relative",
                    display: "flex",
                    width: "100%",
                    textAlign: "left",
                    gap: ".85rem",
                    padding: "1.1rem",
                    borderRadius: "var(--r-lg)",
                    marginBottom: ".8rem",
                    background: "var(--surf-low)",
                  }}
                >
                  {unread && (
                    <span
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: meta.color,
                      }}
                    />
                  )}
                  <span
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: "var(--r-md)",
                      flexShrink: 0,
                      background: meta.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon
                      name={meta.icon}
                      size={20}
                      stroke={meta.color}
                      sw={1.7}
                    />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: ".92rem", fontWeight: 700, color: "var(--ink)", lineHeight: 1.35 }}>
                      {meta.title}
                    </p>
                    <p style={{ fontSize: ".84rem", color: "var(--ink-3)", lineHeight: 1.5, marginTop: 2 }}>
                      {richText(meta.label)}
                    </p>
                    <span style={{ fontSize: ".72rem", color: "var(--ink-4)", display: "block", marginTop: 5 }}>
                      {formatRelativeTime(n.createdAt)}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div style={{ padding: "1rem 1.1rem", flexShrink: 0, borderTop: "1px solid var(--border)" }}>
            <button
              onClick={() => clearAll.mutate(items.map(n => n.id))}
              disabled={clearAll.isPending}
              className="btn btn-primary btn-block btn-pill"
            >
              {clearAll.isPending ? "Clearing…" : "Clear Notifications"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Play a soft two-tone chime using Web Audio API — no audio file needed */
function playNotifSound() {
  try {
    const ctx = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    )();
    const tones = [880, 1100];
    tones.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
      osc.start(start);
      osc.stop(start + 0.28);
    });
  } catch {}
}

// Bell icon + unread dot + notification-sound effect + slide-in panel.
// Standalone so it can sit inside TopBar or any other header (e.g. Home's
// shared header row above the main+right columns).
export function NotifBell({ dark }: { dark?: boolean }) {
  const [notifs, setNotifs] = useState(false);
  const { data: notifData } = useNotifications();
  const unread = (notifData ?? []).filter((n) => !n.readAt).length;
  const prevUnread = useRef(unread);

  useEffect(() => {
    if (unread > prevUnread.current) playNotifSound();
    prevUnread.current = unread;
  }, [unread]);

  const sub = dark ? "rgba(250,250,248,.55)" : "var(--ink-3)";

  return (
    <>
      <button
        onClick={() => setNotifs(true)}
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <Icon name="bell" stroke={sub} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: 7,
              right: 8,
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--ember)",
              border: "2px solid var(--white)",
            }}
          />
        )}
      </button>
      {notifs && <NotifPanel onClose={() => setNotifs(false)} />}
    </>
  );
}

export function TopBar({ title, dark }: TopBarProps) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  // Listen to the scrollable content area below this header
  useEffect(() => {
    const el = document.querySelector(".app-content");
    if (!el) return;
    const onScroll = () => setScrolled(el.scrollTop > 10);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const c = dark ? "rgba(250,250,248,.92)" : "var(--ink)";
  const sub = dark ? "rgba(250,250,248,.55)" : "var(--ink-3)";

  return (
    <header
      className={`app-topbar${dark ? " app-topbar-dark" : ""}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "1.15rem 1.6rem .9rem",
        flexShrink: 0,
        background: dark ? "var(--forest)" : "var(--bg)",
        borderBottom: scrolled
          ? "1px solid var(--border)"
          : "1px solid transparent",
        boxShadow: scrolled ? "var(--shadow-soft)" : "none",
        transition: "border-color .2s, box-shadow .2s",
      }}
    >
      <h1
        className="serif app-topbar-title"
        style={{
          fontSize: "1.9rem",
          fontWeight: 600,
          color: c,
          letterSpacing: ".005em",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </h1>
      <div style={{ display: "flex", alignItems: "center", gap: ".3rem" }}>
        <button
          onClick={() => router.push("/search")}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="search" stroke={sub} />
        </button>
        <NotifBell dark={dark} />
        {/* Settings — only shown on mobile where the sidebar (with its own Settings/theme access) is hidden */}
        <button
          onClick={() => router.push("/settings")}
          className="mobile-settings-btn"
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            display: "none",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="gear" size={18} stroke={sub} />
        </button>
      </div>
    </header>
  );
}
