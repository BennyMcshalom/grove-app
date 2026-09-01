"use client";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useToastStore } from "@/store/useToastStore";
import { TRIAL_END, REMIND_DATE, type Plan } from "./constants";
import styles from "./DoneStep.module.css";

export function DoneStep({ plan }: { plan: Plan }) {
  const router = useRouter();
  const { toast } = useToastStore();

  return (
    <div className={clsx("screen-enter", styles.wrap)}>
      <div className={styles.checkCircle}>
        <Icon name="check" size={40} stroke="var(--green)" />
      </div>
      <h1 className={clsx("serif", styles.title)}>
        Your 14 days start now.
      </h1>
      <p className={styles.subtitle}>
        Full access to all of Grouv is unlocked. We&apos;ll remind you on{" "}
        {REMIND_DATE}, before your {plan} membership begins.
      </p>
      <div className={clsx("card", styles.trialCard)}>
        <div>
          <div className="label-mono">Trial ends</div>
          <div className={styles.trialEndDate}>{TRIAL_END}</div>
        </div>
        <span className={clsx("chip", styles.trialChip)}>
          14 days left
        </span>
      </div>
      <button
        className={clsx("btn", "btn-primary", "btn-lg", "btn-block", styles.enterBtn)}
        onClick={() => {
          toast("Welcome in. Enjoy all of Grouv.");
          router.push("/home");
        }}
      >
        Enter Grouv <Icon name="arrow" stroke="#fff" />
      </button>
      <button onClick={() => router.push("/settings")} className={styles.manageBtn}>
        Manage trial in Settings
      </button>
    </div>
  );
}
