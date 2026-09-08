"use client";

import { useState } from "react";
import { GlowAvatar, ChapterBadge } from "@/components/app/BondChat";
import { useToast } from "@/components/app/ToastProvider";

/**
 * The Bonds rail — Figma frame 452:10158.
 *
 * PENDING CONNECTION carries Accept / Decline per request; PEOPLE YOU MIGHT
 * KNOW offers Connect. Each action raises the matching alert from the section's
 * set (253:14786, 285:9289, 285:9261).
 */
const PENDING = [
  { id: "p1", name: "Jalen Crestwood", avatar: "/images/people/jalen.png", status: "Mid-project" },
  { id: "p2", name: "Jalen Crestwood", avatar: "/images/people/jalen.png", status: "Mid-project" },
];

const MIGHT_KNOW = [
  { id: "k1", name: "Jalen Crestwood", avatar: "/images/people/jalen.png", status: "Mid-project" },
  { id: "k2", name: "Jalen Crestwood", avatar: "/images/people/jalen.png", status: "Mid-project" },
];

export function BondsRail() {
  const toast = useToast();
  const [handled, setHandled] = useState<Record<string, string>>({});

  return (
    <aside className="hidden w-[260px] shrink-0 overflow-y-auto bg-ivory-100 px-4 py-6 lg:block xl:w-[300px] xl:px-5">
      <div className="flex flex-col gap-7">
        <section className="flex flex-col gap-4">
          <h2 className="font-sans text-base font-medium text-ink-600">
            PENDING CONNECTION
          </h2>
          <ul className="flex flex-col gap-4">
            {PENDING.map((person) => (
              <li
                key={person.id}
                className="flex flex-col gap-3 rounded-lg bg-white p-3"
              >
                <Person {...person} />
                {handled[person.id] ? (
                  <p className="font-sans text-sm text-ink-300">
                    {handled[person.id]}
                  </p>
                ) : (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setHandled((h) => ({ ...h, [person.id]: "Accepted" }));
                        toast({ title: "Connection request accepted" });
                      }}
                      className="flex-1 rounded-full bg-primary-500 px-3 py-2 font-ui text-sm font-medium text-ink-0 transition-colors hover:bg-primary-400"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHandled((h) => ({ ...h, [person.id]: "Declined" }));
                        toast({
                          title: "Connection request declined",
                          tone: "danger",
                        });
                      }}
                      className="flex-1 rounded-full bg-primary-50 px-3 py-2 font-ui text-sm font-medium text-primary-800 transition-colors hover:bg-primary-100"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        <span className="h-px w-full bg-ink-50" />

        <section className="flex flex-col gap-4">
          <h2 className="font-sans text-base font-medium text-ink-600">
            PEOPLE YOU MIGHT KNOW
          </h2>
          <ul className="flex flex-col gap-4">
            {MIGHT_KNOW.map((person) => (
              <li
                key={person.id}
                className="flex flex-col gap-3 rounded-lg bg-white p-3"
              >
                <Person {...person} />
                <button
                  type="button"
                  disabled={!!handled[person.id]}
                  onClick={() => {
                    setHandled((h) => ({ ...h, [person.id]: "Requested" }));
                    toast({ title: "Connection request sent" });
                  }}
                  className="w-full rounded-full border border-primary-500 px-3 py-2 font-ui text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50 disabled:border-ink-50 disabled:text-ink-300"
                >
                  {handled[person.id] ? "Requested" : "Connect"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
}

function Person({
  name,
  avatar,
  status,
}: {
  name: string;
  avatar: string;
  status: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <GlowAvatar src={avatar} online />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="truncate font-sans text-sm font-medium text-ink-700">
          {name}
        </span>
        <ChapterBadge label={status} />
      </span>
    </div>
  );
}
