/**
 * updater.ts
 * Auto-update service for StockLite.
 *
 * Current mode: Manual file-based update (user brings a .exe installer on USB/physically)
 * Future mode:  Switch to GitHub Releases by uncommenting the publish config in electron-builder.json5
 *               and replacing the `manualUpdate` call with `autoUpdater.checkForUpdatesAndNotify()`.
 */

import { dialog, ipcMain, BrowserWindow, shell } from "electron";
import { autoUpdater, UpdateInfo } from "electron-updater";
import path from "node:path";
import fs from "node:fs";

// ─── Configure logger (writes to console in dev, suppressed in prod unless needed) ──────────────
autoUpdater.logger = null; // Set to `require('electron-log')` if you add electron-log later
autoUpdater.autoDownload = false;    // Always ask before downloading
autoUpdater.autoInstallOnAppQuit = false;

let mainWin: BrowserWindow | null = null;

// ─── IPC Channels ──────────────────────────────────────────────────────────────────────────────
const IPC = {
  CHECK:    "updater:check",       // Renderer → Main: check for update
  DOWNLOAD: "updater:download",    // Renderer → Main: user approved download
  INSTALL:  "updater:install",     // Renderer → Main: user wants to install now
  STATUS:   "updater:status",      // Main → Renderer: status update
  PROGRESS: "updater:progress",    // Main → Renderer: download progress
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

// ─── Arabic dialog texts ────────────────────────────────────────────────────────────────────────
const ARABIC = {
  updateAvailableTitle:   "تحديث متاح",
  updateAvailableMsg:     (ver: string) =>
    `يتوفر الإصدار الجديد ${ver}.\nهل تريد تنزيله الآن؟`,
  downloadBtn:            "تنزيل",
  laterBtn:               "لاحقاً",
  updateReadyTitle:       "التحديث جاهز",
  updateReadyMsg:         "تم تنزيل التحديث. هل تريد إعادة التشغيل الآن لتثبيته؟",
  restartBtn:             "إعادة التشغيل وتثبيت التحديث",
  postponeBtn:            "لاحقاً",
  noUpdateTitle:          "لا يوجد تحديث",
  noUpdateMsg:            "أنت تستخدم أحدث إصدار.",
  errorTitle:             "خطأ في التحديث",
  manualTitle:            "تثبيت التحديث يدوياً",
  manualMsg:              "اختر ملف الإعداد (.exe) الذي جلبته لتثبيت التحديث.",
  manualFilter:           "Setup Files",
};

// ─── Native dialog helpers ──────────────────────────────────────────────────────────────────────
async function askDownload(ver: string): Promise<boolean> {
  const result = await dialog.showMessageBox(mainWin!, {
    type: "question",
    title: ARABIC.updateAvailableTitle,
    message: ARABIC.updateAvailableMsg(ver),
    buttons: [ARABIC.downloadBtn, ARABIC.laterBtn],
    defaultId: 0,
    cancelId: 1,
  });
  return result.response === 0;
}

async function askInstall(): Promise<boolean> {
  const result = await dialog.showMessageBox(mainWin!, {
    type: "question",
    title: ARABIC.updateReadyTitle,
    message: ARABIC.updateReadyMsg,
    buttons: [ARABIC.restartBtn, ARABIC.postponeBtn],
    defaultId: 0,
    cancelId: 1,
  });
  return result.response === 0;
}

// ─── electron-updater event wiring ─────────────────────────────────────────────────────────────
function wireUpdaterEvents() {
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
    dialog.showMessageBox(mainWin!, {
      type: "info",
      title: ARABIC.noUpdateTitle,
      message: ARABIC.noUpdateMsg,
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    sendStatus({ type: "downloading", percent: Math.round(progress.percent) });
  });

  autoUpdater.on("update-downloaded", async (info: UpdateInfo) => {
    sendStatus({ type: "ready" });
    const install = await askInstall();
    if (install) {
      setImmediate(() => autoUpdater.quitAndInstall(false, true));
    }
  });

  autoUpdater.on("error", (err) => {
    sendStatus({ type: "error", message: err.message });
    dialog.showMessageBox(mainWin!, {
      type: "error",
      title: ARABIC.errorTitle,
      message: err.message,
    });
  });
}

// ─── Manual update: user brings a .exe file physically ─────────────────────────────────────────
async function manualUpdate() {
  const result = await dialog.showOpenDialog(mainWin!, {
    title: ARABIC.manualTitle,
    properties: ["openFile"],
    filters: [{ name: ARABIC.manualFilter, extensions: ["exe", "msi"] }],
  });

  if (result.canceled || result.filePaths.length === 0) return;

  const installerPath = result.filePaths[0];

  const confirm = await dialog.showMessageBox(mainWin!, {
    type: "question",
    title: ARABIC.manualTitle,
    message: ARABIC.updateReadyMsg,
    buttons: [ARABIC.restartBtn, ARABIC.laterBtn],
    defaultId: 0,
    cancelId: 1,
  });

  if (confirm.response === 0) {
    // Launch installer and exit current app
    shell.openPath(installerPath);
    setTimeout(() => {
      mainWin?.destroy();
      const { app } = require("electron");
      app.quit();
    }, 1000);
  }
}

// ─── IPC handlers (called from renderer's "Check for Updates" button) ──────────────────────────
function registerIpcHandlers() {
  // The renderer can call this to trigger a manual-file update
  ipcMain.handle(IPC.CHECK, async () => {
    await manualUpdate();
  });

  // Future: when you switch to GitHub releases, use this instead:
  // ipcMain.handle(IPC.CHECK, async () => {
  //   autoUpdater.checkForUpdates();
  // });
}

// ─── Public init ───────────────────────────────────────────────────────────────────────────────
export function initUpdater(win: BrowserWindow) {
  mainWin = win;
  wireUpdaterEvents();
  registerIpcHandlers();
}
