/**
 * useUpdater.ts
 * Shared hook — tracks the live update status from the main process.
 * Import in any component that needs to know if an update is available.
 */

import { useEffect, useState } from "react";

export type UpdateStatus =
  | { type: "idle" }
  | { type: "checking" }
  | { type: "available"; info: { version: string } }
  | { type: "not-available" }
  | { type: "downloading"; percent: number }
  | { type: "ready" }
  | { type: "error"; message: string };

export function useUpdater() {
  const [status, setStatus] = useState<UpdateStatus>({ type: "idle" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!window.updaterApi) return;
    const unsub = window.updaterApi.onStatus((s: unknown) =>
      setStatus(s as UpdateStatus)
    );
    return unsub;
  }, []);

  const checkForUpdates = async () => {
    if (!window.updaterApi || busy) return;
    setBusy(true);
    try {
      await window.updaterApi.checkForUpdates();
    } finally {
      setBusy(false);
    }
  };

  const hasUpdate =
    status.type === "available" || status.type === "ready";

  const isDownloading = status.type === "downloading";

  return { status, busy, hasUpdate, isDownloading, checkForUpdates };
}
