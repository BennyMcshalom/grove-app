import clsx from 'clsx';
import { spaceById } from '@/lib/data';
import { Icon } from './Icon';
import styles from './StageChip.module.css';

interface StageChipProps {
  space: string;
  stage: string;
  small?: boolean;
  tone?: 'ember';
}

export function StageChip({ space, stage, small, tone }: StageChipProps) {
  const s = spaceById(space);
  const ember = tone === 'ember';
  return (
    <span className={clsx(styles.chip, ember && styles.ember, small && styles.small)}>
      <span className={styles.iconWrap}>
        <Icon
          name={s.icon}
          size={ember ? (small ? 14 : 15) : small ? 11 : 12}
          stroke={ember ? 'var(--ember-deep)' : s.ink}
          sw={1.9}
        />
      </span>
      {stage}
    </span>
  );
}
