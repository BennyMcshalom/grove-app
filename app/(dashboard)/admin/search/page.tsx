'use client';
import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { AdminSubNav } from '@/components/admin/AdminSubNav';
import { useAdminContentSearch } from '@/hooks/useAdmin';
import type { AdminContentResult } from '@/lib/api';

const TYPES: { id: string; label: string }[] = [
  { id: '', label: 'All' },
  { id: 'post', label: 'Posts' },
  { id: 'comment', label: 'Comments' },
  { id: 'bond_message', label: 'Bond messages' },
  { id: 'group_post', label: 'Group posts' },
];

function resultText(r: AdminContentResult): string {
  return (r.body as string) || (r.doing as string) || (r.honestThing as string) || (r.content as string) || '(no text)';
}

export default function AdminContentSearchPage() {
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const { data, isLoading } = useAdminContentSearch({ q, type: type || undefined });

  return (
    <AppShell title="Content search">
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 1.6rem 3rem' }}>
        <AdminSubNav/>

        <p style={{ color: 'var(--ink-3)', fontSize: '.86rem', marginTop: '-.4rem', marginBottom: '1.2rem' }}>
          Look up content directly, by id, or by text, without waiting for a report first.
        </p>

        <div style={{ position: 'relative', marginBottom: '.9rem' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
            <Icon name="search" size={16} stroke="var(--ink-4)"/>
          </span>
          <input autoFocus value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search text, or paste a content id…"
            style={{ width: '100%', padding: '.7rem .9rem .7rem 2.3rem', fontSize: '.95rem',
              border: '1.5px solid var(--border-2)', borderRadius: 'var(--r-md)', background: 'var(--surf-low)' }}/>
        </div>

        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
          {TYPES.map(t => (
            <button key={t.id} onClick={() => setType(t.id)} className="chip"
              style={{ cursor: 'pointer', background: type === t.id ? 'var(--ember)' : 'var(--surf-high)',
                color: type === t.id ? '#fff' : 'var(--ink-2)', fontWeight: 500 }}>
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner/></div>
        ) : !q.trim() ? (
          <p style={{ fontSize: '.86rem', color: 'var(--ink-4)', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>
            Start typing to search.
          </p>
        ) : !data?.results.length ? (
          <p style={{ fontSize: '.86rem', color: 'var(--ink-4)', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>
            No matches.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
            {data.results.map(r => (
              <div key={`${r.type}-${r.id}`} className="card" style={{ padding: '.9rem 1.1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.5rem' }}>
                  <span className="chip" style={{ background: 'var(--surf-high)', color: 'var(--ink-3)', fontSize: '.66rem', textTransform: 'capitalize' }}>
                    {r.type.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: '.7rem', color: 'var(--ink-4)', fontFamily: 'var(--font-dm-mono, DM Mono)' }}>
                    {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: '.66rem', color: 'var(--ink-4)', fontFamily: 'var(--font-dm-mono, DM Mono)' }}>
                    {r.id}
                  </span>
                </div>
                <p style={{ fontSize: '.9rem', color: 'var(--ink-2)', lineHeight: 1.5 }}>{resultText(r)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
