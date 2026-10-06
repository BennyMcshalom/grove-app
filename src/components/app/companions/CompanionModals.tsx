"use client";

/* eslint-disable @next/next/no-img-element -- a local preview of the picked photo */
import { useEffect, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/app/Avatar";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { MomentPicker, momentKey, splitMomentKeys } from "@/components/app/companions/MomentPicker";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { PersonRowsSkeleton } from "@/components/ui/Skeleton";
import {
  endCompanionship,
  loadCompanionSelection,
  saveCompanionMoments,
  saveCompanionNote,
  shareCompanionUpdate,
} from "@/lib/companion-actions";
import { loadInviteSetup } from "@/lib/invite-actions";
import type { OwnerCompanion, PickableMoment } from "@/lib/invites";
import { removeUploads, uploadFile, UPLOAD_LIMITS } from "@/lib/upload";

const TEXTAREA =
  "w-full resize-y rounded-lg bg-ivory-100 px-3.5 py-2.5 font-sans text-base text-ink-500 outline-none placeholder:text-ink-200 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]";

/** "Share an update": words and an optional photo, to the companions picked (all by default). */
export function ShareUpdateModal({
  userChapterId,
  companions,
  onClose,
}: {
  userChapterId: string;
  /** Everyone walking with this chapter; only those who agreed to updates can be picked. */
  companions: OwnerCompanion[];
  onClose: () => void;
}) {
  const viewer = useViewer();
  const toast = useToast();
  const eligible = companions.filter((c) => c.share.future);
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<{ path: string; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [to, setTo] = useState<string[]>(eligible.map((c) => c.companionId));
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const shared = useRef(false);
  const photoRef = useRef(photo);
  useEffect(() => {
    photoRef.current = photo;
  }, [photo]);
  // Closing without sharing leaves no orphaned upload behind.
  useEffect(
    () => () => {
      if (!shared.current && photoRef.current) removeUploads("media", [photoRef.current.path]);
      if (photoRef.current) URL.revokeObjectURL(photoRef.current.preview);
    },
    [],
  );

  const addPhoto = async (file: File | undefined) => {
    if (!file) return;
    setError(undefined);
    if (!file.type.startsWith("image/")) return setError("Choose a photo.");
    if (file.size > UPLOAD_LIMITS.photoBytes) return setError("Photos can be up to 10 MB.");
    setUploading(true);
    const uploaded = await uploadFile("media", viewer.id, file, { prefix: "companion-", fallbackExtension: "jpg" });
    setUploading(false);
    if ("error" in uploaded) return setError(uploaded.error);
    if (photo) removeUploads("media", [photo.path]);
    setPhoto({ path: uploaded.path, preview: URL.createObjectURL(file) });
  };

  return (
    <Modal label="Share an update" onClose={onClose} width="max-w-[560px]">
      <ModalHeader title="Share an update" onClose={onClose} />
      {eligible.length === 0 ? (
        <p className="font-sans text-base text-ink-300">
          No one walking with this chapter gets updates yet. Invite someone and tick &ldquo;Future updates I choose to share&rdquo;.
        </p>
      ) : (
        <>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            maxLength={2000}
            autoFocus
            placeholder="What’s happened since? What’s next?"
            className={TEXTAREA}
          />
          {photo ? (
            <div className="relative w-fit">
              <img src={photo.preview} alt="" className="max-h-48 rounded-lg" />
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => {
                  removeUploads("media", [photo.path]);
                  URL.revokeObjectURL(photo.preview);
                  setPhoto(null);
                }}
                className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-ink-900/50 text-white"
              >
                ×
              </button>
            </div>
          ) : (
            <Button variant="secondary" size="sm" className="w-fit" loading={uploading} onClick={() => fileInput.current?.click()}>
              Add a photo
            </Button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              void addPhoto(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <div className="flex flex-col gap-2">
            <span className="font-sans text-sm font-medium text-ink-500">Share with</span>
            <ul className="flex flex-col gap-1">
              {eligible.map((c) => (
                <li key={c.companionId}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-ivory-100">
                    <input
                      type="checkbox"
                      checked={to.includes(c.companionId)}
                      onChange={() =>
                        setTo((prev) => (prev.includes(c.companionId) ? prev.filter((id) => id !== c.companionId) : [...prev, c.companionId]))
                      }
                      className="size-5 shrink-0 accent-primary-500"
                    />
                    <Avatar src={c.avatarUrl} name={c.name} sizes="32px" className="size-8" />
                    <span className="font-sans text-sm font-medium text-ink-700">{c.name}</span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="font-sans text-xs text-ink-300">Only the people ticked will see it. It never goes to your circle or your Log.</p>
          </div>
          <FormError message={error} />
          <Button
            fullWidth
            loading={pending}
            disabled={uploading || (!body.trim() && !photo) || to.length === 0}
            onClick={() =>
              startTransition(async () => {
                setError(undefined);
                const all = to.length === eligible.length;
                const result = await shareCompanionUpdate({
                  userChapterId,
                  body,
                  photoPath: photo?.path ?? null,
                  companionIds: all ? null : to,
                });
                if (result.error) return setError(result.error);
                shared.current = true;
                toast({ title: "Update shared", description: `Sent to ${to.length} ${to.length === 1 ? "person" : "people"}.` });
                onClose();
              })
            }
          >
            Share update
          </Button>
        </>
      )}
    </Modal>
  );
}

/** Edit "Where are you now?" and the next milestone. */
export function NoteModal({
  userChapterId,
  note,
  onClose,
}: {
  userChapterId: string;
  note: { whereNow: string; milestone: string; milestoneDate: string };
  onClose: () => void;
}) {
  const toast = useToast();
  const [whereNow, setWhereNow] = useState(note.whereNow);
  const [milestone, setMilestone] = useState(note.milestone);
  const [milestoneDate, setMilestoneDate] = useState(note.milestoneDate);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <Modal label="Where you are now" onClose={onClose} width="max-w-[560px]">
      <ModalHeader title="Where you are now" onClose={onClose} />
      <label className="flex flex-col gap-1.5">
        <span className="font-sans text-sm font-medium text-ink-500">Where are you now?</span>
        <textarea value={whereNow} onChange={(e) => setWhereNow(e.target.value)} rows={4} maxLength={1000} className={TEXTAREA} />
      </label>
      <div className="flex flex-col gap-1.5">
        <span className="font-sans text-sm font-medium text-ink-500">Next milestone</span>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="min-w-0 flex-1">
            <Input value={milestone} maxLength={200} onChange={(e) => setMilestone(e.target.value)} aria-label="Next milestone" />
          </div>
          <div className="sm:w-44">
            <Input type="date" value={milestoneDate} onChange={(e) => setMilestoneDate(e.target.value)} aria-label="Milestone date (optional)" />
          </div>
        </div>
      </div>
      <p className="font-sans text-xs text-ink-300">Companions who were shown your current note see the change.</p>
      <FormError message={error} />
      <Button
        fullWidth
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            setError(undefined);
            const result = await saveCompanionNote({ userChapterId, whereNow, milestone, milestoneDate });
            if (result.error) return setError(result.error);
            toast({ title: "Saved" });
            onClose();
          })
        }
      >
        Save
      </Button>
    </Modal>
  );
}

/** "Add more moments": what one companion sees from the story so far. */
export function MomentsModal({
  userChapterId,
  companion,
  onClose,
}: {
  userChapterId: string;
  companion: OwnerCompanion;
  onClose: () => void;
}) {
  const toast = useToast();
  const [moments, setMoments] = useState<PickableMoment[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadInviteSetup(userChapterId), loadCompanionSelection(companion.companionId)]).then(([setup, selection]) => {
      if (cancelled) return;
      setMoments(setup.moments);
      setPicked([
        ...selection.logEntryIds.map((id) => momentKey({ kind: "log", id })),
        ...selection.postIds.map((id) => momentKey({ kind: "post", id })),
      ]);
    });
    return () => {
      cancelled = true;
    };
  }, [userChapterId, companion.companionId]);

  return (
    <Modal label="Story so far" onClose={onClose} width="max-w-[560px]" className="max-h-[calc(100dvh-2rem)]">
      <div className="flex flex-col gap-2">
        <ModalHeader title="Story so far" onClose={onClose} />
        <p className="font-sans text-sm text-ink-300">Pick the moments {companion.name} can see. Everything else stays private.</p>
      </div>
      <div className="-mx-1 min-h-0 flex-1 scroll-slim overflow-y-auto px-1">
        {moments === null ? (
          <PersonRowsSkeleton count={3} label="Loading your moments" />
        ) : (
          <MomentPicker
            moments={moments}
            picked={picked}
            onToggle={(key) => setPicked((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))}
          />
        )}
      </div>
      <FormError message={error} />
      <Button
        fullWidth
        loading={pending}
        disabled={moments === null}
        onClick={() =>
          startTransition(async () => {
            setError(undefined);
            const { logEntryIds, postIds } = splitMomentKeys(picked);
            const result = await saveCompanionMoments(companion.companionId, logEntryIds, postIds);
            if (result.error) return setError(result.error);
            toast({ title: "Moments updated", description: `${companion.name} sees ${picked.length} ${picked.length === 1 ? "moment" : "moments"}.` });
            onClose();
          })
        }
      >
        Save
      </Button>
    </Modal>
  );
}

/** Remove a companion: their access ends at once. */
export function RemoveCompanionModal({ companion, onClose }: { companion: OwnerCompanion; onClose: () => void }) {
  const toast = useToast();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  return (
    <Modal label={`Remove ${companion.name}?`} onClose={onClose} width="max-w-[480px]">
      <ModalHeader title={`Remove ${companion.name}?`} onClose={onClose} />
      <p className="font-sans text-base text-ink-400">
        {companion.name} will stop seeing this chapter straight away — your moments, note and updates. They won&rsquo;t be
        told, and you stay connected wherever you already are.
      </p>
      <FormError message={error} />
      <div className="flex flex-col gap-3">
        <Button
          fullWidth
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await endCompanionship(companion.companionId);
              if (result.error) return setError(result.error);
              toast({ title: `${companion.name} removed`, description: "They no longer see this chapter." });
              onClose();
            })
          }
        >
          Remove
        </Button>
        <Button variant="secondary" fullWidth onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
