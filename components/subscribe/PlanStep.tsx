"use client";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PLAN_FEATURES, TRIAL_END, REMIND_DATE, type Plan } from "./constants";
import styles from "./PlanStep.module.css";

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
      <div className={styles.head}>
        <span className={clsx("chip", styles.headChip)}>
          14 days free, then choose to stay
        </span>
        <h1 className={clsx("serif", styles.title)}>
          Go deeper into Grouv.
        </h1>
        <p className={styles.subtitle}>
          Start a 14-day trial. Full access from minute one.
        </p>
      </div>

      {/* Trial timeline */}
      <div className={clsx("card", styles.timelineCard)}>
        <div className={clsx("label-mono", styles.timelineLabel)}>
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
          <div key={date} className={styles.timelineRow}>
            <div className={styles.timelineDotCol}>
              <span
                className={styles.timelineDot}
                style={{ background: color, boxShadow: `0 0 0 4px ${color}22` }}
              />
              {i < arr.length - 1 && (
                <span className={styles.timelineConnector} />
              )}
            </div>
            <div className={styles.timelineContent}>
              <div className={styles.timelineMeta}>
                <span className={clsx("mono", styles.timelineDate)}>
                  {date}
                </span>
                <span className={styles.timelineTitle}>
                  {title}
                </span>
              </div>
              <div className={styles.timelineDesc}>
                {desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Plan selector */}
      <div className={styles.plans}>
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
              className={clsx(styles.planBtn, on && styles.selected)}
            >
              <span className={clsx(styles.radioDot, on && styles.selected)} />
              <div className={styles.planInfo}>
                <div className={styles.planLabelRow}>
                  <span className={styles.planLabel}>{label}</span>
                  {badge && (
                    <span className={clsx("chip", styles.planBadge)}>
                      {badge}
                    </span>
                  )}
                </div>
                <div className={styles.planNote}>
                  {note}
                </div>
              </div>
              <div className={styles.planPrice}>
                <span className={clsx("serif", styles.planAmount)}>
                  {amt}
                </span>
                <span className={styles.planCadence}>
                  {cad}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <button
        className={clsx("btn", "btn-primary", "btn-lg", "btn-block", styles.startBtn)}
        onClick={onStartTrial}
      >
        Start my 14 free days <Icon name="arrow" stroke="#fff" />
      </button>
      <p className={styles.startHint}>
        No card needed. We&apos;ll remind you before {TRIAL_END}, keep going
        only if you want to.
      </p>

      {/* Features */}
      <div className={clsx("card", styles.featuresCard)}>
        <div className={clsx("label-mono", styles.featuresLabel)}>
          Everything&apos;s included
        </div>
        <div className={styles.featuresList}>
          {PLAN_FEATURES.map(([iconName, title, desc]) => (
            <div key={title} className={styles.featureRow}>
              <span className={styles.featureIcon}>
                <Icon
                  name={iconName}
                  size={18}
                  stroke="var(--ember)"
                  sw={1.6}
                />
              </span>
              <div>
                <div className={styles.featureTitle}>
                  {title}
                </div>
                <div className={styles.featureDesc}>
                  {desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className={styles.footnote}>
        No ads. No data selling. You pay us, so you&apos;re never the product.{" "}
        <button onClick={() => router.push("/legal")} className={styles.footnoteLink}>
          Our promise →
        </button>
      </p>
    </div>
  );
}
