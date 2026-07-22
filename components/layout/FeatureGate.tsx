'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFeatureFlagStore } from '@/store/useFeatureFlagStore';

// Wraps a page whose nav entry can be switched off from Admin → Feature
// flags. Hiding the sidebar link alone isn't a real block — anyone with the
// URL could still land on the page — so this also redirects away from the
// route itself once flags are known to have loaded and the flag is off.
// Renders nothing (rather than the page) while that's happening, so there's
// no flash of now-forbidden content before the redirect fires.
export function FeatureGate({ flagKey, children }: { flagKey: string; children: React.ReactNode }) {
  const router = useRouter();
  const loaded  = useFeatureFlagStore(s => s.loaded);
  const enabled = useFeatureFlagStore(s => s.isEnabled(flagKey));
  const blocked = loaded && !enabled;

  useEffect(() => {
    if (blocked) router.replace('/home');
  }, [blocked, router]);

  if (blocked) return null;
  return <>{children}</>;
}
