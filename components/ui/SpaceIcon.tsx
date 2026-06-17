import { Icon } from './Icon';
import { spaceById } from '@/lib/data';

interface SpaceIconProps {
  spaceId: string;
  size?: number;
  /** Renders inside a coloured circle pill. Default false. */
  pill?: boolean;
  pillSize?: number;
}

/**
 * Renders the proper SVG icon for a space.
 * Use this everywhere a space emoji was previously displayed.
 */
export function SpaceIcon({ spaceId, size = 18, pill = false, pillSize }: SpaceIconProps) {
  const space = spaceById(spaceId);
  const ps = pillSize ?? size * 2.2;

  if (pill) {
    return (
      <span style={{
        width: ps, height: ps, borderRadius: '50%',
        background: space.color,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon name={space.icon} size={size} stroke={space.ink} sw={1.8}/>
      </span>
    );
  }

  return <Icon name={space.icon} size={size} stroke={space.ink} sw={1.8}/>;
}
