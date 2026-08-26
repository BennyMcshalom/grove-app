import { Avatar } from '@/components/ui/Avatar';
import type { AdminUserDetail } from '@/lib/api';
import { STATUS_COLOR, STATUS_GRADIENT } from './constants';

export function UserHeaderCard({ user, profile, isAdminUser, isSelf }: {
  user: AdminUserDetail['user'];
  profile: AdminUserDetail['profile'];
  isAdminUser: boolean;
  isSelf: boolean;
}) {
  return (
    <div className="card rise" style={{ padding: '1.4rem 1.5rem', marginBottom: '1.1rem', display: 'flex', gap: '1.1rem',
      alignItems: 'center', background: STATUS_GRADIENT[user.status] }}>
      <Avatar name={profile?.displayName ?? user.email} size={60} avatarUrl={profile?.avatarUrl}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
          <span className="serif" style={{ fontSize: '1.3rem', fontWeight: 600 }}>{profile?.displayName ?? 'Unnamed'}</span>
          <span className="chip" style={{ background: '#fff', boxShadow: 'var(--shadow-soft)', color: STATUS_COLOR[user.status], fontSize: '.66rem', textTransform: 'capitalize', fontWeight: 600 }}>
            {user.status}
          </span>
          {isAdminUser && <span className="chip" style={{ background: '#fff', boxShadow: 'var(--shadow-soft)', color: 'var(--slate)', fontSize: '.66rem', fontWeight: 600 }}>Admin</span>}
          {isSelf && <span className="chip" style={{ background: '#fff', boxShadow: 'var(--shadow-soft)', color: 'var(--ink-3)', fontSize: '.66rem' }}>You</span>}
        </div>
        <div style={{ fontSize: '.84rem', color: 'var(--ink-2)', marginTop: '.25rem' }}>{user.email}</div>
        <div style={{ fontSize: '.72rem', color: 'var(--ink-4)', marginTop: '.25rem', fontFamily: 'inherit' }}>
          Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          {!user.emailVerifiedAt && ' · Email unverified'}
        </div>
      </div>
    </div>
  );
}
