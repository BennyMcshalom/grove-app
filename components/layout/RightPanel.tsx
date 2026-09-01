import clsx from "clsx";
import styles from "./RightPanel.module.css";

interface RightPanelProps {
  children: React.ReactNode;
}

export function RightPanel({ children }: RightPanelProps) {
  return <aside className={clsx("scroll", styles.panel)}>{children}</aside>;
}

interface RPSectionProps {
  label: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
  suggested?: boolean;
}

export function RPSection({
  label,
  action,
  onAction,
  children,
  suggested,
}: RPSectionProps) {
  return (
    <section className={clsx(styles.section, suggested && styles.suggested)}>
      <div className={styles.sectionHeader}>
        <div
          className={clsx(
            "label-mono",
            styles.sectionLabel,
            suggested && styles.suggested,
          )}
        >
          {label}
        </div>
        {action && (
          <button onClick={onAction} className={styles.sectionAction}>
            {action}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}
