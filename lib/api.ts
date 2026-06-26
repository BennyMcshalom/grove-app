const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

let isRefreshing = false;
let refreshQueue: Array<() => void> = [];

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

// noRefresh = true: throw 401 immediately without attempting token refresh.
// Use this for auth-check endpoints (/auth/me) and auth mutation endpoints
// (login, signup, logout) where a 401 means "not authenticated", not "token expired".
async function req<T>(
  method: string,
  path: string,
  body?: unknown,
  retried = false,
  noRefresh = false,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Network error — API unreachable');
  }

  // 502/503/504 mean the backend is down — treat the same as a network failure
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    throw new ApiError(0, 'Server unavailable');
  }

  // Auto-refresh on 401 — only for regular API calls, never for auth endpoints
  if (res.status === 401 && !retried && !noRefresh) {
    if (isRefreshing) {
      await new Promise<void>((resolve) => refreshQueue.push(resolve));
      return req<T>(method, path, body, true, noRefresh);
    }

    isRefreshing = true;
    const ok = await doRefresh();
    isRefreshing = false;

    const q = refreshQueue.splice(0);
    q.forEach((resolve) => resolve());

    if (ok) return req<T>(method, path, body, true, noRefresh);

    throw new ApiError(401, 'Session expired');
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const err = await res.json();
      message = err.message || err.error || message;
    } catch {}
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new ApiError(res.status,
      `Expected JSON but got ${contentType || 'unknown'} — is NEXT_PUBLIC_API_URL correct?`);
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Regular API calls — auto-refresh enabled
export const api = {
  get:    <T>(path: string)                 => req<T>('GET',    path),
  post:   <T>(path: string, body?: unknown) => req<T>('POST',   path, body),
  patch:  <T>(path: string, body?: unknown) => req<T>('PATCH',  path, body),
  put:    <T>(path: string, body?: unknown) => req<T>('PUT',    path, body),
  delete: <T>(path: string)                 => req<T>('DELETE', path),
};

// Auth calls — skip auto-refresh; a 401 here means "not logged in", not "expired"
const authReq = {
  get:  <T>(path: string)                 => req<T>('GET',  path, undefined, false, true),
  post: <T>(path: string, body?: unknown) => req<T>('POST', path, body,      false, true),
};

// Presence cookie set on the FRONTEND domain so Next.js middleware can read it.
// The actual auth token stays in the httpOnly __Host-access cookie on the API domain.
const SESSION_COOKIE = 'grove_session';
const THIRTY_DAYS = 60 * 60 * 24 * 30;

export function markSessionPresent() {
  if (typeof document === 'undefined') return;
  document.cookie = `${SESSION_COOKIE}=1; path=/; max-age=${THIRTY_DAYS}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
}

export function clearSessionPresent() {
  if (typeof document === 'undefined') return;
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface SignupPayload  { email: string; password: string; display_name: string; }
export interface LoginPayload   { email: string; password: string; }
export interface MeResponse     { id: string; email: string; emailVerifiedAt: string | null; roles: string[]; }
export interface SignupResponse { userId: string; profile: ProfileResponse; }
export interface ProfileResponse {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  onboardingCompleted: boolean;
  openTo: string | null;
  sittingWith: string | null;
  honestTension: string | null;
  deepFocusActive: boolean;
  notificationPrefs: Record<string, boolean>;
}

export const authApi = {
  signup:         async (data: SignupPayload) => {
    const r = await authReq.post<SignupResponse>('/auth/signup', data);
    markSessionPresent();
    return r;
  },
  login:          async (data: LoginPayload) => {
    const r = await authReq.post<{ userId: string }>('/auth/login', data);
    markSessionPresent();
    return r;
  },
  logout:         async () => {
    clearSessionPresent();
    return authReq.post<void>('/auth/logout');
  },
  me:             () => authReq.get<MeResponse>('/auth/me'),
  forgotPassword: (email: string) =>
                    authReq.post<{ ok: boolean }>('/auth/forgot-password', { email }),
  resetPassword:  (data: { token: string; password: string }) =>
                    authReq.post<{ ok: boolean }>('/auth/reset-password', data),
  verifySignupCode: (code: string) =>
                    api.post<{ ok: boolean }>('/auth/verify-signup-code', { code }),
  resendSignupCode: () =>
                    api.post<{ ok: boolean }>('/auth/resend-signup-code'),
  googleUrl:      () => `${BASE}/auth/google`,
};

// ── Profiles ──────────────────────────────────────────────────────────────────
export interface PatchMePayload {
  display_name?: string;
  bio?: string | null;
  avatar_url?: string | null;
  preferences?: Record<string, unknown>;
  onboarding_completed?: boolean;
}

export const profilesApi = {
  me:       () => api.get<ProfileResponse>('/me'),
  updateMe: (data: PatchMePayload) => api.patch<ProfileResponse>('/me', data),
  get:      (id: string) => api.get<ProfileResponse>(`/profiles/${id}`),
  batch:    (ids: string[]) => api.get<ProfileResponse[]>(`/profiles?ids=${ids.join(',')}`),
};

// ── Posts ─────────────────────────────────────────────────────────────────────
export interface PostRecord {
  id: string;
  userId: string;
  spaceId: string;
  doing: string | null;
  progress: string | null;
  honestThing: string | null;
  isAnonymous: boolean;
  createdAt: string;
  kind: string;
  body: string | null;
  authorLocation: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  isOpen: boolean;
  // joined fields — always present in list responses
  authorName?: string;
  authorAvatar?: string | null;
  rootCount?: number;
  commentCount?: number;
  userReacted?: boolean;
}

export interface CreatePostPayload {
  spaceId: string;
  kind?: 'roots' | 'reflection' | 'just_grouw';
  doing?: string;
  progress?: string;
  honestThing?: string;
  body?: string;
  authorLocation?: string;
  isAnonymous?: boolean;
  mediaUrl?: string;
  mediaType?: string;
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  authorName: string;
  authorAvatar?: string | null;
  body: string;
  createdAt: string;
}

export const postsApi = {
  list:    (spaceId?: string, cursor?: string) => {
    const params = new URLSearchParams();
    if (spaceId) params.set('spaceId', spaceId);
    if (cursor)  params.set('cursor', cursor);
    params.set('limit', '20');
    return api.get<PostRecord[]>(`/posts?${params}`);
  },
  create:  (data: CreatePostPayload) => api.post<PostRecord>('/posts', data),
  update:  (id: string, data: { doing?: string; honestThing?: string; progress?: string }) =>
             api.patch<PostRecord>(`/posts/${id}`, data),
  delete:  (id: string) => api.delete<void>(`/posts/${id}`),
  react:   (id: string, emoji: string) => api.post<void>(`/posts/${id}/reactions`, { emoji }),
  unreact: (id: string, emoji: string) => api.delete<void>(`/posts/${id}/reactions/${emoji}`),
  comments: (id: string) =>
    api.get<PostComment[]>(`/posts/${id}/comments`),
  addComment: (id: string, body: string) =>
    api.post<PostComment>(`/posts/${id}/comments`, { body }),

  // Server-side proxy upload — avoids R2 CORS issues in the browser
  uploadViaProxy: async (file: File): Promise<{ mediaUrl: string; mediaType: string }> => {
    const form = new FormData();
    form.append('file', file, file.name);
    const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const res = await fetch(`${BASE}/posts/media`, {
      method: 'POST',
      credentials: 'include',
      body: form,
      // Note: do NOT set Content-Type — browser sets it automatically with the correct boundary
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new ApiError(res.status, err.message ?? res.statusText);
    }
    return res.json();
  },
};

// ── Bonds ─────────────────────────────────────────────────────────────────────
export interface BondRecord {
  id: string;
  userA: string;
  userB: string;
  formedAt: string;
  releasedAt: string | null;
  originLabel: string;
  status: 'circle' | 'bond';     // 'circle' until 7 chat days; then 'bond'
  streakDays: number;             // distinct calendar days with ≥1 message exchanged
  // joined by backend
  otherUser?: { id: string; displayName: string; avatarUrl: string | null; openTo: string | null; deepFocusActive?: boolean; deepFocusEndsAt?: string | null };
  depthScore?: number;
}

export interface BondMessage {
  id: string;
  kind: 'text' | 'voice';
  senderId: string;
  recipientId: string;
  body?: string | null;
  storagePath?: string | null;
  audioUrl?: string | null;
  durationSeconds?: number | null;
  readAt: string | null;
  createdAt: string;
  // threading
  replyToId?: string | null;
  replyPreview?: string | null;
  // reactions: { emoji: [userId, ...] }
  reactions?: Record<string, string[]>;
}

export const bondInvitationsApi = {
  received:  () => api.get<BondInvitation[]>('/bonds/invitations'),
  sent:      () => api.get<BondInvitation[]>('/bonds/invitations/sent'),
  invite:    (recipientId: string, message?: string) =>
               api.post<BondInvitation>('/bonds/invite', { recipientId, message }),
  accept:    (id: string) => api.post<{ bond: BondRecord; accepted: boolean }>(`/bonds/invitations/${id}/accept`),
  decline:   (id: string) => api.post<void>(`/bonds/invitations/${id}/decline`),
};

export const bondsApi = {
  list:        () => api.get<BondRecord[]>('/bonds'),
  get:         (id: string) => api.get<BondRecord>(`/bonds/${id}`),
  messages:    (id: string) => api.get<BondMessage[]>(`/bonds/${id}/messages`),
  sendMessage: (id: string, body: string, opts?: { replyToId?: string; replyPreview?: string }) =>
                 api.post<BondMessage>(`/bonds/${id}/messages`, { body, ...opts }),
  markRead:    (id: string) => api.post<void>(`/bonds/${id}/read`),
  react:       (bondId: string, msgId: string, emoji: string) =>
                 api.post<void>(`/bonds/${bondId}/messages/${msgId}/react`, { emoji }),
  unreact:     (bondId: string, msgId: string, emoji: string) =>
                 api.delete<void>(`/bonds/${bondId}/messages/${msgId}/react/${encodeURIComponent(emoji)}`),
  release:     (id: string, data: { whatItGave: string; carryingForward: string; messageUnsent: string }) =>
                 api.post<{ released: boolean }>(`/bonds/${id}/release`, data),

  // Upload voice note via server-side proxy (avoids R2 CORS)
  uploadVoice: async (bondId: string, blob: Blob, durationSeconds?: number): Promise<BondMessage> => {
    const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const form = new FormData();
    form.append('file', blob, `voice-${Date.now()}.webm`);
    if (durationSeconds) form.append('durationSeconds', String(Math.round(durationSeconds)));
    const res = await fetch(`${BASE}/bonds/${bondId}/voice`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    const { voiceNote } = await res.json();
    return { ...voiceNote, kind: 'voice' as const };
  },
};

// ── Spaces ────────────────────────────────────────────────────────────────────
export interface SpaceRecord {
  id: string;
  name: string;
  slug: string;
  colorHex: string;
  iconEmoji: string;
}

export interface UserSpaceRecord {
  id: string;
  userId: string;
  spaceId: string;
  stage: string | null;
  isPrimary: boolean;
  currentMarker: string | null;
  visibility: string;
  openedAt: string;
  closedAt: string | null;
  // joined by backend
  space?: SpaceRecord | null;
  memberCount?: number;
}

export interface SpaceMember {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  openTo: string | null;
  stage: string | null;
}

export interface SpaceOverlap {
  id: string;
  connectionA: { id: string; displayName: string; avatarUrl: string | null } | null;
  connectionB: { id: string; displayName: string; avatarUrl: string | null } | null;
  sharedSpace: string | null;
}

export const spacesApi = {
  all:     () => api.get<SpaceRecord[]>('/spaces'),
  mine:    () => api.get<UserSpaceRecord[]>('/spaces/mine'),
  open:    (data: { spaceId: string; stage?: string; isPrimary?: boolean }) =>
             api.post<UserSpaceRecord>('/spaces/mine', data),
  update:  (id: string, data: { stage?: string; currentMarker?: string | null; visibility?: string; promptDismissed?: boolean }) =>
             api.patch<UserSpaceRecord>(`/spaces/mine/${id}`, data),
  close:   (id: string) => api.delete<void>(`/spaces/mine/${id}`),
  members:          (spaceId: string) => api.get<SpaceMember[]>(`/spaces/${spaceId}/members`),
  overlap:          ()                => api.get<SpaceOverlap | null>('/spaces/overlap'),
  dismissOverlap:   (id: string)      => api.post<void>(`/spaces/overlap/${id}/dismiss`),
  introduceOverlap: (id: string)      => api.post<{ introduced: boolean }>(`/spaces/overlap/${id}/introduce`),
};

// ── Groups ────────────────────────────────────────────────────────────────────
export interface GroupRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  lifePhase: string;
  emoji: string;
  coverColor: string;
  memberCount: number;
  members?: { userId: string }[];
}

export interface GroupPost {
  id: string;
  groupId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export const groupsApi = {
  list:      () => api.get<GroupRecord[]>('/groups'),
  get:       (id: string) => api.get<GroupRecord>(`/groups/${id}`),
  join:      (id: string) => api.post<void>(`/groups/${id}/members`),
  leave:     (id: string) => api.delete<void>(`/groups/${id}/members`),
  posts:     (id: string) => api.get<GroupPost[]>(`/groups/${id}/posts`),
  postMsg:   (id: string, content: string) => api.post<GroupPost>(`/groups/${id}/posts`, { content }),
};

// ── Notifications ─────────────────────────────────────────────────────────────
export interface NotifRecord {
  id: string;
  userId: string;
  type: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export const notifsApi = {
  list:    (unreadOnly?: boolean) =>
             api.get<NotifRecord[]>(`/notifications${unreadOnly ? '?unreadOnly=true' : ''}`),
  read:    (id: string) => api.patch<NotifRecord>(`/notifications/${id}/read`),
  readAll: () => api.post<void>('/notifications/read-all'),
  delete:  (id: string) => api.delete<void>(`/notifications/${id}`),
};

// ── Chapters / Archive ────────────────────────────────────────────────────────
export interface ChapterRecord {
  id: string;
  userId: string;
  spaceId: string;
  openedAt: string;
  closedAt: string | null;
  closingLearned: string | null;
  closingAdvice: string | null;
  closingCarryForward: string | null;
  reflectionQ1: string | null;
  reflectionQ2: string | null;
  reflectionQ3: string | null;
  space?: { id: string; slug: string; name: string } | null;
}

export interface MonthlyStats {
  id: string;
  month: string;
  rootsPosts: number;
  voiceNotesSent: number;
  voiceNotesRecv: number;
  bondInteractions: number;
  curioReads: number;
  wanderSaves: number;
}

export const chaptersApi = {
  list:       () => api.get<ChapterRecord[]>('/chapters'),
  listClosed: () => api.get<ChapterRecord[]>('/chapters?closed=true'),
  open:   (spaceId: string) => api.post<ChapterRecord>('/chapters', { spaceId }),
  close:  (id: string, data?: {
    closingLearned?: string; closingAdvice?: string; closingCarryForward?: string;
    reflectionQ1?: string; reflectionQ2?: string; reflectionQ3?: string;
  }) => api.post<ChapterRecord>(`/chapters/${id}/close`, data ?? {}),
  stats:  () => api.get<MonthlyStats[]>('/chapters/stats'),
  intake: (data: { spaceId: string; whatsHappening?: string; duration?: string; lookingFor?: string; unsaid?: string }) =>
            api.put<unknown>('/chapters/intake', data),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export interface PublicProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  openTo: string | null;
  honestTension: string | null;
}

export interface PatchUserPayload {
  displayName?: string;
  bio?: string;
  openTo?: string | null;
  sittingWith?: string | null;
  honestTension?: string | null;
  onboardingCompleted?: boolean;
}

export interface Suggestion {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  honestTension: string | null;
  openTo: string | null;
  reason: string;
}

export interface BondInvitation {
  id: string;
  fromUserId: string;
  toUserId: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  fromUser?: { id: string; displayName: string; avatarUrl: string | null; openTo: string | null } | null;
}

// ── Search ────────────────────────────────────────────────────────────────────
export interface SearchResults {
  users:  Array<{ id: string; displayName: string; avatarUrl: string | null; openTo: string | null }>;
  posts:  PostRecord[];
  groups: Array<{ id: string; name: string; lifePhase: string; emoji: string; coverColor: string; memberCount: number }>;
  spaces: Array<{ id: string; name: string; slug: string; iconEmoji: string; colorHex: string }>;
}
export const searchApi = {
  query: (q: string, type = 'all') =>
    api.get<SearchResults>(`/search?q=${encodeURIComponent(q)}&type=${type}`),
};

// ── Grove (Life Rings) ────────────────────────────────────────────────────────
export interface GroveData {
  profile: { id: string; displayName: string; avatarUrl: string | null; honestTension: string | null; sittingWith: string | null; openTo: string | null };
  activeSpaces: Array<{ id: string; spaceId: string; stage: string | null; space: { slug: string; name: string; iconEmoji: string; colorHex: string } | null }>;
  closedChapters: Array<{ id: string; openedAt: string; closedAt: string | null; closingLearned: string | null; space: { slug: string; name: string } | null }>;
  rings: { struggling: string | null; building: string | null; openTo: string | null };
}
export const groveApi = {
  get: (userId: string) => api.get<GroveData>(`/grove/${userId}`),
};

// ── Gathering / Nearby ────────────────────────────────────────────────────────
export interface GatheringRoom {
  id: string;
  gatheringTag: string;
  geohash: string;
  openedBy: string;
  memberCount: number;
  expiresAt: string;
  pinnedPrompt: string | null;
  isJoined?: boolean;  // returned by GET /gathering/rooms — true if current user is a member
}

export interface NearbyUser {
  userId: string;
  geohash: string;
  gatheringTag: string | null;
  displayName: string;
  avatarUrl: string | null;
  openTo: string | null;
  spaces: string[];
}

export interface ProximityWave {
  id: string;
  fromUser: string;
  toUser: string;
  spaceTag: string | null;
  status: string;
  createdAt: string;
}

export const gatheringApi = {
  publishPresence: (geohash: string, cellLat: number, cellLng: number, visible = true) =>
    api.post('/gathering/presence', { geohash, cellLat, cellLng, visible }),
  removePresence: () => api.delete('/gathering/presence'),
  nearby:     (geohash: string) => api.get<NearbyUser[]>(`/gathering/nearby?geohash=${encodeURIComponent(geohash)}`),
  rooms:      (geohash: string) => api.get<GatheringRoom[]>(`/gathering/rooms?geohash=${encodeURIComponent(geohash)}`),
  createRoom: (data: { gatheringTag: string; geohash: string; cellLat: number; cellLng: number }) =>
    api.post<GatheringRoom>('/gathering/rooms', data),
  joinRoom:   (id: string) => api.post<unknown>(`/gathering/rooms/${id}/join`, {}),
  leaveRoom:  (id: string) => api.delete<void>(`/gathering/rooms/${id}/leave`),
  wave: (toUser: string, spaceTag?: string) =>
    api.post<ProximityWave>('/gathering/waves', { toUser, ...(spaceTag && { spaceTag }) }),
  respondWave: (id: string, status: 'waved_back' | 'dismissed') =>
    api.patch<ProximityWave>(`/gathering/waves/${id}`, { status }),
};

export const usersApi = {
  get:         (id: string)    => api.get<PublicProfile>(`/users/${id}`),
  suggestions: ()              => api.get<Suggestion[]>('/users/suggestions'),
  lookup:      (name: string)  => api.get<PublicProfile | null>(`/users/lookup?name=${encodeURIComponent(name)}`),
  updateMe:    (data: PatchUserPayload) => api.patch<ProfileResponse>('/users/me', data),
  deepFocus:   (active: boolean, endsAt?: string) =>
                 api.patch<ProfileResponse>('/users/me/deep-focus', { active, endsAt }),
  deleteMe:    () => api.delete<void>('/users/me'),
  uploadAvatar: async (file: File): Promise<{ avatarUrl: string }> => {
    const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const form = new FormData();
    form.append('file', file, file.name);
    const res = await fetch(`${BASE}/users/me/avatar`, {
      method: 'POST', credentials: 'include', body: form,
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.json();
  },
};

// ── Curio ─────────────────────────────────────────────────────────────────────
export interface CurioEntry {
  id: string;
  userId: string;
  cardId: string | null;
  spaceId: string;
  servedDate: string;
  saved: boolean;
  reflection: string | null;
  title: string | null;
  body: string | null;
  createdAt: string;
}

export const curioApi = {
  today:   (spaceId: string) => api.get<CurioEntry>(`/curio/${spaceId}/today`),
  save:    (id: string, data: { saved?: boolean; reflection?: string }) =>
             api.patch<CurioEntry>(`/curio/${id}`, data),
  saved:   () => api.get<CurioEntry[]>('/curio/saved'),
};

// ── Anonymous Asks ────────────────────────────────────────────────────────────
export interface AnonAsk {
  id: string;
  userId: string;
  question: string;
  spaceId: string | null;
  expiresAt: string;
  createdAt: string;
  isOwn?: boolean;
}

export interface AnonAskAnswer {
  id: string;
  askId: string;
  authorFirstName: string;
  authorAvatar: string | null;
  body: string;
  createdAt: string;
  likeCount: number;
  userLiked: boolean;
  commentCount: number;
}

export interface AnonAnswerComment {
  id: string;
  answerId: string;
  body: string;
  createdAt: string;
}

export const anonAsksApi = {
  current: (spaceId: string) =>
             api.get<AnonAsk | null>(`/anon-asks/${spaceId}/current`),
  all:     (spaceId: string) =>
             api.get<AnonAsk[]>(`/anon-asks/${spaceId}/all`),
  post:    (data: { question: string; spaceId?: string }) =>
             api.post<AnonAsk>('/anon-asks', data),
  answers: (id: string) =>
             api.get<AnonAskAnswer[]>(`/anon-asks/${id}/answers`),
  answer:  (id: string, data: { body: string; authorFirstName: string; authorAvatar?: string }) =>
             api.post<AnonAskAnswer>(`/anon-asks/${id}/answers`, data),
  likeAnswer:      (answerId: string) =>
             api.post<{ liked: boolean }>(`/anon-asks/answers/${answerId}/like`, {}),
  answerComments:  (answerId: string) =>
             api.get<AnonAnswerComment[]>(`/anon-asks/answers/${answerId}/comments`),
  addAnswerComment:(answerId: string, body: string) =>
             api.post<AnonAnswerComment>(`/anon-asks/answers/${answerId}/comments`, { body }),
};

// ── Grouw Log ─────────────────────────────────────────────────────
export interface LogEntry {
  id: string;
  userId: string;
  spaceId: string;
  dayNumber: number;
  body: string;
  mediaUrl: string | null;
  mediaType: string | null;
  entryDate: string;      // YYYY-MM-DD
  createdAt: string;
}

export interface LogSettings {
  visibility: 'public' | 'circle' | 'bonds' | 'private';
}

export interface CircleLogUser {
  userId: string;
  name: string;
  avatarUrl: string | null;
  spaceId: string | null;
  entries: LogEntry[];
}

export interface UserLogResponse {
  visible: boolean;
  entries: LogEntry[];
}

export const logApi = {
  myEntries: (spaceId: string) =>
    api.get<LogEntry[]>(`/log/${spaceId}`),

  // Someone else's entries for a space — respects their visibility setting.
  userEntries: (spaceId: string, userId: string) =>
    api.get<UserLogResponse>(`/log/${spaceId}/user/${userId}`),

  addEntry: (spaceId: string, data: { body: string; mediaUrl?: string; mediaType?: string }) =>
    api.post<LogEntry>(`/log/${spaceId}`, data),

  settings: (spaceId: string) =>
    api.get<LogSettings>(`/log/${spaceId}/settings`),

  updateSettings: (spaceId: string, visibility: LogSettings['visibility']) =>
    api.patch<LogSettings>(`/log/${spaceId}/settings`, { visibility }),

  circle: () =>
    api.get<CircleLogUser[]>(`/log/circle`),
};

// ── Bond Log ──────────────────────────────────────────────────────
export interface BondLogEntry {
  body: string | null;
  postedAt?: string;
  resonanceAt?: string | null;
}

export interface BondLogSession {
  id: string;
  prompt: string;
  entryDate: string;
}

export interface BondLogToday {
  session:      BondLogSession;
  partner:      { id: string; name: string; avatarUrl: string | null };
  myEntry:      BondLogEntry | null;
  partnerEntry: BondLogEntry | null;  // body=null when partner posted but I haven't yet
  revealed:     boolean;
}

export interface BondLogHistoryItem {
  date:         string;
  prompt:       string;
  myEntry:      { body: string; resonanceAt: string | null };
  partnerEntry: { body: string; resonanceAt: string | null };
}

export const bondLogApi = {
  today:   (bondId: string) =>
    api.get<BondLogToday>(`/bond-log/${bondId}`),

  post:    (bondId: string, body: string) =>
    api.post<{ response: { id: string }; revealed: boolean }>(`/bond-log/${bondId}`, { body }),

  resonate:(bondId: string) =>
    api.post<unknown>(`/bond-log/${bondId}/resonate`, {}),

  history: (bondId: string) =>
    api.get<BondLogHistoryItem[]>(`/bond-log/${bondId}/history`),
};

// ── Subscriptions ─────────────────────────────────────────────────
export interface SubscriptionRecord {
  id?: string;
  status: string;            // 'active' | 'trialing' | 'past_due' | 'canceled' | 'none'
  priceId?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  trialEnd?: string | null;
}

export const subscriptionsApi = {
  me:     () => api.get<SubscriptionRecord>('/subscriptions/me'),
  portal: (returnUrl?: string) =>
    api.post<{ url: string }>('/subscriptions/portal', returnUrl ? { returnUrl } : {}),
};

// ── Admin ─────────────────────────────────────────────────────────
export interface AdminStats {
  members: number;
  verifiedEmails: number;
  waitlist: number;
  activeBonds: number;
  activeCircles: number;
  postsLast24h: number;
  postsLast7d: number;
  signupsToday: number;
  signupsThisWeek: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  pendingReports: number;
}

export interface AdminSeriesPoint { date: string; count: number; }

export type UserStatus = 'active' | 'suspended' | 'banned';

export interface AdminUserRow {
  id: string;
  email: string;
  googleId: string | null;
  emailVerifiedAt: string | null;
  status: UserStatus;
  statusReason: string | null;
  statusChangedAt: string | null;
  createdAt: string;
  updatedAt: string;
  displayName: string | null;
  avatarUrl: string | null;
  roles: string[];
  subscriptionStatus: string | null;
}

export interface AdminUsersResponse { total: number; users: AdminUserRow[]; }

export interface AdminUserDetail {
  user: Omit<AdminUserRow, 'displayName' | 'avatarUrl' | 'roles' | 'subscriptionStatus'>;
  profile: { displayName: string; avatarUrl: string | null; bio: string | null } | null;
  roles: string[];
  subscription: SubscriptionRecord | null;
  bondCount: number;
  spaceCount: number;
  recentAudit: AdminAuditEntry[];
}

export interface AdminAuditEntry {
  id: string;
  adminId: string;
  adminName?: string;
  targetUserId: string | null;
  targetEmail: string | null;
  action: 'suspend' | 'unsuspend' | 'ban' | 'unban' | 'grant_admin' | 'revoke_admin' | 'verify_email' | 'delete_user';
  reason: string | null;
  createdAt: string;
}

export interface AdminAuditLogResponse { total: number; entries: AdminAuditEntry[]; }

export interface AdminUsersQuery {
  limit?: number;
  offset?: number;
  q?: string;
  status?: UserStatus;
  role?: 'admin' | 'user';
}

export interface AdminSpaceStat {
  id: string;
  name: string;
  slug: string;
  colorHex: string;
  memberCount: number;
  postCount: number;
}

export interface AdminWaitlistEntry {
  id: string;
  email: string;
  stageInterest: string | null;
  joinedAt: string;
}

export interface AdminWaitlistResponse { total: number; entries: AdminWaitlistEntry[]; }

export interface AdminSession {
  id: string;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface AdminRelatedAccount {
  userId: string;
  email: string | null;
  status: UserStatus | null;
  displayName: string | null;
  avatarUrl: string | null;
  sharedIpCount: number;
  sessionCount: number;
  lastSeen: string;
}

export type ReportContentType = 'post' | 'comment' | 'bond_message' | 'anon_answer';
export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'other';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface AdminReport {
  id: string;
  reporterId: string;
  reporterName: string | null;
  contentType: ReportContentType;
  contentId: string;
  authorId: string | null;
  authorName: string | null;
  contentSnapshot: string | null;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionAction: string | null;
  createdAt: string;
}

export interface AdminReportsResponse { total: number; reports: AdminReport[]; }

function qs<T extends object>(params: T): string {
  const parts = Object.entries(params as Record<string, unknown>)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export const adminApi = {
  stats:    () => api.get<AdminStats>('/admin/stats'),
  signups:  (days = 30) => api.get<AdminSeriesPoint[]>(`/admin/stats/signups${qs({ days })}`),
  activity: (days = 30) => api.get<AdminSeriesPoint[]>(`/admin/stats/activity${qs({ days })}`),

  users:    (params: AdminUsersQuery = {}) =>
    api.get<AdminUsersResponse>(`/admin/users${qs(params)}`),
  user:     (id: string) => api.get<AdminUserDetail>(`/admin/users/${id}`),

  setStatus: (id: string, status: UserStatus, reason?: string) =>
    api.patch<{ ok: true }>(`/admin/users/${id}/status`, { status, reason }),
  setRole:   (id: string, role: 'admin' | 'user') =>
    api.patch<{ ok: true }>(`/admin/users/${id}/role`, { role }),
  verifyEmail: (id: string) =>
    api.post<{ ok: true }>(`/admin/users/${id}/verify-email`),
  deleteUser:  (id: string) => api.delete<void>(`/admin/users/${id}`),

  sessions:      (id: string) => api.get<AdminSession[]>(`/admin/users/${id}/sessions`),
  revokeSession: (id: string, sessionId: string) => api.delete<void>(`/admin/users/${id}/sessions/${sessionId}`),
  relatedAccounts: (id: string) => api.get<AdminRelatedAccount[]>(`/admin/users/${id}/related-accounts`),

  spaceStats: () => api.get<AdminSpaceStat[]>('/admin/stats/spaces'),
  waitlist:   (params: { limit?: number; offset?: number } = {}) =>
    api.get<AdminWaitlistResponse>(`/admin/waitlist${qs(params)}`),

  auditLog: (params: { limit?: number; offset?: number } = {}) =>
    api.get<AdminAuditLogResponse>(`/admin/audit-log${qs(params)}`),

  // CSV export streams a file, not JSON — raw fetch so we can hand the
  // response a Blob URL instead of parsing it.
  exportUsersCsv: async (params: Omit<AdminUsersQuery, 'limit' | 'offset'> = {}): Promise<Blob> => {
    const res = await fetch(`${BASE}/admin/users/export${qs(params)}`, { credentials: 'include' });
    if (!res.ok) throw new ApiError(res.status, await res.text().catch(() => res.statusText));
    return res.blob();
  },

  reports: (params: { limit?: number; offset?: number; status?: ReportStatus } = {}) =>
    api.get<AdminReportsResponse>(`/admin/reports${qs(params)}`),
  dismissReport:        (id: string) => api.patch<{ ok: true }>(`/admin/reports/${id}/dismiss`),
  removeReportedContent: (id: string) => api.patch<{ ok: true }>(`/admin/reports/${id}/remove`),
};

// ── Content reports (consumer-facing) ───────────────────────────────
export const reportsApi = {
  submit: (data: { contentType: ReportContentType; contentId: string; reason: ReportReason; details?: string }) =>
    api.post<{ ok: true }>('/reports', data),
};
