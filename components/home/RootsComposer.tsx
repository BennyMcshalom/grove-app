"use client";
import React, { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { SpaceIcon } from "@/components/ui/SpaceIcon";
import { useUserStore } from "@/store/useUserStore";
import { useToastStore } from "@/store/useToastStore";
import { useMySpaces } from "@/hooks/useSpaces";
import { PROGRESS, spaceById } from "@/lib/data";
import { postsApi } from "@/lib/api";
import type { Post } from "@/lib/types";

// ── Roots Composer ──
// A slim always-visible bar that, on any click, opens the full compose
// modal — nothing expands inline anymore.
export function RootsComposer({
  onPost,
}: {
  onPost?: (p: Post & { _mediaFile?: File }) => void;
}) {
  const { user } = useUserStore();
  const { toast } = useToastStore();
  // user.spaces is a one-time onboarding snapshot, never updated when a
  // space is opened/closed later — mySpaceSlugs is the real, live list.
  const { data: mySpaces } = useMySpaces();
  const mySpaceSlugs = (mySpaces ?? [])
    .map((s) => s.space?.slug)
    .filter((s): s is string => !!s);
  const [selectedSpace, setSelectedSpace] = useState<string | null>(null);
  // Falls back to the first open space if nothing's been picked yet, or if
  // the previously picked one was closed since.
  const activeSpace =
    selectedSpace && mySpaceSlugs.includes(selectedSpace)
      ? selectedSpace
      : (mySpaceSlugs[0] ?? "career");
  const [mode, setMode] = useState<"root" | "justgrouw">("root");
  const [open, setOpen] = useState(false);
  const [spaceMenuOpen, setSpaceMenuOpen] = useState(false);
  // Root mode
  const [doing, setDoing] = useState("");
  const [prog, setProg] = useState<string | null>(null);
  const [honest, setHonest] = useState("");
  // Just Grouv mode
  const [caption, setCaption] = useState("");
  const [anon, setAnon] = useState(false);
  const [media, setMedia] = useState<{
    type: "image" | "video";
    src: string;
    file: File;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const imageRef = React.useRef<HTMLInputElement>(null);
  const videoRef = React.useRef<HTMLInputElement>(null);

  const rootReady =
    doing.trim().length > 4 && honest.trim().length > 3 && !uploading;
  const grouwReady = !!media && caption.trim().length > 1 && !uploading;
  const ready = mode === "root" ? rootReady : grouwReady;

  function pickFile(file: File) {
    const isVideo = file.type.startsWith("video/");
    const src = URL.createObjectURL(file);
    setMedia({ type: isVideo ? "video" : "image", src, file });
  }

  const nowClock = () => {
    const d = new Date();
    return (
      String(d.getHours()).padStart(2, "0") +
      ":" +
      String(d.getMinutes()).padStart(2, "0")
    );
  };

  const uploadMedia = async () => {
    if (!media?.file) return { mediaUrl: undefined, mediaType: undefined };
    if (media.file.size > 50 * 1024 * 1024) {
      toast("Video is too large (max 50 MB). Try trimming it first.");
      throw new Error("too large");
    }
    const result = await postsApi.uploadViaProxy(media.file);
    return { mediaUrl: result.mediaUrl, mediaType: result.mediaType };
  };

  const submit = async () => {
    if (!ready) return;
    setUploading(true);

    let mediaUrl: string | undefined, mediaType: string | undefined;
    try {
      ({ mediaUrl, mediaType } = await uploadMedia());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("too large")) {
        if (msg.includes("413")) toast("Video is too large (max 50 MB).");
        else if (msg.includes("Unsupported"))
          toast("That file type isn't supported. Use MP4, MOV, or WebM.");
        else toast("Upload failed. Check your connection and try again.");
      }
      setUploading(false);
      return;
    }

    try {
      if (mode === "root") {
        await onPost?.({
          id: Date.now(),
          name: user.name,
          anon,
          space: activeSpace,
          progress: prog ?? "",
          time: "just now",
          doing: doing.trim(),
          honest: honest.trim(),
          media: mediaUrl
            ? {
                type: mediaType?.startsWith("video") ? "video" : "image",
                src: mediaUrl,
              }
            : undefined,
          roots: 0,
          comments: 0,
          kind: "roots",
          _mediaFile: media?.file,
          _mediaUrl: mediaUrl,
          _mediaType: mediaType,
        } as Post & {
          _mediaFile?: File;
          _mediaUrl?: string;
          _mediaType?: string;
        });
        setDoing("");
        setProg(null);
        setHonest("");
      } else {
        const clock = nowClock();
        const userLocation = user.location;
        await onPost?.({
          id: Date.now(),
          name: user.name,
          anon,
          space: activeSpace,
          progress: "",
          time: "just now",
          doing: "",
          honest: "",
          media: mediaUrl
            ? {
                type: mediaType?.startsWith("video") ? "video" : "image",
                src: mediaUrl,
              }
            : undefined,
          roots: 0,
          comments: 0,
          kind: "just_grouw",
          caption: caption.trim(),
          clock,
          location: userLocation || undefined,
          _mediaFile: media?.file,
          _mediaUrl: mediaUrl,
          _mediaType: mediaType,
        } as Post & {
          _mediaFile?: File;
          _mediaUrl?: string;
          _mediaType?: string;
        });
        setCaption("");
      }

      setAnon(false);
      if (media?.src) URL.revokeObjectURL(media.src);
      setMedia(null);
      setOpen(false);
    } catch {
      // onPost already surfaced its own error toast — keep the draft/modal open so the user can retry.
    } finally {
      setUploading(false);
    }
  };

  const openModal = () => setOpen(true);

  return (
    <>
      <input
        ref={imageRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pickFile(f);
          e.target.value = "";
        }}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) pickFile(f);
          e.target.value = "";
        }}
      />

      {/* Slim trigger bar — clicking anywhere on it opens the compose modal */}
      <div
        className="card"
        style={{ padding: "1.4rem", marginBottom: "1.1rem" }}
      >
        <button
          onClick={openModal}
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            gap: ".8rem",
            marginBottom: ".9rem",
            textAlign: "left",
          }}
        >
          <Avatar name={user.name} size={40} avatarUrl={user.avatar_url} />
          <span
            style={{
              flex: 1,
              padding: ".8rem 1rem",
              fontSize: ".78rem",
              fontWeight: 500,
              letterSpacing: ".02em",
              textTransform: "uppercase",
              background: "var(--surf-low)",
              border: "1.5px solid var(--border-2)",
              borderRadius: "16px",
              color: "var(--ink-3)",
            }}
          >
            {mode === "root"
              ? "What are you doing right now?"
              : "Say anything. A line is enough."}
          </span>
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: ".5rem",
          }}
        >
          <button
            onClick={openModal}
            className="chip"
            style={{
              cursor: "pointer",
              background: "var(--ember-pale)",
              color: "var(--ink-2)",
              fontWeight: 500,
            }}
          >
            <Icon
              name={mode === "root" ? "sprout" : "image"}
              size={13}
              stroke="var(--ink-3)"
            />
            {mode === "root" ? "Root a thought" : "Just Grouv"}
            <Icon name="chevron-down" size={13} stroke="var(--ink-3)" />
          </button>

          {mySpaceSlugs.length > 0 && (
            <button
              onClick={openModal}
              className="chip"
              style={{
                cursor: "pointer",
                background: "var(--ember-pale)",
                color: "var(--ink-2)",
                fontWeight: 500,
              }}
            >
              <SpaceIcon spaceId={activeSpace} size={13} />
              {spaceById(activeSpace).name}
              <Icon name="chevron-down" size={13} stroke="var(--ink-3)" />
            </button>
          )}

          <button
            onClick={openModal}
            className="chip"
            style={{
              cursor: "pointer",
              background: "var(--ember-pale)",
              color: "var(--ink-2)",
              fontWeight: 500,
            }}
          >
            <Icon name="image" size={13} stroke="var(--ink-3)" /> Photo
            <Icon name="chevron-down" size={13} stroke="var(--ink-3)" />
          </button>

          <div style={{ flex: 1 }} />

          <button
            onClick={openModal}
            className="btn btn-primary"
            style={{ minWidth: 110, opacity: ready ? 1 : 0.55 }}
          >
            {mode === "root" ? "Root this" : "Grouv it"}
          </button>
        </div>
      </div>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9000,
            background: "rgba(26,26,26,.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "1.5rem",
          }}
          onClick={() => setOpen(false)}
        >
          <div
            className="rise"
            style={{
              width: "min(520px, 94vw)",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "var(--white)",
              borderRadius: 24,
              boxShadow: "var(--shadow-lg)",
              padding: "1.6rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: avatar, name, space picker — close button */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: "1.2rem",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: ".7rem" }}
              >
                <Avatar
                  name={user.name}
                  size={44}
                  avatarUrl={user.avatar_url}
                  dot
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: "1rem" }}>
                    {user.name}
                  </div>
                  {mySpaceSlugs.length > 0 && (
                    <div style={{ position: "relative", marginTop: 4 }}>
                      <button
                        onClick={() => setSpaceMenuOpen((v) => !v)}
                        className="chip"
                        style={{
                          cursor: "pointer",
                          background: "var(--ember-pale)",
                          color: "var(--ember-deep)",
                          fontWeight: 500,
                        }}
                      >
                        <SpaceIcon spaceId={activeSpace} size={13} />
                        {spaceById(activeSpace).name}
                        <Icon
                          name="chevron-down"
                          size={13}
                          stroke="var(--ember-deep)"
                        />
                      </button>
                      {spaceMenuOpen && (
                        <div
                          className="fade-in"
                          style={{
                            position: "absolute",
                            top: "calc(100% + 6px)",
                            left: 0,
                            zIndex: 20,
                            minWidth: 180,
                            background: "var(--white)",
                            borderRadius: "var(--r-md)",
                            boxShadow: "var(--shadow-lg)",
                            border: "1px solid var(--border)",
                            overflow: "hidden",
                            maxHeight: 260,
                            overflowY: "auto",
                          }}
                        >
                          {mySpaceSlugs.map((slug) => {
                            const sp = spaceById(slug);
                            const active = slug === activeSpace;
                            return (
                              <button
                                key={slug}
                                onClick={() => {
                                  setSelectedSpace(slug);
                                  setSpaceMenuOpen(false);
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: ".55rem",
                                  width: "100%",
                                  textAlign: "left",
                                  padding: ".65rem .9rem",
                                  fontSize: ".85rem",
                                  fontWeight: 500,
                                  color: active
                                    ? "var(--ember)"
                                    : "var(--ink-2)",
                                  background: active
                                    ? "var(--ember-dim)"
                                    : "transparent",
                                }}
                              >
                                <SpaceIcon spaceId={slug} size={14} /> {sp.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name="close" size={20} stroke="var(--ink)" />
              </button>
              {spaceMenuOpen && (
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 10 }}
                  onClick={() => setSpaceMenuOpen(false)}
                />
              )}
            </div>

            {/* Full-bleed media preview — breaks out of the modal's side padding */}
            {mode === "root" && media && (
              <div
                style={{
                  position: "relative",
                  margin: "0 -1.6rem 1.3rem",
                  overflow: "hidden",
                }}
              >
                {media.type === "image" ? (
                  <img
                    src={media.src}
                    alt=""
                    style={{
                      width: "100%",
                      height: 320,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <video
                    src={media.src}
                    style={{
                      width: "100%",
                      height: 320,
                      objectFit: "cover",
                      display: "block",
                    }}
                    controls={false}
                  />
                )}
                <button
                  onClick={() => {
                    URL.revokeObjectURL(media.src);
                    setMedia(null);
                  }}
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: "rgba(26,26,26,.55)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="close" size={16} stroke="#fff" />
                </button>
              </div>
            )}

            {/* Tabs */}
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid var(--border)",
                marginBottom: "1.3rem",
              }}
            >
              {(
                [
                  ["root", "Root a thought"],
                  ["justgrouw", "Just Grouv"],
                ] as ["root" | "justgrouw", string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => {
                    setMode(id);
                    setMedia(null);
                  }}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: ".75rem 0",
                    fontSize: ".92rem",
                    fontWeight: 500,
                    color: mode === id ? "var(--ember)" : "var(--ink-3)",
                    borderBottom:
                      mode === id
                        ? "2px solid var(--ember)"
                        : "2px solid transparent",
                    marginBottom: -1,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === "root" ? (
              <>
                <div style={{ marginBottom: "1rem" }}>
                  <div
                    className="label-mono"
                    style={{ marginBottom: ".5rem", fontFamily: "inherit" }}
                  >
                    What are you doing right now?
                  </div>
                  <input
                    value={doing}
                    maxLength={100}
                    onChange={(e) => setDoing(e.target.value)}
                    style={{
                      width: "100%",
                      padding: ".8rem .9rem",
                      fontSize: ".95rem",
                      background: "var(--surf-low)",
                      border: "1.5px solid var(--border-2)",
                      borderRadius: "var(--r-md)",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--ember)";
                      e.target.style.boxShadow = "0 0 0 3px var(--ember-dim)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "var(--border-2)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <div
                    className="label-mono"
                    style={{ marginBottom: ".6rem", fontFamily: "inherit" }}
                  >
                    Where are you in it?{" "}
                    <span
                      style={{
                        textTransform: "none",
                        letterSpacing: 0,
                        color: "var(--ink-4)",
                      }}
                    >
                      · optional
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}
                  >
                    {PROGRESS.map((p) => (
                      <button
                        key={p}
                        onClick={() => setProg(prog === p ? null : p)}
                        className="chip"
                        style={{
                          cursor: "pointer",
                          padding: ".45rem .85rem",
                          background:
                            prog === p ? "var(--ember)" : "var(--ember-pale)",
                          color: prog === p ? "#fff" : "var(--ink-2)",
                          fontWeight: 500,
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: "1.1rem" }}>
                  <div
                    className="label-mono"
                    style={{ marginBottom: ".5rem", fontFamily: "inherit" }}
                  >
                    One honest thing about where you are
                  </div>
                  <textarea
                    value={honest}
                    maxLength={200}
                    onChange={(e) => setHonest(e.target.value)}
                    placeholder="The honest thing is…"
                    style={{
                      width: "100%",
                      minHeight: 96,
                      resize: "vertical",
                      padding: ".8rem .9rem",
                      fontSize: ".95rem",
                      lineHeight: 1.55,
                      background: "var(--surf-low)",
                      border: "1.5px solid var(--border-2)",
                      borderRadius: "var(--r-md)",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--ember)";
                      e.target.style.boxShadow = "0 0 0 3px var(--ember-dim)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "var(--border-2)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  <div
                    style={{
                      textAlign: "right",
                      fontSize: ".68rem",
                      color: "var(--ink-4)",
                    }}
                  >
                    {honest.length}/200
                  </div>
                </div>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: ".55rem",
                    fontSize: ".88rem",
                    color: "var(--ink-2)",
                    cursor: "pointer",
                    marginBottom: "1.1rem",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={anon}
                    onChange={(e) => setAnon(e.target.checked)}
                    style={{
                      accentColor: "var(--ember)",
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                    }}
                  />
                  Post anonymously
                </label>

                <div
                  style={{
                    borderTop: "1px solid var(--border)",
                    paddingTop: "1.1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: ".7rem",
                  }}
                >
                  <div style={{ display: "flex", gap: ".5rem" }}>
                    <button
                      onClick={() => imageRef.current?.click()}
                      className="chip"
                      style={{
                        cursor: "pointer",
                        background: "var(--surf-high)",
                        color: "var(--ink-2)",
                        fontWeight: 500,
                      }}
                    >
                      <Icon name="image" size={14} stroke="var(--ink-3)" />{" "}
                      Photo
                    </button>
                    <button
                      onClick={() => videoRef.current?.click()}
                      className="chip"
                      style={{
                        cursor: "pointer",
                        background: "var(--surf-high)",
                        color: "var(--ink-2)",
                        fontWeight: 500,
                      }}
                    >
                      <Icon name="video" size={14} stroke="var(--ink-3)" />{" "}
                      Video
                    </button>
                  </div>
                  <button
                    className="btn btn-primary"
                    disabled={!ready}
                    onClick={submit}
                    style={{ minWidth: 120 }}
                  >
                    {uploading ? "Posting…" : "Root this"}
                  </button>
                </div>
              </>
            ) : (
              <>
                {!media ? (
                  <div
                    style={{
                      display: "flex",
                      gap: ".9rem",
                      marginBottom: "1.1rem",
                    }}
                  >
                    {(
                      [
                        ["image", "Photo", "image"],
                        ["video", "Video", "video"],
                      ] as [string, string, string][]
                    ).map(([kind, label, icon]) => (
                      <button
                        key={kind}
                        onClick={() =>
                          (kind === "image"
                            ? imageRef
                            : videoRef
                          ).current?.click()
                        }
                        style={{
                          flex: 1,
                          padding: "1.8rem 1rem",
                          borderRadius: "var(--r-md)",
                          background: "var(--surf-high)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: ".6rem",
                        }}
                      >
                        <span
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: "50%",
                            background: "var(--ember-dim)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Icon name={icon} size={21} stroke="var(--ember)" />
                        </span>
                        <span style={{ fontWeight: 600, fontSize: ".9rem" }}>
                          {label}
                        </span>
                        <span
                          style={{ fontSize: ".72rem", color: "var(--ink-4)" }}
                        >
                          Upload a {label.toLowerCase()}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      position: "relative",
                      margin: "0 -1.6rem 1.1rem",
                      overflow: "hidden",
                      height: 320,
                      background: "#2a1d12",
                    }}
                  >
                    {media.type === "video" ? (
                      <video
                        src={media.src}
                        playsInline
                        preload="metadata"
                        muted
                        onLoadedMetadata={(e) => {
                          (e.target as HTMLVideoElement).currentTime = 0.01;
                        }}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <img
                        src={media.src}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    )}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(180deg, rgba(20,12,4,.5) 0%, transparent 30%, transparent 55%, rgba(20,12,4,.8) 100%)",
                        pointerEvents: "none",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: 16,
                        left: 0,
                        right: 0,
                        textAlign: "center",
                        pointerEvents: "none",
                      }}
                    >
                      <div
                        style={{
                          color: "#fff",
                          fontSize: "1.05rem",
                          fontWeight: 700,
                          letterSpacing: ".02em",
                        }}
                      >
                        {nowClock()}
                      </div>
                      {user.location && (
                        <div
                          style={{
                            color: "rgba(255,255,255,.85)",
                            fontSize: ".78rem",
                            marginTop: 4,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 4,
                          }}
                        >
                          <Icon
                            name="pin"
                            size={12}
                            stroke="rgba(255,255,255,.85)"
                          />{" "}
                          {user.location}
                        </div>
                      )}
                    </div>
                    {media.type === "video" && (
                      <span
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          pointerEvents: "none",
                        }}
                      >
                        <span
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: "50%",
                            background: "rgba(255,255,255,.9)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Icon name="play" size={22} stroke="var(--ink)" />
                        </span>
                      </span>
                    )}
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        padding: "1.2rem 1.2rem 1.3rem",
                        textAlign: "center",
                      }}
                    >
                      <p
                        style={{
                          color: "#fff",
                          fontSize: "1rem",
                          fontWeight: 500,
                          lineHeight: 1.3,
                          minHeight: "1.4em",
                          textShadow: "0 2px 12px rgba(0,0,0,.4)",
                        }}
                      >
                        {caption || "Caption here"}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        URL.revokeObjectURL(media.src);
                        setMedia(null);
                      }}
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        background: "rgba(26,26,26,.6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon name="close" size={16} stroke="#fff" />
                    </button>
                  </div>
                )}

                <div style={{ marginBottom: "1.1rem" }}>
                  <div
                    className="label-mono"
                    style={{ marginBottom: ".5rem", fontFamily: "inherit" }}
                  >
                    Caption
                  </div>
                  <textarea
                    value={caption}
                    maxLength={120}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Share a thought, feeling, or moment…"
                    style={{
                      width: "100%",
                      minHeight: 60,
                      resize: "vertical",
                      padding: ".8rem .9rem",
                      fontSize: ".95rem",
                      lineHeight: 1.5,
                      background: "var(--surf-low)",
                      border: "1.5px solid var(--border-2)",
                      borderRadius: "var(--r-md)",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--ember)";
                      e.target.style.boxShadow = "0 0 0 3px var(--ember-dim)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "var(--border-2)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  <div
                    style={{
                      textAlign: "right",
                      fontSize: ".68rem",
                      color: "var(--ink-4)",
                    }}
                  >
                    {caption.length}/120
                  </div>
                </div>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: ".55rem",
                    fontSize: ".88rem",
                    color: "var(--ink-2)",
                    cursor: "pointer",
                    marginBottom: "1.1rem",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={anon}
                    onChange={(e) => setAnon(e.target.checked)}
                    style={{
                      accentColor: "var(--ember)",
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                    }}
                  />
                  Post anonymously
                </label>

                <div
                  style={{
                    borderTop: "1px solid var(--border)",
                    paddingTop: "1.1rem",
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    className="btn btn-primary"
                    disabled={!ready}
                    onClick={submit}
                    style={{ minWidth: 120 }}
                  >
                    {uploading ? "Posting…" : "Grouv it"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
