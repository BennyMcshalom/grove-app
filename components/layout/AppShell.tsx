import clsx from 'clsx';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { RightPanel } from './RightPanel';
import { MobileNav } from './MobileNav';
import styles from './AppShell.module.css';

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
  /**
   * Rendered as a sibling of the scrolling content, inside the middle
   * column — for a floating element (e.g. a "+" compose button) that
   * should stay put as the feed scrolls, without escaping to the full
   * browser viewport past the sidebar/right panel.
   */
  fab?: React.ReactNode;
}

export function AppShell({ children, title, right, dark, noTopbar, header, fab }: AppShellProps) {
  if (header) {
    return (
      <div className="app-shell">
        <div className="app-sidebar">
          <Sidebar />
        </div>

        <div className={styles.bodyCol}>
          {header}
          <div className={styles.row}>
            <main className={clsx('app-main', styles.main, dark && styles.dark)}>
              <div className="scroll app-content">
                {children}
              </div>
              {fab}
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

      <main className={clsx('app-main', styles.main, dark && styles.dark)}>
        {!noTopbar && <TopBar title={title} dark={dark} />}
        {/* scroll lives here — TopBar is always above it, never overlaps */}
        <div className={clsx('scroll', 'app-content', styles.contentTopGap)}>
          {children}
        </div>
        {fab}
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
