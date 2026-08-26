"use client";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { Group, Row } from "./primitives";
import { subColor, subLabel } from "./subscriptionLabels";

// ── Subscription ──
export function SubscriptionGroup({
  sub,
  loadingPortal,
  onManage,
}: {
  sub: {
    status: string;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
    trialEnd?: string | null;
  } | null;
  loadingPortal: boolean;
  onManage: () => void;
}) {
  const router = useRouter();
  const hasSub = sub && sub.status !== "none" && sub.status !== "incomplete";
  const periodEnd = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;
  const trialEndDate = sub?.trialEnd
    ? new Date(sub.trialEnd).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <Group label="Subscription">
      {sub === null ? (
        <div
          style={{ display: "flex", justifyContent: "center", padding: "1rem" }}
        >
          <Spinner size={16} color="var(--ember)" />
        </div>
      ) : hasSub ? (
        <Row
          label="Grouv membership"
          sub={
            <span>
              <span style={{ color: subColor(sub.status), fontWeight: 600 }}>
                {subLabel(sub.status)}
              </span>
              {sub.status === "trialing" &&
                trialEndDate &&
                ` · trial ends ${trialEndDate}`}
              {sub.status === "active" && periodEnd && ` · renews ${periodEnd}`}
              {sub.cancelAtPeriodEnd && periodEnd && (
                <span style={{ color: "var(--amber)" }}>
                  {" "}
                  · cancels ${periodEnd}
                </span>
              )}
            </span>
          }
        >
          <button
            className="btn btn-soft"
            style={{
              padding: ".45rem .9rem",
              fontSize: ".82rem",
              cursor: "pointer",
            }}
            disabled={loadingPortal}
            onClick={onManage}
          >
            {loadingPortal ? (
              <Spinner size={12} color="var(--ink-3)" />
            ) : (
              "Manage"
            )}
          </button>
        </Row>
      ) : (
        <Row
          label="No active plan"
          sub="Start a free trial to unlock everything."
        >
          <button
            className="btn btn-primary"
            style={{
              padding: ".45rem .9rem",
              fontSize: ".82rem",
              cursor: "pointer",
            }}
            onClick={() => router.push("/subscribe")}
          >
            Start trial
          </button>
        </Row>
      )}
    </Group>
  );
}
