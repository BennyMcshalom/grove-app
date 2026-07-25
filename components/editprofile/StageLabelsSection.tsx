'use client';
import { SpaceIcon } from '@/components/ui/SpaceIcon';
import { STAGES, spaceById } from '@/lib/data';
import { Section } from './Section';
import { fieldStyle, focusStyle, blurStyle } from './fieldStyle';

export function StageLabelsSection({ spaces, labels, setLabels }: {
  spaces: string[];
  labels: Record<string, string>;
  setLabels: (l: Record<string, string>) => void;
}) {
  return (
    <Section label="Where you are in each space">
      {spaces.map(id => {
        const s = spaceById(id);
        const opts = STAGES[id] ?? STAGES.career;
        return (
          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '.7rem', marginBottom: '.8rem' }}>
            <SpaceIcon spaceId={id} size={16} pill pillSize={32}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: '.9rem', marginBottom: '.3rem' }}>{s.name}</div>
              <select value={labels[id] ?? opts[0]} onChange={e => setLabels({ ...labels, [id]: e.target.value })}
                style={{ ...fieldStyle, padding: '.55rem .7rem', fontSize: '.88rem' }}
                onFocus={focusStyle} onBlur={blurStyle}>
                {opts.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
        );
      })}
    </Section>
  );
}
