/**
 * UpdaterButton.tsx
 * Reusable button that triggers the update check / install flow.
 * Only renders visually prominent when an update is available.
 */

import { Download, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useUpdater } from "../../hooks/useUpdater";

const LABEL: Record<string, string> = {
  idle:           "التحقق من التحديثات",
  checking:       "جارٍ الفحص...",
  available:      "تحديث متاح — تنزيل",
  "not-available":"أحدث إصدار",
  downloading:    "جارٍ التنزيل",
  ready:          "إعادة التشغيل والتثبيت",
  error:          "خطأ — أعد المحاولة",
};

export function UpdaterButton() {
  const { status, busy, isDownloading, checkForUpdates } = useUpdater();

  const label = isDownloading
    ? `${LABEL.downloading} ${(status as { type: "downloading"; percent: number }).percent}%`
    : LABEL[status.type] ?? LABEL.idle;

  const Icon =
    status.type === "available"      ? Download       :
    status.type === "ready"          ? CheckCircle2   :
    status.type === "error"          ? AlertCircle    :
    busy || status.type === "checking" || isDownloading ? Loader2 :
    RefreshCw;

  const variant =
    status.type === "available"  ? "update" :
    status.type === "ready"      ? "success" :
    status.type === "error"      ? "danger"  :
    "default";

  const styles: Record<string, string> = {
    update:  "bg-[var(--primary)] hover:bg-[var(--primary-dark,var(--primary))] text-white shadow-sm",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm",
    danger:  "bg-[var(--danger)] hover:opacity-90 text-white shadow-sm",
    default: "bg-[var(--surface)] hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border)]",
  };

  return (
    <button
      id="updater-check-button"
      onClick={checkForUpdates}
      disabled={busy || isDownloading || status.type === "not-available"}
      className={`
        inline-flex items-center gap-2.5 rounded-[var(--radius-md)] px-4 py-2.5
        text-sm font-semibold transition-all duration-150
        disabled:cursor-not-allowed disabled:opacity-60
        ${styles[variant]}
      `}
      title={status.type === "error" ? (status as { type: "error"; message: string }).message : undefined}
    >
      <Icon
        size={16}
        className={(busy || status.type === "checking" || isDownloading) ? "animate-spin" : ""}
      />
      {label}
    </button>
  );
}
