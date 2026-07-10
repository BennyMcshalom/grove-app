'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

// Pages a moderator (not full admin) may not open directly — these surface
// business-sensitive data (growth/revenue KPIs, user management, billing,
// feature flags, email log) that's out of scope for content moderation.
const ADMIN_ONLY_PATHS = ['/admin/users', '/admin/waitlist', '/admin/audit', '/admin/billing', '/admin/feature-flags', '/admin/email-log'];

// The parent (dashboard) layout already guarantees isInitialized + user by the
// time this mounts — this layout only adds the staff-role gate on top of that.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = user?.roles.includes('admin') ?? false;
  const isModerator = user?.roles.includes('moderator') ?? false;
  const isStaff = isAdmin || isModerator;
  const blockedForModerator = isModerator && !isAdmin
    && (pathname === '/admin' || ADMIN_ONLY_PATHS.some(p => pathname.startsWith(p)));

  useEffect(() => {
    if (!isStaff) { router.replace('/home'); return; }
    if (blockedForModerator) router.replace('/admin/reports');
  }, [isStaff, blockedForModerator, router]);

  if (!isStaff || blockedForModerator) return null;

  return <>{children}</>;
}
