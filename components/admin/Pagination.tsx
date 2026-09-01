import clsx from 'clsx';
import styles from './Pagination.module.css';

export function Pagination({ page, pageCount, onPrev, onNext }: {
  page: number; pageCount: number; onPrev: () => void; onNext: () => void;
}) {
  return (
    <div className={styles.wrap}>
      <button className={clsx('btn', 'btn-soft', styles.btn, page === 0 && styles.disabled)} disabled={page === 0} onClick={onPrev}>
        ← Prev
      </button>
      <span className={styles.label}>Page {page + 1} of {pageCount}</span>
      <button className={clsx('btn', 'btn-soft', styles.btn, page >= pageCount - 1 && styles.disabled)} disabled={page >= pageCount - 1} onClick={onNext}>
        Next →
      </button>
    </div>
  );
}
