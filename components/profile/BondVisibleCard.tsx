"use client";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/types";

export function BondVisibleCard({ user }: { user: User }) {
  const router = useRouter();

  return (
    <div
      className="card"
      style={{ padding: "1.4rem 1.6rem", marginBottom: "1.2rem" }}
    >
      <div className="label-mono" style={{ marginBottom: "1rem" }}>
        Visible only to your Bonds
      </div>
      {[
        [
          "Honest tension",
          user.tension ||
            "Still working out whether the safe path is actually the scared one.",
        ],
        [
          "Sitting with",
          user.sitting ||
            "Whether wanting more makes me ungrateful for what I have.",
        ],
        [
          "Open to",
          user.open || "People who'll tell me the truth, not just cheer me on.",
        ],
      ].map(([l, v]) => (
        <div key={l} style={{ marginBottom: ".9rem" }}>
          <div
            style={{
              fontSize: ".78rem",
              fontWeight: 600,
              color: "var(--ink-3)",
              marginBottom: ".2rem",
            }}
          >
            {l}:
          </div>
          <p
            style={{
              fontStyle: "italic",
              color: "var(--ink-2)",
              lineHeight: 1.5,
            }}
          >
            {v}
          </p>
        </div>
      ))}
      <button
        onClick={() => router.push("/editprofile")}
        style={{ fontSize: ".82rem", color: "var(--ember)", fontWeight: 500 }}
      >
        Edit profile
      </button>
    </div>
  );
}
