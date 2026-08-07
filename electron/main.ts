import { app, BrowserWindow, dialog } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";

import "./apis/Apis";
import LicenseManager from "./services/LicenseManager";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "../..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: "نظام محاسبة أسواق المزارعين",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.webContents.on("did-finish-load", () => {
    win?.webContents.send(
      "main-process-message",
      new Date().toLocaleString(),
    );
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(async () => {
  try {
    
    let licenseStatus = LicenseManager.validateLicense();
    while (!licenseStatus.valid) {
      const response = await dialog.showMessageBox({
        type: 'error',
        title: 'Activation Required',
        message: `${licenseStatus.message}\n\nYour Device ID is: ${licenseStatus.deviceId}`,
        buttons: ['Import License File', 'Exit Application'],
        defaultId: 0,
        cancelId: 1
      });

      if (response.response === 0) {
        const importPath = await dialog.showOpenDialog({
          title: 'Select License File',
          filters: [{ name: 'License Files', extensions: ['dat'] }],
          properties: ['openFile']
        });

        if (!importPath.canceled && importPath.filePaths.length > 0) {
          const result = LicenseManager.importLicense(importPath.filePaths[0]);
          if (result.success) {
            dialog.showMessageBoxSync({ type: 'info', title: 'Activated', message: 'License imported successfully! Application will now start.' });
            licenseStatus = { valid: true, message: 'Success' }; // Break loop
          } else {
            dialog.showMessageBoxSync({ type: 'error', title: 'Import Failed', message: `Invalid license file:\n${result.error}` });
          }
        } else {
          app.quit();
          return;
        }
      } else {
        app.quit();
        return;
      }
    }

    const { initDatabase } = await import(
      "../src/main/database/dbmanager"
    );

    await initDatabase();
    console.log("Database initialized successfully from electron/main.ts");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    app.quit();
    return;
  }

  // Start auto-backup service (runs every hour)
  try {
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    const backupController = require(path.join(__dirname, "../../src/controllers/backupController.js"));
    
    setInterval(() => {
      backupController.runAutoBackupCycle().catch(console.error);
    }, 60 * 60 * 1000); // 1 hour
    
    // Run an initial check on startup
    backupController.runAutoBackupCycle().catch(console.error);
  } catch (error) {
    console.error("Failed to start auto-backup service:", error);
  }

  // Start auto-backup service (runs every hour)
  try {
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    const backupController = require(path.join(__dirname, "../../src/controllers/backupController.js"));
    
    setInterval(() => {
      backupController.runAutoBackupCycle().catch(console.error);
    }, 60 * 60 * 1000); // 1 hour
    
    // Run an initial check on startup
    backupController.runAutoBackupCycle().catch(console.error);
  } catch (error) {
    console.error("Failed to start auto-backup service:", error);
  }

  createWindow();
});
