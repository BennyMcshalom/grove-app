import { Sidebar } from "@/components/app/Sidebar";
import { MobileNav } from "@/components/app/MobileNav";
import { ToastProvider } from "@/components/app/ToastProvider";

/**
 * App shell — Figma frame 58:2301 (desktop) and 601:30182 (mobile).
 *
 * Desktop: a 272px sidebar beside the main column. Mobile: no sidebar, a
 * bottom nav bar instead (Figma 601:30105). The shell is `h-dvh` so only the
 * inner columns scroll.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="flex h-dvh overflow-hidden bg-ivory-100">
        <Sidebar className="hidden lg:flex" />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>
          <MobileNav />
        </div>
      </div>
    </ToastProvider>
  );
}
