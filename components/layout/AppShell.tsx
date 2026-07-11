import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { RightPanel } from './RightPanel';
import { MobileNav } from './MobileNav';

interface AppShellProps {
  children: React.ReactNode;
  title: string;
  right?: React.ReactNode;
  dark?: boolean;
  noTopbar?: boolean;
}

export function AppShell({ children, title, right, dark, noTopbar }: AppShellProps) {
  return (
    <div className="app-shell">
      <div className="app-sidebar">
        <Sidebar />
      </div>

      <main className="app-main"
        style={{ background: dark ? 'var(--forest)' : 'var(--bg)' }}>
        {!noTopbar && <TopBar title={title} dark={dark} />}
        {/* scroll lives here — TopBar is always above it, never overlaps */}
        <div className="scroll app-content" style={{ marginTop: "20px" }}>
          {children}
        </div>
      </main>

      {right && (
        <div className="app-right">
          <RightPanel>{right}</RightPanel>
        </div>
      )}

      {/* Mobile bottom nav — only visible on small screens via CSS */}
      <MobileNav />
    </div>
  );
}
