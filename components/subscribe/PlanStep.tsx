"use client";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PLAN_FEATURES, TRIAL_END, REMIND_DATE, type Plan } from "./constants";

export function PlanStep({
  plan,
  setPlan,
  onStartTrial,
}: {
  plan: Plan;
  setPlan: (p: Plan) => void;
  onStartTrial: () => void;
}) {
  const router = useRouter();

  return (
    <div className="screen-enter">
      <div style={{ textAlign: "center", marginBottom: "1.6rem" }}>
        <span
          className="chip"
          style={{
            background: "var(--ember-dim)",
            color: "var(--ember-deep)",
            fontWeight: 600,
            marginBottom: ".9rem",
            display: "inline-block",
          }}
        >
          14 days free, then choose to stay
        </span>
        <h1
          className="serif"
          style={{
            fontSize: "clamp(1.7rem, 7.5vw, 2.4rem)",
            fontWeight: 600,
            lineHeight: 1.1,
          }}
        >
          Go deeper into Grouv.
        </h1>
        <p style={{ color: "var(--ink-3)", marginTop: ".5rem" }}>
          Start a 14-day trial. Full access from minute one.
        </p>
      </div>

      {/* Trial timeline */}
      <div
        className="card"
        style={{ padding: "1.4rem 1.5rem", marginBottom: "1.4rem" }}
      >
        <div className="label-mono" style={{ marginBottom: "1.1rem" }}>
          How your trial works
        </div>
        {(
          [
            [
              "var(--ember)",
              "Today",
              "Full access unlocks",
              "All of Grouv, free for 14 days.",
            ],
            [
              "var(--amber)",
              REMIND_DATE,
              "A gentle reminder",
              "We'll email you 2 days before, no surprises.",
            ],
            [
              "var(--sage)",
              TRIAL_END,
              "Membership begins",
              `Your ${plan} plan starts unless you cancel.`,
            ],
          ] as [string, string, string, string][]
        ).map(([color, date, title, desc], i, arr) => (
          <div key={date} style={{ display: "flex", gap: ".9rem" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  width: 13,
                  height: 13,
                  borderRadius: "50%",
                  background: color,
                  flexShrink: 0,
                  marginTop: 3,
                  boxShadow: `0 0 0 4px ${color}22`,
                }}
              />
              {i < arr.length - 1 && (
                <span
                  style={{
                    width: 2,
                    flex: 1,
                    background: "var(--border-2)",
                    margin: "4px 0",
                    display: "block",
                  }}
                />
              )}
            </div>
            <div style={{ paddingBottom: i < arr.length - 1 ? "1.1rem" : 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: ".5rem",
                }}
              >
                <span
                  className="mono"
                  style={{ fontSize: ".66rem", color: "var(--ink-4)" }}
                >
                  {date}
                </span>
                <span style={{ fontWeight: 600, fontSize: ".92rem" }}>
                  {title}
                </span>
              </div>
              <div
                style={{
                  fontSize: ".82rem",
                  color: "var(--ink-3)",
                  marginTop: 1,
                }}
              >
                {desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Plan selector */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: ".7rem",
          marginBottom: "1.4rem",
        }}
      >
        {(
          [
            [
              "annual",
              "Annual",
              "$84",
              "/year",
              "Save $36 · $7/mo",
              "Best value",
            ],
            ["monthly", "Monthly", "$10", "/month", "Billed monthly", null],
          ] as [Plan, string, string, string, string, string | null][]
        ).map(([id, label, amt, cad, note, badge]) => {
          const on = plan === id;
          return (
            <button
              key={id}
              onClick={() => setPlan(id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: ".9rem",
                textAlign: "left",
                padding: "1.1rem 1.3rem",
                borderRadius: "var(--r-lg)",
                background: "var(--white)",
                border: on
                  ? "2px solid var(--ember)"
                  : "1.5px solid var(--border-2)",
                boxShadow: on
                  ? "0 6px 20px -8px rgba(243,112,30,.4)"
                  : "var(--shadow-soft)",
                transition: "all .15s",
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  flexShrink: 0,
                  border: on
                    ? "7px solid var(--ember)"
                    : "2px solid var(--border-2)",
                  transition: "all .15s",
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: ".5rem",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{label}</span>
                  {badge && (
                    <span
                      className="chip"
                      style={{
                        background: "var(--ember-dim)",
                        color: "var(--ember-deep)",
                        fontSize: ".62rem",
                        padding: ".15rem .5rem",
                      }}
                    >
                      {badge}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: ".8rem", color: "var(--ink-3)" }}>
                  {note}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span
                  className="serif"
                  style={{
                    fontSize: "1.7rem",
                    fontWeight: 600,
                    color: "var(--ember)",
                  }}
                >
                  {amt}
                </span>
                <span style={{ fontSize: ".78rem", color: "var(--ink-4)" }}>
                  {cad}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <button
        className="btn btn-primary btn-lg btn-block"
        onClick={onStartTrial}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: ".5rem",
        }}
      >
        Start my 14 free days <Icon name="arrow" stroke="#fff" />
      </button>
      <p
        style={{
          textAlign: "center",
          fontSize: ".78rem",
          color: "var(--ink-3)",
          marginTop: ".8rem",
        }}
      >
        No card needed. We&apos;ll remind you before {TRIAL_END}, keep going
        only if you want to.
      </p>

      {/* Features */}
      <div
        className="card"
        style={{ padding: "1.3rem 1.5rem", marginTop: "1.6rem" }}
      >
        <div className="label-mono" style={{ marginBottom: ".9rem" }}>
          Everything&apos;s included
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: ".7rem" }}>
          {PLAN_FEATURES.map(([iconName, title, desc]) => (
            <div
              key={title}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: ".7rem",
              }}
            >
              <span style={{ flexShrink: 0, marginTop: 1 }}>
                <Icon
                  name={iconName}
                  size={18}
                  stroke="var(--ember)"
                  sw={1.6}
                />
              </span>
              <div>
                <div style={{ fontWeight: 500, fontSize: ".9rem" }}>
                  {title}
                </div>
                <div style={{ fontSize: ".78rem", color: "var(--ink-3)" }}>
                  {desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p
        style={{
          textAlign: "center",
          color: "var(--ink-4)",
          fontSize: ".8rem",
          marginTop: "1.2rem",
          fontStyle: "italic",
        }}
      >
        No ads. No data selling. You pay us, so you&apos;re never the product.{" "}
        <button
          onClick={() => router.push("/legal")}
          style={{ color: "var(--ember)" }}
        >
          Our promise →
        </button>
      </p>
    </div>
  );
}
