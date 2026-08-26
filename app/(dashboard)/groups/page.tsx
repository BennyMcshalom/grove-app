"use client";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { RPSection } from "@/components/layout/RightPanel";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useGroups } from "@/hooks/useGroups";
import { groupIcon } from "@/lib/data";
import type { GroupRecord } from "@/lib/api";
import { CreateGroupModal } from "@/components/groups/CreateGroupModal";
import { GroupDetail } from "@/components/groups/GroupDetail";

export default function GroupsPage() {
  const { data: groups, isLoading } = useGroups();
  const [open, setOpen] = useState<GroupRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");

  const list = (groups ?? []).filter(
    (g) =>
      g.name.toLowerCase().includes(q.toLowerCase()) ||
      g.lifePhase.toLowerCase().includes(q.toLowerCase()),
  );

  const right = (
    <RPSection label="Suggested for your chapter">
      {(groups ?? []).slice(0, 3).map((g) => (
        <button
          key={g.id}
          onClick={() => setOpen(g)}
          className="card"
          style={{
            display: "flex",
            width: "100%",
            textAlign: "left",
            padding: ".8rem",
            marginBottom: ".55rem",
            boxShadow: "var(--shadow-soft)",
            alignItems: "center",
            gap: ".6rem",
          }}
        >
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: g.coverColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name={groupIcon(g.emoji)} size={16} stroke="#fff" sw={1.5} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: ".84rem" }}>{g.name}</div>
            <div style={{ fontSize: ".72rem", color: "var(--ink-3)" }}>
              {g.lifePhase}
            </div>
          </div>
        </button>
      ))}
    </RPSection>
  );

  return (
    <AppShell title="Chapter Groups" right={right}>
      <div
        style={{ maxWidth: 640, margin: "0 auto", padding: "0 1.6rem 3rem" }}
      >
        <p
          style={{
            color: "var(--ink-3)",
            marginTop: "-.4rem",
            marginBottom: "1.2rem",
          }}
        >
          Life-phase rooms. Request to join, an admin lets you in.
        </p>
        <div style={{ position: "relative", marginBottom: "1.4rem" }}>
          <span
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            <Icon name="search" size={17} stroke="var(--ink-4)" />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search chapters…"
            style={{
              width: "100%",
              padding: ".8rem 1rem .8rem 2.6rem",
              borderRadius: 100,
              border: "1.5px solid var(--border-2)",
              background: "var(--white)",
              fontSize: ".95rem",
            }}
          />
        </div>

        {isLoading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "3rem",
            }}
          >
            <Spinner />
          </div>
        ) : list.length === 0 ? (
          <div
            className="card"
            style={{
              background:
                "linear-gradient(160deg, var(--slate-dim), var(--green-dim))",
              maxWidth: 480,
              margin: "0 auto",
            }}
          >
            <EmptyState
              variant="groups"
              title={q ? `No groups match "${q}".` : "No chapter groups yet."}
              body={
                q
                  ? "Try a different search, or start a new chapter."
                  : "Chapter groups form around shared life phases. Start the first one."
              }
              action={{
                label: "Start a chapter →",
                onClick: () => setCreating(true),
              }}
            />
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: ".8rem" }}
          >
            {list.map((g) => (
              <button
                key={g.id}
                onClick={() => setOpen(g)}
                className="card"
                style={{
                  display: "block",
                  textAlign: "left",
                  overflow: "hidden",
                  padding: 0,
                }}
              >
                <div style={{ height: 4, background: g.coverColor }} />
                <div style={{ padding: "1.1rem 1.3rem" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: ".7rem",
                      marginBottom: ".6rem",
                    }}
                  >
                    <span
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: "50%",
                        background: g.coverColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon
                        name={groupIcon(g.emoji)}
                        size={20}
                        stroke="#fff"
                        sw={1.4}
                      />
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{g.name}</div>
                      <span
                        className="chip"
                        style={{ background: "var(--surf-high)", marginTop: 2 }}
                      >
                        {g.lifePhase}
                      </span>
                    </div>
                    <span style={{ fontSize: ".78rem", color: "var(--ink-4)" }}>
                      {g.memberCount} members
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: ".88rem",
                      color: "var(--ink-2)",
                      marginBottom: ".4rem",
                    }}
                  >
                    {g.description}
                  </p>
                  <span
                    style={{
                      fontSize: ".82rem",
                      color: "var(--ember)",
                      fontWeight: 500,
                    }}
                  >
                    {g.myRole
                      ? "Open →"
                      : g.myRequestStatus === "pending"
                        ? "Request pending"
                        : "Request to join →"}
                  </span>
                </div>
              </button>
            ))}
            <div
              onClick={() => setCreating(true)}
              style={{
                borderRadius: "var(--r-lg)",
                border: "1.5px dashed var(--border-2)",
                padding: "1.2rem",
                textAlign: "center",
                color: "var(--ink-3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: ".5rem",
                cursor: "pointer",
              }}
            >
              <Icon name="plus" size={18} stroke="var(--ember)" /> Start a
              chapter
            </div>
          </div>
        )}
      </div>
      {open && <GroupDetail group={open} onClose={() => setOpen(null)} />}
      {creating && <CreateGroupModal onClose={() => setCreating(false)} />}
    </AppShell>
  );
}
