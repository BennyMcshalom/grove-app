interface EmptyStateProps {
  variant: keyof typeof VARIANTS;
  title?: string;
  body?: string;
  action?: { label: string; onClick: () => void };
  /** Smaller illustration + tighter padding, for narrow contexts like a sidebar widget */
  compact?: boolean;
}

const VARIANTS = {
  feed: {
    title: 'Nothing here yet.',
    body: 'Be the first to root a thought. Your circle is listening.',
    illustration: (
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none">
        <circle cx="44" cy="44" r="40" fill="var(--surf-low)"/>
        {/* Sprout */}
        <path d="M44 68V50" stroke="var(--sage)" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M44 55c0-6 4.5-10 9-10 0 6-4.5 10-9 10Z" fill="var(--sage)" opacity=".7"/>
        <path d="M44 59c0-6-4.5-10-9-10 0 6 4.5 10 9 10Z" fill="var(--sage)"/>
        <circle cx="44" cy="48" r="2.5" fill="var(--sage)"/>
        {/* Soil dots */}
        <circle cx="34" cy="70" r="2" fill="var(--surf-high)"/>
        <circle cx="44" cy="72" r="2.5" fill="var(--surf-high)"/>
        <circle cx="54" cy="70" r="2" fill="var(--surf-high)"/>
      </svg>
    ),
  },

  bonds: {
    title: 'No active Bonds yet.',
    body: 'A Bond forms when you consistently show up for someone. It can\'t be rushed.',
    illustration: (
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none">
        <circle cx="44" cy="44" r="40" fill="var(--surf-low)"/>
        {/* Two overlapping circles */}
        <circle cx="36" cy="44" r="14" stroke="var(--ember)" strokeWidth="2" strokeDasharray="4 3" opacity=".5"/>
        <circle cx="52" cy="44" r="14" stroke="var(--slate)" strokeWidth="2" strokeDasharray="4 3" opacity=".5"/>
        {/* Center spark */}
        <circle cx="44" cy="44" r="4" fill="var(--ember)" opacity=".3"/>
        <circle cx="44" cy="44" r="2" fill="var(--ember)" opacity=".7"/>
      </svg>
    ),
  },

  thread: {
    title: 'Start the conversation.',
    body: 'The first message is always the hardest. It doesn\'t have to be perfect.',
    illustration: (
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none">
        <circle cx="44" cy="44" r="40" fill="var(--surf-low)"/>
        {/* Voice waveform bars */}
        {[26,32,38,44,50,56,62].map((x, i) => {
          const heights = [8,14,20,26,18,12,10];
          const h = heights[i];
          return (
            <rect key={x} x={x} y={44 - h/2} width="4" height={h} rx="2"
              fill="var(--ember)" opacity={0.2 + i * 0.1}/>
          );
        })}
        {/* Mic dot */}
        <circle cx="44" cy="64" r="4" fill="var(--ember)" opacity=".4"/>
      </svg>
    ),
  },

  archive: {
    title: 'No closed chapters yet.',
    body: 'When you close a space, your reflections will live here — permanently.',
    illustration: (
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none">
        <circle cx="44" cy="44" r="40" fill="var(--surf-low)"/>
        {/* Book */}
        <rect x="24" y="26" width="40" height="36" rx="3" fill="var(--surf-high)" stroke="var(--border-2)" strokeWidth="1.5"/>
        <line x1="44" y1="26" x2="44" y2="62" stroke="var(--border-2)" strokeWidth="1.5"/>
        {/* Lines on left page */}
        <line x1="30" y1="36" x2="40" y2="36" stroke="var(--ink-4)" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="30" y1="41" x2="40" y2="41" stroke="var(--ink-4)" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="30" y1="46" x2="37" y2="46" stroke="var(--ink-4)" strokeWidth="1.5" strokeLinecap="round"/>
        {/* Lines on right page */}
        <line x1="48" y1="36" x2="58" y2="36" stroke="var(--ink-4)" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="48" y1="41" x2="58" y2="41" stroke="var(--ink-4)" strokeWidth="1.5" strokeLinecap="round"/>
        {/* Ribbon */}
        <path d="M44 62v6" stroke="var(--ember)" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },

  stats: {
    title: 'Nothing to measure yet.',
    body: 'Show up honestly — the numbers will follow. Stats appear after your first full month.',
    illustration: (
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none">
        <circle cx="44" cy="44" r="40" fill="var(--surf-low)"/>
        {/* Bar chart */}
        <rect x="26" y="52" width="9" height="10" rx="1.5" fill="var(--surf-high)" stroke="var(--border-2)" strokeWidth="1.5"/>
        <rect x="39.5" y="42" width="9" height="20" rx="1.5" fill="var(--surf-high)" stroke="var(--border-2)" strokeWidth="1.5"/>
        <rect x="53" y="33" width="9" height="29" rx="1.5" fill="var(--surf-high)" stroke="var(--border-2)" strokeWidth="1.5"/>
        {/* Axis */}
        <line x1="24" y1="64" x2="64" y2="64" stroke="var(--border-2)" strokeWidth="1.5" strokeLinecap="round"/>
        {/* Dotted upward trend */}
        <path d="M28 55 L43.5 45 L57 36" stroke="var(--ember)" strokeWidth="1.5" strokeDasharray="3 3" strokeLinecap="round" opacity=".5"/>
      </svg>
    ),
  },

  groups: {
    title: 'No groups found.',
    body: 'Chapter groups form around shared life phases. Try a different search.',
    illustration: (
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none">
        <circle cx="44" cy="44" r="40" fill="var(--surf-low)"/>
        {/* Three people silhouettes */}
        <circle cx="44" cy="35" r="7" fill="var(--surf-high)" stroke="var(--border-2)" strokeWidth="1.5"/>
        <path d="M33 58c0-6.1 4.9-11 11-11s11 4.9 11 11" stroke="var(--border-2)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <circle cx="30" cy="37" r="5.5" fill="var(--surf-high)" stroke="var(--border-2)" strokeWidth="1.5" opacity=".6"/>
        <path d="M22 57c0-4.4 3.6-8 8-8" stroke="var(--border-2)" strokeWidth="1.5" strokeLinecap="round" opacity=".6"/>
        <circle cx="58" cy="37" r="5.5" fill="var(--surf-high)" stroke="var(--border-2)" strokeWidth="1.5" opacity=".6"/>
        <path d="M66 57c0-4.4-3.6-8-8-8" stroke="var(--border-2)" strokeWidth="1.5" strokeLinecap="round" opacity=".6"/>
      </svg>
    ),
  },

  notifications: {
    title: 'All quiet here.',
    body: 'When something needs your attention, it\'ll show up here. For now, you\'re caught up.',
    illustration: (
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none">
        <circle cx="44" cy="44" r="40" fill="var(--surf-low)"/>
        {/* Bell outline */}
        <path d="M44 26a12 12 0 0 1 12 12c0 10-3 14-3 14H35s-3-4-3-14a12 12 0 0 1 12-12Z"
          stroke="var(--ink-4)" strokeWidth="2" fill="var(--surf-high)"/>
        <path d="M41 52a3 3 0 0 0 6 0" stroke="var(--ink-4)" strokeWidth="2" strokeLinecap="round" fill="none"/>
        {/* Zzz */}
        <text x="54" y="36" fontSize="8" fill="var(--ink-4)" fontFamily="system-ui" opacity=".5">z</text>
        <text x="58" y="30" fontSize="7" fill="var(--ink-4)" fontFamily="system-ui" opacity=".35">z</text>
      </svg>
    ),
  },

  curio: {
    title: 'No card for today.',
    body: 'Your morning Curio will appear here. Come back tomorrow.',
    illustration: (
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none">
        <circle cx="44" cy="44" r="40" fill="var(--surf-low)"/>
        {/* Sun */}
        <circle cx="44" cy="44" r="12" fill="var(--c-career)" stroke="var(--amber)" strokeWidth="2"/>
        {/* Rays */}
        {[0,45,90,135,180,225,270,315].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = 44 + 17 * Math.cos(rad), y1 = 44 + 17 * Math.sin(rad);
          const x2 = 44 + 22 * Math.cos(rad), y2 = 44 + 22 * Math.sin(rad);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" opacity=".5"/>;
        })}
      </svg>
    ),
  },

  ask: {
    title: 'No active ask.',
    body: 'Ask something honest and your space will respond — without names.',
    illustration: (
      <svg width="88" height="88" viewBox="0 0 88 88" fill="none">
        <circle cx="44" cy="44" r="40" fill="var(--surf-low)"/>
        {/* Speech bubble with ? */}
        <path d="M28 30h32a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H50l-6 6-6-6H28a4 4 0 0 1-4-4V34a4 4 0 0 1 4-4Z"
          fill="var(--surf-high)" stroke="var(--border-2)" strokeWidth="1.5"/>
        <text x="40" y="46" fontSize="16" fontWeight="600" fill="var(--ink-3)" fontFamily="Georgia, serif">?</text>
      </svg>
    ),
  },
} as const;

export function EmptyState({ variant, title, body, action, compact }: EmptyStateProps) {
  const v = VARIANTS[variant];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      textAlign: 'center', padding: compact ? '1.6rem 1.1rem' : '3rem 1.5rem', gap: compact ? '.7rem' : '1rem' }}>
      <div style={{
        animation: 'rise .6s cubic-bezier(.22,.61,.36,1) both',
        transform: compact ? 'scale(.7)' : undefined,
        margin: compact ? '-10px 0' : undefined,
      }}>
        {v.illustration}
      </div>
      <div style={{ maxWidth: compact ? 230 : 320 }}>
        <h3 className="serif" style={{ fontSize: compact ? '1.05rem' : '1.4rem', fontWeight: 600, marginBottom: '.35rem', color: 'var(--ink)' }}>
          {title ?? v.title}
        </h3>
        <p style={{ fontSize: compact ? '.78rem' : '.88rem', color: 'var(--ink-3)', lineHeight: 1.55 }}>
          {body ?? v.body}
        </p>
      </div>
      {action && (
        <button onClick={action.onClick} className="btn btn-primary btn-pill"
          style={{ padding: compact ? '.5rem 1.1rem' : '.6rem 1.4rem', fontSize: compact ? '.78rem' : '.88rem', marginTop: compact ? '.1rem' : '.4rem' }}>
          {action.label}
        </button>
      )}
    </div>
  );
}
