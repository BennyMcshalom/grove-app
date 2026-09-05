"use client";

import Image from "next/image";
import { useState } from "react";
import { TopBar } from "@/components/app/TopBar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

/**
 * Edit Profile — Figma frame 404:15153.
 *
 * Four cards in the 1096px column: UPDATE PROFILE (avatar, name, location),
 * the aura chips, the Bonds-only prompts, and per-space status. Every label,
 * placeholder and hint is Figma's (frame 404:15157).
 */
const AURAS = [
  { label: "Reflective", dot: "bg-success-50" },
  { label: "Open to connect", dot: "bg-destructive-50" },
  { label: "Deep Focus", dot: "bg-warning-40" },
  { label: "In transition", dot: "bg-white", selected: true },
  { label: "Active nearby", dot: "bg-primary-600" },
];

const BOND_PROMPTS = [
  {
    label: "Honest Tension",
    placeholder: "The thing i am not quite saying out loud",
  },
  { label: "Sitting with", placeholder: "Something unresolved" },
  { label: "Open to", placeholder: "The people or conversations i need...." },
];

const SPACES = [
  { label: "Health", value: "Building a Habit" },
  { label: "Spiritual", value: "Newly questioning" },
];

export default function EditProfilePage() {
  const [aura, setAura] = useState("In transition");
  const [name, setName] = useState("Oreoluwa");
  const [location, setLocation] = useState("");

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title="Edit Profile" />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8">
        <form
          className="mx-auto flex w-full max-w-[1096px] flex-col gap-14 pb-10"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="flex flex-col gap-6">
            <Card label="Update profile">
              <div className="relative size-20">
                <span
                  className="absolute inset-2 rounded-full"
                  style={{ boxShadow: "0px 2px 9px 9px rgba(251, 148, 31, 0.45)" }}
                />
                <Image
                  src="/images/people/jalen.png"
                  alt=""
                  width={64}
                  height={64}
                  className="absolute inset-2 size-16 rounded-full object-cover"
                />
                <label className="absolute right-0 bottom-1 grid size-8 cursor-pointer place-items-center rounded-full bg-primary-50 text-primary-600">
                  <CameraIcon />
                  <span className="sr-only">Change photo</span>
                  <input type="file" accept="image/*" className="sr-only" />
                </label>
              </div>

              <div className="flex flex-col gap-4">
                <Labelled label="Name">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={fieldClass}
                  />
                </Labelled>

                <Labelled
                  label="Location"
                  hint="Used only to surface people in your chapter nearby. Never shared precisely. Tap the target icon to detect it automatically."
                >
                  <div className="flex items-center gap-2 rounded-lg bg-ivory-100 px-3.5 py-2.5 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="City, Country"
                      className="min-w-0 flex-1 bg-transparent font-sans text-xs text-ink-500 outline-none placeholder:text-ink-500"
                    />
                    <button
                      type="button"
                      aria-label="Detect location"
                      onClick={() => setLocation("Lagos, Nigeria")}
                      className="shrink-0 text-primary-600"
                    >
                      <CrosshairIcon />
                    </button>
                  </div>
                </Labelled>
              </div>
            </Card>

            <Card label="Your aura, how your circle reads you">
              <div className="flex flex-wrap gap-2">
                {AURAS.map((a) => {
                  const on = aura === a.label;
                  return (
                    <button
                      key={a.label}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setAura(a.label)}
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
                          on ? "bg-white" : a.dot,
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
                {BOND_PROMPTS.map((p) => (
                  <Labelled key={p.label} label={p.label}>
                    <textarea
                      rows={3}
                      placeholder={p.placeholder}
                      className={cn(fieldClass, "resize-y")}
                    />
                  </Labelled>
                ))}
              </div>
            </Card>

            <Card label="Where you are in each space">
              <div className="flex flex-col gap-4">
                {SPACES.map((s) => (
                  <Labelled key={s.label} label={s.label}>
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-ivory-100 px-3.5 py-2.5 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                      <span className="font-sans text-xs text-ink-500">
                        {s.value}
                      </span>
                      <CaretDownIcon className="size-4 shrink-0 text-primary-600" />
                    </div>
                  </Labelled>
                ))}
              </div>
            </Card>
          </div>

          <Button type="submit" size="sm" fullWidth>
            Save Changes
          </Button>
        </form>
      </div>
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
    <section className="flex flex-col gap-4 rounded-lg bg-white px-6 py-4 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)]">
      <h2 className="font-sans text-base text-ink-200 uppercase">{label}</h2>
      {children}
    </section>
  );
}

function Labelled({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-sans text-sm font-medium text-ink-500">{label}</span>
      {children}
      {hint && <span className="font-sans text-sm text-ink-400">{hint}</span>}
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
