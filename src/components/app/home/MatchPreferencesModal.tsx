"use client";

import { useEffect, useState, useTransition } from "react";
import { usePaywall } from "@/components/app/pass/PaywallProvider";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { PersonRowsSkeleton } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { loadMatchPreferences, saveMatchPreferences } from "@/lib/match-actions";
import { DISTANCE, LIFE_STAGES, LOOKING_FOR, type MatchPreferences } from "@/lib/matches";
import { cn } from "@/lib/cn";

/**
 * Match Preferences — Figma 1215:22432 (toast 1011:19250).
 *
 * PRD §5/§13: core matching and match notifications are Free; life stage,
 * what you're looking for and distance are Season Pass. Without it those
 * three controls still show (with their saved values) but each opens the
 * paywall instead of changing; the notification switch always works.
 */
export function MatchPreferencesModal({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const { hasPass } = useViewer();
  const paywall = usePaywall();
  const toast = useToast();
  const [prefs, setPrefs] = useState<MatchPreferences | null>(null);
  const [error, setError] = useState<string>();
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    let live = true;
    void loadMatchPreferences().then((p) => live && setPrefs(p));
    return () => {
      live = false;
    };
  }, []);

  /** Runs a gated change, or explains the Season Pass. */
  const gated = (change: () => void) => (hasPass ? change() : paywall("discovery"));

  const toggle = <T extends string>(list: T[], value: T) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const save = () => {
    if (!prefs) return;
    setError(undefined);
    startSaving(async () => {
      const result = await saveMatchPreferences(prefs);
      if (result.needsPass) {
        paywall("discovery");
        return;
      }
      if (result.error) {
        setError(result.error);
        return;
      }
      toast({ title: "Preferences updated. We’ll refresh your matches." });
      onSaved?.();
      onClose();
    });
  };

  const distance = prefs?.distanceKm ?? null;

  return (
    <Modal label="Match Preferences" onClose={onClose}>
      <ModalHeader title="Match Preferences" onClose={onClose} />
      <p className="font-sans text-base text-ink-500">
        Tell us more about where you are right now, and we’ll look for people who fit.
      </p>

      {prefs === null ? (
        <PersonRowsSkeleton count={3} label="Loading your preferences" />
      ) : (
        <>
          {!hasPass && (
            <button
              type="button"
              onClick={() => paywall("discovery")}
              className="rounded-lg bg-primary-50 px-4 py-3 text-left font-sans text-sm text-primary-800 transition-colors hover:bg-primary-100"
            >
              Life stage, what you’re looking for and distance are part of the Season Pass. Your matches and
              notifications stay free.
            </button>
          )}

          <ChipGroup
            label="Life stage"
            locked={!hasPass}
            options={LIFE_STAGES}
            selected={prefs.lifeStages}
            onToggle={(v) => gated(() => setPrefs({ ...prefs, lifeStages: toggle(prefs.lifeStages, v) }))}
          />
          <ChipGroup
            label="What you’re looking for"
            locked={!hasPass}
            options={LOOKING_FOR}
            selected={prefs.lookingFor}
            onToggle={(v) => gated(() => setPrefs({ ...prefs, lookingFor: toggle(prefs.lookingFor, v) }))}
          />

          <section className="flex flex-col gap-3 border-b border-ink-50 pb-6">
            <SectionLabel locked={!hasPass}>Distance</SectionLabel>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <span className="font-sans text-lg font-medium text-ink-700">
                  {distance === null ? "Any distance" : `Within ${distance} km`}
                </span>
                <span className="font-sans text-sm text-ink-300">Drag to widen or narrow your radius</span>
              </div>
              <label className="flex w-full flex-col items-center gap-1 sm:w-[246px]">
                <span className="sr-only">Distance in km</span>
                <input
                  type="range"
                  min={DISTANCE.min}
                  max={DISTANCE.max}
                  step={DISTANCE.step}
                  value={distance ?? DISTANCE.max}
                  onPointerDown={(e) => {
                    if (!hasPass) {
                      e.preventDefault();
                      paywall("discovery");
                    }
                  }}
                  onKeyDown={(e) => {
                    if (!hasPass) {
                      e.preventDefault();
                      paywall("discovery");
                    }
                  }}
                  onChange={(e) =>
                    gated(() => {
                      const km = Number(e.target.value);
                      setPrefs({ ...prefs, distanceKm: km >= DISTANCE.max ? null : km });
                    })
                  }
                  className="w-full accent-primary-500"
                />
                <span className="font-sans text-sm text-ink-500 tabular-nums">
                  {distance === null ? `${DISTANCE.max}+ km` : `${distance}km`}
                </span>
              </label>
            </div>
          </section>

          <section className="flex flex-col gap-3 border-b border-ink-50 pb-6">
            <h3 className="font-sans text-sm font-medium tracking-wide text-primary-700 uppercase">Notifications</h3>
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="font-sans text-lg font-medium text-ink-700">Notify me about new matches</span>
                <span className="font-sans text-sm text-ink-300">We’ll let you know as soon as someone new fits</span>
              </div>
              <Switch
                label="Notify me about new matches"
                checked={prefs.notify}
                onChange={(notify) => setPrefs({ ...prefs, notify })}
              />
            </div>
          </section>

          <FormError message={error} />
          <Button size="md" fullWidth loading={saving} onClick={save}>
            Save preferences
          </Button>
        </>
      )}
    </Modal>
  );
}

function SectionLabel({ locked, children }: { locked: boolean; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 font-sans text-sm font-medium tracking-wide text-ink-600 uppercase">
      {children}
      {locked && (
        <span className="flex items-center gap-1 rounded-full bg-ivory-200 px-2 py-0.5 font-sans text-xs font-medium tracking-normal text-ink-400 normal-case">
          <LockIcon />
          Season Pass
        </span>
      )}
    </h3>
  );
}

function ChipGroup<T extends string>({
  label,
  locked,
  options,
  selected,
  onToggle,
}: {
  label: string;
  locked: boolean;
  options: readonly { value: T; label: string }[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <SectionLabel locked={locked}>{label}</SectionLabel>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(o.value)}
              className={cn(
                "rounded-full px-3 py-1.5 font-sans text-sm font-medium transition-colors",
                on ? "bg-primary-500 text-white" : "bg-primary-50 text-primary-600 hover:bg-primary-100",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-3" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
