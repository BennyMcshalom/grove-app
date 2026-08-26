"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Icon } from "@/components/ui/Icon";
import { useToastStore } from "@/store/useToastStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useUserStore } from "@/store/useUserStore";
import { useMySpaces } from "@/hooks/useSpaces";
import { useTheme } from "@/hooks/useTheme";
import { toggleTheme } from "@/lib/theme";
import { authApi, profilesApi, usersApi, subscriptionsApi } from "@/lib/api";
import { stopCalling } from "@/lib/calling";
import { spaceById } from "@/lib/data";
import { Group, Row, Toggle } from "@/components/settings/primitives";
import { ProfileCard } from "@/components/settings/ProfileCard";
import { NotificationsGroup } from "@/components/settings/NotificationsGroup";
import { SubscriptionGroup } from "@/components/settings/SubscriptionGroup";
import { DangerZoneCard } from "@/components/settings/DangerZoneCard";

// ── Main page ──────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToastStore();
  const { user, clear: clearUser } = useUserStore();
  const { clear: clearAuth } = useAuthStore();
  const theme = useTheme();
  const isDark = theme === "dark";

  // ── Server state ──
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean> | null>(
    null,
  );
  const [deepFocusActive, setDeepFocusActive] = useState(false);
  const [deepFocusEndsAt, setDeepFocusEndsAt] = useState<string | null>(null);
  const [sub, setSub] = useState<{
    status: string;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
    trialEnd?: string | null;
  } | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);

  // ── Account deletion ──
  const [delConfirm, setDelConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  // ── Load profile prefs + subscription on mount ──
  useEffect(() => {
    profilesApi
      .me()
      .then((p) => {
        setNotifPrefs(p.notificationPrefs ?? {});
        setDeepFocusActive(!!p.deepFocusActive);
      })
      .catch(() => {});

    subscriptionsApi
      .me()
      .then((s) => setSub(s))
      .catch(() => {});
  }, []);

  function updatePref(key: string, value: boolean) {
    const prefs = notifPrefs ?? {
      morning_curio: true,
      chapter_prompt: false,
      bond_invitation: true,
      wave: true,
    };
    const updated = { ...prefs, [key]: value };
    setNotifPrefs(updated);
    profilesApi.updateMe({ preferences: updated }).catch(() => {});
  }

  async function openBillingPortal() {
    setLoadingPortal(true);
    try {
      const { url } = await subscriptionsApi.portal();
      window.location.href = url;
    } catch {
      toast("Could not open billing portal. Try again.");
    } finally {
      setLoadingPortal(false);
    }
  }

  async function handleDelete() {
    if (delConfirm !== "DELETE") return;
    setDeleting(true);
    try {
      await usersApi.deleteMe();
      clearAuth();
      clearUser();
      router.push("/auth");
    } catch {
      toast("Could not delete account. Contact support.");
      setDeleting(false);
    }
  }

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {}
    stopCalling();
    clearAuth();
    clearUser();
    router.push("/auth");
  }

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

  const focusEndsLabel = deepFocusEndsAt
    ? `Active, ends ${new Date(deepFocusEndsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
    : deepFocusActive
      ? "Active"
      : "Off";

  return (
    <AppShell title="Settings">
      <div
        style={{ maxWidth: 600, margin: "0 auto", padding: "0 1.6rem 3rem" }}
      >
        <ProfileCard
          user={user}
          firstSpace={firstSpace}
          spaceLabel={spaceLabel}
        />

        {/* ── Appearance ── */}
        <Group label="Appearance">
          <Row
            label={isDark ? "Dark mode" : "Light mode"}
            sub={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: ".6rem" }}
            >
              <Icon
                name={isDark ? "sun" : "moon"}
                size={16}
                stroke="var(--ink-3)"
              />
              <Toggle on={isDark} onChange={() => toggleTheme()} />
            </div>
          </Row>
        </Group>

        {/* ── Account ── */}
        <Group label="Account">
          <Row
            label="Edit profile"
            sub="Name, photo, honest fields"
            onClick={() => router.push("/editprofile")}
          >
            <Icon name="arrow" size={16} stroke="var(--ink-4)" />
          </Row>
          <Row
            label="Change password"
            onClick={() => {
              router.push("/auth/forgot");
              toast("Check your inbox for a reset link.");
            }}
          >
            <Icon name="arrow" size={16} stroke="var(--ink-4)" />
          </Row>
        </Group>

        <NotificationsGroup notifPrefs={notifPrefs} onUpdate={updatePref} />

        {/* ── Deep Focus ── */}
        <Group label="Deep Focus">
          <Row label="Status" sub={focusEndsLabel}>
            <button
              className="btn btn-soft"
              style={{
                padding: ".45rem .9rem",
                fontSize: ".82rem",
                cursor: "pointer",
              }}
              onClick={() => router.push("/deep-focus")}
            >
              {deepFocusActive ? "End early" : "Start"}
            </button>
          </Row>
        </Group>

        <SubscriptionGroup
          sub={sub}
          loadingPortal={loadingPortal}
          onManage={openBillingPortal}
        />

        {/* ── Privacy ── */}
        <Group label="Privacy">
          <Row
            label="Log visibility"
            sub="Who can see your Grouv Log"
            onClick={() => router.push("/log")}
          >
            <Icon name="arrow" size={16} stroke="var(--ink-4)" />
          </Row>
          <Row label="Grouv's Promise" onClick={() => router.push("/legal")}>
            <Icon name="arrow" size={16} stroke="var(--ink-4)" />
          </Row>
        </Group>

        <DangerZoneCard
          delConfirm={delConfirm}
          setDelConfirm={setDelConfirm}
          onDelete={handleDelete}
          deleting={deleting}
        />

        {/* ── Footer ── */}
        <div
          style={{
            display: "flex",
            gap: "1.2rem",
            justifyContent: "center",
            fontSize: ".82rem",
            color: "var(--ink-3)",
            flexWrap: "wrap",
            marginBottom: ".8rem",
          }}
        >
          <button onClick={() => router.push("/legal")}>Privacy</button>
          <button onClick={() => router.push("/legal")}>Terms</button>
          <button onClick={() => router.push("/legal")}>Our Promise</button>
        </div>
        <div
          className="mono"
          style={{
            textAlign: "center",
            fontSize: ".68rem",
            color: "var(--ink-4)",
          }}
        >
          Grouv v1.0.0
        </div>

        <button
          onClick={handleLogout}
          className="btn btn-ghost btn-block"
          style={{ marginTop: "1.2rem" }}
        >
          Sign out
        </button>
      </div>
    </AppShell>
  );
}
