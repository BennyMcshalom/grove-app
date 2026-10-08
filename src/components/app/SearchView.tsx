"use client";

import { BackButton } from "@/components/app/BackButton";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/app/Avatar";
import { SearchArt } from "@/components/app/home/MatchesModal";
import { Button } from "@/components/ui/Button";
import { PersonRowsSkeleton } from "@/components/ui/Skeleton";
import { useViewer } from "@/components/app/ViewerProvider";
import { getChapter } from "@/lib/chapters";
import { cn } from "@/lib/cn";
import { searchEverything, type SearchResult } from "@/lib/search";

/**
 * Search — Figma frames 123:10150 (desktop) and 628:35194 (phone).
 *
 * A pill input (812x72, 123px radius, ivory-50 on a text-100 border) above the
 * heading and suggestion chips (frame 123:10158). Typing searches as you go;
 * results are grouped People / Posts / Groups / Spaces, which Figma has no
 * frame for.
 */
const GROUPS: { kind: SearchResult["kind"]; label: string }[] = [
  { kind: "person", label: "People" },
  { kind: "post", label: "Posts" },
  { kind: "group", label: "Groups" },
  { kind: "space", label: "Spaces" },
];

export function SearchView({
  initialQuery,
  initialResults,
  initialFailed = false,
}: {
  initialQuery: string;
  initialResults: SearchResult[] | null;
  /** The server's search failed: start on the error state (1206:22696). */
  initialFailed?: boolean;
}) {
  const viewer = useViewer();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState(initialResults);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(initialFailed);
  // Bumped by "Retry search" to run the same terms again.
  const [attempt, setAttempt] = useState(0);
  const latest = useRef(initialQuery);

  // The suggestion chips are phases from the viewer's own chapters, then a few
  // common ones — the kind of thing people search for (Figma's chips).
  const suggestions = [
    ...new Set([
      ...viewer.chapters.map((c) => c.phase),
      "Relocating somewhere new",
      "Going pro",
      "Career pivot in progress",
      "Deep in recovery",
    ]),
  ].slice(0, 6);

  useEffect(() => {
    const term = query.trim();
    latest.current = term;
    if (term === initialQuery.trim() && attempt === 0) return;
    if (term.length < 2) {
      const clear = setTimeout(() => {
        setResults(null);
        setFailed(false);
      }, 0);
      return () => clearTimeout(clear);
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      setFailed(false);
      try {
        const found = await searchEverything(term);
        if (latest.current !== term) return;
        setResults(found);
        window.history.replaceState(null, "", `/search?q=${encodeURIComponent(term)}`);
      } catch {
        // The terms stay in the box; "Retry search" runs them again.
        if (latest.current === term) setFailed(true);
      } finally {
        if (latest.current === term) setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, initialQuery, attempt]);

  const term = query.trim();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-ivory-100">
      {/* Frame 628:35194 — a back/title bar; desktop gets it too, so Search
          always has a way back to where you were. */}
      <header className="flex shrink-0 items-center gap-4 bg-surface px-5 py-4 lg:px-6 lg:pt-8">
        <BackButton fallback="/home" className="rounded-full p-1 transition-colors hover:bg-ivory-200" />
        <h1 className="font-display text-xl font-semibold text-ink-600">
          Search
        </h1>
      </header>

      <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-5 py-6 lg:px-6 lg:py-10">
      <div className="mx-auto flex w-full max-w-[812px] flex-col gap-10 lg:gap-14">
        <label className="relative block">
          <span className="sr-only">Search Grouv</span>
          <input
            autoFocus
            value={query}
            maxLength={80}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, posts, groups, spaces"
            className="h-12 w-full rounded-full border border-ink-100 bg-ivory-50 pr-12 pl-12 font-sans text-sm text-ink-500 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline-none placeholder:text-ink-200 focus:border-primary-200 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)] lg:h-[72px] lg:pr-6 lg:pl-16 lg:text-lg"
          />
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-300 lg:left-6 lg:size-6" />
        </label>

        {failed ? (
          // Error — Figma 1206:22696.
          <SearchState
            title="Search isn't working right now"
            body="Something went wrong on our end. Check your connection and try again — your search terms are still here."
            action="Retry search"
            onAction={() => setAttempt((n) => n + 1)}
          />
        ) : searching && term.length >= 2 ? (
          // Loading — Figma 1206:22415.
          <PersonRowsSkeleton count={4} label="Searching" />
        ) : results !== null && results.length === 0 && term.length >= 2 ? (
          // No results — Figma 1206:22547.
          <SearchState
            title={`No results for "${term}"`}
            body="We couldn't find any people, groups, or chapters matching that. Try a different word, or browse what's popular right now."
            action="Clear search"
            onAction={() => {
              setQuery("");
              window.history.replaceState(null, "", "/search");
            }}
          />
        ) : results === null ? (
          <div className="flex flex-col gap-8">
            <h1 className="text-center font-display text-xl leading-[1.2] font-semibold text-ink-500 lg:text-left lg:text-3xl lg:leading-[1.04] xl:text-4xl">
              What are you looking for?
            </h1>

            <div className="flex flex-wrap justify-center gap-3 lg:justify-start lg:gap-4">
              {suggestions.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setQuery(chip)}
                  className={cn(
                    "rounded-full px-4 py-2 font-sans text-sm font-medium transition-colors",
                    query === chip
                      ? "bg-primary-500 text-white"
                      : "bg-primary-50 text-primary-600 hover:bg-primary-100",
                  )}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : results.length === 0 ? (
          <p className="text-center font-sans text-base text-ink-300">
            {searching ? "Searching…" : `Nothing matches “${query.trim()}”.`}
          </p>
        ) : (
          <div className={cn("flex flex-col gap-8 transition-opacity", searching && "opacity-60")}>
            {GROUPS.map(({ kind, label }) => {
              const rows = results.filter((r) => r.kind === kind);
              if (rows.length === 0) return null;
              return (
                <section key={kind} className="flex flex-col gap-3">
                  <h2 className="font-sans text-sm font-medium tracking-wide text-ink-300 uppercase">{label}</h2>
                  <ul className="flex flex-col gap-2">
                    {rows.map((result) => (
                      <li key={`${kind}-${result.id}`}>
                        <ResultRow result={result} held={viewer.chapters.some((c) => c.slug === result.chapterSlug)} />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

/** The magnifier art over a title, a line and one action (1206:22547 / 22696). */
function SearchState({
  title,
  body,
  action,
  onAction,
}: {
  title: string;
  body: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-6 text-center" role="status">
      <SearchArt className="h-[180px] w-[240px] lg:h-[240px] lg:w-[320px]" />
      <div className="flex max-w-[480px] flex-col gap-2">
        <h2 className="font-display text-xl font-semibold text-ink-800 lg:text-2xl">{title}</h2>
        <p className="font-sans text-base text-ink-400">{body}</p>
      </div>
      <Button size="sm" onClick={onAction}>
        {action}
      </Button>
    </div>
  );
}

function ResultRow({ result, held }: { result: SearchResult; held: boolean }) {
  const chapter = result.chapterSlug ? getChapter(result.chapterSlug) : undefined;
  const href =
    result.kind === "person"
      ? `/people/${result.id}`
      : result.kind === "post"
        ? `/posts/${result.id}`
        : result.kind === "group"
          ? `/groups/${result.id}`
          : held
            ? `/spaces/${result.id}`
            : "/spaces";

  return (
    <Link href={href} className="flex items-center gap-4 rounded-2xl bg-surface p-4 transition-colors hover:bg-ivory-50">
      {result.kind === "person" ? (
        <Avatar src={result.image} name={result.title} className="size-10" />
      ) : result.kind === "space" && result.image ? (
        <Image src={result.image} alt="" width={40} height={40} className="size-10 shrink-0" />
      ) : (
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-50 font-ui text-sm font-bold text-primary-600">
          {result.kind === "post" ? "P" : "G"}
        </span>
      )}
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-sans text-base font-medium text-ink-700">{result.title}</span>
        <span className="truncate font-sans text-sm text-ink-300">
          {[result.subtitle, result.kind !== "space" && chapter?.name].filter(Boolean).join(" · ")}
          {result.kind === "space" && !held && " · Open it from My Spaces"}
        </span>
      </span>
    </Link>
  );
}


function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m16.5 16.5 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
