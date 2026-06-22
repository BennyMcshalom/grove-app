'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

// The parent (dashboard) layout already guarantees isInitialized + user by the
// time this mounts — this layout only adds the admin-role gate on top of that.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const router = useRouter();
  const isAdmin = user?.roles.includes('admin') ?? false;

  useEffect(() => {
    if (!isAdmin) router.replace('/home');
  }, [isAdmin, router]);

  if (!isAdmin) return null;

  return <>{children}</>;
}
