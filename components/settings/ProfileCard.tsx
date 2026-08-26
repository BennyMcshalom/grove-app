"use client";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { SpaceIcon } from "@/components/ui/SpaceIcon";
import type { User } from "@/lib/types";

// ── Profile card ──
export function ProfileCard({
  user,
  firstSpace,
  spaceLabel,
}: {
  user: User;
  firstSpace: string | undefined;
  spaceLabel: string;
}) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push("/profile")}
      className="card"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        padding: "1.2rem 1.4rem",
        width: "100%",
        textAlign: "left",
        marginBottom: "1.4rem",
        transition: "opacity .15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = ".85")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    >
      <Avatar
        name={user.name}
        size={56}
        avatarUrl={user.avatar_url}
        ring={2}
        aura={user.aura ?? "open"}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: "1.05rem",
            marginBottom: ".18rem",
          }}
        >
          {user.name}
        </div>
        <div
          style={{
            fontSize: ".78rem",
            color: "var(--ink-3)",
            display: "flex",
            alignItems: "center",
            gap: ".35rem",
            flexWrap: "wrap",
          }}
        >
          {firstSpace && <SpaceIcon spaceId={firstSpace} size={11} />}
          {spaceLabel}
        </div>
        {user.open && (
          <div
            style={{
              fontSize: ".74rem",
              color: "var(--ink-4)",
              marginTop: ".2rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            Open to: {user.open}
          </div>
        )}
      </div>
      <Icon name="arrow" size={16} stroke="var(--ink-4)" />
    </button>
  );
}
