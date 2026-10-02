"use client";

import { useState, useTransition } from "react";
import { ProfileBanner } from "@/components/app/ProfileBanner";
import { useToast } from "@/components/app/ToastProvider";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { setProfileBanner } from "@/app/(app)/settings/actions";
import { BANNER_ARTS, BANNER_CATEGORIES, BANNER_COLORS } from "@/lib/banners";
import { cn } from "@/lib/cn";

const TABS = ["Colours", "Art"] as const;

/**
 * Change banner: Grouv's own solid colours, or drawn wallpapers grouped by
 * life area — like WhatsApp's chat backgrounds. Nothing is uploaded.
 */
export function BannerPicker({
  banner,
  seed,
  onClose,
}: {
  banner: string | null;
  /** The viewer's id, for the default colour in the preview. */
  seed: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const [choice, setChoice] = useState(banner);
  const [tab, setTab] = useState<(typeof TABS)[number]>(banner?.startsWith("art:") ? "Art" : "Colours");
  const [error, setError] = useState<string>();
  const [saving, startSaving] = useTransition();

  return (
    <Modal label="Change banner" onClose={onClose}>
      <ModalHeader title="Change banner" onClose={onClose} />

      <ProfileBanner banner={choice} seed={seed} className="h-20 rounded-lg" />

      <div role="tablist" className="flex">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={t === tab}
            onClick={() => setTab(t)}
            className={cn(
              "h-10 flex-1 border-b-2 px-4 py-2 font-sans text-sm font-medium text-ink-500 transition-colors",
              t === tab ? "border-primary-600" : "border-ivory-600 hover:border-ivory-700",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Colours" ? (
        <div className="grid grid-cols-5 gap-3 sm:grid-cols-10">
          {BANNER_COLORS.map((c) => {
            const key = `color:${c.key}`;
            return (
              <button
                key={c.key}
                type="button"
                aria-label={c.key}
                aria-pressed={choice === key}
                onClick={() => setChoice(key)}
                style={{ backgroundColor: c.hex }}
                className={cn(
                  "aspect-square w-full rounded-full transition-shadow",
                  choice === key && "ring-2 ring-primary-500 ring-offset-2 ring-offset-surface",
                )}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex max-h-[46vh] flex-col gap-5 scroll-slim overflow-y-auto pr-1">
          {BANNER_CATEGORIES.map((category) => (
            <section key={category} className="flex flex-col gap-2">
              <h3 className="font-sans text-xs font-semibold tracking-wide text-ink-300 uppercase">{category}</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {BANNER_ARTS.filter((a) => a.category === category).map((a) => {
                  const key = `art:${a.key}`;
                  return (
                    <button
                      key={a.key}
                      type="button"
                      aria-label={`${category}: ${a.label}`}
                      aria-pressed={choice === key}
                      onClick={() => setChoice(key)}
                      className={cn(
                        "overflow-hidden rounded-lg transition-shadow",
                        choice === key && "ring-2 ring-primary-500 ring-offset-2 ring-offset-surface",
                      )}
                    >
                      <ProfileBanner banner={key} seed={seed} className="h-16" />
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-ink-50 pt-6">
        <FormError message={error} />
        <Button
          type="button"
          size="sm"
          fullWidth
          loading={saving}
          disabled={choice === banner}
          onClick={() =>
            startSaving(async () => {
              const result = await setProfileBanner(choice);
              if (result.error) {
                setError(result.error);
                return;
              }
              toast({ title: "Banner updated" });
              onClose();
            })
          }
        >
          Save banner
        </Button>
      </div>
    </Modal>
  );
}
