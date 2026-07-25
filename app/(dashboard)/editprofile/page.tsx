'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { AvatarCropper } from '@/components/ui/AvatarCropper';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useUserStore } from '@/store/useUserStore';
import { useToastStore } from '@/store/useToastStore';
import { useMySpaces } from '@/hooks/useSpaces';
import { usersApi } from '@/lib/api';
import type { AuraKey } from '@/lib/types';
import { reverseGeocode } from '@/components/editprofile/geocode';
import { PhotoNameSection } from '@/components/editprofile/PhotoNameSection';
import { AuraSection } from '@/components/editprofile/AuraSection';
import { BondVisibleSection } from '@/components/editprofile/BondVisibleSection';
import { StageLabelsSection } from '@/components/editprofile/StageLabelsSection';

export default function EditProfilePage() {
  const router  = useRouter();
  const { user, setUser } = useUserStore();
  const { toast } = useToastStore();
  const fileRef = useRef<HTMLInputElement>(null);
  // user.spaces is a one-time onboarding snapshot, never updated when a
  // space is opened/closed later — mySpaceSlugs is the real, live list.
  const { data: mySpaces } = useMySpaces();
  const mySpaceSlugs = (mySpaces ?? []).map(s => s.space?.slug).filter((s): s is string => !!s);
  const spaces = mySpaceSlugs.length ? mySpaceSlugs : ['career', 'creative'];

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
  const [locating, setLocating] = useState(false);

  async function detectLocation() {
    setLocating(true);
    try {
      const gps = await new Promise<{ lat: number; lng: number } | null>(resolve => {
        if (!navigator.geolocation) { resolve(null); return; }
        navigator.geolocation.getCurrentPosition(
          pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: false, timeout: 10_000, maximumAge: 120_000 },
        );
      });
      let coords = gps;
      if (!coords) {
        // GPS denied/unavailable — fall back to coarser IP-based coordinates
        try {
          const res = await fetch('/api/locate');
          if (res.ok) {
            const data = await res.json();
            if (typeof data.lat === 'number' && typeof data.lng === 'number') coords = { lat: data.lat, lng: data.lng };
          }
        } catch { /* fall through to error toast below */ }
      }
      if (!coords) { toast('Could not detect your location.'); return; }
      const label = await reverseGeocode(coords.lat, coords.lng);
      if (label) setLocation(label);
      else toast('Could not detect your location.');
    } finally {
      setLocating(false);
    }
  }

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

        <PhotoNameSection name={name} setName={setName} location={location} setLocation={setLocation}
          aura={aura} avatarUrl={user.avatar_url} uploading={uploading} locating={locating}
          onPickPhoto={() => fileRef.current?.click()} onDetectLocation={detectLocation} userName={user.name} />

        <AuraSection aura={aura} setAura={setAura} />

        <BondVisibleSection tension={tension} setTension={setTension} sitting={sitting} setSitting={setSitting}
          openTo={openTo} setOpenTo={setOpenTo} />

        <StageLabelsSection spaces={spaces} labels={labels} setLabels={setLabels} />

        <button onClick={save} disabled={saving} className="btn btn-primary btn-lg btn-block">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </AppShell>
  );
}
