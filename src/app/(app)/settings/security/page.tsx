import { SecurityView } from "@/components/app/settings/SecurityView";
import { twoStepEnabled } from "@/lib/auth/two-step";

/** Settings → Security: two-step verification and signing out other devices. No Figma frame. */
export default async function SecurityPage() {
  return <SecurityView initialEnabled={await twoStepEnabled()} />;
}
