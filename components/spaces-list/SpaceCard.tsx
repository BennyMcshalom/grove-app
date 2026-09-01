"use client";
import { Avatar } from "@/components/ui/Avatar";
import { SpaceIcon } from "@/components/ui/SpaceIcon";
import { useToastStore } from "@/store/useToastStore";
import { useUpdateSpace, useSpaceMembers } from "@/hooks/useSpaces";
import { spaceById } from "@/lib/data";
import type { UserSpaceRecord } from "@/lib/api";

export const STAGE_MARKERS = [
  "Just started",
  "In progress",
  "Thick of it",
  "Wrapping up",
];

export function SpaceCard({
  slot,
  onOpen,
  onClose,
}: {
  slot: UserSpaceRecord;
  onOpen: () => void;
  onClose: () => void;
}) {
  const { toast } = useToastStore();
  const updateSpace = useUpdateSpace();
  const slug = slot.space?.slug ?? "";
  const s = spaceById(slug || "career");
  const { data: members } = useSpaceMembers(slot.spaceId);
  const stack = (members ?? []).slice(0, 4);

  // Use persisted marker from DB, default to 'In progress'
  const currentIdx = STAGE_MARKERS.indexOf(slot.currentMarker ?? "") ?? 1;
  const markerIdx = currentIdx >= 0 ? currentIdx : 1;

  const cycleMarker = async () => {
    const next = STAGE_MARKERS[(markerIdx + 1) % STAGE_MARKERS.length];
    try {
      await updateSpace.mutateAsync({ id: slot.id, currentMarker: next });
    } catch {
      toast("Could not update marker.");
    }
  };

  return (
    <div className="card" style={{ padding: "1.3rem 1.4rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: ".8rem",
          marginBottom: "1.1rem",
        }}
      >
        <SpaceIcon spaceId={slug || "career"} size={22} pill pillSize={48} />
        <div style={{ minWidth: 0 }}>
          <div
            className="serif"
            style={{ fontSize: "1.15rem", fontWeight: 600 }}
          >
            {s.name}
          </div>
          <div style={{ fontSize: ".85rem", color: "var(--ink-3)" }}>
            {slot.stage || "Building a habit"}
          </div>
        </div>
      </div>

      {/* Member avatar stack */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: ".5rem",
          marginBottom: ".9rem",
        }}
      >
        <div style={{ display: "flex" }}>
          {stack.map((m, i) => (
            <div
              key={m.id}
              style={{
                marginLeft: i === 0 ? 0 : -10,
                borderRadius: "50%",
                boxShadow: "0 0 0 2px var(--white)",
              }}
            >
              <Avatar name={m.displayName} avatarUrl={m.avatarUrl} size={26} />
            </div>
          ))}
        </div>
        <span style={{ fontSize: ".8rem", color: "var(--ink-4)" }}>
          {slot.memberCount ?? 0} in this space
        </span>
      </div>

      {/* Stage marker — persists to DB */}
      <button
        onClick={cycleMarker}
        disabled={updateSpace.isPending}
        className="chip"
        style={{
          cursor: "pointer",
          background: "var(--surf-high)",
          marginBottom: "1.1rem",
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--ember)",
            display: "inline-block",
            marginRight: ".4rem",
          }}
        />
        {STAGE_MARKERS[markerIdx]}
      </button>

      <button
        onClick={onOpen}
        className="btn btn-primary btn-pill btn-block"
      >
        Open feed
      </button>
      <button
        onClick={onClose}
        style={{
          display: "block",
          width: "100%",
          textAlign: "center",
          marginTop: ".7rem",
          fontSize: ".8rem",
          color: "var(--red)",
        }}
      >
        Close chapter
      </button>
    </div>
  );
}
