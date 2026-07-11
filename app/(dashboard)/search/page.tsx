'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { SpaceIcon } from '@/components/ui/SpaceIcon';
import { Spinner } from '@/components/ui/Spinner';
import { searchApi } from '@/lib/api';
import { useRequestToJoinGroup } from '@/hooks/useGroups';
import { useToastStore } from '@/store/useToastStore';
import { SPACES, spaceById, groupIcon } from '@/lib/data';
import { formatRelativeTime } from '@/lib/mappers';

const SUGGESTIONS = ['New to freelance', 'Relocating solo', 'Career pivot', 'Deep in recovery', 'Going pro'];
const TYPES = [['all','All'],['users','People'],['posts','Posts'],['groups','Groups'],['spaces','Spaces']] as const;

export default function SearchPage() {
  const router = useRouter();
  const { toast } = useToastStore();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all'|'users'|'posts'|'groups'|'spaces'>('all');
  const requestToJoin = useRequestToJoinGroup();
  const [requested, setRequested] = useState<string[]>([]);

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', q, filter],
    queryFn: () => searchApi.query(q, filter),
    enabled: q.trim().length >= 2,
    staleTime: 30_000,
  });

  const hasResults = results && (
    results.users.length || results.posts.length ||
    results.groups.length || results.spaces.length
  );

  return (
    <AppShell title="Search">
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 1.6rem 3rem' }}>

        {/* Search input */}
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <span style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)' }}>
            <Icon name="search" size={19} stroke="var(--ink-4)"/>
          </span>
          <input
            autoFocus value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search people, posts, groups, spaces…"
            style={{ width: '100%', padding: '1rem 1.2rem 1rem 3rem', borderRadius: 100,
              border: '1.5px solid var(--border-2)', background: 'var(--white)', fontSize: '1.05rem' }}
            onFocus={e => { e.target.style.borderColor = 'var(--ember)'; e.target.style.boxShadow = '0 0 0 3px var(--ember-dim)'; }}
            onBlur={e  => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none'; }}
          />
          {q && (
            <button onClick={() => setQ('')} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)' }}>
              <Icon name="close" size={16} stroke="var(--ink-3)"/>
            </button>
          )}
        </div>

        {/* Type filter pills */}
        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.4rem', flexWrap: 'wrap' }}>
          {TYPES.map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)} className="chip"
              style={{ cursor: 'pointer', padding: '.45rem .9rem',
                background: filter === id ? 'var(--slate)' : 'var(--surf-high)',
                color: filter === id ? '#fff' : 'var(--ink-2)' }}>{label}</button>
          ))}
        </div>

        {/* Empty / suggestion state */}
        {q.trim().length < 2 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <h2 className="serif" style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
              What chapter are you looking for?
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.6rem', justifyContent: 'center' }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => setQ(s)} className="chip"
                  style={{ cursor: 'pointer', padding: '.55rem 1rem', background: 'var(--white)', boxShadow: 'var(--shadow-soft)' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner/></div>
        ) : !hasResults ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--ink-3)' }}>
            <p className="serif" style={{ fontSize: '1.2rem', marginBottom: '.4rem' }}>No results for "{q}"</p>
            <p style={{ fontSize: '.86rem' }}>Try different keywords or check the spelling.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>

            {/* ── People ── */}
            {results.users.length > 0 && (filter === 'all' || filter === 'users') && (
              <section>
                {filter === 'all' && <div className="label-mono" style={{ marginBottom: '.8rem' }}>People</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                  {results.users.map(u => (
                    <div key={u.id} className="card" style={{ padding: '.9rem 1.1rem', display: 'flex', alignItems: 'center', gap: '.8rem', boxShadow: 'var(--shadow-soft)' }}>
                      <button onClick={() => router.push(`/grove/${u.id}`)}>
                        <Avatar name={u.displayName} size={44} avatarUrl={u.avatarUrl}/>
                      </button>
                      <button onClick={() => router.push(`/grove/${u.id}`)}
                        style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                        <div style={{ fontWeight: 600 }}>{u.displayName}</div>
                        {u.openTo && <div style={{ fontSize: '.78rem', color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.openTo}</div>}
                      </button>
                      <button onClick={() => router.push(`/grove/${u.id}`)}
                        className="btn btn-ghost" style={{ padding: '.4rem .9rem', fontSize: '.8rem' }}>
                        View Grove
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Posts ── */}
            {results.posts.length > 0 && (filter === 'all' || filter === 'posts') && (
              <section>
                {filter === 'all' && <div className="label-mono" style={{ marginBottom: '.8rem' }}>Posts</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                  {results.posts.map(p => (
                    <div key={p.id} className="card" style={{ padding: '1rem 1.1rem', boxShadow: 'var(--shadow-soft)' }}>
                      <p style={{ fontWeight: 500, marginBottom: '.3rem', fontSize: '.92rem' }}>{p.doing}</p>
                      {p.honestThing && <p style={{ fontSize: '.86rem', fontStyle: 'italic', color: 'var(--ink-2)', lineHeight: 1.5 }}>{p.honestThing}</p>}
                      <div style={{ fontSize: '.72rem', color: 'var(--ink-4)', marginTop: '.5rem', fontFamily: 'DM Mono, monospace' }}>
                        {formatRelativeTime(p.createdAt ?? '')}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Groups ── */}
            {results.groups.length > 0 && (filter === 'all' || filter === 'groups') && (
              <section>
                {filter === 'all' && <div className="label-mono" style={{ marginBottom: '.8rem' }}>Groups</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                  {results.groups.map(g => (
                    <div key={g.id} className="card" style={{ padding: '.9rem 1.1rem', display: 'flex', alignItems: 'center', gap: '.8rem', boxShadow: 'var(--shadow-soft)' }}>
                      <span style={{ width: 44, height: 44, borderRadius: '50%', background: g.coverColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={groupIcon(g.emoji)} size={20} stroke="#fff" sw={1.4}/></span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{g.name}</div>
                        <div style={{ fontSize: '.78rem', color: 'var(--ink-3)' }}>{g.lifePhase} · {g.memberCount} members</div>
                      </div>
                      <button
                        disabled={requested.includes(g.id) || requestToJoin.isPending}
                        onClick={async () => {
                          try { await requestToJoin.mutateAsync(g.id); setRequested(j => [...j, g.id]); toast(`Requested to join ${g.name}.`); }
                          catch { toast('Could not send request.'); }
                        }}
                        className="btn btn-ghost" style={{ padding: '.4rem .9rem', fontSize: '.8rem' }}>
                        {requested.includes(g.id) ? 'Requested' : 'Request'}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Spaces ── */}
            {results.spaces.length > 0 && (filter === 'all' || filter === 'spaces') && (
              <section>
                {filter === 'all' && <div className="label-mono" style={{ marginBottom: '.8rem' }}>Spaces</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                  {results.spaces.map(s => {
                    const local = SPACES.find(sp => sp.id === s.slug);
                    return (
                      <div key={s.id} className="card" style={{ padding: '.9rem 1.1rem', display: 'flex', alignItems: 'center', gap: '.8rem', boxShadow: 'var(--shadow-soft)' }}>
                        <SpaceIcon spaceId={s.slug} size={20} pill pillSize={44}/>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600 }}>{s.name}</div>
                          {local && <div style={{ fontSize: '.78rem', color: 'var(--ink-3)' }}>{local.desc}</div>}
                        </div>
                        <button onClick={() => router.push(`/spaces/${s.slug}`)} className="btn btn-ghost" style={{ padding: '.4rem .9rem', fontSize: '.8rem' }}>
                          Open
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
