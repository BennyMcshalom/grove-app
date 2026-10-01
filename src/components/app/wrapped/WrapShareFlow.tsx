"use client";

import { useEffect, useState, useTransition } from "react";
import { usePaywall } from "@/components/app/pass/PaywallProvider";
import { useToast } from "@/components/app/ToastProvider";
import { exportShareCard } from "@/components/app/wrapped/exportCard";
import { CheckIcon, DownloadIcon, WarningIcon } from "@/components/app/wrapped/icons";
import { ShareCard } from "@/components/app/wrapped/ShareCard";
import { FormError } from "@/components/auth/FormError";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { Button } from "@/components/ui/Button";
import { ModalHeader, ModalStatus, ModalClose } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";
import { createShareLink, previewShareText, revokeShareLink } from "@/lib/wrapped-actions";
import { weekdayLabel, wrapPeriodWord, type ShareCardData, type Wrap } from "@/lib/wrapped";

/**
 * Share a wrap — Figma 1483:22522 (Card selection), 1483:22555 (Hide
 * details), 1483:22575 (Preview), 1483:22590 (Link ready), 1483:22609
 * (Failure), 1483:22620 (Revoke this link?) and the "Link copied" /
 * "Link revoked" alerts.
 *
 * Only the one chosen card ever leaves Grouv. The preview shows the text the
 * server will actually store (names already swapped out), and "Save image"
 * exports that same card as a PNG.
 */
type Step = "select" | "hide" | "preview" | "link" | "failed";

export function WrapShareFlow({
  wrap,
  initialIndex,
  firstName,
  onBack,
  onClose,
}: {
  wrap: Wrap;
  initialIndex: number;
  firstName: string;
  /** Back to the viewer. */
  onBack: () => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const paywall = usePaywall();
  const [step, setStep] = useState<Step>("select");
  const [picked, setPicked] = useState<number>(initialIndex);
  const [hideNames, setHideNames] = useState(true);
  const [hidePhotos, setHidePhotos] = useState(false);
  const [previewBody, setPreviewBody] = useState<string | null | undefined>(undefined);
  const [link, setLink] = useState<{ id: string; url: string } | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [error, setError] = useState<string>();
  const [creating, startCreating] = useTransition();
  const [revoking, startRevoking] = useTransition();
  const [exporting, setExporting] = useState(false);

  const moment = wrap.moments[picked];
  const total = wrap.moments.length;

  // The Preview step asks the server for the exact text that will leave.
  useEffect(() => {
    if (step !== "preview") return;
    let live = true;
    previewShareText(moment.id, hideNames).then((body) => {
      if (live) setPreviewBody(body);
    });
    return () => {
      live = false;
    };
  }, [step, moment.id, hideNames]);

  const card: ShareCardData = {
    sharerName: hideNames ? null : firstName,
    range: wrap.range,
    startsOn: wrap.startsOn,
    endsOn: wrap.endsOn,
    body: previewBody ?? null,
    photoUrl: hidePhotos ? null : moment.photoUrl,
    date: moment.date,
  };
  const photoOnlyHidden = hidePhotos && !moment.body;

  const create = () => {
    setError(undefined);
    startCreating(async () => {
      const result = await createShareLink({ momentId: moment.id, hideNames, hidePhotos });
      if ("error" in result) {
        if (result.reason === "pass") {
          paywall("wrapped");
          return;
        }
        setStep("failed");
        return;
      }
      setLink(result);
      setStep("link");
    });
  };

  const save = async () => {
    setExporting(true);
    try {
      await exportShareCard(card);
      toast({ title: "Saved to your device" });
    } catch {
      toast({ title: "We couldn’t save this card", description: "Try again in a moment.", tone: "danger" });
    } finally {
      setExporting(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      toast({ title: "Link copied" });
    } catch {
      toast({ title: "Couldn’t copy the link", description: link.url, tone: "danger" });
    }
  };

  const revoke = () => {
    if (!link) return;
    setError(undefined);
    startRevoking(async () => {
      const result = await revokeShareLink(link.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setConfirmRevoke(false);
      setLink(null);
      toast({ title: "Link revoked" });
      onBack();
    });
  };

  if (step === "select") {
    return (
      <>
        <ModalHeader title="Choose a moment to share" onClose={onClose} />
        <p className="font-sans text-sm text-ink-300">
          Pick one moment or reflection from {wrapPeriodWord(wrap.range)} Wrapped. Only this card leaves Grouv — the
          rest of your Log stays private.
        </p>
        <fieldset className="flex flex-col gap-5">
          <legend className="sr-only">Moments</legend>
          {wrap.moments.map((m, i) => (
            <label key={m.id} className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="share-moment"
                checked={picked === i}
                onChange={() => setPicked(i)}
                className="mt-1.5 size-4 shrink-0 accent-primary-500"
              />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-sans text-base text-ink-800">
                  Moment {i + 1} of {total} — {weekdayLabel(m.date)}
                </span>
                <span className="line-clamp-2 font-sans text-sm text-ink-300">
                  {m.body ?? "A photo from your Grouv Log"}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="flex flex-col gap-2 pt-2">
          <Button size="sm" fullWidth onClick={() => setStep("hide")}>
            Continue
          </Button>
          <Button variant="tertiary" size="sm" fullWidth onClick={onBack}>
            Back to your wrap
          </Button>
        </div>
      </>
    );
  }

  if (step === "hide") {
    return (
      <>
        <ModalHeader title="Hide details" onClose={onClose} />
        <div className="flex flex-col gap-2 rounded-lg bg-primary-50 p-4">
          <p className="font-sans text-xs font-medium tracking-wide text-primary-600 uppercase">
            Moment {picked + 1} of {total}
          </p>
          <p className="line-clamp-3 font-sans text-base text-ink-700">{moment.body ?? "A photo from your Grouv Log"}</p>
        </div>
        <Toggle
          label="Hide names"
          description="Replace your name, Bond and chapter names with generic labels."
          checked={hideNames}
          onChange={setHideNames}
        />
        <Toggle
          label="Hide photos"
          description="Leave photos off the card, so no faces or places leave Grouv."
          checked={hidePhotos}
          onChange={setHidePhotos}
        />
        <p className="font-sans text-sm text-ink-400">
          These only change what leaves Grouv. Your private Log stays exactly as it is.
        </p>
        {photoOnlyHidden && (
          <p className="font-sans text-sm text-destructive-60">
            This moment is only a photo. Turn off Hide photos to share it, or pick another moment.
          </p>
        )}
        <div className="flex flex-col gap-2 pt-2">
          <Button
            size="sm"
            fullWidth
            disabled={photoOnlyHidden}
            onClick={() => {
              setPreviewBody(undefined);
              setStep("preview");
            }}
            iconRight={<ArrowRight className="size-4" />}
          >
            Continue
          </Button>
          <Button variant="tertiary" size="sm" fullWidth onClick={() => setStep("select")}>
            Back
          </Button>
        </div>
      </>
    );
  }

  if (step === "preview") {
    return (
      <>
        <ModalHeader title="Preview" onClose={onClose} />
        {previewBody === undefined ? (
          <div className="flex flex-col gap-4" aria-busy="true">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="aspect-[596/260] w-full rounded-2xl" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <ShareCard card={card} variant="preview" />
        )}
        <div className="flex flex-col gap-2 pt-2">
          <Button size="sm" fullWidth loading={creating} disabled={previewBody === undefined} onClick={create}>
            Create link
          </Button>
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            loading={exporting}
            disabled={previewBody === undefined}
            onClick={save}
            iconLeft={<DownloadIcon />}
          >
            Save image
          </Button>
          <Button variant="tertiary" size="sm" fullWidth onClick={() => setStep("hide")}>
            Back
          </Button>
        </div>
      </>
    );
  }

  if (step === "failed") {
    return (
      <>
        <div className="flex justify-end">
          <ModalClose onClose={onClose} />
        </div>
        <ModalStatus icon={<WarningIcon className="size-8" />} tone="danger" title="We couldn’t send this out">
          Something went wrong on our end. Your memories are safe — nothing left Grouv. Let’s try again.
        </ModalStatus>
        <div className="flex flex-col gap-2 pt-10">
          <Button size="sm" fullWidth loading={creating} onClick={create}>
            Try again
          </Button>
          <Button variant="secondary" size="sm" fullWidth onClick={onBack}>
            Cancel
          </Button>
        </div>
      </>
    );
  }

  // Link ready.
  return (
    <>
      <div className="flex justify-end">
        <ModalClose onClose={onClose} />
      </div>
      <ModalStatus icon={<CheckIcon />} title="Link ready">
        Anyone with this link can view the shared card only, nothing else about your chapter or Log.
      </ModalStatus>
      {link && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-ivory-300 px-4 py-4">
          <span className="min-w-0 truncate font-sans text-sm text-ink-700">{link.url.replace(/^https?:\/\//, "")}</span>
          <button
            type="button"
            onClick={copy}
            className="shrink-0 font-ui text-sm font-semibold text-primary-600 hover:underline"
          >
            Copy
          </button>
        </div>
      )}

      {confirmRevoke ? (
        <div role="alertdialog" aria-label="Revoke this link?" className="flex flex-col gap-3 rounded-lg border border-warning-40 bg-warning-5 p-4">
          <p className="font-sans text-base font-semibold text-ink-800">Revoke this link?</p>
          <p className="font-sans text-sm text-ink-400">
            Anyone who has it will lose access right away. This can’t be undone.
          </p>
          <FormError message={error} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmRevoke(false)}
              className="rounded-full bg-warning-20 px-4 py-2 font-ui text-sm font-medium text-warning-70 transition-colors hover:bg-warning-30"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={revoke}
              disabled={revoking}
              className="rounded-full bg-warning-60 px-4 py-2 font-ui text-sm font-medium text-white transition-colors hover:bg-warning-70 disabled:opacity-60"
            >
              {revoking ? "Revoking…" : "Revoke link"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmRevoke(true)}
          className="w-fit font-ui text-sm font-semibold text-primary-600 hover:underline"
        >
          Revoke link
        </button>
      )}

      <div className="flex flex-col gap-2">
        <Button size="sm" fullWidth onClick={onClose}>
          Done
        </Button>
        <Button
          variant="tertiary"
          size="sm"
          fullWidth
          loading={exporting}
          onClick={save}
          iconLeft={<DownloadIcon />}
        >
          Save image
        </Button>
      </div>
    </>
  );
}

/** Figma's switch rows: label and hint on the left, a pill toggle on the right. */
function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="flex flex-col gap-1">
        <span className="font-sans text-base text-ink-800">{label}</span>
        <span className="font-sans text-sm text-ink-300">{description}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary-600" : "bg-ink-50",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}
