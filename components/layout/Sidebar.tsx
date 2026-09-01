"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { Logo } from "@/components/ui/Logo";
import { useUserStore } from "@/store/useUserStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useFeatureFlagStore } from "@/store/useFeatureFlagStore";
import { useBonds } from "@/hooks/useBonds";
import { useMySpaces } from "@/hooks/useSpaces";
import { spaceById } from "@/lib/data";
import { useTheme } from "@/hooks/useTheme";
import { toggleTheme } from "@/lib/theme";
import styles from "./Sidebar.module.css";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUserStore();
  const theme = useTheme();
  const isDark = theme === "dark";
  const { isInitialized, user: authUser } = useAuthStore();
  const isAdmin =
    authUser?.roles.some((r) => r === "admin" || r === "moderator") ?? false;
  const { data: bondsData } = useBonds();
  const bondCount = bondsData?.length ?? 0;
  const isEnabled = useFeatureFlagStore((s) => s.isEnabled);

  // user.spaces is a one-time onboarding snapshot, never updated when a
  // space is opened/closed later — mySpaceSlugs is the real, live list.
  const { data: mySpaces } = useMySpaces();
  const mySpaceSlugs = (mySpaces ?? [])
    .map((s) => s.space?.slug)
    .filter((s): s is string => !!s);
  const firstSpace = mySpaceSlugs[0];
  const spaceLabel = firstSpace
    ? user.stageLabels?.[firstSpace] || spaceById(firstSpace).name
    : "Your chapter";

  // flag: undefined means always shown (Home is the fallback destination a
  // blocked route redirects to, so it can't itself be turned off).
  const NAV = [
    { id: "home", href: "/home", label: "Home", icon: "home" },
    {
      id: "spaces",
      href: "/spaces",
      label: "My Spaces",
      icon: "spaces",
      flag: "nav_spaces",
    },
    {
      id: "log",
      href: "/log",
      label: "Grouv Log",
      icon: "book",
      flag: "nav_log",
    },
    {
      id: "bonds",
      href: "/bonds",
      label: "Bonds",
      icon: "bonds",
      badge: isInitialized ? bondCount : null,
      flag: "nav_bonds",
    },
    {
      id: "morning",
      href: "/morning",
      label: "Morning Room",
      icon: "sun",
      flag: "nav_morning",
    },
    {
      id: "nearby",
      href: "/nearby",
      label: "Nearby",
      icon: "pin",
      heartbeat: true,
      flag: "nav_nearby",
    },
    {
      id: "archive",
      href: "/archive",
      label: "Archive",
      icon: "archive",
      flag: "nav_archive",
    },
    {
      id: "stats",
      href: "/stats",
      label: "Stats",
      icon: "stats",
      flag: "nav_stats",
    },
  ].filter((item) => !item.flag || isEnabled(item.flag));

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoWrap}>
        <Logo size={22} />
      </div>

      <Link href="/profile" className={styles.profileLink}>
        <Avatar name={user.name} size={42} avatarUrl={user.avatar_url} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className={styles.profileName}>{user.name}</div>
          <div className={styles.profileSpace}>{spaceLabel}</div>
        </div>
      </Link>

      <nav className={styles.nav}>
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={clsx(styles.navItem, active && styles.active)}
            >
              <Icon
                name={item.icon}
                stroke={active ? "var(--ember)" : "var(--ink-3)"}
              />
              <span className={styles.navLabel}>{item.label}</span>
              {item.heartbeat && user.proximity && (
                <span className={styles.heartbeatDot} />
              )}
              {item.badge != null && item.badge > 0 && (
                <span
                  className={clsx(
                    "mono",
                    styles.navBadge,
                    active && styles.active,
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className={styles.adminDivider} />
            <Link
              href="/admin"
              className={clsx(
                styles.navItem,
                pathname.startsWith("/admin") && styles.active,
              )}
            >
              <Icon
                name="shield"
                stroke={
                  pathname.startsWith("/admin")
                    ? "var(--ember)"
                    : "var(--ink-3)"
                }
              />
              <span className={styles.navLabel}>Admin</span>
            </Link>
          </>
        )}
      </nav>

      <div className={styles.footer}>
        {/* Subscribe / trial */}
        <Link href="/subscribe" className={styles.trialLink}>
          <Icon name="sprout" size={16} stroke="#fff" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className={styles.trialTitle}>Start 14-day trial</div>
            <div className={styles.trialSub}>Full access, free</div>
          </div>
        </Link>
        {/* Theme toggle */}
        <button onClick={toggleTheme} className={styles.themeToggle}>
          <Icon
            name={isDark ? "sun" : "moon"}
            size={17}
            stroke="var(--ink-3)"
          />
          {isDark ? "Light mode" : "Dark mode"}
        </button>
        <Link href="/deep-focus" className={styles.deepFocusLink}>
          <Icon name="focus" size={16} stroke="var(--ink-3)" /> Deep Focus
        </Link>
        <Link href="/settings" className={styles.settingsLink}>
          <Icon name="gear" size={17} stroke="var(--ink-3)" /> Settings
        </Link>
      </div>
    </aside>
  );
}
