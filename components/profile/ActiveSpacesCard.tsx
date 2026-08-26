"use client";
import { useRouter } from "next/navigation";
import { SpaceIcon } from "@/components/ui/SpaceIcon";
import { Icon } from "@/components/ui/Icon";
import { spaceById } from "@/lib/data";
import type { User } from "@/lib/types";

export function ActiveSpacesCard({
  user,
  spaces,
}: {
  user: User;
  spaces: string[];
}) {
  const router = useRouter();

  return (
    <div
      className="card"
      style={{ padding: "1.4rem 1.6rem", marginBottom: "1.2rem" }}
    >
      <div className="label-mono" style={{ marginBottom: ".9rem" }}>
        Active spaces
      </div>
      {spaces.map((id) => {
        const s = spaceById(id);
        return (
          <button
            key={id}
            onClick={() => router.push(`/spaces/${id}`)}
            style={{
              display: "flex",
              width: "100%",
              alignItems: "center",
              gap: ".7rem",
              padding: ".6rem 0",
              textAlign: "left",
            }}
          >
            <SpaceIcon spaceId={id} size={16} pill pillSize={32} />
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 500 }}>{s.name}</span>{" "}
              <span style={{ color: "var(--ink-3)", fontSize: ".85rem" }}>
                · {user.stageLabels?.[id] || "In progress"}
              </span>
            </div>
            <Icon name="arrow" size={16} stroke="var(--ink-4)" />
          </button>
        );
      })}
    </div>
  );
}
