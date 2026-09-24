"use client";

import { useEffect } from "react";
import { syncSession } from "@/lib/session-actions";

const KEY = "grouv-session-synced";

/**
 * Runs once per browser session (not continuously): sends the time zone, and
 * a position only if location access was already granted — it never asks.
 */
export function SessionSync() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, "1");
    } catch {
      // Storage blocked: syncing again next load is harmless.
    }

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const send = (position?: { latitude: number; longitude: number }) => void syncSession({ timezone, position });

    if (!navigator.permissions || !navigator.geolocation) {
      send();
      return;
    }
    navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        if (status.state !== "granted") return send();
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => send({ latitude: coords.latitude, longitude: coords.longitude }),
          () => send(),
          { enableHighAccuracy: false, maximumAge: 30 * 60_000, timeout: 10_000 },
        );
      })
      .catch(() => send());
  }, []);

  return null;
}
