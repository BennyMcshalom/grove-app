'use client';
import { useState, useEffect } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useToastStore } from '@/store/useToastStore';
import { useBondLogToday, usePostBondLog, useMarkBondResonance, useBondLogHistory } from '@/hooks/useBondLog';
import type { AuraKey } from '@/lib/types';

// ── BondReveal — fully wired ──────────────────────────────────────
export function BondReveal({ bonds }: { bonds: { id: string; name: string; avatarUrl?: string | null }[] }) {
  const { toast } = useToastStore();
  const [selectedBondId, setSelectedBondId] = useState(bonds[0]?.id ?? '');
  const [draft, setDraft] = useState('');

  const { data, isLoading, refetch } = useBondLogToday(selectedBondId || undefined);
  const postEntry = usePostBondLog(selectedBondId || undefined);
  const markResonate = useMarkBondResonance(selectedBondId || undefined);
  const { data: history } = useBondLogHistory(selectedBondId || undefined);

  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => { setDraft(''); }, [selectedBondId]);

  if (!bonds.length) {
    return (
      <div className="card" style={{ padding: '1.5rem 1.6rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--ink-3)', fontSize: '.9rem', lineHeight: 1.6 }}>
          Form a Bond first. Bond Log unlocks once you have at least one Bond.
        </p>
      </div>
    );
  }

  const partner = data?.partner;
  const session = data?.session;
  const myEntry = data?.myEntry ?? null;
  const partnerEntry = data?.partnerEntry ?? null;
  const revealed = data?.revealed ?? false;
  const iPosted = !!myEntry;
  const theyPosted = !!partnerEntry;

  const myResonance = !!myEntry?.resonanceAt;
  const partnerResonance = !!partnerEntry?.resonanceAt;
  const bothResonant = myResonance && partnerResonance;

  const handlePost = async () => {
    if (!draft.trim() || postEntry.isPending) return;
    try {
      await postEntry.mutateAsync(draft.trim());
      setDraft('');
      toast('Entry posted. Waiting for your Bond to post theirs.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('409')) toast('You already posted today. Come back tomorrow.');
      else toast('Could not post. Try again.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>

      {bonds.length > 1 && (
        <div className="card" style={{ padding: '.7rem 1rem' }}>
          <div className="label-mono" style={{ marginBottom: '.5rem' }}>Bond Log with</div>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            {bonds.map(b => (
              <button key={b.id} onClick={() => setSelectedBondId(b.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.45rem .8rem',
                  borderRadius: 100, fontSize: '.84rem', fontWeight: 500,
                  background: selectedBondId === b.id ? 'var(--ember-dim)' : 'var(--surf-high)',
                  color: selectedBondId === b.id ? 'var(--ember)' : 'var(--ink-2)',
                  border: selectedBondId === b.id ? '1.5px solid var(--ember-bdr)' : '1.5px solid transparent'
                }}>
                <Avatar name={b.name} size={22} avatarUrl={b.avatarUrl} />
                {b.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: '1.5rem 1.6rem' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Spinner size={20} color="var(--ember)" /></div>
        ) : !session ? null : (
          <>
            <div className="label-mono" style={{ marginBottom: '.5rem' }}>
              Bond Log · with {partner?.name?.split(' ')[0]}
            </div>
            <p className="serif" style={{ fontSize: '1.35rem', fontWeight: 600, lineHeight: 1.3, marginBottom: '1.1rem' }}>
              {session.prompt}
            </p>

            {!iPosted && (
              <div>
                <p style={{ fontSize: '.84rem', color: 'var(--ink-3)', marginBottom: '.8rem', lineHeight: 1.55 }}>
                  Same prompt, separate entries. Neither of you sees the other&apos;s until both post.
                </p>
                <textarea autoFocus={false} value={draft} onChange={e => setDraft(e.target.value.slice(0, 300))}
                  placeholder="Your honest entry…"
                  style={{
                    width: '100%', minHeight: 90, resize: 'vertical', padding: '.85rem 1rem',
                    background: 'var(--surf-low)', border: '1.5px solid var(--border-2)',
                    borderRadius: 'var(--r-md)', fontSize: '1rem', lineHeight: 1.6,
                    marginBottom: '.8rem', color: 'var(--ink)', transition: 'border .15s, box-shadow .15s'
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--ember)'; e.target.style.boxShadow = '0 0 0 3px var(--ember-dim)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none'; }} />
                <button className="btn btn-primary btn-block"
                  disabled={draft.trim().length < 3 || postEntry.isPending}
                  onClick={handlePost}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem' }}>
                  {postEntry.isPending ? <Spinner size={14} color="#fff" /> : null}
                  {theyPosted ? 'Post my entry, reveal both' : 'Post my entry'}
                </button>
                {theyPosted && (
                  <p style={{ fontSize: '.76rem', color: 'var(--sage)', fontWeight: 500, textAlign: 'center', marginTop: '.5rem' }}>
                    {partner?.name?.split(' ')[0]} already posted. Post yours to unlock the reveal.
                  </p>
                )}
              </div>
            )}

            {iPosted && !revealed && (
              <div style={{ textAlign: 'center', padding: '1.4rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1.2rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <Avatar name="You" size={52} />
                    <div style={{
                      fontSize: '.72rem', color: 'var(--green)', marginTop: 5, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3
                    }}>
                      <Icon name="check" size={11} stroke="var(--green)" sw={2.5} /> Posted
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Avatar name={partner?.name ?? ''} size={52} avatarUrl={partner?.avatarUrl} aura={partner?.aura ?? undefined} />
                    <div style={{ fontSize: '.72rem', color: 'var(--ink-4)', marginTop: 5 }}>
                      Hasn&apos;t posted yet
                    </div>
                  </div>
                </div>
                <p style={{ color: 'var(--ink-3)', fontSize: '.88rem', lineHeight: 1.6 }}>
                  Your entry is sealed until {partner?.name?.split(' ')[0]} posts theirs.
                </p>
                <p style={{ fontSize: '.72rem', color: 'var(--ink-4)', marginTop: '.4rem' }}>
                  Checking automatically · {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <button onClick={() => refetch()} className="btn btn-soft"
                  style={{ marginTop: '.9rem', fontSize: '.8rem', padding: '.4rem .9rem', borderRadius: 100 }}>
                  Check now
                </button>
              </div>
            )}

            {revealed && myEntry && partnerEntry && (
              <div className="fade-in">
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <span className="chip" style={{
                    background: 'var(--mint)', color: 'var(--forest)',
                    display: 'inline-flex', alignItems: 'center', gap: 5
                  }}>
                    <Icon name="check" size={12} stroke="var(--forest)" sw={2.5} /> Both posted, revealed
                  </span>
                </div>
                <div className="grid-2-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.9rem', marginBottom: '1rem' }}>
                  {([
                    ['You', myEntry.body ?? '', true, undefined, myResonance, undefined],
                    [partner?.name ?? '', partnerEntry.body ?? '', false, partner?.avatarUrl, partnerResonance, partner?.aura],
                  ] as [string, string, boolean, string | null | undefined, boolean, AuraKey | null | undefined][]).map(([who, txt, me, av, res, auraVal], i) => (
                    <div key={i} className="rise" style={{
                      animationDelay: `${i * 0.1}s`,
                      background: 'var(--surf-low)', borderRadius: 'var(--r-md)', padding: '1rem 1.1rem',
                      borderTop: `3px solid ${me ? 'var(--ember)' : 'var(--sage)'}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.6rem' }}>
                        <Avatar name={me ? 'You' : (who ?? '')} size={28} avatarUrl={me ? undefined : (av ?? undefined)} aura={me ? undefined : (auraVal ?? undefined)} />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 600, fontSize: '.82rem' }}>{me ? 'You' : who?.split(' ')[0]}</span>
                        </div>
                        {res && <Icon name="heart" size={13} stroke="var(--ember)" sw={0} />}
                      </div>
                      <p className="serif" style={{ fontSize: '1rem', lineHeight: 1.55 }}>{txt}</p>
                    </div>
                  ))}
                </div>

                <button
                  disabled={myResonance || markResonate.isPending}
                  onClick={async () => {
                    try { await markResonate.mutateAsync(); }
                    catch { toast('Could not mark resonance.'); }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem',
                    width: '100%', padding: '.85rem', borderRadius: 'var(--r-md)', fontWeight: 500,
                    background: bothResonant ? 'var(--green-dim)' : myResonance ? 'var(--surf-high)' : 'var(--surf-high)',
                    color: bothResonant ? 'var(--green)' : myResonance ? 'var(--ink-4)' : 'var(--ink-2)',
                    transition: 'all .2s'
                  }}>
                  <Icon name={bothResonant ? 'check' : 'heart'} size={16}
                    stroke={bothResonant ? 'var(--green)' : myResonance ? 'var(--ink-4)' : 'var(--ink-2)'}
                    sw={bothResonant ? 2.5 : 1.8} />
                  {bothResonant
                    ? 'You both felt this'
                    : myResonance
                      ? `Marked · waiting for ${partner?.name?.split(' ')[0]}`
                      : 'Mark resonance'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {(history ?? []).length > 0 && (
        <div>
          <button onClick={() => setShowHistory(s => !s)}
            style={{
              display: 'flex', alignItems: 'center', gap: '.5rem', width: '100%',
              padding: '.6rem .2rem', fontSize: '.82rem', color: 'var(--ink-3)', fontWeight: 500
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-4)"
              strokeWidth="2.2" strokeLinecap="round"
              style={{ transform: showHistory ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s' }}>
              <path d="M6 9l6 6 6-6" />
            </svg>
            {showHistory ? 'Hide' : 'Show'} past reveals ({history!.length})
          </button>
          {showHistory && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '.8rem', marginTop: '.4rem' }}>
              {history!.map((item, i) => {
                const d = new Date(item.date);
                const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const bothRes = !!item.myEntry.resonanceAt && !!item.partnerEntry.resonanceAt;
                return (
                  <div key={i} className="card" style={{ padding: '1.1rem 1.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.6rem' }}>
                      <div className="label-mono">{label}</div>
                      {bothRes && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '.72rem', color: 'var(--green)', fontWeight: 500 }}>
                          <Icon name="heart" size={12} stroke="var(--green)" sw={0} /> Resonant
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '.82rem', fontStyle: 'italic', color: 'var(--ink-3)', marginBottom: '.5rem', lineHeight: 1.45 }}>
                      &ldquo;{item.prompt}&rdquo;
                    </p>
                    <div className="grid-2-mobile-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
                      {[['You', item.myEntry.body, 'var(--ember)'], [partner?.name?.split(' ')[0] ?? 'Bond', item.partnerEntry.body, 'var(--sage)']].map(([who, body, color]) => (
                        <div key={who as string} style={{
                          background: 'var(--surf-low)', borderRadius: 'var(--r-sm)',
                          padding: '.7rem .8rem', borderLeft: `2px solid ${color}`
                        }}>
                          <div style={{ fontSize: '.68rem', color: 'var(--ink-4)', fontWeight: 600, marginBottom: '.3rem' }}>{who as string}</div>
                          <p className="serif" style={{ fontSize: '.9rem', lineHeight: 1.45, color: 'var(--ink)' }}>{body as string}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
