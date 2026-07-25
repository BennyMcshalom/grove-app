'use client';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { useToastStore } from '@/store/useToastStore';
import { TRIAL_END, REMIND_DATE, type Plan } from './constants';

export function DoneStep({ plan }: { plan: Plan }) {
  const router = useRouter();
  const { toast } = useToastStore();

  return (
    <div className="screen-enter" style={{ textAlign: 'center', paddingTop: '1.5rem' }}>
      <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'var(--green-dim)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.4rem' }}>
        <Icon name="check" size={40} stroke="var(--green)"/>
      </div>
      <h1 className="serif" style={{ fontSize: 'clamp(1.7rem, 7.5vw, 2.4rem)', fontWeight: 600, lineHeight: 1.1 }}>
        Your 14 days start now.
      </h1>
      <p style={{ color: 'var(--ink-2)', marginTop: '.6rem', maxWidth: 380, marginInline: 'auto', lineHeight: 1.6 }}>
        Full access to all of Grouv is unlocked. We'll remind you on {REMIND_DATE}, before your{' '}
        {plan} membership begins.
      </p>
      <div className="card" style={{ padding: '1.1rem 1.4rem', margin: '1.8rem 0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}>
        <div>
          <div className="label-mono">Trial ends</div>
          <div style={{ fontWeight: 600, marginTop: 2 }}>{TRIAL_END}</div>
        </div>
        <span className="chip" style={{ background: 'var(--ember-dim)', color: 'var(--ember-deep)', fontWeight: 600 }}>
          14 days left
        </span>
      </div>
      <button className="btn btn-primary btn-lg btn-block"
        onClick={() => { toast('Welcome in. Enjoy all of Grouv.'); router.push('/home'); }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem' }}>
        Enter Grouv <Icon name="arrow" stroke="#fff"/>
      </button>
      <button onClick={() => router.push('/settings')}
        style={{ marginTop: '1rem', fontSize: '.82rem', color: 'var(--ink-3)' }}>
        Manage trial in Settings
      </button>
    </div>
  );
}
