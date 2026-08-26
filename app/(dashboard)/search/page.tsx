"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { searchApi } from "@/lib/api";
import { PeopleResults } from "@/components/search/PeopleResults";
import { PostResults } from "@/components/search/PostResults";
import { GroupResults } from "@/components/search/GroupResults";
import { SpaceResults } from "@/components/search/SpaceResults";

const SUGGESTIONS = [
  "New to freelance",
  "Relocating solo",
  "Career pivot",
  "Deep in recovery",
  "Going pro",
];
const TYPES = [
  ["all", "All"],
  ["users", "People"],
  ["posts", "Posts"],
  ["groups", "Groups"],
  ["spaces", "Spaces"],
] as const;

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<
    "all" | "users" | "posts" | "groups" | "spaces"
  >("all");

  const { data: results, isLoading } = useQuery({
    queryKey: ["search", q, filter],
    queryFn: () => searchApi.query(q, filter),
    enabled: q.trim().length >= 2,
    staleTime: 30_000,
  });

  const hasResults =
    results &&
    (results.users.length ||
      results.posts.length ||
      results.groups.length ||
      results.spaces.length);

  return (
    <AppShell title="Search">
      <div
        style={{ maxWidth: 680, margin: "0 auto", padding: "0 1.6rem 3rem" }}
      >
        {/* Search input */}
        <div style={{ position: "relative", marginBottom: "1rem" }}>
          <span
            style={{
              position: "absolute",
              left: 18,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            <Icon name="search" size={19} stroke="var(--ink-4)" />
          </span>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people, posts, groups, spaces…"
            style={{
              width: "100%",
              padding: "1rem 1.2rem 1rem 3rem",
              borderRadius: 100,
              border: "1.5px solid var(--border-2)",
              background: "var(--white)",
              fontSize: "1.05rem",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--ember)";
              e.target.style.boxShadow = "0 0 0 3px var(--ember-dim)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--border-2)";
              e.target.style.boxShadow = "none";
            }}
          />
          {q && (
            <button
              onClick={() => setQ("")}
              style={{
                position: "absolute",
                right: 16,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              <Icon name="close" size={16} stroke="var(--ink-3)" />
            </button>
          )}
        </div>

        {/* Type filter pills */}
        <div
          style={{
            display: "flex",
            gap: ".5rem",
            marginBottom: "1.4rem",
            flexWrap: "wrap",
          }}
        >
          {TYPES.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className="chip"
              style={{
                cursor: "pointer",
                padding: ".45rem .9rem",
                background: filter === id ? "var(--slate)" : "var(--surf-high)",
                color: filter === id ? "#fff" : "var(--ink-2)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Empty / suggestion state */}
        {q.trim().length < 2 ? (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <h2
              className="serif"
              style={{
                fontSize: "1.5rem",
                fontWeight: 600,
                marginBottom: "1rem",
              }}
            >
              What chapter are you looking for?
            </h2>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: ".6rem",
                justifyContent: "center",
              }}
            >
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setQ(s)}
                  className="chip"
                  style={{
                    cursor: "pointer",
                    padding: ".55rem 1rem",
                    background: "var(--white)",
                    boxShadow: "var(--shadow-soft)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : isLoading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "3rem",
            }}
          >
            <Spinner />
          </div>
        ) : !hasResults ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem",
              color: "var(--ink-3)",
            }}
          >
            <p
              className="serif"
              style={{ fontSize: "1.2rem", marginBottom: ".4rem" }}
            >
              No results for &apos;{q}&apos;
            </p>
            <p style={{ fontSize: ".86rem" }}>
              Try different keywords or check the spelling.
            </p>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1.4rem" }}
          >
            {results.users.length > 0 &&
              (filter === "all" || filter === "users") && (
                <PeopleResults
                  users={results.users}
                  showLabel={filter === "all"}
                />
              )}
            {results.posts.length > 0 &&
              (filter === "all" || filter === "posts") && (
                <PostResults
                  posts={results.posts}
                  showLabel={filter === "all"}
                />
              )}
            {results.groups.length > 0 &&
              (filter === "all" || filter === "groups") && (
                <GroupResults
                  groups={results.groups}
                  showLabel={filter === "all"}
                />
              )}
            {results.spaces.length > 0 &&
              (filter === "all" || filter === "spaces") && (
                <SpaceResults
                  spaces={results.spaces}
                  showLabel={filter === "all"}
                />
              )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
