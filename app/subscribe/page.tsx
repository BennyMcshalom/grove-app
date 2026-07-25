'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { Logo } from '@/components/ui/Logo';
import { useUserStore } from '@/store/useUserStore';
import { TRIAL_END, type Step, type Plan } from '@/components/subscribe/constants';
import { PlanStep } from '@/components/subscribe/PlanStep';
import { PayStep } from '@/components/subscribe/PayStep';
import { DoneStep } from '@/components/subscribe/DoneStep';

export default function SubscribePage() {
  const router   = useRouter();
  const { setUser } = useUserStore();

  const [step, setStep] = useState<Step>('plan');
  const [plan, setPlan] = useState<Plan>('annual');

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

        {step === 'plan' && (
          <PlanStep plan={plan} setPlan={setPlan} onStartTrial={startTrial} />
        )}

        {step === 'pay' && (
          <PayStep plan={plan} card={card} setCard={setCard} cardReady={cardReady}
            onBackToPlan={() => setStep('plan')} onStartTrial={startTrial} />
        )}

        {step === 'done' && (
          <DoneStep plan={plan} />
        )}

      </div>
    </div>
  );
}
