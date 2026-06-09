'use client';

const SW_PATH = '/sw.js';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/** Register the service worker and return the registration, or null on failure. */
export async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
  } catch (err) {
    console.warn('[push] SW registration failed', err);
    return null;
  }
}

/** Request notification permission. Returns 'granted' | 'denied' | 'default'. */
export async function requestPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

/** Subscribe to push and POST the subscription to the backend. */
export async function subscribePush(reg: ServiceWorkerRegistration): Promise<boolean> {
  try {
    // Get VAPID public key from backend
    const res = await fetch(`${API_BASE}/notifications/vapid-key`);
    if (!res.ok) return false;
    const { publicKey } = await res.json();
    if (!publicKey) return false;

    const existing = await reg.pushManager.getSubscription();
    if (existing) await existing.unsubscribe();

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });

    await fetch(`${API_BASE}/notifications/subscribe`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
    });

    return true;
  } catch (err) {
    console.warn('[push] Subscribe failed', err);
    return false;
  }
}

/** Full setup: register SW → request permission → subscribe. Call after login. */
export async function setupPush(): Promise<void> {
  const reg = await registerSW();
  if (!reg) return;

  const perm = await requestPermission();
  if (perm !== 'granted') return;

  await subscribePush(reg);
}

// Helper: convert VAPID base64url key to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}
