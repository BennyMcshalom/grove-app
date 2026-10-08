"use client";

import { useEffect, useState, useTransition } from "react";
import { ImageCropper } from "@/components/app/media/ImageCropper";
import { TopBar } from "@/components/app/TopBar";
import { Avatar } from "@/components/app/Avatar";
import { ProfileBanner } from "@/components/app/ProfileBanner";
import { BannerPicker } from "@/components/app/settings/BannerPicker";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { checkUsername, updateProfile } from "@/app/(app)/settings/actions";
import { getChapter } from "@/lib/chapters";
import { cn } from "@/lib/cn";
import { AURAS, type Aura } from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";

/**
 * Edit Profile — Figma frame 404:15153.
 *
 * Four cards in the 1096px column: UPDATE PROFILE (avatar, name, location),
 * the aura chips, the Bonds-only prompts, and per-space status. Every label,
 * placeholder and hint is Figma's (frame 404:15157). Username (PRD §12) isn't
 * in the frame; it sits under Name in the same field style.
 */
const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export interface EditablePrompts {
  honestTension: string;
  sittingWith: string;
  openTo: string;
}

export function EditProfileForm({
  prompts: initialPrompts,
  username: initialUsername = "",
  bio: initialBio = "",
  birthday: initialBirthday = "",
}: {
  prompts: EditablePrompts;
  username?: string;
  /** Who sees these two is set in Settings → Privacy & AI controls. */
  bio?: string;
  /** "YYYY-MM-DD" or "". */
  birthday?: string;
}) {
  const viewer = useViewer();
  const toast = useToast();

  const [name, setName] = useState(viewer.firstName);
  const [username, setUsername] = useState(initialUsername);
  const [usernameError, setUsernameError] = useState<string>();
  const [location, setLocation] = useState(viewer.locationLabel ?? "");
  const [bio, setBio] = useState(initialBio);
  const [birthday, setBirthday] = useState(initialBirthday);
  // The coordinates behind a detected location, so saving needn't look the city up again.
  const [detected, setDetected] = useState<{ label: string; latitude: number; longitude: number } | null>(null);
  const [aura, setAura] = useState<Aura>(viewer.aura);
  const [avatarUrl, setAvatarUrl] = useState(viewer.avatarUrl);
  const [prompts, setPrompts] = useState(initialPrompts);
  const [phases, setPhases] = useState(
    Object.fromEntries(viewer.chapters.map((c) => [c.id, c.phase])),
  );
  // The space that leads under your name. The list keeps its own order.
  const [primaryId, setPrimaryId] = useState(
    viewer.chapters.find((c) => c.isPrimary)?.id ?? viewer.chapters[0]?.id ?? null,
  );

  const [error, setError] = useState<string>();
  const [nameError, setNameError] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [cropping, setCropping] = useState<{ name: string; previewUrl: string } | null>(null);
  const [locating, setLocating] = useState(false);
  const [pickingBanner, setPickingBanner] = useState(false);
  const [saving, startSaving] = useTransition();

  // Checked as it's typed, once they pause; the save checks again.
  useEffect(() => {
    const value = username.trim().toLowerCase();
    // Typing clears the last error; blank or unchanged needs no check.
    if (value === "" || value === initialUsername) return;
    let live = true;
    const timer = setTimeout(() => {
      void checkUsername(value).then((result) => {
        if (live) setUsernameError(result.available ? undefined : result.error);
      });
    }, 400);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [username, initialUsername]);

  // Uploads straight to Storage (RLS keeps it to the viewer's own folder); the
  // profile only points at the new photo once "Save Changes" succeeds.
  /** Picking a photo opens the cropper; the framed part is what uploads. */
  const chooseAvatar = (file: File) => {
    if (!AVATAR_TYPES.includes(file.type)) {
      toast({ title: "Use a PNG, JPG or WebP photo", tone: "danger" });
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast({ title: "Choose a photo under 5MB", tone: "danger" });
      return;
    }
    setCropping({ name: file.name, previewUrl: URL.createObjectURL(file) });
  };

  const uploadAvatar = async (file: Blob) => {
    setUploading(true);
    const supabase = createClient();
    const extension = (file.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
    const path = `${viewer.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
    setUploading(false);

    if (uploadError) {
      toast({ title: "That photo didn't upload. Try again.", tone: "danger" });
      return;
    }
    setAvatarUrl(supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl);
  };

  // "Tap the target icon to detect it automatically." Coordinates are rounded
  // to ~1km before being turned into "City, Country"; only a ~11km region is
  // kept (privately, for "near you").
  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "This browser can't detect your location", tone: "danger" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const params = new URLSearchParams({
            latitude: coords.latitude.toFixed(2),
            longitude: coords.longitude.toFixed(2),
            localityLanguage: "en",
          });
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`,
          );
          const place: { city?: string; locality?: string; countryName?: string } =
            await response.json();
          const city = place.city || place.locality;
          const label = [city, place.countryName].filter(Boolean).join(", ");
          setLocation(label);
          setDetected({
            label,
            latitude: Number(coords.latitude.toFixed(1)),
            longitude: Number(coords.longitude.toFixed(1)),
          });
        } catch {
          toast({ title: "We couldn't work out your city. Type it instead.", tone: "danger" });
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        toast({ title: "Location permission was declined", tone: "danger" });
      },
      { maximumAge: 10 * 60 * 1000, timeout: 10_000 },
    );
  };

  const save = () => {
    setError(undefined);
    setNameError(undefined);
    startSaving(async () => {
      const result = await updateProfile({
        firstName: name,
        locationLabel: location,
        coordinates:
          detected && detected.label === location
            ? { latitude: detected.latitude, longitude: detected.longitude }
            : null,
        aura,
        avatarUrl,
        prompts,
        phases: viewer.chapters.map((c) => ({
          userChapterId: c.id,
          slug: c.slug,
          phase: phases[c.id],
        })),
        primaryChapterId: primaryId,
        username,
        bio,
        birthday,
      });
      if (result.error || result.fieldErrors) {
        setError(result.error);
        setNameError(result.fieldErrors?.firstName);
        if (result.fieldErrors?.bio || result.fieldErrors?.birthday) {
          setError(result.fieldErrors.bio ?? result.fieldErrors.birthday);
        }
        if (result.fieldErrors?.username) setUsernameError(result.fieldErrors.username);
        return;
      }
      toast({ title: "Profile updated", tone: "confirm" });
    });
  };

  const bondPrompts = [
    {
      key: "honestTension",
      label: "Honest Tension",
      placeholder: "The thing i am not quite saying out loud",
    },
    { key: "sittingWith", label: "Sitting with", placeholder: "Something unresolved" },
    { key: "openTo", label: "Open to", placeholder: "The people or conversations i need...." },
  ] as const;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title="Edit Profile" back="/settings" />

      <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-6 lg:px-8">
        <form
          className="mx-auto flex w-full max-w-[1096px] flex-col gap-14 pb-10"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="flex flex-col gap-6">
            <Card label="Update profile">
              <div className="relative size-20">
                {/* Previews the aura picked below as the ring around the photo. */}
                <Avatar
                  src={avatarUrl}
                  name={name || viewer.firstName}
                  aura={aura}
                  sizes="64px"
                  className={cn(
                    "absolute inset-2 size-16 transition-opacity",
                    uploading && "opacity-50",
                  )}
                />
                <label className="absolute right-0 bottom-1 grid size-8 cursor-pointer place-items-center rounded-full bg-primary-50 text-primary-600">
                  <CameraIcon />
                  <span className="sr-only">
                    {uploading ? "Uploading photo…" : "Change photo"}
                  </span>
                  <input
                    type="file"
                    accept={AVATAR_TYPES.join(",")}
                    className="sr-only"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) chooseAvatar(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>

              <div className="flex flex-col gap-4">
                <Labelled label="Name" hint={nameError} error={Boolean(nameError)}>
                  <input
                    value={name}
                    maxLength={50}
                    onChange={(e) => setName(e.target.value)}
                    className={fieldClass}
                  />
                </Labelled>

                <Labelled
                  label="Username"
                  hint={usernameError ?? "Letters, numbers, dots and underscores. How people can find you."}
                  error={Boolean(usernameError)}
                >
                  <div className="flex items-center gap-0.5 rounded-lg bg-ivory-100 px-3.5 py-2.5 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] focus-within:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]">
                    <span className="font-sans text-xs text-ink-300" aria-hidden="true">@</span>
                    <input
                      value={username}
                      maxLength={30}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      onChange={(e) => {
                        setUsername(e.target.value.toLowerCase().replace(/\s/g, ""));
                        setUsernameError(undefined);
                      }}
                      placeholder="yourname"
                      aria-invalid={Boolean(usernameError)}
                      className="min-w-0 flex-1 bg-transparent font-sans text-xs text-ink-500 outline-none placeholder:text-ink-300"
                    />
                  </div>
                </Labelled>

                <Labelled
                  label="Location"
                  hint="Used only to surface people in your chapter nearby. Never shared precisely. Tap the target icon to detect it automatically."
                >
                  <div className="flex items-center gap-2 rounded-lg bg-ivory-100 px-3.5 py-2.5 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                    <input
                      value={location}
                      maxLength={120}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="City, Country"
                      className="min-w-0 flex-1 bg-transparent font-sans text-xs text-ink-500 outline-none placeholder:text-ink-500"
                    />
                    <button
                      type="button"
                      aria-label="Detect location"
                      onClick={detectLocation}
                      disabled={locating}
                      className={cn("shrink-0 text-primary-600", locating && "animate-pulse")}
                    >
                      <CrosshairIcon />
                    </button>
                  </div>
                </Labelled>

                <Labelled
                  label="Bio"
                  hint="A line or two about you. Choose who sees it, and your birthday, in Settings → Privacy & AI controls."
                >
                  <textarea
                    rows={2}
                    maxLength={300}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="What you're about right now"
                    className={cn(fieldClass, "resize-y")}
                  />
                </Labelled>

                <Labelled label="Birthday" hint="Only the day and month show on your profile, to the people you choose.">
                  <input
                    type="date"
                    value={birthday}
                    min="1900-01-01"
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setBirthday(e.target.value)}
                    className={fieldClass}
                  />
                </Labelled>
              </div>
            </Card>

            {/* Saved straight away from the picker, like the photo. */}
            <Card label="Profile banner">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <ProfileBanner banner={viewer.banner} seed={viewer.id} className="h-16 flex-1 rounded-lg" />
                <Button type="button" variant="secondary" size="sm" onClick={() => setPickingBanner(true)}>
                  Change banner
                </Button>
              </div>
              {pickingBanner && (
                <BannerPicker banner={viewer.banner} seed={viewer.id} onClose={() => setPickingBanner(false)} />
              )}
            </Card>

            <Card label="Your aura, how your circle reads you">
              <div className="flex flex-wrap gap-2">
                {AURAS.map((a) => {
                  const on = aura === a.value;
                  return (
                    <button
                      key={a.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setAura(a.value)}
                      className={cn(
                        "flex items-center gap-1 rounded-full px-2 py-1 font-sans text-xs font-medium transition-colors",
                        on
                          ? "bg-primary-600 text-white"
                          : "bg-ivory-500 text-ink-400 hover:bg-ivory-600",
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          on ? "bg-surface" : a.dot,
                        )}
                      />
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card label="Visible only to your Bonds">
              <div className="flex flex-col gap-4">
                {bondPrompts.map((p) => (
                  <Labelled key={p.key} label={p.label}>
                    <textarea
                      rows={3}
                      maxLength={1000}
                      placeholder={p.placeholder}
                      value={prompts[p.key]}
                      onChange={(e) => setPrompts({ ...prompts, [p.key]: e.target.value })}
                      className={cn(fieldClass, "resize-y")}
                    />
                  </Labelled>
                ))}
              </div>
            </Card>

            {viewer.chapters.length > 0 && (
              <Card label="Where you are in each space">
                <div className="flex flex-col gap-4">
                  {viewer.chapters.map((held) => {
                    const chapter = getChapter(held.slug);
                    if (!chapter) return null;
                    const primary = held.id === primaryId;
                    return (
                      <Labelled
                        key={held.id}
                        label={chapter.name}
                        trailing={
                          <button
                            type="button"
                            aria-pressed={primary}
                            onClick={() => setPrimaryId(held.id)}
                            className={cn(
                              "rounded-full px-2.5 py-0.5 font-sans text-xs font-medium transition-colors",
                              primary
                                ? "bg-primary-500 text-white"
                                : "bg-ivory-200 text-ink-500 hover:bg-ivory-300",
                            )}
                          >
                            {primary ? "Primary" : "Make primary"}
                          </button>
                        }
                      >
                        <div className="relative">
                          <select
                            value={phases[held.id]}
                            onChange={(e) => setPhases({ ...phases, [held.id]: e.target.value })}
                            className={cn(fieldClass, "appearance-none pr-9")}
                          >
                            {chapter.options.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          <CaretDownIcon className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-primary-600" />
                        </div>
                      </Labelled>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <FormError message={error} />
            <Button type="submit" size="sm" fullWidth loading={saving} disabled={uploading || Boolean(usernameError)}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      {cropping && (
        <ImageCropper
          file={cropping}
          onCancel={() => {
            URL.revokeObjectURL(cropping.previewUrl);
            setCropping(null);
          }}
          onApply={(blob) => {
            URL.revokeObjectURL(cropping.previewUrl);
            setCropping(null);
            void uploadAvatar(blob);
          }}
        />
      )}
    </div>
  );
}

const fieldClass =
  "w-full rounded-lg bg-ivory-100 px-3.5 py-2.5 font-sans text-xs text-ink-500 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline-none placeholder:text-ink-300 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]";

function Card({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-lg bg-surface px-6 py-4 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)]">
      <h2 className="font-sans text-base text-ink-200 uppercase">{label}</h2>
      {children}
    </section>
  );
}

function Labelled({
  label,
  hint,
  error = false,
  trailing,
  children,
}: {
  label: string;
  hint?: string;
  error?: boolean;
  /** A control beside the label, e.g. "Make primary". Kept out of the <label>. */
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  const hintText = hint && (
    <span className={cn("font-sans text-sm", error ? "text-destructive-60" : "text-ink-400")}>{hint}</span>
  );

  if (trailing) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="flex items-center justify-between gap-3">
          <span className="font-sans text-sm font-medium text-ink-500">{label}</span>
          {trailing}
        </span>
        <label className="flex flex-col">
          <span className="sr-only">{label}</span>
          {children}
        </label>
        {hintText}
      </div>
    );
  }

  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-sans text-sm font-medium text-ink-500">{label}</span>
      {children}
      {hintText}
    </label>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-5" aria-hidden="true">
      <path
        d="M3 7h3l1.2-2h5.6L14 7h3v9H3V7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="11" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function CrosshairIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M8 1v2M8 13v2M1 8h2M13 8h2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CaretDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="m4 6 4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
