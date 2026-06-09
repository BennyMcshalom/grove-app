'use client';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

interface OBShellProps {
  step?: number;
  total?: number;
  onBack?: () => void;
  bg?: string;
  children: React.ReactNode;
  wide?: boolean;
}

export function OBShell({ step, total = 7, onBack, bg = 'var(--cream)', children, wide }: OBShellProps) {
  return (
    <div className="scroll" style={{ height: '100vh', width: '100vw', background: bg, overflowY: 'auto' }}>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: '2rem 1.5rem 3rem' }}>
        <div style={{ width: '100%', maxWidth: wide ? 880 : 560, display: 'flex',
          alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: '2.2rem' }}>
          {onBack && (
            <button onClick={onBack} style={{ position: 'absolute', left: 0, color: 'var(--ink-3)' }}>
              <Icon name="back" size={22} stroke="var(--ink-3)"/>
            </button>
          )}
          {step && (
            <div style={{ display: 'flex', gap: 7 }}>
              {[...Array(total)].map((_, i) => (
                <span key={i} style={{ width: i + 1 === step ? 22 : 7, height: 7, borderRadius: 100,
                  background: i + 1 === step ? 'var(--ember)' : (i + 1 < step ? 'var(--ember-soft)' : 'var(--border-2)'),
                  transition: 'all .3s', display: 'block' }}/>
              ))}
            </div>
          )}
        </div>
        <div style={{ width: '100%', maxWidth: wide ? 880 : 560, flex: 1, display: 'flex', flexDirection: 'column' }}
          className="screen-enter">
          {children}
        </div>
      </div>
    </div>
  );
}
