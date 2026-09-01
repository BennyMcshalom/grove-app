'use client';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import styles from './RecordingBar.module.css';

export function RecordingBar({ elapsed, onSend, onCancel, sending }: {
  elapsed: number; onSend: () => void; onCancel: () => void; sending: boolean;
}) {
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return (
    <div className={styles.wrap}>
      <span className={styles.left}>
        <span className={styles.dot} />
        <span className={styles.time}>{fmt(elapsed)}</span>
        <span className={styles.track}>
          <span className={styles.fill} style={{ width: `${Math.min(elapsed / 120 * 100, 100)}%` }} />
        </span>
      </span>
      <button onClick={onCancel} className={styles.cancelBtn}>
        <Icon name="close" size={16} stroke="var(--red)" />
      </button>
      <button onClick={onSend} disabled={sending} className={styles.sendBtn}>
        {sending ? <Spinner size={14} color="#fff" /> : <Icon name="send" size={16} stroke="#fff" />}
      </button>
    </div>
  );
}
