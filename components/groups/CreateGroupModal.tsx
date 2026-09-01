'use client';
import clsx from 'clsx';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useToastStore } from '@/store/useToastStore';
import { useCreateGroup } from '@/hooks/useGroups';
import { CATEGORIES, COLORS, slugify } from './constants';
import styles from './CreateGroupModal.module.css';

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
    <div className={styles.overlay} onClick={onClose}>
      <div className={clsx('card', 'scroll', styles.modal)} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={clsx('serif', styles.title)}>Start a chapter</h2>
          <button onClick={onClose} className={styles.closeBtn}>
            <Icon name="close" size={16} stroke="var(--ink-3)"/>
          </button>
        </div>

        <label className={styles.label}>Chapter name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Relocating solo" maxLength={80}
          className={styles.input}/>

        <label className={styles.label}>Where people are in this phase</label>
        <input value={phase} onChange={e => setPhase(e.target.value)} placeholder="e.g. Just moved" maxLength={40}
          className={styles.input}/>

        <label className={styles.label}>What this chapter is for</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="A sentence or two on who this room is for." maxLength={500}
          className={styles.textarea}/>

        <label className={clsx(styles.label, styles.categoryLabel)}>Category</label>
        <div className={styles.categoryRow}>
          {CATEGORIES.map(c => {
            const active = category.emoji === c.emoji;
            return (
              <button key={c.emoji} onClick={() => setCategory(c)} title={c.label}
                className={clsx(styles.categoryBtn, active && styles.active)}
                style={{ background: active ? color : undefined }}>
                <Icon name={c.icon} size={17} stroke={active ? '#fff' : 'var(--ink-3)'} sw={1.4}/>
              </button>
            );
          })}
        </div>

        <label className={clsx(styles.label, styles.categoryLabel)}>Color</label>
        <div className={styles.colorRow}>
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className={clsx(styles.colorBtn, color === c && styles.active)}
              style={{ background: c }}/>
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
