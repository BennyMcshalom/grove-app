"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TopBar } from "@/components/app/TopBar";
import { GroupCard } from "@/components/app/GroupCard";
import { EmptyState } from "@/components/app/EmptyState";
import { SuggestedRail } from "@/components/app/SuggestedRail";
import { GROUPS } from "@/lib/groups";
import { CreateGroupModal } from "@/components/app/CreateGroupModal";

/**
 * Chapter Groups — Figma frame 177:3542 (the "My Group" section).
 *
 * Title bar with an Admin Mode toggle, a search pill beside "Create group",
 * then group cards. Card copy is Figma's (component 178:5933), including its
 * lorem-ipsum description placeholder.
 */
export default function GroupsPage() {
  const [adminMode, setAdminMode] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const visible = GROUPS.filter((g) =>
    query ? g.title.toLowerCase().includes(query.toLowerCase()) : true,
  );

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <TopBar
        title="Chapter Groups"
        back="/spaces"
        desktopActions={<AdminToggle on={adminMode} onChange={setAdminMode} />}
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[724px] flex-col gap-4 pb-10">
          <div className="flex items-center gap-3 sm:gap-8">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search chapters</span>
              <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-300" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search chapters"
                className="w-full rounded-full border border-ink-100 bg-ivory-50 py-3 pr-4 pl-11 font-sans text-base text-ink-500 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline-none placeholder:text-ink-200 focus:border-primary-200 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)] sm:px-6 sm:py-4 sm:pl-12"
              />
            </label>
            <Button
              size="sm"
              className="shrink-0 sm:h-14 sm:px-8 sm:text-base"
              onClick={() => setCreating(true)}
            >
              Create group
            </Button>
          </div>

          {/* Frame 628:45544 hangs the toggle under the search row on a phone;
              on desktop it lives in the header instead. */}
          <div className="flex justify-end lg:hidden">
            <AdminToggle on={adminMode} onChange={setAdminMode} />
          </div>

          {visible.length === 0 ? (
            /* Frame 648:35986 — the "No Group" state. */
            <EmptyState
              title="No Group"
              body="It seems there are no Group added yet"
              action={
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex items-center gap-2 rounded-full px-4 py-2 font-ui text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50"
                >
                  <span aria-hidden="true" className="text-lg leading-none">
                    +
                  </span>
                  Add new group
                </button>
              }
            />
          ) : (
            <ul className="flex flex-col gap-4">
              {visible.map((group) => (
                <li key={group.id}>
                  <GroupCard group={group} adminMode={adminMode} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {creating && <CreateGroupModal onClose={() => setCreating(false)} />}
      </div>

      <SuggestedRail />
    </div>
  );
}

/** Figma 177:3548 — the Admin Mode switch, 44x24 with a 20px knob. */
function AdminToggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
          on ? "justify-end bg-primary-600" : "justify-start bg-ink-50"
        }`}
      >
        <span className="size-5 rounded-full bg-white shadow-sm" />
      </button>
      <span className="font-sans text-base text-ink-600">Admin Mode</span>
    </label>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="m11 11 3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

