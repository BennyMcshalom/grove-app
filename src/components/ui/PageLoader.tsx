'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

// Thin progress bar at the top — lights up on route change
export function PageLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    setLoading(true);
    setWidth(30);
    const t1 = setTimeout(() => setWidth(70), 100);
    const t2 = setTimeout(() => setWidth(95), 400);
    const t3 = setTimeout(() => {
      setWidth(100);
      setTimeout(() => { setLoading(false); setWidth(0); }, 200);
    }, 600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [pathname]);

  if (!loading && width === 0) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, height: 2 }}>
      <div style={{
        height: '100%',
        width: `${width}%`,
        background: 'var(--ember)',
        transition: width === 100 ? 'width .15s ease, opacity .2s .15s' : 'width .4s ease',
        opacity: width === 100 ? 0 : 1,
        boxShadow: '0 0 8px rgba(243,112,30,.6)',
      }}/>
    </div>
  );
}
