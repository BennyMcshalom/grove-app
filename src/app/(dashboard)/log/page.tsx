'use client';
import { useState, useEffect, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { RPSection } from '@/components/layout/RightPanel';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StageChip } from '@/components/ui/StageChip';
import { Spinner } from '@/components/ui/Spinner';
import { useUserStore } from '@/store/useUserStore';
import { useToastStore } from '@/store/useToastStore';
import { useSpaceStore } from '@/store/useSpaceStore';
import { SpaceIcon } from '@/components/ui/SpaceIcon';
import { spaceById } from '@/lib/data';
import { postsApi } from '@/lib/api';
import { useBonds } from '@/hooks/useBonds';
import { useMyLogEntries, useAddLogEntry, useLogSettings, useUpdateLogSettings, useCircleLogs } from '@/hooks/useLog';
import { useBondLogToday, usePostBondLog, useMarkBondResonance, useBondLogHistory } from '@/hooks/useBondLog';
import type { LogEntry as ApiLogEntry, CircleLogUser } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────
type LogEntry = {
  day: number;
  date: string;
  text?: string;
  media?: string;
  missed?: boolean;
};

type OtherLog = {
  name: string;
  avatarUrl?: string | null;
  space: string;
  phase: string;
  vis: string;
  when: string;
  entries: LogEntry[];
};


const LOG_PROMPTS: Record<string, string> = {
  career:    'What did you build today — even a little?',
  creative:  'What did you make today, finished or not?',
  health:    'What did your body ask of you today?',
  wealth:    'What did today cost, and what did it buy?',
  spiritual: 'Where did you feel still today?',
  learning:  'What did you not understand today?',
  adventure: 'What did today look like that yesterday didn\'t?',
  relation:  'Who did you actually show up for today?',
};

const LOG_VIS = [
  ['public',  'Everyone',    'Anyone on Grouw in your spaces can scroll your log'],
  ['circle',  'My circle',   'People you\'re connected with can see it'],
  ['bonds',   'Bonds only',  'Only your Bonds can open your log'],
  ['private', 'Private',     'Just you. A closed door.'],
];

// ── StripTile ─────────────────────────────────────────────────────
function StripTile({ entry, active, onClick }: { entry: LogEntry; active: boolean; onClick: () => void }) {
  if (entry.missed) {
    return (
      <button onClick={onClick} title={`${entry.date} — missed`}
        style={{ flexShrink: 0, width: 78, height: 96, borderRadius: 'var(--r-md)',
          border: '1.5px dashed var(--border-2)', background: 'var(--surf-low)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 4, opacity: .55 }}>
        <span style={{ fontSize: '.66rem', color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>{entry.date}</span>
        <span style={{ width: 18, height: 1.5, background: 'var(--border-2)', borderRadius: 2, display: 'block' }}/>
      </button>
    );
  }
  return (
    <button onClick={onClick} title={entry.date}
      style={{ flexShrink: 0, width: 78, height: 96, borderRadius: 'var(--r-md)',
        overflow: 'hidden', position: 'relative',
        boxShadow: active ? '0 0 0 2.5px var(--ember)' : 'var(--shadow-soft)',
        transition: 'box-shadow .15s' }}>
      {entry.media
        ? <img src={entry.media} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
        : <div style={{ width: '100%', height: '100%', background: 'var(--surf-high)' }}/>}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 45%, rgba(20,18,16,.6))' }}/>
      <span className="mono" style={{ position: 'absolute', left: 6, bottom: 5, fontSize: '.6rem', color: '#fff' }}>{entry.date}</span>
      <span style={{ position: 'absolute', right: 6, top: 6, width: 6, height: 6, borderRadius: '50%', background: 'var(--mint)', display: 'block' }}/>
    </button>
  );
}

// ── MemoriesGallery ───────────────────────────────────────────────
type GalleryStyle = 'strip' | 'list' | 'grid';

function MemoriesGallery({ entries, style, onStyleChange, onTile, onArtifact }: {
  entries: LogEntry[];
  style: GalleryStyle;
  onStyleChange: (s: GalleryStyle) => void;
  onTile: (e: LogEntry) => void;
  onArtifact: () => void;
}) {
  const filled = entries.filter(e => !e.missed);

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.7rem' }}>
        <div className="label-mono">The Strip · {filled.length} entries</div>
        <div style={{ display: 'flex', gap: 3, background: 'var(--surf-high)', borderRadius: 100, padding: 2 }}>
          {([['strip', 'Strip'], ['list', 'List'], ['grid', 'Grid']] as [GalleryStyle, string][]).map(([id, label]) => (
            <button key={id} onClick={() => onStyleChange(id)}
              style={{ padding: '.25rem .65rem', borderRadius: 100, fontSize: '.72rem', fontWeight: 500,
                background: style === id ? 'var(--white)' : 'transparent',
                color: style === id ? 'var(--ember)' : 'var(--ink-4)',
                boxShadow: style === id ? 'var(--shadow-soft)' : 'none' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {style === 'strip' && (
        <div className="scroll" style={{ display: 'flex', gap: '.55rem', overflowX: 'auto', paddingBottom: '.6rem' }}>
          {entries.map((e, i) => (
            <StripTile key={i} entry={e} active={false} onClick={() => onTile(e)}/>
          ))}
          <button onClick={onArtifact}
            style={{ flexShrink: 0, width: 120, height: 96, borderRadius: 'var(--r-md)',
              border: '1.5px solid var(--ember-bdr)', background: 'var(--ember-dim)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 .6rem' }}>
            <Icon name="lock" size={18} stroke="var(--ember-deep)"/>
            <span style={{ fontSize: '.66rem', color: 'var(--ember-deep)', textAlign: 'center', lineHeight: 1.3, fontWeight: 500 }}>
              Unlocks at chapter close
            </span>
          </button>
        </div>
      )}

      {style === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.55rem' }}>
          {entries.filter(e => !e.missed).map((e, i) => (
            <button key={i} onClick={() => onTile(e)}
              style={{ display: 'flex', alignItems: 'center', gap: '.8rem', padding: '.6rem .7rem',
                borderRadius: 'var(--r-md)', background: 'var(--white)', border: '1px solid var(--border)',
                textAlign: 'left' }}>
              {e.media
                ? <img src={e.media} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}/>
                : <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--surf-high)', flexShrink: 0 }}/>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="mono" style={{ fontSize: '.68rem', color: 'var(--ink-4)', marginBottom: 2 }}>Day {e.day} · {e.date}</div>
                <div style={{ fontSize: '.88rem', color: 'var(--ink)', lineHeight: 1.4,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.text}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {style === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.5rem' }}>
          {entries.filter(e => !e.missed).map((e, i) => (
            <button key={i} onClick={() => onTile(e)}
              style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
              {e.media
                ? <img src={e.media} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                : <div style={{ width: '100%', height: '100%', background: 'var(--surf-high)' }}/>}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(20,18,16,.65))' }}/>
              <span className="mono" style={{ position: 'absolute', left: 6, bottom: 5, fontSize: '.58rem', color: '#fff' }}>{e.date}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Entry detail overlay ──────────────────────────────────────────
function EntryDetail({ entry, onClose }: { entry: LogEntry; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 7100, background: 'rgba(26,26,26,.55)',
      backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}
      onClick={onClose}>
      <div style={{ width: 'min(440px, 94vw)', background: 'var(--cream)', borderRadius: 20,
        boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>
        {entry.media && (
          <img src={entry.media} alt="" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }}/>
        )}
        <div style={{ padding: '1.3rem 1.5rem 1.6rem' }}>
          <div className="label-mono" style={{ marginBottom: '.6rem' }}>Day {entry.day} · {entry.date}</div>
          <p className="serif" style={{ fontSize: '1.25rem', lineHeight: 1.5 }}>{entry.text}</p>
        </div>
      </div>
    </div>
  );
}

// ── Artifact ──────────────────────────────────────────────────────
function Artifact({ spaceId, phase, entries, onClose }: {
  spaceId: string; phase: string; entries: LogEntry[]; onClose: () => void;
}) {
  const space = spaceById(spaceId);
  const filled = entries.filter(e => !e.missed);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 7000, background: 'rgba(26,26,26,.5)',
      backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', padding: '4vh 1rem' }}
      onClick={onClose}>
      <div className="scroll" style={{ width: 'min(620px, 96vw)', maxHeight: '92vh', overflowY: 'auto',
        background: 'var(--cream)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-lg)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ position: 'sticky', top: 0, background: 'var(--cream)', borderBottom: '1px solid var(--border)',
          padding: '1.1rem 1.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 }}>
          <div className="label-mono" style={{ color: 'var(--ember)' }}>Preview · the Artifact</div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" stroke="var(--ink-3)"/>
          </button>
        </div>
        <div style={{ padding: '2.2rem 2rem 3rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '.4rem' }}><Icon name={space.icon} size={32} stroke={space.ink} sw={1.5}/></div>
            <h1 className="serif" style={{ fontSize: '2.4rem', fontWeight: 600, lineHeight: 1.1 }}>
              {space.name} · {phase}
            </h1>
            <div className="mono" style={{ fontSize: '.72rem', color: 'var(--ink-4)', marginTop: '.5rem' }}>
              {filled.length} entries stitched
            </div>
          </div>
          {filled.map((e, i) => (
            <article key={i} style={{ marginBottom: '2rem', paddingBottom: '2rem',
              borderBottom: i < filled.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div className="label-mono" style={{ marginBottom: '.7rem' }}>Day {e.day} · {e.date}</div>
              {e.media && (
                <div style={{ borderRadius: 'var(--r-md)', overflow: 'hidden', marginBottom: '.9rem', maxHeight: 280 }}>
                  <img src={e.media} alt="" style={{ width: '100%', objectFit: 'cover', display: 'block' }}/>
                </div>
              )}
              <p className="serif" style={{ fontSize: '1.25rem', lineHeight: 1.5 }}>{e.text}</p>
            </article>
          ))}
          <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontStyle: 'italic', fontSize: '.9rem' }}>
            This is a preview. The Artifact unlocks for real when you close the chapter.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MomentsEntryCard ──────────────────────────────────────────────
function MomentsEntryCard({ prompt, onPost, posted, submitting }: {
  prompt: string;
  onPost: (text: string, file?: File) => void;
  posted: boolean;
  submitting?: boolean;
}) {
  const [text, setText] = useState('');
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [file, setFile]     = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const ready = text.trim().length > 2 && !submitting;

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const r = new FileReader();
    r.onload = () => setImgSrc(r.result as string);
    r.readAsDataURL(f);
    e.target.value = '';
  };

  return (
    <div className="card" style={{ padding: '1.5rem 1.6rem' }}>
      <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} style={{ display: 'none' }}/>
      <div className="label-mono" style={{ marginBottom: '.6rem' }}>Today's entry</div>
      <p className="serif" style={{ fontSize: '1.45rem', fontWeight: 600, lineHeight: 1.25, marginBottom: '1.2rem' }}>
        {prompt}
      </p>
      {posted ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', padding: '1rem 1.2rem',
          background: 'var(--green-dim)', borderRadius: 'var(--r-md)' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="check" size={18} stroke="#fff"/>
          </div>
          <span style={{ color: 'var(--ink-2)', fontSize: '.95rem' }}>Today's entry is in. Come back tomorrow.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Photo slot */}
          <button onClick={() => fileRef.current?.click()}
            style={{ width: 140, height: 140, flexShrink: 0, borderRadius: 14, overflow: 'hidden',
              border: imgSrc ? 'none' : '1.5px dashed var(--border-2)', background: imgSrc ? 'transparent' : 'var(--surf-low)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
              boxShadow: imgSrc ? 'var(--shadow-soft)' : 'none' }}>
            {imgSrc
              ? <img src={imgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
              : <div style={{ textAlign: 'center', color: 'var(--ink-4)' }}>
                  <Icon name="image" size={22} stroke="var(--ink-4)"/>
                  <div style={{ fontSize: '.72rem', marginTop: '.3rem' }}>Add photo</div>
                </div>}
            {imgSrc && (
              <button onClick={e => { e.stopPropagation(); setImgSrc(null); setFile(null); }}
                style={{ position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: '50%',
                  background: 'rgba(26,26,26,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={12} stroke="#fff"/>
              </button>
            )}
          </button>
          <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column' }}>
            <textarea value={text} onChange={e => setText(e.target.value.slice(0, 140))}
              placeholder="One line. What was true today."
              style={{ flex: 1, minHeight: 96, resize: 'none', padding: '.85rem 1rem',
                fontSize: '1rem', lineHeight: 1.55, background: 'var(--surf-low)',
                border: '1.5px solid var(--border-2)', borderRadius: 'var(--r-md)' }}
              onFocus={e => { e.target.style.borderColor = 'var(--ember)'; e.target.style.boxShadow = '0 0 0 3px var(--ember-dim)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none'; }}/>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '.7rem' }}>
              <span className="mono" style={{ fontSize: '.66rem', color: 'var(--ink-4)' }}>{text.length}/140</span>
              <button className="btn btn-primary" disabled={!ready}
                onClick={() => { onPost(text.trim(), file ?? undefined); setText(''); setImgSrc(null); setFile(null); }}>
                {submitting ? <Spinner size={14} color="#fff"/> : 'Add today\'s entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── BondReveal — fully wired ──────────────────────────────────────
function BondReveal({ bonds }: { bonds: { id: string; name: string; avatarUrl?: string | null }[] }) {
  const { toast } = useToastStore();
  const [selectedBondId, setSelectedBondId] = useState(bonds[0]?.id ?? '');
  const [draft, setDraft] = useState('');

  const { data, isLoading, refetch } = useBondLogToday(selectedBondId || undefined);
  const postEntry  = usePostBondLog(selectedBondId || undefined);
  const markResonate = useMarkBondResonance(selectedBondId || undefined);
  const { data: history } = useBondLogHistory(selectedBondId || undefined);

  const [showHistory, setShowHistory] = useState(false);

  // When bond changes, reset draft
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

  const partner    = data?.partner;
  const session    = data?.session;
  const myEntry    = data?.myEntry ?? null;
  const partnerEntry = data?.partnerEntry ?? null;
  const revealed   = data?.revealed ?? false;
  const iPosted    = !!myEntry;
  const theyPosted = !!partnerEntry;

  const myResonance      = !!myEntry?.resonanceAt;
  const partnerResonance = !!partnerEntry?.resonanceAt;
  const bothResonant     = myResonance && partnerResonance;

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

      {/* Bond picker */}
      {bonds.length > 1 && (
        <div className="card" style={{ padding: '.7rem 1rem' }}>
          <div className="label-mono" style={{ marginBottom: '.5rem' }}>Bond Log with</div>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            {bonds.map(b => (
              <button key={b.id} onClick={() => setSelectedBondId(b.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.45rem .8rem',
                  borderRadius: 100, fontSize: '.84rem', fontWeight: 500,
                  background: selectedBondId === b.id ? 'var(--ember-dim)' : 'var(--surf-high)',
                  color: selectedBondId === b.id ? 'var(--ember)' : 'var(--ink-2)',
                  border: selectedBondId === b.id ? '1.5px solid var(--ember-bdr)' : '1.5px solid transparent' }}>
                <Avatar name={b.name} size={22} avatarUrl={b.avatarUrl}/>
                {b.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Today's session */}
      <div className="card" style={{ padding: '1.5rem 1.6rem' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Spinner size={20} color="var(--ember)"/></div>
        ) : !session ? null : (
          <>
            <div className="label-mono" style={{ marginBottom: '.5rem' }}>
              Bond Log · with {partner?.name?.split(' ')[0]}
            </div>
            <p className="serif" style={{ fontSize: '1.35rem', fontWeight: 600, lineHeight: 1.3, marginBottom: '1.1rem' }}>
              {session.prompt}
            </p>

            {/* ── Compose ── */}
            {!iPosted && (
              <div>
                <p style={{ fontSize: '.84rem', color: 'var(--ink-3)', marginBottom: '.8rem', lineHeight: 1.55 }}>
                  Same prompt, separate entries. Neither of you sees the other&apos;s until both post.
                </p>
                <textarea autoFocus={false} value={draft} onChange={e => setDraft(e.target.value.slice(0, 300))}
                  placeholder="Your honest entry…"
                  style={{ width: '100%', minHeight: 90, resize: 'vertical', padding: '.85rem 1rem',
                    background: 'var(--surf-low)', border: '1.5px solid var(--border-2)',
                    borderRadius: 'var(--r-md)', fontSize: '1rem', lineHeight: 1.6,
                    marginBottom: '.8rem', color: 'var(--ink)', transition: 'border .15s, box-shadow .15s' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--ember)'; e.target.style.boxShadow = '0 0 0 3px var(--ember-dim)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none'; }}/>
                <button className="btn btn-primary btn-block"
                  disabled={draft.trim().length < 3 || postEntry.isPending}
                  onClick={handlePost}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem' }}>
                  {postEntry.isPending ? <Spinner size={14} color="#fff"/> : null}
                  {theyPosted ? 'Post my entry — reveal both' : 'Post my entry'}
                </button>
                {theyPosted && (
                  <p style={{ fontSize: '.76rem', color: 'var(--sage)', fontWeight: 500, textAlign: 'center', marginTop: '.5rem' }}>
                    {partner?.name?.split(' ')[0]} already posted. Post yours to unlock the reveal.
                  </p>
                )}
              </div>
            )}

            {/* ── Waiting ── */}
            {iPosted && !revealed && (
              <div style={{ textAlign: 'center', padding: '1.4rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1.2rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <Avatar name="You" size={52}/>
                    <div style={{ fontSize: '.72rem', color: 'var(--green)', marginTop: 5, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                      <Icon name="check" size={11} stroke="var(--green)" sw={2.5}/> Posted
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <Avatar name={partner?.name ?? ''} size={52} avatarUrl={partner?.avatarUrl} aura="reflective"/>
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

            {/* ── Revealed ── */}
            {revealed && myEntry && partnerEntry && (
              <div className="fade-in">
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <span className="chip" style={{ background: 'var(--mint)', color: 'var(--forest)',
                    display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Icon name="check" size={12} stroke="var(--forest)" sw={2.5}/> Both posted — revealed
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.9rem', marginBottom: '1rem' }}>
                  {([
                    ['You',           myEntry.body ?? '',           true,  undefined,        myResonance],
                    [partner?.name ?? '', partnerEntry.body ?? '',  false, partner?.avatarUrl, partnerResonance],
                  ] as [string, string, boolean, string | null | undefined, boolean][]).map(([who, txt, me, av, res], i) => (
                    <div key={i} className="rise" style={{ animationDelay: `${i * 0.1}s`,
                      background: 'var(--surf-low)', borderRadius: 'var(--r-md)', padding: '1rem 1.1rem',
                      borderTop: `3px solid ${me ? 'var(--ember)' : 'var(--sage)'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.6rem' }}>
                        <Avatar name={me ? 'You' : (who ?? '')} size={28} avatarUrl={me ? undefined : (av ?? undefined)} aura={me ? undefined : 'reflective'}/>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 600, fontSize: '.82rem' }}>{me ? 'You' : who?.split(' ')[0]}</span>
                        </div>
                        {res && <Icon name="heart" size={13} stroke="var(--ember)" sw={0}/>}
                      </div>
                      <p className="serif" style={{ fontSize: '1rem', lineHeight: 1.55 }}>{txt}</p>
                    </div>
                  ))}
                </div>

                {/* Resonance button */}
                <button
                  disabled={myResonance || markResonate.isPending}
                  onClick={async () => {
                    try { await markResonate.mutateAsync(); }
                    catch { toast('Could not mark resonance.'); }
                  }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem',
                    width: '100%', padding: '.85rem', borderRadius: 'var(--r-md)', fontWeight: 500,
                    background: bothResonant ? 'var(--green-dim)' : myResonance ? 'var(--surf-high)' : 'var(--surf-high)',
                    color: bothResonant ? 'var(--green)' : myResonance ? 'var(--ink-4)' : 'var(--ink-2)',
                    transition: 'all .2s' }}>
                  <Icon name={bothResonant ? 'check' : 'heart'} size={16}
                    stroke={bothResonant ? 'var(--green)' : myResonance ? 'var(--ink-4)' : 'var(--ink-2)'}
                    sw={bothResonant ? 2.5 : 1.8}/>
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

      {/* Past reveals */}
      {(history ?? []).length > 0 && (
        <div>
          <button onClick={() => setShowHistory(s => !s)}
            style={{ display: 'flex', alignItems: 'center', gap: '.5rem', width: '100%',
              padding: '.6rem .2rem', fontSize: '.82rem', color: 'var(--ink-3)', fontWeight: 500 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-4)"
              strokeWidth="2.2" strokeLinecap="round"
              style={{ transform: showHistory ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s' }}>
              <path d="M6 9l6 6 6-6"/>
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
                          <Icon name="heart" size={12} stroke="var(--green)" sw={0}/> Resonant
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '.82rem', fontStyle: 'italic', color: 'var(--ink-3)', marginBottom: '.5rem', lineHeight: 1.45 }}>
                      &ldquo;{item.prompt}&rdquo;
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
                      {[['You', item.myEntry.body, 'var(--ember)'], [partner?.name?.split(' ')[0] ?? 'Bond', item.partnerEntry.body, 'var(--sage)']].map(([who, body, color]) => (
                        <div key={who as string} style={{ background: 'var(--surf-low)', borderRadius: 'var(--r-sm)',
                          padding: '.7rem .8rem', borderLeft: `2px solid ${color}` }}>
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

// ── LogViewer ─────────────────────────────────────────────────────
function LogViewer({ log, onClose }: { log: OtherLog; onClose: () => void }) {
  const space = spaceById(log.space);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 7000, background: 'rgba(26,26,26,.5)',
      backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end' }}
      onClick={onClose}>
      <div className="scroll" style={{ width: 'min(520px, 94vw)', height: '100%', background: 'var(--white)',
        overflowY: 'auto', animation: 'slideIn .3s ease both' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ position: 'sticky', top: 0, background: 'var(--white)', zIndex: 2,
          borderBottom: '1px solid var(--border)', padding: '1.1rem 1.4rem',
          display: 'flex', alignItems: 'center', gap: '.8rem' }}>
          <Avatar name={log.name} size={40} avatarUrl={log.avatarUrl}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>{log.name}</div>
            <div style={{ fontSize: '.74rem', color: 'var(--ink-3)' }}>
              <SpaceIcon spaceId={log.space} size={11}/> {log.phase} · {log.when}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" stroke="var(--ink-3)"/>
          </button>
        </div>
        <div style={{ padding: '1.4rem' }}>
          {log.entries.map((e, i) => (
            <article key={i} style={{ marginBottom: '1.8rem', paddingBottom: '1.8rem',
              borderBottom: i < log.entries.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div className="label-mono" style={{ marginBottom: '.6rem' }}>Day {e.day} · {e.date}</div>
              {e.media && (
                <div style={{ borderRadius: 'var(--r-md)', overflow: 'hidden', marginBottom: '.8rem' }}>
                  <img src={e.media} alt="" style={{ width: '100%', objectFit: 'cover', display: 'block', maxHeight: 240 }}/>
                </div>
              )}
              <p className="serif" style={{ fontSize: '1.15rem', lineHeight: 1.5 }}>{e.text}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── CircleLogFeed ─────────────────────────────────────────────────
function CircleLogFeed({ logs, onOpen }: { logs: OtherLog[]; onOpen: (log: OtherLog) => void }) {
  return (
    <section>
      <div className="label-mono" style={{ marginBottom: '.8rem' }}>From your circle</div>
      {logs.map((log, i) => {
        const space = spaceById(log.space);
        const latest = log.entries[0];
        return (
          <button key={i} onClick={() => onOpen(log)} className="card"
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '1rem 1.1rem',
              marginBottom: '.75rem', boxShadow: 'var(--shadow-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', marginBottom: '.8rem' }}>
              <Avatar name={log.name} size={40} avatarUrl={log.avatarUrl}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{log.name}</div>
                <div style={{ fontSize: '.72rem', color: 'var(--ink-3)' }}>
                  <SpaceIcon spaceId={log.space} size={11}/> {log.phase} · {log.when}
                </div>
              </div>
              <span className="chip" style={{ background: 'var(--surf-high)', fontSize: '.66rem' }}>
                Day {latest.day}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              {log.entries.slice(0, 3).map((e, j) => (
                e.media
                  ? <img key={j} src={e.media} alt="" style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}/>
                  : <div key={j} style={{ width: 72, height: 72, borderRadius: 10, background: 'var(--surf-high)', flexShrink: 0 }}/>
              ))}
              <div style={{ flex: 1, padding: '.3rem .2rem', display: 'flex', alignItems: 'center' }}>
                <p style={{ fontSize: '.84rem', color: 'var(--ink-2)', lineHeight: 1.4,
                  overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const }}>
                  {latest.text}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </section>
  );
}

// ── Map API entries to the local LogEntry shape ───────────────────
function apiToLocal(r: ApiLogEntry): LogEntry {
  const d = new Date(r.entryDate);
  return {
    day:   r.dayNumber,
    date:  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    text:  r.body,
    media: r.mediaUrl ?? undefined,
  };
}

/** Fill gaps between real entries with missed-day placeholders */
function buildStrip(apiEntries: ApiLogEntry[]): LogEntry[] {
  if (!apiEntries.length) return [];
  const sorted = [...apiEntries].sort((a, b) => a.entryDate.localeCompare(b.entryDate));
  const first = new Date(sorted[0].entryDate);
  const last  = new Date();
  const dateMap = new Map(sorted.map(e => [e.entryDate, e]));
  const strip: LogEntry[] = [];
  let day = 1;
  const cur = new Date(first);
  while (cur <= last) {
    const key = cur.toISOString().slice(0, 10);
    const entry = dateMap.get(key);
    if (entry) {
      strip.push(apiToLocal(entry));
    } else {
      strip.push({ day, date: cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), missed: true });
    }
    day++;
    cur.setDate(cur.getDate() + 1);
  }
  return strip;
}

// ── Main page ─────────────────────────────────────────────────────
export default function LogPage() {
  const { user } = useUserStore();
  const { toast } = useToastStore();
  const { uuidBySlug } = useSpaceStore();

  const spaceSlug = user.spaces[0] ?? 'creative';
  const spaceUuid = uuidBySlug(spaceSlug);
  const space     = spaceById(spaceSlug);
  const phase     = user.stageLabels?.[spaceSlug] ?? 'Mid-project';
  const prompt    = LOG_PROMPTS[spaceSlug] ?? 'What was true today?';

  // ── Live data ──
  const { data: bondsData } = useBonds();
  const { data: apiEntries, isLoading: entriesLoading } = useMyLogEntries(spaceUuid);
  const addLogEntry   = useAddLogEntry(spaceUuid);
  const { data: settingsData } = useLogSettings(spaceUuid);
  const updateSettings = useUpdateLogSettings(spaceUuid);
  const { data: circleData } = useCircleLogs();

  // ── Derived state ──
  const entries: LogEntry[] = apiEntries ? buildStrip(apiEntries) : [];
  const today = new Date().toISOString().slice(0, 10);
  const posted = apiEntries?.some(e => e.entryDate === today) ?? false;
  const vis = settingsData?.visibility ?? 'circle';
  const visMeta = LOG_VIS.find(v => v[0] === vis) ?? LOG_VIS[1];
  const filled = entries.filter(e => !e.missed);

  // Map circle data to OtherLog shape
  const circleUsers: OtherLog[] = (circleData ?? []).map((u: CircleLogUser) => ({
    name:      u.name,
    avatarUrl: u.avatarUrl,
    space:     u.spaceId ? spaceSlug : spaceSlug,
    phase,
    vis:     'public',
    when:    u.entries[0]
              ? new Date(u.entries[0].createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : '',
    entries: u.entries.map(e => apiToLocal(e)),
  }));

  const [mode, setMode]         = useState<'solo' | 'bond'>('solo');
  const [artifact, setArtifact] = useState(false);
  const [viewLog, setViewLog]   = useState<OtherLog | null>(null);
  const [tileEntry, setTileEntry] = useState<LogEntry | null>(null);
  const [visMenu, setVisMenu]   = useState(false);
  const [galleryStyle, setGalleryStyle] = useState<GalleryStyle>('strip');

  const addEntry = async (text: string, file?: File) => {
    if (!spaceUuid) { toast('Open a space first.'); return; }
    try {
      let mediaUrl: string | undefined;
      let mediaType: string | undefined;
      if (file) {
        const result = await postsApi.uploadViaProxy(file);
        mediaUrl  = result.mediaUrl;
        mediaType = result.mediaType;
      }
      await addLogEntry.mutateAsync({ body: text, mediaUrl, mediaType });
      toast('Moment added to your Log.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('409')) toast('You already posted today. Come back tomorrow.');
      else toast('Could not save. Try again.');
    }
  };

  const right = (
    <>
      <RPSection label="This log">
        <div className="card" style={{ padding: '1rem 1.1rem', boxShadow: 'var(--shadow-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.7rem' }}>
            <span style={{ width: 38, height: 38, borderRadius: '50%', background: space.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={space.icon} size={18} stroke={space.ink} sw={1.6}/>
            </span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{space.name}</div>
              <div style={{ fontSize: '.74rem', color: 'var(--ink-3)' }}>{phase}</div>
            </div>
          </div>
          <ProgressBar value={entries.length ? Math.round(filled.length / entries.length * 100) : 0}/>
          <div style={{ fontSize: '.74rem', color: 'var(--ink-3)', marginTop: '.5rem' }}>
            {entriesLoading ? 'Loading…' : `${filled.length} of ${entries.length} days logged`}
          </div>
        </div>
      </RPSection>

      <RPSection label="Who can see your log">
        <div style={{ position: 'relative' }}>
          <button onClick={() => setVisMenu(m => !m)} className="card"
            style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '.6rem',
              padding: '.8rem .9rem', boxShadow: 'var(--shadow-soft)', textAlign: 'left' }}>
            <Icon name={vis === 'private' ? 'lock' : 'eye'} size={17} stroke="var(--ember)"/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '.86rem' }}>{visMeta[1]}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--ink-3)' }}>{visMeta[2]}</div>
            </div>
            <Icon name="dots" size={16} stroke="var(--ink-4)"/>
          </button>
          {visMenu && (
            <div className="card" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
              zIndex: 20, padding: '.4rem', boxShadow: 'var(--shadow-lg)' }}>
              {LOG_VIS.map(([id, l, d]) => (
                <button key={id}
                  onClick={async () => {
                    setVisMenu(false);
                    try {
                      await updateSettings.mutateAsync(id as 'public' | 'circle' | 'bonds' | 'private');
                      toast(`Log visibility: ${l}`);
                    } catch { toast('Could not update.'); }
                  }}
                  style={{ display: 'flex', width: '100%', textAlign: 'left', gap: '.5rem',
                    alignItems: 'center', padding: '.6rem .65rem', borderRadius: 'var(--r-sm)',
                    background: vis === id ? 'var(--ember-dim)' : 'transparent' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: '.84rem', color: vis === id ? 'var(--ember)' : 'var(--ink)' }}>{l}</div>
                    <div style={{ fontSize: '.7rem', color: 'var(--ink-3)' }}>{d}</div>
                  </div>
                  {vis === id && <Icon name="check" size={15} stroke="var(--ember)"/>}
                </button>
              ))}
            </div>
          )}
        </div>
      </RPSection>

      <RPSection label="The ritual">
        <p style={{ fontSize: '.84rem', color: 'var(--ink-2)', lineHeight: 1.6 }}>
          One photo. One honest line. Every day you're in this chapter. Choose how you view your past moments
          — and who else gets to scroll them.
        </p>
      </RPSection>
    </>
  );

  return (
    <AppShell title="Grouw Log" right={right}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 1.6rem 3rem' }}>

        {/* Phase chip + mode toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '1rem', marginTop: '-.3rem', marginBottom: '1.4rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
            <StageChip space={spaceSlug} stage={phase}/>
            <span className="chip" style={{ background: 'var(--surf-high)', fontSize: '.7rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name={vis === 'private' ? 'lock' : 'eye'} size={11} stroke="var(--ink-3)" sw={1.8}/> {visMeta[1]}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--surf-high)', borderRadius: 100, padding: 3 }}>
            {([['solo', 'Solo'], ['bond', 'Bond Log']] as ['solo' | 'bond', string][]).map(([id, l]) => (
              <button key={id} onClick={() => setMode(id)}
                style={{ padding: '.4rem .9rem', borderRadius: 100, fontSize: '.82rem', fontWeight: 500,
                  background: mode === id ? 'var(--white)' : 'transparent',
                  color: mode === id ? 'var(--ember)' : 'var(--ink-3)',
                  boxShadow: mode === id ? 'var(--shadow-soft)' : 'none' }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Daily entry / Bond reveal */}
        <div style={{ marginBottom: '2rem' }}>
          {mode === 'solo'
            ? <MomentsEntryCard prompt={prompt} onPost={addEntry} posted={posted} submitting={addLogEntry.isPending}/>
            : <BondReveal bonds={(bondsData ?? [])
                .filter(b => b.status === 'bond')
                .map(b => ({ id: b.id, name: b.otherUser?.displayName ?? 'Bond', avatarUrl: b.otherUser?.avatarUrl }))} />}
        </div>

        {/* Memories gallery */}
        <div style={{ marginBottom: '1.4rem' }}>
          <MemoriesGallery
            entries={entries}
            style={galleryStyle}
            onStyleChange={setGalleryStyle}
            onTile={setTileEntry}
            onArtifact={() => setArtifact(true)}
          />
        </div>

        {/* Artifact access */}
        <button onClick={() => setArtifact(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '.7rem', width: '100%',
            padding: '1rem 1.2rem', marginBottom: '2.2rem', borderRadius: 'var(--r-lg)',
            border: '1.5px solid var(--ember-bdr)', background: 'var(--ember-dim)', textAlign: 'left' }}>
          <Icon name="lock" size={18} stroke="var(--ember-deep)"/>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '.9rem', color: 'var(--ember-deep)' }}>The Artifact</div>
            <div style={{ fontSize: '.76rem', color: 'var(--ink-3)' }}>
              Unlocks when you close this chapter — your whole log, stitched into one piece.
            </div>
          </div>
          <span style={{ fontSize: '.8rem', color: 'var(--ember)', fontWeight: 500 }}>Preview →</span>
        </button>

        {/* Circle logs */}
        {circleUsers.length > 0 && <CircleLogFeed logs={circleUsers} onOpen={setViewLog}/>}
      </div>

      {artifact && (
        <Artifact spaceId={spaceSlug} phase={phase} entries={entries} onClose={() => setArtifact(false)}/>
      )}
      {viewLog && <LogViewer log={viewLog} onClose={() => setViewLog(null)}/>}
      {tileEntry && !tileEntry.missed && (
        <EntryDetail entry={tileEntry} onClose={() => setTileEntry(null)}/>
      )}
    </AppShell>
  );
}
