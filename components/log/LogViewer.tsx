"use client";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { SpaceIcon } from "@/components/ui/SpaceIcon";
import { spaceById } from "@/lib/data";
import type { OtherLog } from "./types";
import { MemoryLightbox } from "./MemoryLightbox";
import { StyleA, StyleB, StyleC } from "./LogStyles";

export function LogViewer({
  log,
  onClose,
}: {
  log: OtherLog;
  onClose: () => void;
}) {
  const space = spaceById(log.space);
  const [open, setOpen] = useState<number | null>(null);
  const filled = log.entries.filter((e) => !e.missed);
  const first = log.name.split(" ")[0];
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 7100,
        background: "rgba(26,18,10,.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "center",
        padding: "4vh 1rem",
      }}
      onClick={onClose}
    >
      <div
        className="scroll fade-in"
        style={{
          width: "min(480px, 96vw)",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "var(--cream)",
          borderRadius: 24,
          boxShadow: "var(--shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 2,
            background: "var(--cream)",
            borderBottom: "1px solid var(--border)",
            padding: "1rem 1.2rem",
            display: "flex",
            alignItems: "center",
            gap: ".8rem",
          }}
        >
          <Avatar
            name={log.name}
            size={44}
            avatarUrl={log.avatarUrl}
            aura={log.aura ?? undefined}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>{first}&apos;s Log</div>
            <div
              style={{
                fontSize: ".76rem",
                color: "var(--ink-3)",
                display: "flex",
                alignItems: "center",
                gap: ".3rem",
              }}
            >
              <SpaceIcon spaceId={log.space} size={11} /> {log.phase} ·{" "}
              {log.entries.length} moments
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="close" stroke="var(--ink-3)" />
          </button>
        </div>
        <div style={{ padding: "1.4rem 1.2rem 1.6rem" }}>
          {filled.length === 0 ? (
            <p
              style={{
                color: "var(--ink-3)",
                fontStyle: "italic",
                textAlign: "center",
                padding: "2rem 0",
              }}
            >
              No moments logged yet.
            </p>
          ) : log.style === "A" ? (
            <StyleA entries={filled} onOpen={setOpen} />
          ) : log.style === "C" ? (
            <StyleC entries={filled} space={space} onOpen={setOpen} />
          ) : (
            <StyleB entries={filled} onOpen={setOpen} />
          )}
        </div>
      </div>
      {open != null && (
        <MemoryLightbox
          entries={filled}
          startIndex={open}
          space={space}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
