"use client";
import { Icon } from "@/components/ui/Icon";
import { REMIND_DATE, PRICES, type Plan } from "./constants";
import { fmtCardNum, fmtExp } from "./cardFormat";

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
      <div style={{ textAlign: "center", marginBottom: "1.4rem" }}>
        <h1
          className="serif"
          style={{ fontSize: "clamp(1.5rem, 6.5vw, 2.1rem)", fontWeight: 600 }}
        >
          Add a payment method
        </h1>
        <p style={{ color: "var(--ink-3)", marginTop: ".4rem" }}>
          Required to start your trial. Nothing is charged today.
        </p>
      </div>

      {/* Order summary */}
      <div
        className="card"
        style={{
          padding: "1.1rem 1.4rem",
          marginBottom: "1.2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontWeight: 600 }}>
            {plan === "annual" ? "Annual" : "Monthly"} membership
          </div>
          <div style={{ fontSize: ".8rem", color: "var(--ink-3)" }}>
            {price.sub}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            className="serif"
            style={{
              fontSize: "1.4rem",
              fontWeight: 600,
              color: "var(--ember)",
            }}
          >
            {price.amount}
            <span style={{ fontSize: ".76rem", color: "var(--ink-4)" }}>
              {price.cadence}
            </span>
          </div>
          <button
            onClick={onBackToPlan}
            style={{ fontSize: ".72rem", color: "var(--ember)" }}
          >
            Change
          </button>
        </div>
      </div>

      {/* Due today */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: ".9rem 1.3rem",
          borderRadius: "var(--r-md)",
          background: "var(--green-dim)",
          marginBottom: "1.4rem",
        }}
      >
        <span style={{ fontWeight: 600, color: "var(--green)" }}>
          Due today
        </span>
        <span
          className="serif"
          style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--green)" }}
        >
          $0.00
        </span>
      </div>

      {/* Card form */}
      <div
        className="card"
        style={{ padding: "1.4rem 1.5rem", marginBottom: "1.2rem" }}
      >
        {/* Card number */}
        <label style={{ display: "block", marginBottom: ".9rem" }}>
          <div
            style={{
              fontSize: ".78rem",
              fontWeight: 500,
              color: "var(--ink-2)",
              marginBottom: ".35rem",
            }}
          >
            Card number
          </div>
          <div style={{ position: "relative" }}>
            <input
              value={card.num}
              onChange={(e) =>
                setCard({ ...card, num: fmtCardNum(e.target.value) })
              }
              placeholder="1234 1234 1234 1234"
              inputMode="numeric"
              style={{
                width: "100%",
                padding: ".8rem .95rem",
                fontSize: "1rem",
                background: "var(--surf-low)",
                border: "1.5px solid var(--border-2)",
                borderRadius: "var(--r-md)",
                fontFamily: "var(--mono)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--ember)";
                e.target.style.boxShadow = "0 0 0 3px var(--ember-dim)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border-2)";
                e.target.style.boxShadow = "none";
              }}
            />
            <div
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                gap: 3,
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 16,
                  borderRadius: 3,
                  background: "linear-gradient(135deg,#F3701E,#C9551A)",
                  display: "block",
                }}
              />
              <span
                style={{
                  width: 24,
                  height: 16,
                  borderRadius: 3,
                  background: "linear-gradient(135deg,#4B607F,#7E93B3)",
                  display: "block",
                }}
              />
            </div>
          </div>
        </label>
        {/* Expiry + CVC */}
        <div style={{ display: "flex", gap: ".8rem", marginBottom: ".9rem" }}>
          <label style={{ flex: 1 }}>
            <div
              style={{
                fontSize: ".78rem",
                fontWeight: 500,
                color: "var(--ink-2)",
                marginBottom: ".35rem",
              }}
            >
              Expiry
            </div>
            <input
              value={card.exp}
              onChange={(e) =>
                setCard({ ...card, exp: fmtExp(e.target.value) })
              }
              placeholder="MM/YY"
              inputMode="numeric"
              style={{
                width: "100%",
                padding: ".8rem .95rem",
                fontSize: "1rem",
                background: "var(--surf-low)",
                border: "1.5px solid var(--border-2)",
                borderRadius: "var(--r-md)",
                fontFamily: "var(--mono)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--ember)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border-2)";
              }}
            />
          </label>
          <label style={{ flex: 1 }}>
            <div
              style={{
                fontSize: ".78rem",
                fontWeight: 500,
                color: "var(--ink-2)",
                marginBottom: ".35rem",
              }}
            >
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
              style={{
                width: "100%",
                padding: ".8rem .95rem",
                fontSize: "1rem",
                background: "var(--surf-low)",
                border: "1.5px solid var(--border-2)",
                borderRadius: "var(--r-md)",
                fontFamily: "var(--mono)",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--ember)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border-2)";
              }}
            />
          </label>
        </div>
        {/* Name */}
        <label style={{ display: "block" }}>
          <div
            style={{
              fontSize: ".78rem",
              fontWeight: 500,
              color: "var(--ink-2)",
              marginBottom: ".35rem",
            }}
          >
            Name on card
          </div>
          <input
            value={card.name}
            onChange={(e) => setCard({ ...card, name: e.target.value })}
            placeholder="Full name"
            style={{
              width: "100%",
              padding: ".8rem .95rem",
              fontSize: "1rem",
              background: "var(--surf-low)",
              border: "1.5px solid var(--border-2)",
              borderRadius: "var(--r-md)",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--ember)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--border-2)";
            }}
          />
        </label>
      </div>

      <button
        className="btn btn-primary btn-lg btn-block"
        disabled={!cardReady}
        onClick={onStartTrial}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: ".5rem",
        }}
      >
        <Icon name="lock" size={17} stroke="#fff" /> Start trial. $0.00 today
      </button>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: ".4rem",
          marginTop: ".9rem",
          fontSize: ".76rem",
          color: "var(--ink-4)",
        }}
      >
        <Icon name="lock" size={13} stroke="var(--ink-4)" />
        Secured &amp; encrypted. We&apos;ll remind you before {REMIND_DATE}.
      </div>
    </div>
  );
}
