import { CallProvider } from "@/components/app/CallProvider";
import { Sidebar } from "@/components/app/Sidebar";
import { MobileNav } from "@/components/app/MobileNav";
import { ToastProvider } from "@/components/app/ToastProvider";
import { SidebarProvider } from "@/components/app/SidebarProvider";
import { ViewerProvider } from "@/components/app/ViewerProvider";
import { getShellViewer } from "@/lib/auth/viewer";

/**
 * App shell — Figma frame 58:2301 (desktop) and 601:30182 (mobile).
 *
 * Desktop: a 272px sidebar beside the main column, collapsible to a 76px
 * rail (SidebarProvider) so three-column screens like Bonds get the width. Mobile: no sidebar, a
 * bottom nav bar instead (Figma 601:30105). The shell is `h-viewport` so only the
 * inner columns scroll.
 *
 * Signed-out visitors go to sign-in and new users finish onboarding first.
 * This is routing, not protection — data access is guarded by RLS.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getShellViewer();

  return (
    <ViewerProvider viewer={viewer}>
      <ToastProvider>
        <CallProvider>
        <SidebarProvider>
          <div className="flex h-viewport overflow-hidden bg-ivory-100">
            <Sidebar className="hidden lg:flex" />
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {children}
              </div>
              <MobileNav />
            </div>
          </div>
        </SidebarProvider>
        </CallProvider>
      </ToastProvider>
    </ViewerProvider>
  );
}
