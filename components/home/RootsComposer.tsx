"use client";
import React, { useState } from "react";
import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { SpaceIcon } from "@/components/ui/SpaceIcon";
import { useUserStore } from "@/store/useUserStore";
import { useToastStore } from "@/store/useToastStore";
import { useMySpaces } from "@/hooks/useSpaces";
import { PROGRESS, spaceById } from "@/lib/data";
import { postsApi } from "@/lib/api";
import type { Post } from "@/lib/types";
import styles from "./RootsComposer.module.css";

export interface RootsComposerHandle {
  open: () => void;
}

// ── Roots Composer ──
// A slim always-visible bar that, on any click, opens the full compose
// modal — nothing expands inline anymore.
export const RootsComposer = React.forwardRef<
  RootsComposerHandle,
  {
    onPost?: (p: Post & { _mediaFile?: File }) => void;
    /** Keeps the component mounted (so `ref.open()` still works) but hides the slim trigger bar */
    hideTrigger?: boolean;
  }
>(function RootsComposer({ onPost, hideTrigger }, ref) {
  const { user } = useUserStore();
  const { toast } = useToastStore();
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
  React.useImperativeHandle(ref, () => ({ open: openModal }));

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
      {!hideTrigger && (
        <div className={clsx("card", styles.triggerCard)}>
          <button onClick={openModal} className={styles.triggerRow}>
            <Avatar name={user.name} size={40} avatarUrl={user.avatar_url} />
            <span className={styles.triggerInput}>
              {mode === "root"
                ? "What are you doing right now?"
                : "Say anything. A line is enough."}
            </span>
          </button>

          <div className={styles.chipRow}>
            <button
              onClick={openModal}
              className={clsx("chip", styles.pillChip)}
            >
              <Icon
                name={mode === "root" ? "sprout" : "image"}
                size={16}
                stroke="var(--ink-3)"
              />
              {mode === "root" ? "Root a thought" : "Just Grouv"}
              <Icon name="chevron-down" size={13} stroke="var(--ink-3)" />
            </button>

            {mySpaceSlugs.length > 0 && (
              <button
                onClick={openModal}
                className={clsx("chip", styles.pillChip)}
              >
                <SpaceIcon spaceId={activeSpace} size={13} />
                {spaceById(activeSpace).name}
                <Icon name="chevron-down" size={13} stroke="var(--ink-3)" />
              </button>
            )}

            <button
              onClick={openModal}
              className={clsx("chip", styles.pillChip)}
            >
              <Icon name="image" size={13} stroke="var(--ink-3)" /> Photo
              <Icon name="chevron-down" size={13} stroke="var(--ink-3)" />
            </button>

            <div className={styles.grow} />

            <button
              onClick={openModal}
              className={clsx(
                "btn",
                "btn-primary",
                styles.submitBtn,
                !ready && styles.dimmed,
              )}
            >
              {mode === "root" ? "Root this" : "Grouv it"}
            </button>
          </div>
        </div>
      )}

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div
            className={clsx("rise", styles.modal)}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: avatar, name, space picker — close button */}
            <div className={styles.modalHeader}>
              <div className={styles.headerLeft}>
                <Avatar
                  name={user.name}
                  size={44}
                  avatarUrl={user.avatar_url}
                  dot
                />
                <div>
                  <div className={styles.userName}>{user.name}</div>
                  {mySpaceSlugs.length > 0 && (
                    <div className={styles.spaceMenuWrap}>
                      <button
                        onClick={() => setSpaceMenuOpen((v) => !v)}
                        className={clsx("chip", styles.spaceChip)}
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
                        <div className={clsx("fade-in", styles.spaceMenuList)}>
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
                                className={clsx(
                                  styles.spaceMenuItem,
                                  active && styles.active,
                                )}
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
                className={styles.closeBtn}
              >
                <Icon name="close" size={20} stroke="var(--ink)" />
              </button>
              {spaceMenuOpen && (
                <div
                  className={styles.clickCatcher}
                  onClick={() => setSpaceMenuOpen(false)}
                />
              )}
            </div>

            {/* Full-bleed media preview — breaks out of the modal's side padding */}
            {mode === "root" && media && (
              <div className={styles.mediaBand}>
                {media.type === "image" ? (
                  <img
                    src={media.src}
                    alt=""
                    className={styles.mediaBandMedia}
                  />
                ) : (
                  <video
                    src={media.src}
                    className={styles.mediaBandMedia}
                    controls={false}
                  />
                )}
                <button
                  onClick={() => {
                    URL.revokeObjectURL(media.src);
                    setMedia(null);
                  }}
                  className={styles.mediaBandClose}
                >
                  <Icon name="close" size={16} stroke="#fff" />
                </button>
              </div>
            )}

            {/* Tabs */}
            <div className={styles.tabs}>
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
                  className={clsx(styles.tab, mode === id && styles.active)}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === "root" ? (
              <>
                <div className={styles.field}>
                  <div className={clsx("label-mono", styles.fieldLabel)}>
                    What are you doing right now?
                  </div>
                  <input
                    value={doing}
                    maxLength={100}
                    onChange={(e) => setDoing(e.target.value)}
                    className={styles.textInput}
                  />
                </div>

                <div className={styles.field}>
                  <div
                    className={clsx(
                      "label-mono",
                      styles.fieldLabel,
                      styles.wide,
                    )}
                  >
                    Where are you in it?{" "}
                    <span className={styles.optionalNote}>· optional</span>
                  </div>
                  <div className={styles.progressPillsWrap}>
                    {PROGRESS.map((p) => (
                      <button
                        key={p}
                        onClick={() => setProg(prog === p ? null : p)}
                        className={clsx(
                          "chip",
                          styles.progressChip,
                          prog === p && styles.active,
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.fieldWide}>
                  <div className={clsx("label-mono", styles.fieldLabel)}>
                    One honest thing about where you are
                  </div>
                  <textarea
                    value={honest}
                    maxLength={2000}
                    onChange={(e) => setHonest(e.target.value)}
                    placeholder="The honest thing is…"
                    className={clsx(styles.textarea, styles.honestTextarea)}
                  />
                  <div className={styles.charCount}>{honest.length}/2000</div>
                </div>

                <label className={styles.anonLabel}>
                  <input
                    type="checkbox"
                    checked={anon}
                    onChange={(e) => setAnon(e.target.checked)}
                    className={styles.anonCheckbox}
                  />
                  Post anonymously
                </label>

                <div className={styles.footerRow}>
                  <div className={styles.footerLeft}>
                    <button
                      onClick={() => imageRef.current?.click()}
                      className={clsx("chip", styles.mediaChip)}
                    >
                      <Icon name="image" size={14} stroke="var(--ink-3)" />{" "}
                      Photo
                    </button>
                    <button
                      onClick={() => videoRef.current?.click()}
                      className={clsx("chip", styles.mediaChip)}
                    >
                      <Icon name="video" size={14} stroke="var(--ink-3)" />{" "}
                      Video
                    </button>
                  </div>
                  <button
                    className={clsx(
                      "btn",
                      "btn-primary",
                      styles.footerSubmitBtn,
                    )}
                    disabled={!ready}
                    onClick={submit}
                  >
                    {uploading ? "Posting…" : "Root this"}
                  </button>
                </div>
              </>
            ) : (
              <>
                {!media ? (
                  <div className={styles.uploadTilesRow}>
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
                        className={styles.uploadTile}
                      >
                        <span className={styles.uploadTileIcon}>
                          <Icon name={icon} size={21} stroke="var(--ember)" />
                        </span>
                        <span className={styles.uploadTileLabel}>{label}</span>
                        <span className={styles.uploadTileHint}>
                          Upload a {label.toLowerCase()}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className={clsx(styles.mediaBand, styles.grouv)}>
                    {media.type === "video" ? (
                      <video
                        src={media.src}
                        playsInline
                        preload="metadata"
                        muted
                        onLoadedMetadata={(e) => {
                          (e.target as HTMLVideoElement).currentTime = 0.01;
                        }}
                        className={styles.mediaBandMedia}
                      />
                    ) : (
                      <img
                        src={media.src}
                        alt=""
                        className={styles.mediaBandMedia}
                      />
                    )}
                    <div className={styles.grouvGradient} />
                    <div className={styles.grouvTopOverlay}>
                      <div className={styles.grouvClock}>{nowClock()}</div>
                      {user.location && (
                        <div className={styles.grouvLocation}>
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
                      <span className={styles.grouvPlayOverlay}>
                        <span className={styles.grouvPlayBtn}>
                          <Icon name="play" size={22} stroke="var(--ink)" />
                        </span>
                      </span>
                    )}
                    <div className={styles.grouvCaptionWrap}>
                      <p className={styles.grouvCaptionText}>
                        {caption || "Caption here"}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        URL.revokeObjectURL(media.src);
                        setMedia(null);
                      }}
                      className={styles.grouvCloseBtn}
                    >
                      <Icon name="close" size={16} stroke="#fff" />
                    </button>
                  </div>
                )}

                <div className={styles.fieldWide}>
                  <div className={clsx("label-mono", styles.fieldLabel)}>
                    Caption
                  </div>
                  <textarea
                    value={caption}
                    maxLength={120}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Share a thought, feeling, or moment…"
                    className={clsx(styles.textarea, styles.captionTextarea)}
                  />
                  <div className={styles.charCount}>{caption.length}/120</div>
                </div>

                <label className={styles.anonLabel}>
                  <input
                    type="checkbox"
                    checked={anon}
                    onChange={(e) => setAnon(e.target.checked)}
                    className={styles.anonCheckbox}
                  />
                  Post anonymously
                </label>

                <div className={clsx(styles.footerRow, styles.end)}>
                  <button
                    className={clsx(
                      "btn",
                      "btn-primary",
                      styles.footerSubmitBtn,
                    )}
                    disabled={!ready}
                    onClick={submit}
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
});
