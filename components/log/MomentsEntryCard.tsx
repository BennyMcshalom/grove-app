"use client";
import { useState, useRef } from "react";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import { SpaceIcon } from "@/components/ui/SpaceIcon";
import { Spinner } from "@/components/ui/Spinner";
import type { Space } from "@/lib/types";
import type { LogEntry } from "./types";
import { GMark } from "./GMark";
import styles from "./MomentsEntryCard.module.css";

// ── Daily entry — tactile "greeting card" composer ──────────────────
export function MomentsEntryCard({
  space,
  prompt,
  onPost,
  onEdit,
  posted,
  todayEntry,
  submitting,
}: {
  space: Space;
  prompt: string;
  onPost: (text: string, file?: File) => void;
  onEdit: (entryId: string, text: string, file?: File) => void;
  posted: boolean;
  todayEntry: LogEntry | null;
  submitting?: boolean;
}) {
  const [text, setText] = useState("");
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const ready = text.trim().length > 2 && !submitting;

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const r = new FileReader();
    r.onload = () => setImgSrc(r.result as string);
    r.readAsDataURL(f);
    e.target.value = "";
  };

  const startEdit = () => {
    setText(todayEntry?.text ?? "");
    setImgSrc(todayEntry?.media ?? null);
    setFile(null);
    setEditing(true);
    setOpen(true);
  };

  const cancel = () => {
    setEditing(false);
    setOpen(false);
    setText("");
    setImgSrc(null);
    setFile(null);
  };

  const save = () => {
    if (editing && todayEntry?.id)
      onEdit(todayEntry.id, text.trim(), file ?? undefined);
    else onPost(text.trim(), file ?? undefined);
    setText("");
    setImgSrc(null);
    setFile(null);
    setOpen(false);
    setEditing(false);
  };

  // ── Sealed state — editable until midnight ──
  if (posted && !editing) {
    return (
      <div className={styles.centerWrap}>
        <div className={clsx("log-card-shadow", styles.sealedCard)}>
          {todayEntry?.media && (
            <div className={styles.sealedMediaWrap}>
              <img
                src={todayEntry.media}
                alt=""
                className={styles.sealedMedia}
              />
            </div>
          )}
          <div className={styles.sealedBody}>
            <div className={styles.stamp}>Today&apos;s moment, sealed</div>
            {todayEntry?.text && (
              <p className={clsx("serif", styles.sealedText)}>
                {todayEntry.text}
              </p>
            )}
            <button onClick={startEdit} className={styles.editLink}>
              <Icon name="image" size={15} stroke="var(--ember)" /> Edit
              today&apos;s moment
            </button>
          </div>
          <div className={styles.footerBar}>
            <div>
              <div className={styles.footerTitle}>Entry sealed</div>
              <div className={styles.footerSub}>editable until midnight</div>
            </div>
            <GMark size={22} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.centerWrap}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={pickFile}
        style={{ display: "none" }}
      />
      <div
        className={clsx(
          "log-card-shadow",
          styles.composerCard,
          open && styles.open,
        )}
      >
        <div className={styles.composerBody}>
          <div className={clsx("label-mono", styles.composerLabel)}>
            <SpaceIcon spaceId={space.id} size={12} /> {space.name} ·{" "}
            {editing ? "Editing today" : "Today"}
          </div>
          <p className={clsx("serif", styles.promptText)}>{prompt}</p>

          {!open ? (
            <button
              onClick={() => setOpen(true)}
              className={clsx("btn", "btn-soft", "btn-block", styles.writeBtn)}
            >
              <Icon name="plus" size={17} stroke="var(--ink-2)" /> Write
              today&apos;s moment
            </button>
          ) : (
            <div className="swap-in">
              {imgSrc ? (
                <div className={styles.imgPreviewWrap}>
                  <img src={imgSrc} alt="" className={styles.imgPreview} />
                  <button
                    onClick={() => {
                      setImgSrc(null);
                      setFile(null);
                    }}
                    className={styles.imgRemoveBtn}
                  >
                    <Icon name="close" size={13} stroke="#fff" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className={styles.uploadBtn}
                >
                  <Icon name="image" size={20} stroke="var(--ember)" />
                  <span className={styles.uploadHint}>Add a photo</span>
                </button>
              )}
              <textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 140))}
                placeholder="One honest line about today…"
                className={styles.textareaEntry}
              />
              <div className={styles.actionsRow}>
                <span className={clsx("mono", styles.charCount)}>
                  {text.length}/140
                </span>
                <div className={styles.btnGroup}>
                  {editing && (
                    <button
                      onClick={cancel}
                      className={clsx("btn", "btn-soft", styles.cancelBtn)}
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    className={clsx("btn", "btn-primary", styles.saveBtn)}
                    disabled={!ready}
                    onClick={save}
                  >
                    {submitting ? (
                      <Spinner size={14} color="#fff" />
                    ) : editing ? (
                      "Update"
                    ) : (
                      "Seal entry"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className={styles.footerBar}>
          <div>
            <div className={clsx(styles.footerTitle, styles.composer)}>
              {editing ? "Editing entry" : "New Entry"}
            </div>
            <div className={clsx(styles.footerSub, styles.composer)}>
              the story of your life
            </div>
          </div>
          <GMark size={24} />
        </div>
      </div>
    </div>
  );
}
