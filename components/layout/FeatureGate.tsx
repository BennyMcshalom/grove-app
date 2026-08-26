"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFeatureFlagStore } from "@/store/useFeatureFlagStore";

export function FeatureGate({
  flagKey,
  children,
}: {
  flagKey: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const loaded = useFeatureFlagStore((s) => s.loaded);
  const enabled = useFeatureFlagStore((s) => s.isEnabled(flagKey));
  const blocked = loaded && !enabled;

  useEffect(() => {
    if (blocked) router.replace("/home");
  }, [blocked, router]);

  if (blocked) return null;
  return <>{children}</>;
}
