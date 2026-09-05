"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
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
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 bg-white px-8 py-6">
        <h1 className="font-display text-2xl font-semibold text-ink-600">
          Chapter Groups
        </h1>
        <label className="flex items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={adminMode}
            onClick={() => setAdminMode((v) => !v)}
            className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
              adminMode ? "justify-end bg-primary-600" : "justify-start bg-ink-50"
            }`}
          >
            <span className="size-5 rounded-full bg-white shadow-sm" />
          </button>
          <span className="font-sans text-base text-ink-600">Admin Mode</span>
        </label>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[724px] flex-col gap-4 pb-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
            <label className="relative flex-1">
              <span className="sr-only">Search chapters</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search chapters"
                className="w-full rounded-full border border-ink-100 bg-ivory-50 px-6 py-4 font-sans text-base text-ink-500 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline-none placeholder:text-ink-200 focus:border-primary-200 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
              />
            </label>
            <Button size="lg" onClick={() => setCreating(true)}>
              Create group
            </Button>
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

