import type { ShellViewer } from "@/components/app/ViewerProvider";

/**
 * The Sidebar / phone menu promo card (Figma 65:1729). "Start 14-day trial"
 * only while one is still available (one per account, PRD §13); days left
 * while trialing; "Get Season Pass" once it's gone. Paid members see nothing.
 */
export function passPromo(
  viewer: Pick<ShellViewer, "hasPass" | "trialAvailable" | "subscriptionStatus" | "trialEndsAt">,
  now = Date.now(),
): { title: string; body: string; href: string } | null {
  const href = "/settings/subscription";
  if (viewer.hasPass) {
    if (viewer.subscriptionStatus !== "trialing" || !viewer.trialEndsAt) return null;
    const days = Math.max(1, Math.ceil((Date.parse(viewer.trialEndsAt) - now) / 86_400_000));
    return { title: "Season Pass trial", body: `${days} ${days === 1 ? "day" : "days"} left`, href };
  }
  if (viewer.trialAvailable) return { title: "Start 14-day trial", body: "Full access, free", href };
  return { title: "Get Season Pass", body: "All eight Spaces, Bonds & more", href };
}
