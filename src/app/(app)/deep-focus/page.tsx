import { DeepFocusView } from "@/components/app/DeepFocusView";
import { getShellViewer } from "@/lib/auth/viewer";

/** Deep Focus — Figma frame 296:11390. */
export default async function DeepFocusPage() {
  const viewer = await getShellViewer();
  return <DeepFocusView activeUntil={viewer.focusEndsAt} />;
}
