'use client';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/Avatar';
import { StageChip } from '@/components/ui/StageChip';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { spaceById } from '@/lib/data';
import type { User } from '@/lib/types';

export function ProfileHeaderCard({ user, authUserId, spaces, uploadingAvatar, onPickAvatar }: {
  user: User;
  authUserId: string | undefined;
  spaces: string[];
  uploadingAvatar: boolean;
  onPickAvatar: () => void;
}) {
  const router = useRouter();

  return (
    <div className="card" style={{ overflow: 'hidden', marginBottom: '1.2rem' }}>
      <div style={{ height: 110, background: 'linear-gradient(120deg, var(--ember-soft), var(--c-relation), var(--c-creative))' }}/>
      <div style={{ padding: '0 1.6rem 1.6rem', marginTop: -48 }}>
        {/* Clickable avatar with upload overlay */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <Avatar name={user.name} size={96} ring={3} aura={user.aura ?? 'open'}
            avatarUrl={user.avatar_url} style={{ cursor: 'pointer' }} />
          <button onClick={onPickAvatar}
            style={{ position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: '50%',
              background: 'var(--ember)', border: '2px solid var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {uploadingAvatar ? <Spinner size={12} color="#fff"/> : <Icon name="image" size={13} stroke="#fff"/>}
          </button>
        </div>
        <h2 className="serif" style={{ fontSize: '1.8rem', fontWeight: 600, marginTop: '.7rem' }}>{user.name}</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', marginTop: '.6rem' }}>
          {spaces.map(id => <StageChip key={id} space={id} stage={user.stageLabels?.[id] || spaceById(id).name}/>)}
        </div>
        <button onClick={() => authUserId && router.push(`/grove/${authUserId}`)} className="btn btn-soft"
          style={{ marginTop: '1rem', fontSize: '.85rem', display: 'inline-flex', alignItems: 'center', gap: '.45rem' }}>
          <Icon name="dots" size={14} stroke="var(--ink-2)" sw={2}/> Enter my Grouv. Life Rings view
        </button>
      </div>
    </div>
  );
}
