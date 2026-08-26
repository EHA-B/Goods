/**
 * updater.ts
 * Auto-update service for StockLite.
 * Hosted on: https://github.com/EHA-B/Goods
 *
 * Flow:
 *  1. On startup (after 5 s delay) → silently check GitHub Releases.
 *     ALL errors and "no update" on startup are completely silent — no dialogs.
 *  2. If update found → ask user (Arabic dialog) whether to download.
 *  3. Download in background, show progress.
 *  4. When done → ask user to restart and install.
 *
 *  Manual check (user clicks button in Settings):
 *  → Same but shows dialogs for "no update" and errors.
 */

import { dialog, ipcMain, BrowserWindow } from "electron";
import { autoUpdater, UpdateInfo } from "electron-updater";

// ─── Configure ─────────────────────────────────────────────────────────────
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;
autoUpdater.logger = null;

let mainWin: BrowserWindow | null = null;

/**
 * true  → startup auto-check  → suppress ALL dialogs (errors, no-update)
 * false → user clicked button → show appropriate dialogs
 */
let isSilentCheck = true;

// ─── IPC Channels ──────────────────────────────────────────────────────────
const IPC = {
  CHECK:  "updater:check",
  STATUS: "updater:status",
} as const;

type UpdateStatus =
  | { type: "idle" }
  | { type: "checking" }
  | { type: "available"; info: UpdateInfo }
  | { type: "not-available" }
  | { type: "downloading"; percent: number }
  | { type: "ready" }
  | { type: "error"; message: string };

function sendStatus(status: UpdateStatus) {
  mainWin?.webContents.send(IPC.STATUS, status);
}

// ─── Arabic dialog texts ────────────────────────────────────────────────────
const AR = {
  availableTitle: "تحديث متاح",
  availableMsg:   (ver: string) =>
    `يتوفر الإصدار الجديد ${ver}.\nهل تريد تنزيله الآن؟`,
  downloadBtn:    "تنزيل التحديث",
  laterBtn:       "لاحقاً",
  readyTitle:     "التحديث جاهز",
  readyMsg:       "تم تنزيل التحديث بنجاح.\nهل تريد إعادة التشغيل الآن لتثبيته؟",
  restartBtn:     "إعادة التشغيل والتثبيت",
  postponeBtn:    "لاحقاً",
  noUpdateTitle:  "لا يوجد تحديث",
  noUpdateMsg:    "أنت تستخدم أحدث إصدار من البرنامج.",
  errorTitle:     "خطأ في التحديث",
};

// ─── Detect "no release published yet" errors ───────────────────────────────
// electron-updater throws these when GitHub has no release / latest.yml is missing.
const NO_RELEASE_PATTERNS = [
  "no published versions",
  "cannot find latest",
  "httperror: 404",
  "latest.yml",
  "could not get",
  "enotfound",
  "net::err",
];

function isNoReleaseError(err: Error): boolean {
  const msg = (err.message ?? "").toLowerCase();
  return NO_RELEASE_PATTERNS.some((p) => msg.includes(p));
}

// ─── Dialog helpers ─────────────────────────────────────────────────────────
async function askDownload(ver: string): Promise<boolean> {
  if (!mainWin) return false;
  const { response } = await dialog.showMessageBox(mainWin, {
    type: "question",
    title: AR.availableTitle,
    message: AR.availableMsg(ver),
    buttons: [AR.downloadBtn, AR.laterBtn],
    defaultId: 0,
    cancelId: 1,
  });
  return response === 0;
}

async function askInstall(): Promise<boolean> {
  if (!mainWin) return false;
  const { response } = await dialog.showMessageBox(mainWin, {
    type: "question",
    title: AR.readyTitle,
    message: AR.readyMsg,
    buttons: [AR.restartBtn, AR.postponeBtn],
    defaultId: 0,
    cancelId: 1,
  });
  return response === 0;
}

// ─── electron-updater events ────────────────────────────────────────────────
function wireEvents() {
  autoUpdater.on("checking-for-update", () => {
    sendStatus({ type: "checking" });
  });

  autoUpdater.on("update-available", async (info: UpdateInfo) => {
    sendStatus({ type: "available", info });
    // Always prompt when an update is found (both silent and manual).
    const approved = await askDownload(info.version);
    if (approved) {
      autoUpdater.downloadUpdate();
    }
  });

  autoUpdater.on("update-not-available", () => {
    sendStatus({ type: "not-available" });
    // Only show "you're up to date" dialog on manual checks.
    if (!isSilentCheck && mainWin) {
      dialog.showMessageBox(mainWin, {
        type: "info",
        title: AR.noUpdateTitle,
        message: AR.noUpdateMsg,
      });
    }
  });

  autoUpdater.on("download-progress", (progress) => {
    sendStatus({ type: "downloading", percent: Math.round(progress.percent) });
  });

  autoUpdater.on("update-downloaded", async () => {
    sendStatus({ type: "ready" });
    const install = await askInstall();
    if (install) {
      setImmediate(() => autoUpdater.quitAndInstall(false, true));
    }
  });

  autoUpdater.on("error", (err: Error) => {
    // ── Silent startup check: never show any dialog ────────────────────────
    if (isSilentCheck) {
      sendStatus({ type: "idle" }); // reset UI quietly
      return;
    }

    // ── Manual check: "no release yet" → friendly "up to date" message ────
    if (isNoReleaseError(err)) {
      sendStatus({ type: "not-available" });
      if (mainWin) {
        dialog.showMessageBox(mainWin, {
          type: "info",
          title: AR.noUpdateTitle,
          message: AR.noUpdateMsg,
        });
      }
      return;
    }

    // ── Manual check: real error → show it ────────────────────────────────
    sendStatus({ type: "error", message: err.message });
    if (mainWin) {
      dialog.showMessageBox(mainWin, {
        type: "error",
        title: AR.errorTitle,
        message: err.message,
      });
    }
  });
}

// ─── IPC handler ────────────────────────────────────────────────────────────
function registerIpc() {
  ipcMain.handle(IPC.CHECK, () => {
    isSilentCheck = false; // User triggered → show dialogs
    autoUpdater.checkForUpdates()?.catch(() => {
      // Error handled by the "error" event above
    });
  });
}

// ─── Public init ────────────────────────────────────────────────────────────
export function initUpdater(win: BrowserWindow) {
  mainWin = win;
  wireEvents();
  registerIpc();

  // Startup silent check — ALL errors suppressed, no dialogs whatsoever.
  setTimeout(() => {
    isSilentCheck = true;
    autoUpdater.checkForUpdates()?.catch(() => {
      isSilentCheck = false; // reset after catch so next manual check works
    });
  }, 5000);
}
