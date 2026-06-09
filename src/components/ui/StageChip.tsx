import { spaceById } from '@/lib/data';
import { Icon } from './Icon';

interface StageChipProps { space: string; stage: string; small?: boolean; }

export function StageChip({ space, stage, small }: StageChipProps) {
  const s = spaceById(space);
  return (
    <span className="chip" style={{ background: 'var(--surf-high)', fontSize: small ? '.7rem' : '.74rem',
      display: 'inline-flex', alignItems: 'center', gap: '.25rem' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
        <Icon name={s.icon} size={small ? 11 : 12} stroke={s.ink} sw={1.9}/>
      </span>
      {stage}
    </span>
  );
}
