'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Avatar } from '@/components/ui/Avatar';
import { StageChip } from '@/components/ui/StageChip';
import { SpaceIcon } from '@/components/ui/SpaceIcon';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useUserStore } from '@/store/useUserStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useToastStore } from '@/store/useToastStore';
import { authApi, usersApi } from '@/lib/api';
import { spaceById } from '@/lib/data';

export default function ProfilePage() {
  const router = useRouter();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { user, setUser, clear: clearUser } = useUserStore();
  const { user: authUser, clear: clearAuth } = useAuthStore();
  const { toast } = useToastStore();
  const spaces = user.spaces.length ? user.spaces : ['career', 'creative'];

  async function handleAvatarChange(file: File) {
    setUploadingAvatar(true);
    try {
      // Resize to max 512×512 before uploading — keeps transfer fast regardless of phone camera size
      const resized = await resizeImage(file, 512);
      const { avatarUrl } = await usersApi.uploadAvatar(resized);
      setUser(u => ({ ...u, avatar_url: avatarUrl }));
      toast('Profile photo updated.');
    } catch {
      toast('Upload failed. Try again.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  function resizeImage(file: File, maxPx: number): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => {
          if (!blob) return reject(new Error('resize failed'));
          resolve(new File([blob], file.name, { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.88);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  return (
    <AppShell title="Me">
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 1.6rem 3rem' }}>
        {/* Hidden file input for avatar */}
        <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarChange(f); e.target.value = ''; }}/>

        <div className="card" style={{ overflow: 'hidden', marginBottom: '1.2rem' }}>
          <div style={{ height: 110, background: 'linear-gradient(120deg, var(--ember-soft), var(--c-relation), var(--c-creative))' }}/>
          <div style={{ padding: '0 1.6rem 1.6rem', marginTop: -48 }}>
            {/* Clickable avatar with upload overlay */}
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <Avatar name={user.name} size={96} ring={3} aura="open"
                avatarUrl={user.avatar_url} style={{ cursor: 'pointer' }} />
              <button onClick={() => avatarInputRef.current?.click()}
                style={{ position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--ember)', border: '2px solid var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {uploadingAvatar ? <Spinner size={12} color="#fff"/> : <Icon name="image" size={13} stroke="#fff"/>}
              </button>
            </div>
            <h2 className="serif" style={{ fontSize: '1.8rem', fontWeight: 600, marginTop: '.7rem' }}>{user.name}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem', marginTop: '.6rem' }}>
              {spaces.map(id => <StageChip key={id} space={id} stage={user.stageLabels?.[id] || spaceById(id).name}/>)}
            </div>
            <button onClick={() => authUser && router.push(`/grove/${authUser.id}`)} className="btn btn-soft"
              style={{ marginTop: '1rem', fontSize: '.85rem', display: 'inline-flex', alignItems: 'center', gap: '.45rem' }}>
              <Icon name="dots" size={14} stroke="var(--ink-2)" sw={2}/> Enter my Grouw — Life Rings view
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: '1.4rem 1.6rem', marginBottom: '1.2rem' }}>
          <div className="label-mono" style={{ marginBottom: '1rem' }}>Visible only to your Bonds</div>
          {[['Honest tension', user.tension || 'Still working out whether the safe path is actually the scared one.'],
            ['Sitting with', user.sitting || 'Whether wanting more makes me ungrateful for what I have.'],
            ['Open to', user.open || "People who'll tell me the truth, not just cheer me on."]].map(([l, v]) => (
            <div key={l} style={{ marginBottom: '.9rem' }}>
              <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--ink-3)', marginBottom: '.2rem' }}>{l}:</div>
              <p style={{ fontStyle: 'italic', color: 'var(--ink-2)', lineHeight: 1.5 }}>{v}</p>
            </div>
          ))}
          <button onClick={() => router.push('/editprofile')} style={{ fontSize: '.82rem', color: 'var(--ember)', fontWeight: 500 }}>Edit profile</button>
        </div>

        <div className="card" style={{ padding: '1.4rem 1.6rem', marginBottom: '1.2rem' }}>
          <div className="label-mono" style={{ marginBottom: '.9rem' }}>Active spaces</div>
          {spaces.map(id => { const s = spaceById(id); return (
            <button key={id} onClick={() => router.push(`/spaces/${id}`)}
              style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '.7rem', padding: '.6rem 0', textAlign: 'left' }}>
              <SpaceIcon spaceId={id} size={16} pill pillSize={32}/>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 500 }}>{s.name}</span>{' '}
                <span style={{ color: 'var(--ink-3)', fontSize: '.85rem' }}>· {user.stageLabels?.[id] || 'In progress'}</span>
              </div>
              <Icon name="arrow" size={16} stroke="var(--ink-4)"/>
            </button>
          ); })}
        </div>

        <div className="card" style={{ padding: '.4rem .6rem', marginBottom: '1.2rem' }}>
          {[['View full archive →','archive'],['Chapter stats →','stats'],['Manage plan →','subscribe'],["Grouw's Promise →",'legal']].map(([l,scr]) => (
            <button key={l} onClick={() => router.push(`/${scr}`)}
              style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', padding: '.9rem 1rem', borderRadius: 'var(--r-md)', fontSize: '.92rem' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf-low)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              {l}
            </button>
          ))}
        </div>
        <button
          onClick={async () => {
            try { await authApi.logout(); } catch {}
            clearAuth();
            clearUser();
            router.push('/auth');
          }}
          className="btn btn-ghost btn-block">
          Sign out
        </button>
      </div>
    </AppShell>
  );
}
