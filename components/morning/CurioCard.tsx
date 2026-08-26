"use client";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { Icon } from "@/components/ui/Icon";
import { useToastStore } from "@/store/useToastStore";
import { useSaveCurio } from "@/hooks/useCurio";
import type { CurioEntry } from "@/lib/api";

export function CurioCard({
  curio,
  isLoading,
  primarySlug,
}: {
  curio: CurioEntry | undefined;
  isLoading: boolean;
  primarySlug: string;
}) {
  const router = useRouter();
  const { toast } = useToastStore();
  const saveCurio = useSaveCurio();

  if (isLoading) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", padding: "3rem" }}
      >
        <Spinner color="var(--sage)" />
      </div>
    );
  }

  if (!curio?.title) {
    // No curio cards seeded for this space — show a graceful placeholder
    return (
      <div
        className="card"
        style={{
          padding: "1.6rem",
          marginBottom: "1.6rem",
          background:
            "linear-gradient(160deg, var(--white) 55%, var(--surf-high))",
          borderLeft: "4px solid var(--border-2)",
          opacity: 0.7,
        }}
      >
        <div className="label-mono" style={{ marginBottom: ".7rem" }}>
          No reading today
        </div>
        <p
          className="serif"
          style={{
            fontSize: "1.35rem",
            fontStyle: "italic",
            color: "var(--ink-3)",
            lineHeight: 1.4,
          }}
        >
          A curio card for your {primarySlug} chapter will appear here when one
          is ready.
        </p>
      </div>
    );
  }

  return (
    <div
      className="card rise"
      style={{
        padding: "1.6rem",
        marginBottom: "1.6rem",
        background:
          "linear-gradient(160deg, var(--white) 55%, var(--surf-high))",
        borderLeft: "4px solid var(--sage)",
        cursor: "pointer",
      }}
      onClick={() =>
        router.push(
          `/curio?title=${encodeURIComponent(curio.title ?? "")}&from=morning`,
        )
      }
    >
      <div
        className="label-mono"
        style={{ color: "var(--sage)", marginBottom: ".7rem" }}
      >
        Today&apos;s Curio &middot; 2 min read
      </div>
      <h2
        className="serif"
        style={{
          fontSize: "1.6rem",
          fontWeight: 600,
          marginBottom: ".8rem",
          lineHeight: 1.25,
        }}
      >
        {curio.title}
      </h2>
      {curio.body && (
        <p
          style={{
            color: "var(--ink-2)",
            lineHeight: 1.75,
            marginBottom: "1.2rem",
          }}
        >
          {curio.body}
        </p>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{ fontSize: ".84rem", color: "var(--sage)", fontWeight: 600 }}
        >
          Read & reflect →
        </span>
        {curio.saved ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: ".4rem",
              fontSize: ".82rem",
              color: "var(--sage)",
              fontWeight: 500,
            }}
          >
            <Icon name="check" size={13} stroke="var(--sage)" sw={2.5} />
            Saved
          </div>
        ) : (
          <button
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await saveCurio.mutateAsync({ id: curio.id, saved: true });
              } catch {}
              toast("Curio saved to archive.");
            }}
            style={{ fontSize: ".82rem", color: "var(--ink-3)" }}
          >
            Save to archive
          </button>
        )}
      </div>
    </div>
  );
}
