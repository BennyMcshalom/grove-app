'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Avatar } from '@/components/ui/Avatar';
import { AvatarCropper } from '@/components/ui/AvatarCropper';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useUserStore } from '@/store/useUserStore';
import { useToastStore } from '@/store/useToastStore';
import { usersApi } from '@/lib/api';
import { AURAS, STAGES, spaceById } from '@/lib/data';
import type { AuraKey } from '@/lib/types';

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: '1.4rem 1.6rem', marginBottom: '1.1rem' }}>
      <div className="label-mono" style={{ marginBottom: '.9rem' }}>{label}</div>
      {children}
    </div>
  );
}

export default function EditProfilePage() {
  const router  = useRouter();
  const { user, setUser } = useUserStore();
  const { toast } = useToastStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const spaces = user.spaces.length ? user.spaces : ['career', 'creative'];

  const [name,     setName]     = useState(user.name === 'You' ? '' : user.name);
  const [location, setLocation] = useState(user.location ?? '');
  const [aura,     setAura]     = useState<AuraKey>(user.aura ?? 'open');
  const [tension,  setTension]  = useState(user.tension ?? '');
  const [sitting,  setSitting]  = useState(user.sitting ?? '');
  const [openTo,   setOpenTo]   = useState(user.open ?? '');
  const [labels,   setLabels]   = useState<Record<string, string>>({ ...(user.stageLabels ?? {}) });
  const [saving,   setSaving]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);

  const handleAvatarChange = async (file: File) => {
    setUploading(true);
    try {
      const { avatarUrl } = await usersApi.uploadAvatar(file);
      setUser(u => ({ ...u, avatar_url: avatarUrl }));
      toast('Photo updated.');
    } catch { toast('Upload failed. Try again.'); }
    finally { setUploading(false); setCropFile(null); }
  };

  const save = async () => {
    setSaving(true);
    try {
      await usersApi.updateMe({
        displayName:    name.trim() || user.name,
        openTo:         openTo.trim() || null,
        sittingWith:    sitting.trim() || null,
        honestTension:  tension.trim() || null,
        aura,
      });
      setUser(u => ({
        ...u,
        name:         name.trim() || u.name,
        location:     location.trim() || undefined,
        tension:      tension.trim(),
        sitting:      sitting.trim(),
        open:         openTo.trim(),
        stageLabels:  labels,
        aura,
      }));
      toast('Profile updated.');
      router.push('/profile');
    } catch { toast('Could not save. Check your connection.'); }
    finally { setSaving(false); }
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '.75rem .9rem', fontSize: '1rem',
    background: 'var(--surf-low)', border: '1.5px solid var(--border-2)', borderRadius: 'var(--r-md)',
    color: 'var(--ink)',
  };
  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    (e.target as HTMLElement).style.borderColor = 'var(--ember)';
    (e.target as HTMLElement).style.boxShadow   = '0 0 0 3px var(--ember-dim)';
  };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    (e.target as HTMLElement).style.borderColor = 'var(--border-2)';
    (e.target as HTMLElement).style.boxShadow   = 'none';
  };

  return (
    <AppShell title="Edit profile" noTopbar>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '1.2rem 1.6rem 3rem' }}>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) setCropFile(f); e.target.value = ''; }}/>
        {cropFile && (
          <AvatarCropper file={cropFile} saving={uploading}
            onCancel={() => setCropFile(null)}
            onSave={handleAvatarChange}/>
        )}

        {/* Top nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.4rem' }}>
          <button onClick={() => router.push('/profile')}
            style={{ display: 'flex', alignItems: 'center', gap: '.4rem', color: 'var(--ink-3)', fontSize: '.9rem' }}>
            <Icon name="back" size={18} stroke="var(--ink-3)"/> Cancel
          </button>
          <h1 className="serif" style={{ fontSize: '1.7rem', fontWeight: 600 }}>Edit profile</h1>
          <button onClick={save} disabled={saving} className="btn btn-primary" style={{ padding: '.5rem 1.1rem', fontSize: '.88rem' }}>
            {saving ? <Spinner size={14} color="#fff"/> : 'Save'}
          </button>
        </div>

        {/* Photo + name */}
        <Section label="Photo & name">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Avatar name={name || user.name} size={76} aura={aura} avatarUrl={user.avatar_url}/>
              <button onClick={() => fileRef.current?.click()}
                style={{ position: 'absolute', right: -2, bottom: -2, width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--ember)', border: '2px solid var(--white)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-soft)' }}>
                {uploading ? <Spinner size={12} color="#fff"/> : <Icon name="image" size={14} stroke="#fff"/>}
              </button>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your first name"
                style={fieldStyle} onFocus={focusStyle} onBlur={blurStyle}/>
              <div style={{ display: 'flex', gap: '.7rem', alignItems: 'center', marginTop: '.5rem' }}>
                <button onClick={() => fileRef.current?.click()} style={{ fontSize: '.8rem', color: 'var(--ember)', fontWeight: 500 }}>
                  Upload a photo
                </button>
              </div>
            </div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--ink-3)', marginBottom: '.35rem' }}>Location</div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
                <Icon name="pin" size={16} stroke="var(--ink-4)"/>
              </span>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, country"
                style={{ ...fieldStyle, paddingLeft: '2.3rem' }} onFocus={focusStyle} onBlur={blurStyle}/>
            </div>
            <div style={{ fontSize: '.74rem', color: 'var(--ink-4)', marginTop: '.4rem' }}>
              Used only to surface people in your chapter nearby. Never shared precisely.
            </div>
          </div>
        </Section>

        {/* Aura */}
        <Section label="Your aura — how your circle reads you">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
            {(Object.entries(AURAS) as [AuraKey, typeof AURAS[AuraKey]][]).map(([k, a]) => (
              <button key={k} onClick={() => setAura(k)}
                style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.5rem .85rem', borderRadius: 100,
                  fontSize: '.84rem', fontWeight: 500,
                  border: aura === k ? `1.5px solid ${a.color}` : '1.5px solid var(--border-2)',
                  background: aura === k ? `${a.color}18` : 'transparent',
                  color: aura === k ? 'var(--ink)' : 'var(--ink-3)' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: a.color,
                  boxShadow: `0 0 7px ${a.color}`, display: 'block' }}/>
                {a.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: '.78rem', fontStyle: 'italic', color: 'var(--ink-4)', marginTop: '.8rem' }}>
            {AURAS[aura].hint}
          </div>
        </Section>

        {/* Bond-visible fields */}
        <Section label="Visible only to your Bonds">
          {([
            ['Honest tension', tension, setTension, 'The thing I\'m not quite saying out loud…'],
            ['Sitting with',   sitting, setSitting,  'Something unresolved…'],
            ['Open to',        openTo,  setOpenTo,   'The people or conversations I need…'],
          ] as [string, string, (v: string) => void, string][]).map(([label, value, setter, ph]) => (
            <div key={label} style={{ marginBottom: '.9rem' }}>
              <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--ink-3)', marginBottom: '.35rem' }}>{label}</div>
              <textarea value={value} onChange={e => setter(e.target.value)} placeholder={ph}
                style={{ ...fieldStyle, minHeight: 60, resize: 'vertical' as const }}
                onFocus={focusStyle} onBlur={blurStyle}/>
            </div>
          ))}
        </Section>

        {/* Stage labels per space */}
        <Section label="Where you are in each space">
          {spaces.map(id => {
            const s = spaceById(id);
            const opts = STAGES[id] ?? STAGES.career;
            return (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '.7rem', marginBottom: '.8rem' }}>
                <span style={{ fontSize: '1.3rem' }}>{s.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: '.9rem', marginBottom: '.3rem' }}>{s.name}</div>
                  <select value={labels[id] ?? opts[0]} onChange={e => setLabels({ ...labels, [id]: e.target.value })}
                    style={{ ...fieldStyle, padding: '.55rem .7rem', fontSize: '.88rem' }}
                    onFocus={focusStyle} onBlur={blurStyle}>
                    {opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
        </Section>

        <button onClick={save} disabled={saving} className="btn btn-primary btn-lg btn-block">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </AppShell>
  );
}
