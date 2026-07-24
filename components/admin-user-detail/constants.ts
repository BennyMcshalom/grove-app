import type { UserStatus } from '@/lib/api';

export const STATUS_COLOR: Record<UserStatus, string> = {
  active: 'var(--green)', suspended: 'var(--amber)', banned: 'var(--red)',
};
export const STATUS_BG: Record<UserStatus, string> = {
  active: 'var(--green-dim)', suspended: 'var(--amber-dim)', banned: 'var(--red-dim)',
};
export const STATUS_GRADIENT: Record<UserStatus, string> = {
  active: 'linear-gradient(160deg, var(--white), var(--green-dim))',
  suspended: 'linear-gradient(160deg, var(--white), var(--amber-dim))',
  banned: 'linear-gradient(160deg, var(--white), var(--red-dim))',
};
export const ACTION_LABEL: Record<string, string> = {
  suspend: 'Suspended', unsuspend: 'Reactivated', ban: 'Banned', unban: 'Reactivated',
  grant_admin: 'Granted admin', revoke_admin: 'Revoked admin',
  verify_email: 'Force-verified email', delete_user: 'Deleted account',
};

export function friendlyDevice(ua: string | null): string {
  if (!ua) return 'Unknown device';
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android'
    : /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'an unknown OS';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) && !/Chrome/.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : 'a browser';
  return `${browser} on ${os}`;
}

export function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
