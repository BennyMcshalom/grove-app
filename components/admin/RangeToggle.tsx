import clsx from 'clsx';
import styles from './RangeToggle.module.css';

export function RangeToggle({ days, setDays }: { days: number; setDays: (n: number) => void }) {
  return (
    <div className={styles.wrap}>
      {[7, 30, 90].map(d => (
        <button key={d} onClick={() => setDays(d)} className={clsx('chip', styles.chip, days === d && styles.active)}>
          {d}d
        </button>
      ))}
    </div>
  );
}
