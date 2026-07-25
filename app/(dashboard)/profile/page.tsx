'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { AvatarCropper } from '@/components/ui/AvatarCropper';
import { useUserStore } from '@/store/useUserStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useToastStore } from '@/store/useToastStore';
import { useMySpaces } from '@/hooks/useSpaces';
import { authApi, usersApi } from '@/lib/api';
import { stopCalling } from '@/lib/calling';
import { ProfileHeaderCard } from '@/components/profile/ProfileHeaderCard';
import { BondVisibleCard } from '@/components/profile/BondVisibleCard';
import { ActiveSpacesCard } from '@/components/profile/ActiveSpacesCard';
import { QuickLinksCard } from '@/components/profile/QuickLinksCard';

export default function ProfilePage() {
  const router = useRouter();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { user, setUser, clear: clearUser } = useUserStore();
  const { user: authUser, clear: clearAuth } = useAuthStore();
  const { toast } = useToastStore();
  // user.spaces is a one-time onboarding snapshot, never updated when a
  // space is opened/closed later — mySpaceSlugs is the real, live list.
  const { data: mySpaces } = useMySpaces();
  const mySpaceSlugs = (mySpaces ?? []).map(s => s.space?.slug).filter((s): s is string => !!s);
  const spaces = mySpaceSlugs.length ? mySpaceSlugs : ['career', 'creative'];

  async function handleAvatarChange(file: File) {
    setUploadingAvatar(true);
    try {
      // The cropper already outputs a fixed 512×512 JPEG — no separate resize step needed.
      const { avatarUrl } = await usersApi.uploadAvatar(file);
      setUser(u => ({ ...u, avatar_url: avatarUrl }));
      toast('Profile photo updated.');
    } catch {
      toast('Upload failed. Try again.');
    } finally {
      setUploadingAvatar(false);
      setCropFile(null);
    }
  }

  return (
    <AppShell title="Me">
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 1.6rem 3rem' }}>
        {/* Hidden file input for avatar */}
        <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) setCropFile(f); e.target.value = ''; }}/>
        {cropFile && (
          <AvatarCropper file={cropFile} saving={uploadingAvatar}
            onCancel={() => setCropFile(null)}
            onSave={handleAvatarChange}/>
        )}

        <ProfileHeaderCard user={user} authUserId={authUser?.id} spaces={spaces}
          uploadingAvatar={uploadingAvatar} onPickAvatar={() => avatarInputRef.current?.click()} />

        <BondVisibleCard user={user} />

        <ActiveSpacesCard user={user} spaces={spaces} />

        <QuickLinksCard />

        <button
          onClick={async () => {
            try { await authApi.logout(); } catch {}
            stopCalling();
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
