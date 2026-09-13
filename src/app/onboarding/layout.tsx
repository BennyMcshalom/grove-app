import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";
import { requireViewer } from "@/lib/auth/viewer";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Onboarding saves to the signed-in account, so there has to be one.
  await requireViewer();

  return <OnboardingProvider>{children}</OnboardingProvider>;
}
