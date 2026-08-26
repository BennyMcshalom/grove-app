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
  /**
   * Replaces the default per-column TopBar with a single header row that
   * spans both the main content column and the right panel (e.g. Home's
   * tabs-left / search+bell-right row). When set, `title`/`noTopbar` are
   * ignored — the caller owns the whole header.
   */
  header?: React.ReactNode;
}

export function AppShell({ children, title, right, dark, noTopbar, header }: AppShellProps) {
  if (header) {
    return (
      <div className="app-shell">
        <div className="app-sidebar">
          <Sidebar />
        </div>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
          {header}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
            <main className="app-main" style={{ background: dark ? 'var(--forest)' : 'var(--bg)' }}>
              <div className="scroll app-content">
                {children}
              </div>
            </main>
            {right && (
              <div className="app-right">
                <RightPanel>{right}</RightPanel>
              </div>
            )}
          </div>
        </div>

        <MobileNav />
      </div>
    );
  }

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
