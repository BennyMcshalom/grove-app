"use client";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import { REMIND_DATE, PRICES, type Plan } from "./constants";
import { fmtCardNum, fmtExp } from "./cardFormat";
import styles from "./PayStep.module.css";

export function PayStep({
  plan,
  card,
  setCard,
  cardReady,
  onBackToPlan,
  onStartTrial,
}: {
  plan: Plan;
  card: { num: string; exp: string; cvc: string; name: string };
  setCard: (c: { num: string; exp: string; cvc: string; name: string }) => void;
  cardReady: boolean;
  onBackToPlan: () => void;
  onStartTrial: () => void;
}) {
  const price = PRICES[plan];

  return (
    <div className="screen-enter">
      <div className={styles.head}>
        <h1 className={clsx("serif", styles.title)}>
          Add a payment method
        </h1>
        <p className={styles.subtitle}>
          Required to start your trial. Nothing is charged today.
        </p>
      </div>

      {/* Order summary */}
      <div className={clsx("card", styles.summaryCard)}>
        <div>
          <div className={styles.summaryTitle}>
            {plan === "annual" ? "Annual" : "Monthly"} membership
          </div>
          <div className={styles.summarySub}>
            {price.sub}
          </div>
        </div>
        <div className={styles.summaryPrice}>
          <div className={clsx("serif", styles.summaryAmount)}>
            {price.amount}
            <span className={styles.summaryCadence}>
              {price.cadence}
            </span>
          </div>
          <button onClick={onBackToPlan} className={styles.changeBtn}>
            Change
          </button>
        </div>
      </div>

      {/* Due today */}
      <div className={styles.dueRow}>
        <span className={styles.dueLabel}>
          Due today
        </span>
        <span className={clsx("serif", styles.dueAmount)}>
          $0.00
        </span>
      </div>

      {/* Card form */}
      <div className={clsx("card", styles.formCard)}>
        {/* Card number */}
        <label className={styles.fieldLabel}>
          <div className={styles.fieldTitle}>
            Card number
          </div>
          <div className={styles.cardNumWrap}>
            <input
              value={card.num}
              onChange={(e) =>
                setCard({ ...card, num: fmtCardNum(e.target.value) })
              }
              placeholder="1234 1234 1234 1234"
              inputMode="numeric"
              className={clsx(styles.textInput, styles.cardNumInput)}
            />
            <div className={styles.cardBrands}>
              <span className={clsx(styles.cardBrand, styles.cardBrandA)} />
              <span className={clsx(styles.cardBrand, styles.cardBrandB)} />
            </div>
          </div>
        </label>
        {/* Expiry + CVC */}
        <div className={styles.expCvcRow}>
          <label className={styles.expCvcField}>
            <div className={styles.fieldTitle}>
              Expiry
            </div>
            <input
              value={card.exp}
              onChange={(e) =>
                setCard({ ...card, exp: fmtExp(e.target.value) })
              }
              placeholder="MM/YY"
              inputMode="numeric"
              className={clsx(styles.textInput, styles.monoInput)}
            />
          </label>
          <label className={styles.expCvcField}>
            <div className={styles.fieldTitle}>
              CVC
            </div>
            <input
              value={card.cvc}
              onChange={(e) =>
                setCard({
                  ...card,
                  cvc: e.target.value.replace(/\D/g, "").slice(0, 4),
                })
              }
              placeholder="123"
              inputMode="numeric"
              className={clsx(styles.textInput, styles.monoInput)}
            />
          </label>
        </div>
        {/* Name */}
        <label className={styles.fieldLabel}>
          <div className={styles.fieldTitle}>
            Name on card
          </div>
          <input
            value={card.name}
            onChange={(e) => setCard({ ...card, name: e.target.value })}
            placeholder="Full name"
            className={styles.textInput}
          />
        </label>
      </div>

      <button
        className={clsx("btn", "btn-primary", "btn-lg", "btn-block", styles.submitBtn)}
        disabled={!cardReady}
        onClick={onStartTrial}
      >
        <Icon name="lock" size={17} stroke="#fff" /> Start trial. $0.00 today
      </button>
      <div className={styles.securedRow}>
        <Icon name="lock" size={13} stroke="var(--ink-4)" />
        Secured &amp; encrypted. We&apos;ll remind you before {REMIND_DATE}.
      </div>
    </div>
  );
}
