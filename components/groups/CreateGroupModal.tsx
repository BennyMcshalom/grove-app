'use client';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useToastStore } from '@/store/useToastStore';
import { useCreateGroup } from '@/hooks/useGroups';
import { CATEGORIES, COLORS, slugify } from './constants';

export function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const { toast } = useToastStore();
  const create = useCreateGroup();
  const [name, setName] = useState('');
  const [phase, setPhase] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [color, setColor] = useState(COLORS[0]);

  const canSubmit = name.trim().length >= 3 && phase.trim().length > 0 && description.trim().length >= 10;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 7100, background: 'rgba(26,26,26,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.2rem' }} onClick={onClose}>
      <div className="card scroll" style={{ width: 480, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '1.6rem' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <h2 className="serif" style={{ fontSize: '1.4rem', fontWeight: 600 }}>Start a chapter</h2>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={16} stroke="var(--ink-3)"/>
          </button>
        </div>

        <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--ink-3)', marginBottom: '.35rem' }}>Chapter name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Relocating solo" maxLength={80}
          style={{ width: '100%', padding: '.7rem .9rem', borderRadius: 'var(--r-md)', border: '1.5px solid var(--border-2)', fontSize: '.92rem', marginBottom: '.9rem' }}/>

        <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--ink-3)', marginBottom: '.35rem' }}>Where people are in this phase</label>
        <input value={phase} onChange={e => setPhase(e.target.value)} placeholder="e.g. Just moved" maxLength={40}
          style={{ width: '100%', padding: '.7rem .9rem', borderRadius: 'var(--r-md)', border: '1.5px solid var(--border-2)', fontSize: '.92rem', marginBottom: '.9rem' }}/>

        <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--ink-3)', marginBottom: '.35rem' }}>What this chapter is for</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="A sentence or two on who this room is for." maxLength={500}
          style={{ width: '100%', minHeight: 80, padding: '.7rem .9rem', borderRadius: 'var(--r-md)', border: '1.5px solid var(--border-2)', fontSize: '.92rem', resize: 'vertical', marginBottom: '.9rem' }}/>

        <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--ink-3)', marginBottom: '.5rem' }}>Category</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '1rem' }}>
          {CATEGORIES.map(c => (
            <button key={c.emoji} onClick={() => setCategory(c)} title={c.label}
              style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: category.emoji === c.emoji ? color : 'var(--surf-low)',
                border: category.emoji === c.emoji ? '2px solid var(--ink)' : '1.5px solid var(--border-2)' }}>
              <Icon name={c.icon} size={17} stroke={category.emoji === c.emoji ? '#fff' : 'var(--ink-3)'} sw={1.4}/>
            </button>
          ))}
        </div>

        <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--ink-3)', marginBottom: '.5rem' }}>Color</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '1.4rem' }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              style={{ width: 28, height: 28, borderRadius: '50%', background: c,
                border: color === c ? '2.5px solid var(--ink)' : '2.5px solid transparent', boxShadow: 'var(--shadow-soft)' }}/>
          ))}
        </div>

        <button className="btn btn-primary btn-block" disabled={!canSubmit || create.isPending}
          onClick={async () => {
            try {
              await create.mutateAsync({
                name: name.trim(), slug: slugify(name), description: description.trim(),
                lifePhase: phase.trim(), emoji: category.emoji, coverColor: color,
              });
              toast(`${name.trim()} is live. You're its first admin.`);
              onClose();
            } catch { toast('Could not create the chapter.'); }
          }}>
          {create.isPending ? 'Creating…' : 'Create chapter'}
        </button>
      </div>
    </div>
  );
}
