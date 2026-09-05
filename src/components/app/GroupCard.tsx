"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "@/components/ui/ArrowRight";

/**
 * Chapter group card — Figma component 178:5933 (instances 205:7820…7823).
 *
 * Glyph, title, phase badge, the member stack with its blurb and the group's
 * description, with "Admin" and "Read More" stacked down the right edge. The
 * "Show Button" property gates the Admin action, which the screen's Admin Mode
 * toggle drives.
 */
export interface Group {
  id: string;
  title: string;
  badge: string;
  blurb: string;
  description: string;
  icon: string;
  /** The text avatar closing the member stack (205:7820 → "SL"/"AU"/"CA"). */
  initials: string;
}

/** Avatar Group 94:3288 — four photos then the "SL" text avatar. */
const MEMBERS = [
  "/images/people/m1.png",
  "/images/people/m2.png",
  "/images/people/m3.png",
  "/images/people/m5.png",
];

export function GroupCard({
  group,
  adminMode = false,
}: {
  group: Group;
  adminMode?: boolean;
}) {
  // Figma draws the list twice: "Join" before you are in a group (575:17359),
  // "Admin" + "Read More" once you are (205:7424).
  const [joined, setJoined] = useState(false);
  return (
    <article className="flex gap-2 rounded-lg bg-white p-4">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-600">
        <span
          className="size-4 bg-current"
          style={{
            maskImage: `url(/icons/events/${group.icon}.svg)`,
            WebkitMaskImage: `url(/icons/events/${group.icon}.svg)`,
            maskSize: "contain",
            WebkitMaskSize: "contain",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
            maskPosition: "center",
            WebkitMaskPosition: "center",
          }}
        />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 className="font-sans text-sm font-semibold text-ink-600">
          {group.title}
        </h2>

        <span className="w-fit rounded-full bg-ivory-500 p-2 font-sans text-xs font-semibold text-ink-300">
          {group.badge}
        </span>

        <div className="flex flex-wrap items-center gap-3">
          <span className="flex">
            {MEMBERS.map((src, i) => (
              <span
                key={src}
                className="relative size-8 overflow-hidden rounded-full border-2 border-white"
                style={{ marginLeft: i === 0 ? 0 : -8 }}
              >
                <Image src={src} alt="" fill sizes="32px" className="object-cover" />
              </span>
            ))}
            <span
              className="grid size-8 place-items-center rounded-full border-2 border-white bg-primary-50 font-sans text-sm font-extrabold text-primary-600"
              style={{ marginLeft: -8 }}
            >
              {group.initials}
            </span>
          </span>
          <span className="font-sans text-xs text-ink-400">{group.blurb}</span>
        </div>

        <p className="font-sans text-xs text-ink-400">{group.description}</p>
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between gap-2">
        {joined ? (
          <>
            {adminMode ? (
              <Button
                variant="secondary"
                size="sm"
                href={`/groups/${group.id}?admin=1`}
                className="bg-ivory-500 px-3 py-2.5 text-sm text-ink-600 hover:bg-ivory-600"
              >
                Admin
              </Button>
            ) : (
              <span />
            )}
            <Link
              href={`/groups/${group.id}`}
              className="flex items-center gap-2 rounded-full px-3 py-2.5 font-ui text-sm text-primary-600 transition-colors hover:bg-primary-50"
            >
              Read More
              <ArrowRight className="size-4" />
            </Link>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setJoined(true)}
            className="flex items-center gap-2 rounded-full px-3 py-2.5 font-ui text-sm text-primary-600 transition-colors hover:bg-primary-50"
          >
            Join
            <ArrowRight className="size-4" />
          </button>
        )}
      </div>
    </article>
  );
}
