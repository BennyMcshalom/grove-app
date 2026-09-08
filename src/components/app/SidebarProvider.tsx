"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

/**
 * Sidebar collapse state, shared so a page can ask for the rail rather than
 * the full 272px column.
 *
 * Screens that already carry their own left list and right rail — Bonds, the
 * Event View, a chapter group — are three columns wide before the app sidebar
 * is counted, so they default to collapsed.
 */
type SidebarState = {
  collapsed: boolean;
  toggle: () => void;
  /** Collapse once on mount without overriding a later manual toggle. */
  requestCollapsed: (want: boolean) => void;
};

const SidebarContext = createContext<SidebarState>({
  collapsed: false,
  toggle: () => {},
  requestCollapsed: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}

/**
 * Ask for a collapsed sidebar on this route. The user's own toggle wins for as
 * long as they stay on the route; navigating elsewhere resets it.
 */
export function useCollapsedSidebar(want = true) {
  const { requestCollapsed } = useSidebar();
  useEffect(() => {
    requestCollapsed(want);
  }, [requestCollapsed, want]);
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  // A manual toggle pins the choice until the route asks again.
  const [pinned, setPinned] = useState(false);

  const toggle = useCallback(() => {
    setPinned(true);
    setCollapsed((v) => !v);
  }, []);

  const requestCollapsed = useCallback((want: boolean) => {
    setPinned(false);
    setCollapsed(want);
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        toggle,
        requestCollapsed: pinned ? () => {} : requestCollapsed,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}
