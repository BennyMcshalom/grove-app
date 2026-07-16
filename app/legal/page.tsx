'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';

export default function LegalPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'promise' | 'privacy' | 'terms'>('promise');

  return (
    <div className="scroll" style={{ height: '100vh', width: '100vw', background: 'var(--cream)', overflowY: 'auto' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.6rem 4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.6rem' }}>
          <Logo size={22}/>
          <button onClick={() => router.push('/home')} style={{ fontSize: '.84rem', color: 'var(--ink-3)' }}>Back to Grouv →</button>
        </div>
        <div className="scroll" style={{ display: 'flex', gap: '1.6rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem', overflowX: 'auto' }}>
          {([['promise',"Grouv's Promise"],['privacy','Privacy Policy'],['terms','Terms of Service']] as [string,string][]).map(([id,l]) => (
            <button key={id} onClick={() => setTab(id as typeof tab)}
              style={{ paddingBottom: '.7rem', fontSize: '.95rem', fontWeight: tab === id ? 600 : 500,
                color: tab === id ? 'var(--ember)' : 'var(--ink-3)', whiteSpace: 'nowrap', flexShrink: 0,
                borderBottom: tab === id ? '2px solid var(--ember)' : '2px solid transparent', marginBottom: -1 }}>{l}</button>
          ))}
        </div>

        {tab === 'promise' && (
          <article className="fade-in">
            <h1 className="serif" style={{ fontSize: 'clamp(1.8rem, 8vw, 2.6rem)', fontWeight: 600, lineHeight: 1.1, marginBottom: '.5rem' }}>What Grouv will always be.</h1>
            <div className="mono" style={{ fontSize: '.72rem', color: 'var(--ink-4)', marginBottom: '1.8rem' }}>A promise, not a contract · May 2026</div>
            <p style={{ fontSize: '1.15rem', lineHeight: 1.8, color: 'var(--ink-2)', marginBottom: '1.6rem' }}>We built Grouv because we were tired of being counted. Here is what we promise you:</p>
            {[
              ['We will never add likes or follower counts.','Your worth here is not a number, and we will never pretend it could be.'],
              ['We will never show you ads.','You are not the product. We have no ad business model and never will.'],
              ['We will never sell your data.','What you write in your honest fields stays between you and your Bonds. Full stop.'],
              ['We will always charge you directly.','We\'d rather you pay us a fair price than have us monetise your attention.'],
              ['We will grow slowly to stay real.','We are not chasing scale. We are chasing depth, even when it costs us.'],
              ['We will tell you honestly when something changes.','No quiet policy edits. If we change, we\'ll say so, plainly.'],
            ].map(([h,b]) => (
              <div key={h} style={{ marginBottom: '1.4rem', paddingLeft: '1.2rem', borderLeft: '3px solid var(--ember)' }}>
                <h3 className="serif" style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '.3rem' }}>{h}</h3>
                <p style={{ color: 'var(--ink-2)', lineHeight: 1.7 }}>{b}</p>
              </div>
            ))}
            <p className="serif" style={{ fontSize: '1.3rem', fontStyle: 'italic', marginTop: '2rem', color: 'var(--ink)' }}>The Grouv team</p>
          </article>
        )}

        {tab === 'privacy' && (
          <article className="fade-in">
            <h1 className="serif" style={{ fontSize: 'clamp(1.7rem, 7.5vw, 2.4rem)', fontWeight: 600, marginBottom: '.4rem' }}>Your Privacy, Simply Explained.</h1>
            <div className="mono" style={{ fontSize: '.72rem', color: 'var(--ink-4)', marginBottom: '1.8rem' }}>Last updated May 2026</div>
            <div className="card" style={{ padding: '1.2rem 1.4rem', marginBottom: '1.8rem', background: 'var(--ember-dim)', border: '1px solid var(--ember-bdr)' }}>
              <p style={{ fontWeight: 600, color: 'var(--ember-deep)' }}>We will never sell your data. We have no ad business model.</p>
            </div>
            {[['What we collect','Your first name, email, the spaces and stages you choose, and what you write.'],
              ['What we never collect','No location history. No contacts scraping. No browsing trackers across the web.'],
              ['How we use your data','To match you with people in similar chapters. Nothing else.'],
              ['Who can see what','Your honest fields are visible only to your Bonds.'],
              ['Data retention','Closed chapters live in your private Archive until you delete your account.'],
              ['Your rights','Export or delete everything, any time, from Settings.'],
            ].map(([h,b]) => (
              <section key={h} style={{ paddingBottom: '1.2rem', marginBottom: '1.2rem', borderBottom: '1px solid var(--border)' }}>
                <h3 className="serif" style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '.3rem' }}>{h}</h3>
                <p style={{ color: 'var(--ink-2)', lineHeight: 1.7 }}>{b}</p>
              </section>
            ))}
          </article>
        )}

        {tab === 'terms' && (
          <article className="fade-in">
            <h1 className="serif" style={{ fontSize: 'clamp(1.7rem, 7.5vw, 2.4rem)', fontWeight: 600, marginBottom: '.4rem' }}>The Rules of the Garden.</h1>
            <div className="mono" style={{ fontSize: '.72rem', color: 'var(--ink-4)', marginBottom: '1.8rem' }}>Last updated May 2026</div>
            {[['Who can join','Anyone 16 or older, willing to show up honestly.'],
              ['What you can post','What\'s true for you. Your chapter, your tension, your real situation.'],
              ['What is never allowed','Harassment, hate, spam, self-promotion, or treating Grouv like a marketing channel.'],
              ["Grouv's rights",'We can remove content that breaks these rules and close accounts that harm others.'],
              ['Termination','You can leave any time. We\'ll keep your private archive available to export first.'],
            ].map(([h,b]) => (
              <section key={h} style={{ paddingBottom: '1.2rem', marginBottom: '1.2rem', borderBottom: '1px solid var(--border)' }}>
                <h3 className="serif" style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '.3rem' }}>{h}</h3>
                <p style={{ color: 'var(--ink-2)', lineHeight: 1.7 }}>{b}</p>
              </section>
            ))}
          </article>
        )}
      </div>
    </div>
  );
}
