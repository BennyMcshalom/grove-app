"use client";

/* eslint-disable @next/next/no-img-element -- local previews of picked photos */
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/app/Avatar";
import { ShareSheet } from "@/components/app/ShareSheet";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { InvitationCard } from "@/components/app/invite/InvitationCard";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal, ModalHeader, ModalStatus } from "@/components/ui/Modal";
import { PersonRowsSkeleton } from "@/components/ui/Skeleton";
import { loadInvitePeople, sendChapterInvite } from "@/lib/invite-actions";
import type { Chapter } from "@/lib/chapters";
import type { InvitePerson } from "@/lib/invites";
import { cn } from "@/lib/cn";
import { removeUploads, uploadFile, UPLOAD_LIMITS } from "@/lib/upload";

const MAX_PHOTOS = 4;

interface Photo {
  path: string;
  preview: string;
}

/**
 * Invite someone into your chapter — Figma 1497:23169 (title, photo, note),
 * 1505:24264 (who: YOUR BOND and SUGGESTED PEOPLE), 1497:23440 (Preview with
 * the invited people, × to drop someone — toast 1519:783 — and + to add
 * more), then "Send Invite" (toast 1514:25098) and the share link.
 */
export function ChapterInviteModal({
  userChapterId,
  chapter,
  phase,
  onClose,
}: {
  userChapterId: string;
  chapter: Chapter;
  phase: string;
  onClose: () => void;
}) {
  const viewer = useViewer();
  const toast = useToast();
  const [step, setStep] = useState<"content" | "who" | "preview" | "sent">("content");
  const [title, setTitle] = useState(`${chapter.name}: ${phase}`);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [people, setPeople] = useState<InvitePerson[] | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string>();
  const [link, setLink] = useState<string>();
  const [sending, startSending] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const sent = useRef(false);
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    let cancelled = false;
    loadInvitePeople(chapter.slug).then((rows) => {
      if (!cancelled) setPeople(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [chapter.slug]);

  // Closing before sending leaves no orphaned uploads behind.
  useEffect(
    () => () => {
      if (!sent.current) removeUploads("media", photosRef.current.map((p) => p.path));
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview));
    },
    [],
  );

  const chosenPeople = useMemo(
    () => (people ?? []).filter((p) => chosen.includes(p.userId)),
    [people, chosen],
  );

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(undefined);
    setUploading(true);
    for (const file of Array.from(files).slice(0, MAX_PHOTOS - photos.length)) {
      if (!file.type.startsWith("image/")) {
        setError("Choose a photo.");
        continue;
      }
      if (file.size > UPLOAD_LIMITS.photoBytes) {
        setError("Photos can be up to 10 MB.");
        continue;
      }
      const uploaded = await uploadFile("media", viewer.id, file, { prefix: "invite-", fallbackExtension: "jpg" });
      if ("error" in uploaded) {
        setError(uploaded.error);
        continue;
      }
      setPhotos((prev) => [...prev, { path: uploaded.path, preview: URL.createObjectURL(file) }]);
    }
    setUploading(false);
  };

  const removePhoto = (photo: Photo) => {
    removeUploads("media", [photo.path]);
    URL.revokeObjectURL(photo.preview);
    setPhotos((prev) => prev.filter((p) => p !== photo));
  };

  const send = () =>
    startSending(async () => {
      setError(undefined);
      const result = await sendChapterInvite({
        userChapterId,
        title,
        note,
        photoPaths: photos.map((p) => p.path),
        recipients: chosen,
      });
      if (result.error || !result.token) {
        setError(result.error);
        return;
      }
      sent.current = true;
      setLink(`${window.location.origin}/i/${result.token}`);
      setStep("sent");
      if (chosenPeople.length > 0) {
        const first = chosenPeople[0].name;
        const to = chosenPeople.length === 1 ? first : `${first} and ${chosenPeople.length - 1} more`;
        toast({
          title: "Chapter invite sent",
          description: `Your invite is on its way to ${to}. They’ll need to accept before joining this chapter.`,
        });
      }
    });

  if (step === "sent" && link) {
    return (
      <Modal label="Invitation ready" onClose={onClose} width="max-w-[480px]">
        <ModalStatus icon={<LinkIcon />} title="Invitation ready">
          Share this link with anyone else you&rsquo;d like here. They&rsquo;ll see your card and can join after signing in.
        </ModalStatus>
        <ShareLink link={link} title={title} />
        <Button variant="secondary" fullWidth onClick={onClose}>
          Done
        </Button>
      </Modal>
    );
  }

  if (step === "preview") {
    return (
      <Modal label="Preview" onClose={onClose}>
        <ModalHeader title="Preview" onClose={onClose} />
        <InvitationCard
          title={title.trim()}
          subtitle="You are inviting people to join you in this chapter"
          photoUrls={photos.map((p) => p.preview)}
          note={note.trim() || null}
        >
          <div className="flex flex-col gap-3">
            <span className="font-sans text-sm font-medium text-ink-700">Invited people</span>
            <ul className="flex flex-wrap gap-4">
              {chosenPeople.map((p) => (
                <li key={p.userId} className="flex w-16 flex-col items-center gap-1">
                  <span className="relative">
                    <Avatar src={p.avatarUrl} name={p.name} sizes="40px" className="size-10" />
                    <button
                      type="button"
                      aria-label={`Remove ${p.name}`}
                      onClick={() => {
                        setChosen((prev) => prev.filter((id) => id !== p.userId));
                        toast({ title: "Removed from invite list", description: `${p.name} won’t get this invitation.` });
                      }}
                      className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-destructive-5 text-destructive-60"
                    >
                      <svg viewBox="0 0 12 12" fill="none" className="size-2.5" aria-hidden="true">
                        <path d="m3 3 6 6M9 3 3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </span>
                  <span className="w-full truncate text-center font-sans text-xs text-ink-500">{p.name}</span>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  aria-label="Invite more people"
                  onClick={() => setStep("who")}
                  className="grid size-10 place-items-center rounded-full border border-dashed border-primary-500 bg-primary-50 text-primary-600 transition-colors hover:bg-primary-100"
                >
                  +
                </button>
              </li>
            </ul>
            {chosenPeople.length === 0 && (
              <p className="font-sans text-sm text-ink-300">
                No one picked yet. You&rsquo;ll get a link to share once it&rsquo;s sent.
              </p>
            )}
          </div>
        </InvitationCard>
        <div className="flex flex-col gap-3">
          <FormError message={error} />
          <Button fullWidth loading={sending} onClick={send}>
            Send Invite
          </Button>
          <Button variant="secondary" fullWidth disabled={sending} onClick={() => setStep("content")}>
            Edit
          </Button>
        </div>
      </Modal>
    );
  }

  if (step === "who") {
    const needle = query.trim().toLowerCase();
    const match = (p: InvitePerson) => !needle || p.name.toLowerCase().includes(needle);
    const bonds = (people ?? []).filter((p) => p.group === "bond" && match(p));
    const suggested = (people ?? []).filter((p) => p.group === "suggested" && match(p));

    return (
      <Modal label="Invite someone to this chapter" onClose={onClose} className="max-h-[calc(100dvh-2rem)]">
        <div className="flex flex-col gap-4">
          <ModalHeader title="Invite someone to this chapter" onClose={onClose} />
          <p className="font-sans text-base text-ink-300">Bring someone into this part of your life.</p>
        </div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people"
          aria-label="Search people"
          iconLeft={<SearchIcon />}
        />
        <div className="-mx-1 flex min-h-0 flex-1 scroll-slim flex-col gap-6 overflow-y-auto px-1">
          {people === null ? (
            <PersonRowsSkeleton count={4} label="Loading people" />
          ) : bonds.length + suggested.length === 0 ? (
            <p className="py-6 text-center font-sans text-sm text-ink-300">
              {needle
                ? "No one by that name."
                : "No one to pick yet. Send it as a link instead — you’ll get one after sending."}
            </p>
          ) : (
            <>
              {bonds.length > 0 && (
                <PeopleGroup title="Your bond" people={bonds} chosen={chosen} onToggle={toggle} />
              )}
              {suggested.length > 0 && (
                <PeopleGroup title="Suggested people" people={suggested} chosen={chosen} onToggle={toggle} />
              )}
            </>
          )}
        </div>
        <Button fullWidth onClick={() => setStep("preview")}>
          Continue
        </Button>
      </Modal>
    );
  }

  return (
    <Modal label="Invite someone into your chapter" onClose={onClose}>
      <ModalHeader title="Invite someone into your chapter" onClose={onClose} />
      <Input
        label="Title"
        value={title}
        maxLength={120}
        onChange={(e) => setTitle(e.target.value)}
        hint="This is exactly the headline your invite will carry."
      />

      <div className="flex flex-col gap-1.5">
        <span className="font-sans text-sm font-medium text-ink-500">Photo (optional)</span>
        {photos.length > 0 && (
          <ul className="flex flex-wrap gap-3">
            {photos.map((photo) => (
              <li key={photo.path} className="relative size-20 overflow-hidden rounded-lg bg-ivory-200">
                <img src={photo.preview} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => removePhoto(photo)}
                  className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-ink-900/50 text-white"
                >
                  <svg viewBox="0 0 12 12" fill="none" className="size-2.5" aria-hidden="true">
                    <path d="m3 3 6 6M9 3 3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-lg bg-ivory-200 transition-colors hover:bg-ivory-300 disabled:opacity-60",
              photos.length ? "py-4" : "py-10",
            )}
          >
            <PhotoIcon />
            <span className="font-sans text-sm font-semibold text-ink-700">Photo</span>
            <span className="font-sans text-sm text-ink-400">{uploading ? "Uploading…" : "Upload a photo"}</span>
          </button>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            void addPhotos(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="font-sans text-sm font-medium text-ink-500">Add a note (optional)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={5}
          maxLength={1000}
          placeholder="Let them know why you’d like them here"
          className="w-full resize-y rounded-lg bg-ivory-100 px-3.5 py-2.5 font-sans text-base text-ink-500 outline-none placeholder:text-ink-200 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
        />
      </label>

      <FormError message={error} />
      <Button
        fullWidth
        disabled={!title.trim() || uploading}
        onClick={() => {
          setError(undefined);
          setStep("who");
        }}
      >
        Continue
      </Button>
    </Modal>
  );

  function toggle(userId: string) {
    setChosen((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }
}

function PeopleGroup({
  title,
  people,
  chosen,
  onToggle,
}: {
  title: string;
  people: InvitePerson[];
  chosen: string[];
  onToggle: (userId: string) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-sans text-xs font-semibold tracking-wide text-ink-300 uppercase">{title}</h3>
      <ul className="flex flex-col gap-2">
        {people.map((p) => {
          const on = chosen.includes(p.userId);
          return (
            <li key={p.userId}>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg py-2">
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar src={p.avatarUrl} name={p.name} sizes="48px" className="size-12 shrink-0" />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-sans text-base font-medium text-ink-600">{p.name}</span>
                    <span className="truncate font-sans text-xs text-ink-200">{p.detail}</span>
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => onToggle(p.userId)}
                  className="size-5 shrink-0 accent-primary-500"
                />
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The link, Copy, and Share (the phone's sheet, or Grouv's own on desktop). */
function ShareLink({ link, title }: { link: string; title: string }) {
  const toast = useToast();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-lg bg-ivory-100 px-3.5 py-2.5">
        <span className="min-w-0 flex-1 truncate font-sans text-sm text-ink-500">{link}</span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              toast({ title: "Link copied" });
            } catch {
              toast({ title: "Couldn't copy the link", tone: "danger" });
            }
          }}
          className="shrink-0 rounded-full px-3 py-1.5 font-ui text-sm font-medium text-primary-600 hover:bg-primary-50"
        >
          Copy
        </button>
      </div>
      <ShareSheet
        url={link}
        title="Join my chapter on Grouv"
        text={title}
        trigger={(open) => (
          <Button fullWidth onClick={open}>
            Share
          </Button>
        )}
      />
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-5 text-ink-300" aria-hidden="true">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="m13.5 13.5 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function PhotoIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" className="size-10 text-primary-500" aria-hidden="true">
      <path d="M4 10a3 3 0 0 1 3-3h9l3 3h14a3 3 0 0 1 3 3v17a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V10Z" fill="currentColor" />
      <rect x="13" y="15" width="14" height="12" rx="2" stroke="white" strokeWidth="1.6" />
      <path d="m14 25 4-4 3 3 2-2 3 3" stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
      <path
        d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
