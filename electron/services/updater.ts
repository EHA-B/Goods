/**
 * updater.ts
 * Auto-update service for StockLite.
 * Hosted on: https://github.com/EHA-B/Goods
 *
 * Flow:
 *  1. On startup (after 5 s delay) → silently check GitHub Releases for a newer version
 *  2. If found → ask user (Arabic dialog) whether to download
 *  3. Download in background, show progress
 *  4. When done → ask user to restart and install
 */

import { dialog, ipcMain, BrowserWindow } from "electron";
import { autoUpdater, UpdateInfo } from "electron-updater";

// ─── Configure ─────────────────────────────────────────────────────────────
autoUpdater.autoDownload = false;          // Ask before downloading
autoUpdater.autoInstallOnAppQuit = false;  // Ask before installing
autoUpdater.logger = null;                 // Add electron-log here if needed

let mainWin: BrowserWindow | null = null;

// ─── IPC Channels ──────────────────────────────────────────────────────────
const IPC = {
  CHECK:    "updater:check",    // Renderer → Main: manual check
  STATUS:   "updater:status",   // Main → Renderer: status push
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
  availableTitle:   "تحديث متاح",
  availableMsg:     (ver: string) =>
    `يتوفر الإصدار الجديد ${ver}.\nهل تريد تنزيله الآن؟`,
  downloadBtn:      "تنزيل التحديث",
  laterBtn:         "لاحقاً",
  readyTitle:       "التحديث جاهز",
  readyMsg:         "تم تنزيل التحديث بنجاح.\nهل تريد إعادة التشغيل الآن لتثبيته؟",
  restartBtn:       "إعادة التشغيل والتثبيت",
  postponeBtn:      "لاحقاً",
  noUpdateTitle:    "لا يوجد تحديث",
  noUpdateMsg:      "أنت تستخدم أحدث إصدار من البرنامج.",
  errorTitle:       "خطأ في التحديث",
};

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
    const approved = await askDownload(info.version);
    if (approved) {
      autoUpdater.downloadUpdate();
    }
  });

  autoUpdater.on("update-not-available", () => {
    sendStatus({ type: "not-available" });
    if (mainWin) {
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

// ─── IPC handler (renderer "Check for Updates" button) ─────────────────────
function registerIpc() {
  ipcMain.handle(IPC.CHECK, () => {
    autoUpdater.checkForUpdates();
  });
}

// ─── Public init ────────────────────────────────────────────────────────────
export function initUpdater(win: BrowserWindow) {
  mainWin = win;
  wireEvents();
  registerIpc();

  // Auto-check 5 seconds after startup (silent — no dialog if up-to-date)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      // Silently ignore startup check errors (e.g. no internet)
    });
  }, 5000);
}
