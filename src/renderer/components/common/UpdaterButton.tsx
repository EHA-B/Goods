/**
 * UpdaterButton.tsx
 * A button the user can click to check for updates / install a new version manually.
 * Place this anywhere in the app (e.g. Settings page, sidebar footer, etc.)
 *
 * Usage:
 *   import { UpdaterButton } from "@/components/common/UpdaterButton";
 *   <UpdaterButton />
 */

import { useState, useEffect, useCallback } from "react";

type UpdateStatus =
  | { type: "idle" }
  | { type: "checking" }
  | { type: "available"; info: { version: string } }
  | { type: "not-available" }
  | { type: "downloading"; percent: number }
  | { type: "ready" }
  | { type: "error"; message: string };

const LABEL: Record<UpdateStatus["type"], string> = {
  idle:          "تحديث البرنامج",
  checking:      "جارٍ الفحص...",
  available:     "تحديث متاح",
  "not-available": "أحدث إصدار",
  downloading:   "جارٍ التنزيل...",
  ready:         "جاهز للتثبيت",
  error:         "خطأ في التحديث",
};

export function UpdaterButton() {
  const [status, setStatus] = useState<UpdateStatus>({ type: "idle" });
  const [busy, setBusy] = useState(false);

  // Listen for status events pushed from the main process
  useEffect(() => {
    if (!window.updaterApi) return;
    const unsub = window.updaterApi.onStatus((s: unknown) =>
      setStatus(s as UpdateStatus)
    );
    return unsub;
  }, []);

  const handleClick = useCallback(async () => {
    if (!window.updaterApi || busy) return;
    setBusy(true);
    try {
      await window.updaterApi.checkForUpdates();
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const isDownloading = status.type === "downloading";
  const label = isDownloading
    ? `${LABEL.downloading} ${(status as { type: "downloading"; percent: number }).percent}%`
    : LABEL[status.type];

  const colorClass =
    status.type === "available" || status.type === "ready"
      ? "bg-green-600 hover:bg-green-700"
      : status.type === "error"
      ? "bg-red-600 hover:bg-red-700"
      : status.type === "not-available"
      ? "bg-gray-500 hover:bg-gray-600"
      : "bg-blue-600 hover:bg-blue-700";

  return (
    <button
      id="updater-check-button"
      onClick={handleClick}
      disabled={busy || isDownloading}
      className={`
        inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium
        text-white transition-colors duration-150 disabled:cursor-not-allowed
        disabled:opacity-60 ${colorClass}
      `}
      title={status.type === "error" ? (status as { type: "error"; message: string }).message : undefined}
    >
      {/* Spinner */}
      {(busy || status.type === "checking" || isDownloading) && (
        <svg
          className="h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}

      {/* Download-ready icon */}
      {status.type === "ready" && (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M5 13l4 4L19 7" />
        </svg>
      )}

      {label}
    </button>
  );
}
