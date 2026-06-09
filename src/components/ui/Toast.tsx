'use client';
import { useToastStore } from '@/store/useToastStore';

export function ToastLayer() {
  const { toasts } = useToastStore();
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9500, display: 'flex', flexDirection: 'column', gap: 8,
      alignItems: 'center', pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} className="rise" style={{
          background: '#1C1A16',
          color: '#F0EAE0',
          padding: '.7rem 1.3rem', borderRadius: 100,
          fontSize: '.88rem', fontWeight: 500,
          boxShadow: '0 8px 32px -8px rgba(0,0,0,.55), 0 2px 8px rgba(0,0,0,.3)',
          border: '1px solid rgba(255,255,255,.08)',
          maxWidth: '80vw', textAlign: 'center',
        }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
