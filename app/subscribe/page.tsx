'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { useToastStore } from '@/store/useToastStore';
import { useUserStore } from '@/store/useUserStore';

const PLAN_FEATURES: [string, string, string][] = [
  ['spaces',  'All four Life Spaces',       'Hold up to four chapters at once'],
  ['bonds',   'Grouw Bonds',                'Up to five deep 1:1 relationships'],
  ['sun',     'Morning Room',               'Daily Curio, prompts & reflections'],
  ['pin',     'Proximity',                  'Find your chapter, right where you are'],
  ['book',    'The Grouw Log',              'Daily ritual + the Artifact at chapter close'],
  ['map',     'The Trail & Life Archive',   'Your living terrain, kept forever'],
];

const TRIAL_END   = 'June 13, 2026';
const REMIND_DATE = 'June 11, 2026';

type Step = 'plan' | 'pay' | 'done';
type Plan = 'annual' | 'monthly';

const PRICES: Record<Plan, { amount: string; cadence: string; sub: string }> = {
  annual:  { amount: '$84', cadence: '/year',  sub: 'just $7/month, billed yearly' },
  monthly: { amount: '$10', cadence: '/month', sub: 'billed monthly' },
};

function fmtCardNum(v: string) {
  return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}
function fmtExp(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
}

export default function SubscribePage() {
  const router   = useRouter();
  const { toast } = useToastStore();
  const { setUser } = useUserStore();

  const [step, setStep] = useState<Step>('plan');
  const [plan, setPlan] = useState<Plan>('annual');
  const price = PRICES[plan];

  const [card, setCard] = useState({ num: '', exp: '', cvc: '', name: '' });
  const cardReady = card.num.replace(/\s/g, '').length >= 15 && card.exp.length === 5 && card.cvc.length >= 3 && card.name.trim().length > 1;

  const startTrial = () => {
    setUser(u => ({ ...u, trial: { active: true, daysLeft: 14, ends: TRIAL_END } } as typeof u));
    setStep('done');
  };

  const back = () => {
    if (step === 'pay') setStep('plan');
    else router.push('/home');
  };

  return (
    <div className="scroll" style={{ height: '100vh', width: '100vw', background: 'var(--cream)', overflowY: 'auto' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '2.2rem 1.6rem 3rem' }}>

        {/* Nav bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.6rem' }}>
          <button onClick={back}
            style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.84rem', color: 'var(--ink-3)' }}>
            <Icon name="back" size={16} stroke="var(--ink-3)"/>
            {step === 'pay' ? 'Plan' : 'Not now'}
          </button>
          <Logo size={22}/>
        </div>

        {/* ── STEP 1: PLAN ── */}
        {step === 'plan' && (
          <div className="screen-enter">
            <div style={{ textAlign: 'center', marginBottom: '1.6rem' }}>
              <span className="chip" style={{ background: 'var(--ember-dim)', color: 'var(--ember-deep)', fontWeight: 600, marginBottom: '.9rem', display: 'inline-block' }}>
                14 days free, then choose to stay
              </span>
              <h1 className="serif" style={{ fontSize: 'clamp(1.7rem, 7.5vw, 2.4rem)', fontWeight: 600, lineHeight: 1.1 }}>
                Go deeper into Grouw.
              </h1>
              <p style={{ color: 'var(--ink-3)', marginTop: '.5rem' }}>
                Start a 14-day trial. Full access from minute one.
              </p>
            </div>

            {/* Trial timeline */}
            <div className="card" style={{ padding: '1.4rem 1.5rem', marginBottom: '1.4rem' }}>
              <div className="label-mono" style={{ marginBottom: '1.1rem' }}>How your trial works</div>
              {([
                ['var(--ember)', 'Today',        'Full access unlocks',    'All of Grouw, free for 14 days.'],
                ['var(--amber)', REMIND_DATE,    'A gentle reminder',      "We'll email you 2 days before — no surprises."],
                ['var(--sage)',  TRIAL_END,      'Membership begins',      `Your ${plan} plan starts unless you cancel.`],
              ] as [string, string, string, string][]).map(([color, date, title, desc], i, arr) => (
                <div key={date} style={{ display: 'flex', gap: '.9rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ width: 13, height: 13, borderRadius: '50%', background: color,
                      flexShrink: 0, marginTop: 3, boxShadow: `0 0 0 4px ${color}22` }}/>
                    {i < arr.length - 1 && (
                      <span style={{ width: 2, flex: 1, background: 'var(--border-2)', margin: '4px 0', display: 'block' }}/>
                    )}
                  </div>
                  <div style={{ paddingBottom: i < arr.length - 1 ? '1.1rem' : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '.5rem' }}>
                      <span className="mono" style={{ fontSize: '.66rem', color: 'var(--ink-4)' }}>{date}</span>
                      <span style={{ fontWeight: 600, fontSize: '.92rem' }}>{title}</span>
                    </div>
                    <div style={{ fontSize: '.82rem', color: 'var(--ink-3)', marginTop: 1 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Plan selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.7rem', marginBottom: '1.4rem' }}>
              {([
                ['annual',  'Annual',  '$84', '/year',  'Save $36 · $7/mo', 'Best value'],
                ['monthly', 'Monthly', '$10', '/month', 'Billed monthly',   null],
              ] as [Plan, string, string, string, string, string | null][]).map(([id, label, amt, cad, note, badge]) => {
                const on = plan === id;
                return (
                  <button key={id} onClick={() => setPlan(id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '.9rem', textAlign: 'left',
                      padding: '1.1rem 1.3rem', borderRadius: 'var(--r-lg)', background: 'var(--white)',
                      border: on ? '2px solid var(--ember)' : '1.5px solid var(--border-2)',
                      boxShadow: on ? '0 6px 20px -8px rgba(243,112,30,.4)' : 'var(--shadow-soft)',
                      transition: 'all .15s' }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      border: on ? '7px solid var(--ember)' : '2px solid var(--border-2)',
                      transition: 'all .15s' }}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                        <span style={{ fontWeight: 600 }}>{label}</span>
                        {badge && (
                          <span className="chip" style={{ background: 'var(--ember-dim)', color: 'var(--ember-deep)', fontSize: '.62rem', padding: '.15rem .5rem' }}>
                            {badge}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '.8rem', color: 'var(--ink-3)' }}>{note}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="serif" style={{ fontSize: '1.7rem', fontWeight: 600, color: 'var(--ember)' }}>{amt}</span>
                      <span style={{ fontSize: '.78rem', color: 'var(--ink-4)' }}>{cad}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <button className="btn btn-primary btn-lg btn-block" onClick={startTrial}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem' }}>
              Start my 14 free days <Icon name="arrow" stroke="#fff"/>
            </button>
            <p style={{ textAlign: 'center', fontSize: '.78rem', color: 'var(--ink-3)', marginTop: '.8rem' }}>
              No card needed. We'll remind you before {TRIAL_END} — keep going only if you want to.
            </p>

            {/* Features */}
            <div className="card" style={{ padding: '1.3rem 1.5rem', marginTop: '1.6rem' }}>
              <div className="label-mono" style={{ marginBottom: '.9rem' }}>Everything's included</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.7rem' }}>
                {PLAN_FEATURES.map(([iconName, title, desc]) => (
                  <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: '.7rem' }}>
                    <span style={{ flexShrink: 0, marginTop: 1 }}><Icon name={iconName} size={18} stroke="var(--ember)" sw={1.6}/></span>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '.9rem' }}>{title}</div>
                      <div style={{ fontSize: '.78rem', color: 'var(--ink-3)' }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p style={{ textAlign: 'center', color: 'var(--ink-4)', fontSize: '.8rem', marginTop: '1.2rem', fontStyle: 'italic' }}>
              No ads. No data selling. You pay us, so you're never the product.{' '}
              <button onClick={() => router.push('/legal')} style={{ color: 'var(--ember)' }}>Our promise →</button>
            </p>
          </div>
        )}

        {/* ── STEP 2: PAY ── */}
        {step === 'pay' && (
          <div className="screen-enter">
            <div style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
              <h1 className="serif" style={{ fontSize: 'clamp(1.5rem, 6.5vw, 2.1rem)', fontWeight: 600 }}>Add a payment method</h1>
              <p style={{ color: 'var(--ink-3)', marginTop: '.4rem' }}>Required to start your trial. Nothing is charged today.</p>
            </div>

            {/* Order summary */}
            <div className="card" style={{ padding: '1.1rem 1.4rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{plan === 'annual' ? 'Annual' : 'Monthly'} membership</div>
                <div style={{ fontSize: '.8rem', color: 'var(--ink-3)' }}>{price.sub}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="serif" style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--ember)' }}>
                  {price.amount}<span style={{ fontSize: '.76rem', color: 'var(--ink-4)' }}>{price.cadence}</span>
                </div>
                <button onClick={() => setStep('plan')} style={{ fontSize: '.72rem', color: 'var(--ember)' }}>Change</button>
              </div>
            </div>

            {/* Due today */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.9rem 1.3rem',
              borderRadius: 'var(--r-md)', background: 'var(--green-dim)', marginBottom: '1.4rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--green)' }}>Due today</span>
              <span className="serif" style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--green)' }}>$0.00</span>
            </div>

            {/* Card form */}
            <div className="card" style={{ padding: '1.4rem 1.5rem', marginBottom: '1.2rem' }}>
              {/* Card number */}
              <label style={{ display: 'block', marginBottom: '.9rem' }}>
                <div style={{ fontSize: '.78rem', fontWeight: 500, color: 'var(--ink-2)', marginBottom: '.35rem' }}>Card number</div>
                <div style={{ position: 'relative' }}>
                  <input value={card.num} onChange={e => setCard({ ...card, num: fmtCardNum(e.target.value) })}
                    placeholder="1234 1234 1234 1234" inputMode="numeric"
                    style={{ width: '100%', padding: '.8rem .95rem', fontSize: '1rem', background: 'var(--surf-low)',
                      border: '1.5px solid var(--border-2)', borderRadius: 'var(--r-md)', fontFamily: 'var(--mono)' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--ember)'; e.target.style.boxShadow = '0 0 0 3px var(--ember-dim)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none'; }}/>
                  <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 3 }}>
                    <span style={{ width: 24, height: 16, borderRadius: 3, background: 'linear-gradient(135deg,#F3701E,#C9551A)', display: 'block' }}/>
                    <span style={{ width: 24, height: 16, borderRadius: 3, background: 'linear-gradient(135deg,#4B607F,#7E93B3)', display: 'block' }}/>
                  </div>
                </div>
              </label>
              {/* Expiry + CVC */}
              <div style={{ display: 'flex', gap: '.8rem', marginBottom: '.9rem' }}>
                <label style={{ flex: 1 }}>
                  <div style={{ fontSize: '.78rem', fontWeight: 500, color: 'var(--ink-2)', marginBottom: '.35rem' }}>Expiry</div>
                  <input value={card.exp} onChange={e => setCard({ ...card, exp: fmtExp(e.target.value) })}
                    placeholder="MM/YY" inputMode="numeric"
                    style={{ width: '100%', padding: '.8rem .95rem', fontSize: '1rem', background: 'var(--surf-low)',
                      border: '1.5px solid var(--border-2)', borderRadius: 'var(--r-md)', fontFamily: 'var(--mono)' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--ember)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; }}/>
                </label>
                <label style={{ flex: 1 }}>
                  <div style={{ fontSize: '.78rem', fontWeight: 500, color: 'var(--ink-2)', marginBottom: '.35rem' }}>CVC</div>
                  <input value={card.cvc} onChange={e => setCard({ ...card, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    placeholder="123" inputMode="numeric"
                    style={{ width: '100%', padding: '.8rem .95rem', fontSize: '1rem', background: 'var(--surf-low)',
                      border: '1.5px solid var(--border-2)', borderRadius: 'var(--r-md)', fontFamily: 'var(--mono)' }}
                    onFocus={e => { e.target.style.borderColor = 'var(--ember)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; }}/>
                </label>
              </div>
              {/* Name */}
              <label style={{ display: 'block' }}>
                <div style={{ fontSize: '.78rem', fontWeight: 500, color: 'var(--ink-2)', marginBottom: '.35rem' }}>Name on card</div>
                <input value={card.name} onChange={e => setCard({ ...card, name: e.target.value })}
                  placeholder="Full name"
                  style={{ width: '100%', padding: '.8rem .95rem', fontSize: '1rem', background: 'var(--surf-low)',
                    border: '1.5px solid var(--border-2)', borderRadius: 'var(--r-md)' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--ember)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; }}/>
              </label>
            </div>

            <button className="btn btn-primary btn-lg btn-block" disabled={!cardReady} onClick={startTrial}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem' }}>
              <Icon name="lock" size={17} stroke="#fff"/> Start trial — $0.00 today
            </button>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem',
              marginTop: '.9rem', fontSize: '.76rem', color: 'var(--ink-4)' }}>
              <Icon name="lock" size={13} stroke="var(--ink-4)"/>
              Secured &amp; encrypted. We'll remind you before {REMIND_DATE}.
            </div>
          </div>
        )}

        {/* ── STEP 3: DONE ── */}
        {step === 'done' && (
          <div className="screen-enter" style={{ textAlign: 'center', paddingTop: '1.5rem' }}>
            <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'var(--green-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.4rem' }}>
              <Icon name="check" size={40} stroke="var(--green)"/>
            </div>
            <h1 className="serif" style={{ fontSize: 'clamp(1.7rem, 7.5vw, 2.4rem)', fontWeight: 600, lineHeight: 1.1 }}>
              Your 14 days start now.
            </h1>
            <p style={{ color: 'var(--ink-2)', marginTop: '.6rem', maxWidth: 380, marginInline: 'auto', lineHeight: 1.6 }}>
              Full access to all of Grouw is unlocked. We'll remind you on {REMIND_DATE}, before your{' '}
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
              onClick={() => { toast('Welcome in. Enjoy all of Grouw.'); router.push('/home'); }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem' }}>
              Enter Grouw <Icon name="arrow" stroke="#fff"/>
            </button>
            <button onClick={() => router.push('/settings')}
              style={{ marginTop: '1rem', fontSize: '.82rem', color: 'var(--ink-3)' }}>
              Manage trial in Settings
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
