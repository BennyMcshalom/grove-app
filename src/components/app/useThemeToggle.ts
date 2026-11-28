"use client";

import { useState } from "react";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { updatePreferences } from "@/app/(app)/settings/actions";
import { applyTheme } from "@/lib/theme";

/**
 * Dark mode on and off from the sidebar and the phone header, now Settings
 * is hidden. Repaints first, then saves; puts it back if the save fails.
 */
export function useThemeToggle() {
  const { theme: savedTheme } = useViewer();
  const toast = useToast();
  const [theme, setTheme] = useState(savedTheme);
  const dark = theme === "dark";

  const toggle = async () => {
    const next = dark ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    const result = await updatePreferences({ theme: next });
    if (result.error) {
      setTheme(theme);
      applyTheme(theme);
      toast({ title: result.error, tone: "danger" });
    }
  };

  return { dark, toggle };
}
