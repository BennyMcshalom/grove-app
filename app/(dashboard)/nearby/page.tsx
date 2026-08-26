"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { FeatureGate } from "@/components/layout/FeatureGate";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { useUserStore } from "@/store/useUserStore";
import { useToastStore } from "@/store/useToastStore";
import { useMySpaces } from "@/hooks/useSpaces";
import { gatheringApi, type NearbyUser, type GatheringRoom } from "@/lib/api";
import { encodeGeohash } from "@/components/nearby/geohash";
import { NearbyCard } from "@/components/nearby/NearbyCard";
import { RoomCard } from "@/components/nearby/RoomCard";
import { Radar } from "@/components/nearby/Radar";

// ── Main page ──────────────────────────────────────────────────────
type Status = "off" | "requesting" | "fallback" | "active" | "denied";
type Mode = "open" | "stage" | "event";

function NearbyPageInner() {
  const { user, setUser } = useUserStore();
  const { toast } = useToastStore();

  const [status, setStatus] = useState<Status>("off");
  const [mode, setMode] = useState<Mode>("open");
  const [nearby, setNearby] = useState<NearbyUser[]>([]);
  const [rooms, setRooms] = useState<GatheringRoom[]>([]);
  const [joinedRooms, setJoined] = useState<Set<string>>(new Set());
  const [newRoom, setNewRoom] = useState("");
  const [geohash, setGeohash] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [approximate, setApprox] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef(false);

  const stopProximity = useCallback(
    async (silent = false) => {
      activeRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setStatus("off");
      setNearby([]);
      setRooms([]);
      setGeohash(null);
      // NOTE: we don't set proximity:false here on silent stop (unmount/refresh)
      // so on next mount it auto-restarts. Only explicit "Turn off" clears it.
      if (!silent) {
        setUser((u) => ({ ...u, proximity: false }));
        toast("Proximity off.");
      }
      try {
        await gatheringApi.removePresence();
      } catch {}
    },
    [setUser, toast],
  );

  const refreshAll = useCallback(
    async (hash: string, lat: number, lng: number) => {
      if (!activeRef.current) return;
      try {
        await gatheringApi.publishPresence(hash, lat, lng);
        const [people, roomList] = await Promise.all([
          gatheringApi.nearby(hash),
          gatheringApi.rooms(hash),
        ]);
        if (!activeRef.current) return;
        setNearby(people);
        setRooms(roomList);
        // Seed joined state from API so buttons are correct on first load and after refetch
        setJoined(new Set(roomList.filter((r) => r.isJoined).map((r) => r.id)));
      } catch {
        /* silent, retries on next interval */
      }
    },
    [],
  );

  const activateWithCoords = useCallback(
    async (lat: number, lng: number, approx: boolean) => {
      const precision = approx ? 4 : 5;
      const hash = encodeGeohash(lat, lng, precision);
      setGeohash(hash);
      setCoords({ lat, lng });
      setApprox(approx);
      setStatus("active");
      setUser((u) => ({ ...u, proximity: true }));
      activeRef.current = true;
      await refreshAll(hash, lat, lng);
      intervalRef.current = setInterval(
        () => refreshAll(hash, lat, lng),
        30_000,
      );
    },
    [refreshAll, setUser],
  );

  const startProximity = useCallback(() => {
    setStatus("requesting");
    const tryIPFallback = async () => {
      setStatus("fallback");
      try {
        const res = await fetch("/api/locate");
        if (!res.ok) throw new Error();
        const { lat, lng } = await res.json();
        if (typeof lat === "number" && typeof lng === "number") {
          await activateWithCoords(lat, lng, true);
          return;
        }
      } catch {}
      setStatus("denied");
    };
    if (!navigator.geolocation) {
      tryIPFallback();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await activateWithCoords(
          pos.coords.latitude,
          pos.coords.longitude,
          false,
        );
      },
      () => tryIPFallback(),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 120_000 },
    );
  }, [activateWithCoords]);

  // Auto-restart on mount if proximity was previously on (survives page refresh)
  useEffect(() => {
    if (user.proximity) startProximity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount — silent so proximity flag stays true for next mount
  useEffect(() => {
    return () => {
      stopProximity(true);
    };
  }, [stopProximity]);

  const { data: mySpaces } = useMySpaces();
  const mySpaceSlugs = (mySpaces ?? [])
    .map((s) => s.space?.slug)
    .filter((s): s is string => !!s);

  const isOn = status === "active";
  const shown =
    mode === "stage"
      ? nearby.filter((p) => p.spaces.some((s) => mySpaceSlugs.includes(s)))
      : nearby;

  const createRoom = async () => {
    if (!newRoom.trim() || !geohash || !coords) return;
    try {
      const room = await gatheringApi.createRoom({
        gatheringTag: newRoom.trim(),
        geohash,
        cellLat: coords.lat,
        cellLng: coords.lng,
      });
      setRooms((r) => [room, ...r]);
      setJoined((j) => new Set([...j, room.id]));
      setNewRoom("");
      toast("Gathering created. Others nearby can find it.");
    } catch {
      toast("Could not create gathering.");
    }
  };

  return (
    <AppShell title="Nearby">
      <div
        style={{ maxWidth: 560, margin: "0 auto", padding: "0 1.6rem 3rem" }}
      >
        {/* ── Radar — always visible ── */}
        <Radar isOn={isOn} count={nearby.length} />

        {/* ── Off state ── */}
        {!isOn && status !== "requesting" && status !== "fallback" && (
          <div
            style={{
              textAlign: "center",
              marginTop: "-1rem",
              marginBottom: "2rem",
            }}
          >
            {status !== "denied" ? (
              <>
                <h2
                  className="serif"
                  style={{
                    fontSize: "1.6rem",
                    fontWeight: 600,
                    marginBottom: ".5rem",
                  }}
                >
                  Grouv Nearby
                </h2>
                <p
                  style={{
                    color: "var(--ink-3)",
                    fontSize: ".9rem",
                    lineHeight: 1.65,
                    maxWidth: 360,
                    margin: "0 auto 1.4rem",
                  }}
                >
                  See who&apos;s in your chapter, right here, right now.
                  <br />
                  No background tracking, ever.
                </p>
                <button
                  onClick={startProximity}
                  className="btn btn-primary btn-lg btn-pill"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: ".5rem",
                    boxShadow: "0 8px 24px -8px rgba(78,125,94,.5)",
                  }}
                >
                  <Icon name="pin" size={17} stroke="#fff" /> Turn on Proximity
                </button>
                <p
                  style={{
                    fontSize: ".72rem",
                    color: "var(--ink-4)",
                    marginTop: ".8rem",
                  }}
                >
                  Turns off when you leave this page
                </p>
              </>
            ) : (
              <div
                className="card"
                style={{
                  padding: "1.3rem 1.5rem",
                  border: "1px solid var(--red-bdr)",
                  textAlign: "left",
                  maxWidth: 400,
                  margin: "0 auto",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: ".6rem",
                    marginBottom: ".6rem",
                  }}
                >
                  <Icon name="pin" size={20} stroke="var(--red)" />
                  <span style={{ fontWeight: 600 }}>Location unavailable</span>
                </div>
                <p
                  style={{
                    fontSize: ".82rem",
                    color: "var(--ink-3)",
                    lineHeight: 1.65,
                    marginBottom: ".9rem",
                  }}
                >
                  <strong>macOS:</strong> System Settings → Privacy &amp;
                  Security → Location Services → your browser →{" "}
                  <em>While Using</em>.<br />
                  Then reload and try again.
                </p>
                <button
                  onClick={() => setStatus("off")}
                  className="btn btn-soft btn-block"
                  style={{ fontSize: ".84rem" }}
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Requesting / fallback ── */}
        {(status === "requesting" || status === "fallback") && (
          <div style={{ textAlign: "center", padding: ".5rem 0 2rem" }}>
            <Spinner size={24} color="var(--sage)" />
            <p
              style={{
                marginTop: ".9rem",
                fontSize: ".9rem",
                color: "var(--ink-3)",
              }}
            >
              {status === "fallback"
                ? "Using approximate location…"
                : "Requesting your location…"}
            </p>
          </div>
        )}

        {/* ── Active state ── */}
        {isOn && (
          <div style={{ marginTop: "-1rem" }}>
            {approximate && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: ".5rem",
                  background: "var(--surf-low)",
                  borderRadius: "var(--r-sm)",
                  padding: ".5rem .9rem",
                  marginBottom: "1.1rem",
                  border: "1px solid var(--border)",
                }}
              >
                <Icon name="pin" size={14} stroke="var(--ink-3)" />
                <span
                  style={{
                    fontSize: ".76rem",
                    color: "var(--ink-3)",
                    lineHeight: 1.4,
                  }}
                >
                  Approximate location. Nearby radius is wider than usual.
                </span>
              </div>
            )}

            {/* Mode tabs */}
            <div
              style={{
                display: "flex",
                gap: 3,
                background: "var(--surf-high)",
                borderRadius: 100,
                padding: 3,
                marginBottom: "1.3rem",
                width: "fit-content",
                margin: "0 auto 1.3rem",
              }}
            >
              {(
                [
                  ["open", "Open"],
                  ["stage", "My Chapter"],
                  ["event", "Gatherings"],
                ] as [Mode, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setMode(id)}
                  style={{
                    padding: ".42rem 1rem",
                    borderRadius: 100,
                    fontSize: ".82rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    background: mode === id ? "var(--white)" : "transparent",
                    color: mode === id ? "var(--ember)" : "var(--ink-3)",
                    boxShadow: mode === id ? "var(--shadow-soft)" : "none",
                    transition: "all .15s",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── Open / My Chapter: people list ── */}
            {(mode === "open" || mode === "stage") &&
              (shown.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      marginBottom: ".7rem",
                    }}
                  >
                    <Icon
                      name="search"
                      size={28}
                      stroke="var(--ink-3)"
                      sw={1.4}
                    />
                  </div>
                  <p
                    style={{
                      fontWeight: 600,
                      color: "var(--ink-2)",
                      marginBottom: ".35rem",
                    }}
                  >
                    No one nearby right now
                  </p>
                  <p
                    style={{
                      fontSize: ".84rem",
                      color: "var(--ink-3)",
                      lineHeight: 1.55,
                    }}
                  >
                    {mode === "stage"
                      ? 'No one in your exact chapter nearby. Try "Open" to see everyone.'
                      : "Refreshes every 30 seconds. Share the app to grow your local circle."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="label-mono" style={{ marginBottom: ".8rem" }}>
                    {shown.length} {shown.length === 1 ? "person" : "people"} in
                    this ring
                  </div>
                  {shown.map((p) => (
                    <NearbyCard
                      key={p.userId}
                      person={p}
                      mySpaces={mySpaceSlugs}
                      onWave={(id) =>
                        gatheringApi.wave(id, p.spaces[0]).then(() => {})
                      }
                    />
                  ))}
                </>
              ))}

            {/* ── Gatherings ── */}
            {mode === "event" && (
              <div>
                <div
                  className="card"
                  style={{
                    padding: "1.1rem 1.3rem",
                    marginBottom: "1rem",
                    border: "1.5px dashed var(--ember-bdr)",
                    background: "var(--ember-dim)",
                    boxShadow: "none",
                  }}
                >
                  <div
                    className="label-mono"
                    style={{
                      marginBottom: ".55rem",
                      color: "var(--ember-deep)",
                    }}
                  >
                    Start a gathering here
                  </div>
                  <div style={{ display: "flex", gap: ".5rem" }}>
                    <input
                      value={newRoom}
                      onChange={(e) => setNewRoom(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") createRoom();
                      }}
                      placeholder='Name it, e.g. "founders breakfast"'
                      style={{
                        flex: 1,
                        padding: ".65rem .9rem",
                        borderRadius: "var(--r-md)",
                        fontSize: ".9rem",
                        border: "1.5px solid var(--ember-bdr)",
                        background: "var(--white)",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "var(--ember)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "var(--ember-bdr)";
                      }}
                    />
                    <button
                      onClick={createRoom}
                      disabled={!newRoom.trim()}
                      className="btn btn-primary"
                      style={{
                        padding: ".6rem 1rem",
                        flexShrink: 0,
                        opacity: newRoom.trim() ? 1 : 0.5,
                      }}
                    >
                      Create
                    </button>
                  </div>
                </div>

                {rooms.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "1.5rem 1rem",
                      color: "var(--ink-3)",
                    }}
                  >
                    <p style={{ fontSize: ".88rem", lineHeight: 1.6 }}>
                      No gatherings nearby yet.
                      <br />
                      Start one to let others find you.
                    </p>
                  </div>
                ) : (
                  <>
                    <div
                      className="label-mono"
                      style={{ marginBottom: ".8rem" }}
                    >
                      {rooms.length} gathering{rooms.length !== 1 ? "s" : ""}{" "}
                      nearby
                    </div>
                    {rooms.map((r) => (
                      <RoomCard
                        key={r.id}
                        room={r}
                        joined={joinedRooms.has(r.id)}
                        onAlreadyJoined={() =>
                          setJoined((j) => new Set([...j, r.id]))
                        }
                        onJoin={async () => {
                          await gatheringApi.joinRoom(r.id);
                          setJoined((j) => new Set([...j, r.id]));
                          setRooms((rs) =>
                            rs.map((x) =>
                              x.id === r.id
                                ? { ...x, memberCount: x.memberCount + 1 }
                                : x,
                            ),
                          );
                          toast("Joined the gathering.");
                        }}
                        onLeave={async () => {
                          await gatheringApi.leaveRoom(r.id);
                          setJoined((j) => {
                            const n = new Set(j);
                            n.delete(r.id);
                            return n;
                          });
                          setRooms((rs) =>
                            rs.map((x) =>
                              x.id === r.id
                                ? {
                                    ...x,
                                    memberCount: Math.max(0, x.memberCount - 1),
                                  }
                                : x,
                            ),
                          );
                        }}
                      />
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Turn off */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: "1.6rem",
              }}
            >
              <button
                onClick={() => stopProximity(false)}
                className="btn btn-soft btn-pill"
                style={{
                  fontSize: ".84rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: ".4rem",
                  cursor: "pointer",
                }}
              >
                <Icon name="close" size={14} stroke="var(--ink-3)" /> Turn off
                Proximity
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function NearbyPage() {
  return (
    <FeatureGate flagKey="nav_nearby">
      <NearbyPageInner />
    </FeatureGate>
  );
}
