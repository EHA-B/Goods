var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { app, ipcMain, BrowserWindow, dialog } from "electron";
import { fileURLToPath } from "node:url";
import path$1 from "node:path";
import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
import crypto from "crypto";
import os from "os";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
let currentUser = null;
function setCurrentUser(user) {
  currentUser = { ...user };
  return currentUser;
}
function getCurrentUser() {
  return currentUser ? { ...currentUser } : null;
}
function clearCurrentUser() {
  currentUser = null;
}
class LicenseManager {
  constructor() {
    // PUBLIC KEY ONLY! Used exclusively to verify signatures.
    // The private key is kept offline and used by the generation script.
    __publicField(this, "publicKeyPem", `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAypKRbbQ1cl4alzH6hJddetunUEiDqADpyMFn6zT3F8A=
-----END PUBLIC KEY-----`);
    __publicField(this, "licenseFileName", "license.dat");
  }
  /**
   * Generate a unique device ID based on hardware characteristics
   * Uses PowerShell to get stable identifiers like Motherboard UUID and OS Drive Serial
   */
  getDeviceId() {
    try {
      const components = [];
      components.push(os.hostname());
      if (os.platform() === "win32") {
        try {
          const uuidOutput = execSync('powershell.exe -NoProfile -Command "(Get-CimInstance -Class Win32_ComputerSystemProduct).UUID"', { encoding: "utf8" });
          if (uuidOutput && uuidOutput.trim()) {
            components.push(uuidOutput.trim());
          }
        } catch (e) {
          console.error("Failed to get Motherboard UUID:", e);
        }
      } else {
        components.push(os.platform());
        components.push(os.arch());
      }
      components.push(os.totalmem().toString());
      const fingerprint = components.join("|");
      const hash = crypto.createHash("sha256").update(fingerprint).digest("hex");
      return hash.substring(0, 16).toUpperCase();
    } catch (error) {
      console.error("Error generating device ID:", error);
      throw new Error("Failed to generate device ID");
    }
  }
  /**
   * Get the path where license file should be stored
   */
  getLicensePath() {
    try {
      const userDataPath = app.getPath("userData");
      return path.join(userDataPath, this.licenseFileName);
    } catch (error) {
      console.error("Error getting license path:", error);
      return path.join(process.cwd(), this.licenseFileName);
    }
  }
  /**
   * Verify the license signature using Ed25519
   */
  verifySignature(data, signatureHex) {
    try {
      const publicKey = crypto.createPublicKey(this.publicKeyPem);
      const signatureBuffer = Buffer.from(signatureHex, "hex");
      return crypto.verify(
        null,
        Buffer.from(data, "utf8"),
        publicKey,
        signatureBuffer
      );
    } catch (error) {
      console.error("Signature verification error:", error);
      return false;
    }
  }
  /**
   * Validate the license file
   * Returns validation status and details
   */
  validateLicense() {
    try {
      const pathsToCheck = [
        this.getLicensePath(),
        // AppData
        path.join(process.cwd(), this.licenseFileName)
        // Current working dir
      ];
      try {
        pathsToCheck.push(path.join(path.dirname(app.getAppPath()), this.licenseFileName));
      } catch (e) {
      }
      let licensePath = null;
      for (const p of pathsToCheck) {
        if (fs.existsSync(p)) {
          licensePath = p;
          break;
        }
      }
      if (!licensePath) {
        return {
          valid: false,
          error: "NO_LICENSE_FILE",
          message: "No license file found. Please activate this application.",
          deviceId: this.getDeviceId()
        };
      }
      const licenseContent = fs.readFileSync(licensePath, "utf8");
      let licenseObj;
      try {
        licenseObj = JSON.parse(licenseContent);
      } catch (error) {
        return {
          valid: false,
          error: "INVALID_LICENSE_FORMAT",
          message: "License file is corrupted or invalid.",
          deviceId: this.getDeviceId()
        };
      }
      const { data, signature } = licenseObj;
      if (!data || !signature) {
        return {
          valid: false,
          error: "INVALID_LICENSE_FORMAT",
          message: "License file is missing data or signature.",
          deviceId: this.getDeviceId()
        };
      }
      const stringifiedData = JSON.stringify(data);
      if (!this.verifySignature(stringifiedData, signature)) {
        return {
          valid: false,
          error: "SIGNATURE_MISMATCH",
          message: "License signature is invalid. The license may have been tampered with.",
          deviceId: this.getDeviceId()
        };
      }
      const currentDeviceId = this.getDeviceId();
      if (data.deviceId !== currentDeviceId) {
        return {
          valid: false,
          error: "DEVICE_MISMATCH",
          message: "This license is not valid for this device. Please contact support.",
          deviceId: currentDeviceId,
          licensedDeviceId: data.deviceId
        };
      }
      return {
        valid: true,
        deviceId: currentDeviceId,
        generatedAt: data.generatedAt,
        message: "License is valid"
      };
    } catch (error) {
      console.error("License validation error:", error);
      return {
        valid: false,
        error: "VALIDATION_ERROR",
        message: "Failed to validate license: " + error.message,
        deviceId: this.getDeviceId()
      };
    }
  }
  /**
   * Get license status information
   */
  getLicenseStatus() {
    const validation = this.validateLicense();
    return {
      ...validation,
      licensePath: this.getLicensePath()
    };
  }
  /**
   * Import a license file from an external path
   * @param {string} sourcePath - Path to the license file to import
   */
  importLicense(sourcePath) {
    try {
      if (!fs.existsSync(sourcePath)) {
        return {
          success: false,
          error: "Source license file not found"
        };
      }
      const licenseData = fs.readFileSync(sourcePath, "utf8");
      const targetPath = this.getLicensePath();
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(targetPath, licenseData, "utf8");
      const validation = this.validateLicense();
      if (!validation.valid) {
        fs.unlinkSync(targetPath);
        return {
          success: false,
          error: validation.message,
          ...validation
        };
      }
      return {
        success: true,
        ...validation
      };
    } catch (error) {
      console.error("Error importing license:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
const LicenseManager$1 = new LicenseManager();
const require$1 = createRequire(import.meta.url);
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$2 = path$1.dirname(__filename$1);
function success(data) {
  return {
    success: true,
    data
  };
}
function normalizeBackendError(code, message, details) {
  const originalCode = String(code || "").trim().toUpperCase();
  const originalMessage = String(message || "").trim();
  let normalizedCode = originalCode || "UNKNOWN_ERROR";
  if (normalizedCode === "SQLITE_CONSTRAINT_FOREIGNKEY" || normalizedCode === "SQLITE_CONSTRAINT" || /foreign key constraint failed/i.test(originalMessage) || /foreign key constraint/i.test(originalMessage)) {
    normalizedCode = "HAS_DEPENDENCIES";
  }
  if (normalizedCode === "SQLITE_CONSTRAINT_UNIQUE" || /unique constraint failed/i.test(originalMessage)) {
    normalizedCode = "DUPLICATE_ENTRY";
  }
  if (normalizedCode === "SQLITE_CONSTRAINT_NOTNULL" || normalizedCode === "SQLITE_CONSTRAINT_CHECK" || /not null constraint failed/i.test(originalMessage) || /check constraint failed/i.test(originalMessage)) {
    normalizedCode = "VALIDATION_ERROR";
  }
  if (normalizedCode === "SQLITE_BUSY" || /database is locked/i.test(originalMessage)) {
    normalizedCode = "DATABASE_BUSY";
  }
  if (normalizedCode === "SQLITE_READONLY" || /readonly database/i.test(originalMessage) || /attempt to write a readonly database/i.test(originalMessage)) {
    normalizedCode = "DATABASE_READONLY";
  }
  return {
    code: normalizedCode,
    message: originalMessage || "Unknown application error",
    details
  };
}
function failure(code, message, details) {
  return {
    success: false,
    error: normalizeBackendError(code, message, details)
  };
}
const authController = require$1(path$1.join(__dirname$2, "../../src/controllers", "authController.js"));
const activityLogController = require$1(path$1.join(__dirname$2, "../../src/controllers", "activityLogController.js"));
const cashboxController = require$1(path$1.join(__dirname$2, "../../src/controllers", "cashboxController.js"));
const cashboxTransactionController = require$1(path$1.join(__dirname$2, "../../src/controllers", "cashboxTransactionController.js"));
const customerController = require$1(path$1.join(__dirname$2, "../../src/controllers", "customerController.js"));
const paymentController = require$1(path$1.join(__dirname$2, "../../src/controllers", "paymentController.js"));
const productController = require$1(path$1.join(__dirname$2, "../../src/controllers", "productController.js"));
const purchaseInvoiceController = require$1(path$1.join(__dirname$2, "../../src/controllers", "purchaseInvoiceController.js"));
require$1(path$1.join(__dirname$2, "../../src/controllers", "purchaseInvoiceItemController.js"));
const saleInvoiceController = require$1(path$1.join(__dirname$2, "../../src/controllers", "saleInvoiceController.js"));
const saleInvoiceItemController = require$1(path$1.join(__dirname$2, "../../src/controllers", "saleInvoiceItemController.js"));
const saleTypeController = require$1(path$1.join(__dirname$2, "../../src/controllers", "saleTypeController.js"));
const settingController = require$1(path$1.join(__dirname$2, "../../src/controllers", "settingController.js"));
const stockAdjustmentController = require$1(path$1.join(__dirname$2, "../../src/controllers", "stockAdjustmentController.js"));
const stockBatchController = require$1(path$1.join(__dirname$2, "../../src/controllers", "stockBatchController.js"));
const supplierController = require$1(path$1.join(__dirname$2, "../../src/controllers", "supplierController.js"));
const transactionCategoryController = require$1(path$1.join(__dirname$2, "../../src/controllers", "transactionCategoryController.js"));
const transactionController = require$1(path$1.join(__dirname$2, "../../src/controllers", "transactionController.js"));
const userController = require$1(path$1.join(__dirname$2, "../../src/controllers", "userController.js"));
const backupController = require$1(path$1.join(__dirname$2, "../../src/controllers", "backupController.js"));
const dashboardController = require$1(path$1.join(__dirname$2, "../../src/controllers", "dashboardController.js"));
const printController = require$1(path$1.join(__dirname$2, "../../src/controllers", "printController.js"));
const notificationController = require$1(path$1.join(__dirname$2, "../../src/controllers", "notificationController.js"));
const workerController = require$1(path$1.join(__dirname$2, "../../src/controllers", "workerController.js"));
ipcMain.handle("api:auth:login", async (_event, input) => {
  try {
    const user = await authController.login(input);
    setCurrentUser(user);
    global.__stockliteCurrentUserId = user.id;
    await activityLogController.recordActivity({ user_id: user.id, action: "auth_login", table_name: "users", record_id: user.id, new_data: { username: user.username } }).catch(() => void 0);
    return success(user);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:auth:logout", async () => {
  const user = getCurrentUser();
  if (user) await activityLogController.recordActivity({ user_id: user.id, action: "auth_logout", table_name: "users", record_id: user.id }).catch(() => void 0);
  clearCurrentUser();
  global.__stockliteCurrentUserId = null;
  return success({ success: true });
});
ipcMain.handle("api:auth:getCurrentUser", async () => {
  return success(getCurrentUser());
});
ipcMain.handle("api:auth:changePassword", async (_event, input) => {
  try {
    const user = getCurrentUser();
    if (!user) return failure("UNAUTHENTICATED", "Authentication is required");
    const result = await authController.changePassword(user.id, input);
    await activityLogController.recordActivity({ user_id: user.id, action: "password_changed", table_name: "users", record_id: user.id }).catch(() => void 0);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
const internallyAuditedChannels = /* @__PURE__ */ new Set([
  "api:saleInvoice:createSaleProcess",
  "api:saleInvoice:cancelSaleInvoice",
  "api:payment:recordSalePayment",
  "api:payment:reverseSalePayment",
  "api:purchase:createFull",
  "api:purchase:addItems",
  "api:purchase:cancel",
  "api:payment:recordPurchasePayment",
  "api:payment:reversePurchasePayment",
  "api:purchase:closeCommission",
  "api:purchase:reverseCommissionSettlement"
]);
function auditInfoForChannel(channel, args, data) {
  var _a, _b;
  if (internallyAuditedChannels.has(channel) || channel.startsWith("api:activityLog:") || channel.includes(":get") || channel.includes(":list") || channel.includes(":summary")) return null;
  const operation = channel.split(":").pop() || "operation";
  const entity = channel.split(":")[1] || "system";
  const mutation = /(create|update|delete|remove|cancel|transfer|adjust|backup|restore|save|set)/i.test(operation);
  if (!mutation) return null;
  const tableMap = { product: "products", customer: "customers", supplier: "suppliers", cashbox: "cashboxes", transaction: "transactions", transactionCategory: "transaction_categories", stockAdjustment: "stock_adjustments", stockBatch: "stock_batches", setting: "settings", backup: "backups", saleType: "sale_types" };
  const action = `${entity}_${operation}`.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
  const recordId = Number((data == null ? void 0 : data.id) ?? ((_a = data == null ? void 0 : data.transaction) == null ? void 0 : _a.id) ?? ((_b = args == null ? void 0 : args[0]) == null ? void 0 : _b.id) ?? (args == null ? void 0 : args[0]) ?? 0) || 0;
  return { action, table_name: tableMap[entity] || entity, record_id: recordId, new_data: { input: (args == null ? void 0 : args[0]) ?? null, result_id: (data == null ? void 0 : data.id) ?? null } };
}
const registerProtectedHandler = ipcMain.handle.bind(ipcMain);
ipcMain.handle = (channel, listener) => registerProtectedHandler(channel, async (...args) => {
  const user = getCurrentUser();
  if (!user) return failure("UNAUTHENTICATED", "Authentication is required");
  global.__stockliteCurrentUserId = user.id;
  const eventArgs = args.slice(1);
  const pendingAudit = auditInfoForChannel(channel, eventArgs, null);
  const oldData = (pendingAudit == null ? void 0 : pendingAudit.record_id) ? await activityLogController.getEntitySnapshot(pendingAudit.table_name, pendingAudit.record_id).catch(() => null) : null;
  const response = await listener(...args);
  if (response == null ? void 0 : response.success) {
    const audit = auditInfoForChannel(channel, eventArgs, response.data);
    if (audit) {
      const inputData = typeof eventArgs[1] === "object" ? eventArgs[1] : typeof eventArgs[0] === "object" ? eventArgs[0] : null;
      await activityLogController.recordActivity({ user_id: user.id, ...audit, old_data: oldData, new_data: inputData || response.data }).catch(() => void 0);
    }
  }
  return response;
});
ipcMain.handle("api:print:payment", async (_event, id) => {
  try {
    return success(await printController.getPaymentDocument(id));
  } catch (e) {
    return failure(e.code || "PRINT_LOAD_FAILED", e.message, e.details);
  }
});
ipcMain.handle("api:print:transaction", async (_event, id) => {
  try {
    return success(await printController.getTransactionDocument(id));
  } catch (e) {
    return failure(e.code || "PRINT_LOAD_FAILED", e.message, e.details);
  }
});
ipcMain.handle("api:print:transfer", async (_event, id) => {
  try {
    return success(await printController.getTransferDocument(id));
  } catch (e) {
    return failure(e.code || "PRINT_LOAD_FAILED", e.message, e.details);
  }
});
ipcMain.handle("api:print:customerStatement", async (_event, id) => {
  try {
    return success(await printController.getCustomerStatement(id));
  } catch (e) {
    return failure(e.code || "PRINT_LOAD_FAILED", e.message, e.details);
  }
});
ipcMain.handle("api:print:supplierStatement", async (_event, id) => {
  try {
    return success(await printController.getSupplierStatement(id));
  } catch (e) {
    return failure(e.code || "PRINT_LOAD_FAILED", e.message, e.details);
  }
});
ipcMain.handle("api:print:cashboxStatement", async (_event, id) => {
  try {
    return success(await printController.getCashboxStatement(id));
  } catch (e) {
    return failure(e.code || "PRINT_LOAD_FAILED", e.message, e.details);
  }
});
ipcMain.handle("api:print:consignment", async (_event, id) => {
  try {
    return success(await printController.getConsignmentDocument(id));
  } catch (e) {
    return failure(e.code || "PRINT_LOAD_FAILED", e.message, e.details);
  }
});
ipcMain.handle("api:notification:list", async (_event, input) => {
  try {
    return success(await notificationController.list(input));
  } catch (e) {
    return failure(e.code || "NOTIFICATIONS_LOAD_FAILED", e.message || "Failed to load notifications", e.details);
  }
});
ipcMain.handle("api:notification:count", async () => {
  try {
    return success(await notificationController.unreadCount());
  } catch (e) {
    return failure(e.code || "NOTIFICATIONS_LOAD_FAILED", e.message || "Failed to load notifications", e.details);
  }
});
ipcMain.handle("api:notification:markRead", async (_event, id) => {
  try {
    return success(await notificationController.markRead(id));
  } catch (e) {
    return failure(e.code || "NOTIFICATION_UPDATE_FAILED", e.message, e.details);
  }
});
ipcMain.handle("api:notification:markAllRead", async () => {
  try {
    return success(await notificationController.markAllRead());
  } catch (e) {
    return failure(e.code || "NOTIFICATION_UPDATE_FAILED", e.message, e.details);
  }
});
ipcMain.handle("api:notification:dismiss", async (_event, id) => {
  try {
    return success(await notificationController.dismiss(id));
  } catch (e) {
    return failure(e.code || "NOTIFICATION_UPDATE_FAILED", e.message, e.details);
  }
});
ipcMain.handle("api:dashboard:get", async () => {
  try {
    return success(await dashboardController.getDashboard());
  } catch (e) {
    return failure(e.code || "DASHBOARD_LOAD_FAILED", e.message || "Failed to load dashboard", e.details);
  }
});
ipcMain.handle("api:system:getAppInfo", async () => {
  try {
    const databasePath = path$1.join(app.getPath("userData"), "farmer-market.db");
    return success({
      appName: "StockLite",
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron || "",
      nodeVersion: process.versions.node || "",
      chromiumVersion: process.versions.chrome || "",
      databaseEngine: "SQLite",
      databasePath,
      platform: process.platform,
      architecture: process.arch,
      environment: app.isPackaged ? "production" : "development"
    });
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:license:getDeviceId", async () => {
  try {
    return success(LicenseManager$1.getDeviceId());
  } catch (e) {
    return failure("LICENSE_ERROR", e.message, e);
  }
});
ipcMain.handle("api:license:getStatus", async () => {
  try {
    return success(LicenseManager$1.getLicenseStatus());
  } catch (e) {
    return failure("LICENSE_ERROR", e.message, e);
  }
});
ipcMain.handle("api:license:import", async (_event, sourcePath) => {
  try {
    return success(LicenseManager$1.importLicense(sourcePath));
  } catch (e) {
    return failure("LICENSE_ERROR", e.message, e);
  }
});
ipcMain.handle("api:activityLog:list", async (_event, filters, pagination) => {
  try {
    return success(await activityLogController.listActivityLogs(filters, pagination));
  } catch (e) {
    return failure(e.code || "ACTIVITY_LOG_LOAD_FAILED", e.message || "Failed to load activity log", e.details);
  }
});
ipcMain.handle("api:activityLog:get", async (_event, id) => {
  try {
    return success(await activityLogController.getActivityLog(id));
  } catch (e) {
    return failure(e.code || "ACTIVITY_LOG_LOAD_FAILED", e.message || "Failed to load activity log", e.details);
  }
});
ipcMain.handle("api:activityLog:options", async () => {
  try {
    return success(await activityLogController.getActivityLogOptions());
  } catch (e) {
    return failure(e.code || "ACTIVITY_LOG_LOAD_FAILED", e.message || "Failed to load activity log options", e.details);
  }
});
ipcMain.handle("api:cashbox:createCashbox", async (_event, input) => {
  try {
    const result = await cashboxController.createCashbox(input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:cashbox:getCashbox", async (_event, id) => {
  try {
    const result = await cashboxController.getCashbox(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:cashbox:getAllCashboxs", async (_event) => {
  try {
    const result = await cashboxController.getAllCashboxs();
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:cashbox:getCashboxesSummary", async (_event) => {
  try {
    const result = await cashboxController.getCashboxesSummary();
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:cashbox:reverseTransfer", async (_event, transferGroupId, reason) => {
  try {
    const result = await cashboxController.reverseCashboxTransfer(transferGroupId, reason);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:cashbox:updateCashbox", async (_event, id, input) => {
  try {
    const result = await cashboxController.updateCashbox(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:cashbox:getDetails", async (_event, id) => {
  try {
    const result = await cashboxController.getCashboxDetails(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:cashbox:getMovements", async (_event, cashboxId, filters) => {
  try {
    const result = await cashboxController.getCashboxMovements(cashboxId, filters);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:cashbox:createMovement", async (_event, input) => {
  try {
    const result = await cashboxController.createCashboxMovement(input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:cashbox:transferBetween", async (_event, input) => {
  try {
    const result = await cashboxController.transferBetweenCashboxes(input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:cashbox:reverseMovement", async (_event, transactionId, reason) => {
  try {
    const result = await cashboxController.reverseCashboxMovement(transactionId, reason);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:cashbox:deleteCashbox", async (_event, id) => {
  try {
    const result = await cashboxController.deleteCashbox(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:cashboxTransaction:getCashboxTransaction", async (_event, id) => {
  try {
    const result = await cashboxTransactionController.getCashboxTransaction(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:cashboxTransaction:getAllCashboxTransactions", async (_event) => {
  try {
    const result = await cashboxTransactionController.getAllCashboxTransactions();
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:customer:createCustomer", async (_event, input) => {
  try {
    const result = await customerController.createCustomer(input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:customer:getCustomer", async (_event, id) => {
  try {
    const result = await customerController.getCustomer(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:customer:getAllCustomers", async (_event) => {
  try {
    const result = await customerController.getAllCustomers();
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:customer:updateCustomer", async (_event, id, input) => {
  try {
    const result = await customerController.updateCustomer(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:customer:deleteCustomer", async (_event, id) => {
  try {
    const result = await customerController.deleteCustomer(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:payment:getPayment", async (_event, id) => {
  try {
    const result = await paymentController.getPayment(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:payment:getAllPayments", async (_event) => {
  try {
    const result = await paymentController.getAllPayments();
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:payment:getSalePayments", async (_event, invoiceId) => {
  try {
    const result = await paymentController.getSalePayments(invoiceId);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:payment:getPurchasePayments", async (_event, invoiceId) => {
  try {
    const result = await paymentController.getPurchasePayments(invoiceId);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:payment:recordSalePayment", async (_event, input) => {
  try {
    const result = await paymentController.recordSalePayment(input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:payment:recordPurchasePayment", async (_event, input) => {
  try {
    const result = await paymentController.recordPurchasePayment(input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:payment:reverseSalePayment", async (_event, paymentId, reason) => {
  try {
    const result = await paymentController.reverseSalePayment(paymentId, reason);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:payment:reversePurchasePayment", async (_event, paymentId, reason) => {
  try {
    const result = await paymentController.reversePurchasePayment(paymentId, reason);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:product:createProduct", async (_event, input) => {
  try {
    const result = await productController.createProduct(input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:product:getProduct", async (_event, id) => {
  try {
    const result = await productController.getProduct(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:product:getAllProducts", async (_event) => {
  try {
    const result = await productController.getAllProducts();
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:product:updateProduct", async (_event, id, input) => {
  try {
    const result = await productController.updateProduct(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:product:deleteProduct", async (_event, id) => {
  try {
    const result = await productController.deleteProduct(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:product:adjustProductStock", async (_event, id, input) => {
  try {
    const result = await productController.adjustProductStock(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:product:getProductWithStock", async (_event, id) => {
  try {
    const result = await productController.getProductWithStock(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:purchase:createFull", async (_event, input) => {
  try {
    const result = await purchaseInvoiceController.createFullPurchaseInvoice(input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:purchase:addItems", async (_event, invoiceId, items) => {
  try {
    const result = await purchaseInvoiceController.addItemsToPurchaseInvoice(invoiceId, items);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:purchase:get", async (_event, id) => {
  try {
    const result = await purchaseInvoiceController.getPurchaseInvoice(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:purchase:getDetails", async (_event, id) => {
  try {
    const result = await purchaseInvoiceController.getPurchaseInvoiceDetails(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:purchase:list", async (_event, filters, pagination) => {
  try {
    const result = await purchaseInvoiceController.listPurchaseInvoices(filters, pagination);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:purchase:getAll", async (_event) => {
  try {
    const result = await purchaseInvoiceController.getAllPurchaseInvoices();
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:purchase:cancel", async (_event, id, reason) => {
  try {
    const result = await purchaseInvoiceController.cancelPurchaseInvoice(id, reason);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:purchase:deleteDraft", async (_event, id) => {
  try {
    const result = await purchaseInvoiceController.deleteDraftPurchaseInvoice(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:purchase:getSalesDetails", async (_event, id) => {
  try {
    const result = await purchaseInvoiceController.getPurchaseInvoiceSalesDetails(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:purchase:getConsignmentSummary", async (_event, id) => {
  try {
    const result = await purchaseInvoiceController.getConsignmentSummary(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:purchase:previewConsignmentClosing", async (_event, id, input) => {
  try {
    const result = await purchaseInvoiceController.previewConsignmentClosing(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:purchase:closeCommission", async (_event, id, input) => {
  try {
    const result = await purchaseInvoiceController.closeCommission(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:purchase:getConsignmentSettlement", async (_event, id) => {
  try {
    const result = await purchaseInvoiceController.getConsignmentSettlement(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:purchase:reverseConsignmentSettlement", async (_event, id, reason) => {
  try {
    const result = await purchaseInvoiceController.reverseCommissionSettlement(id, reason);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:purchase:recordPayment", async (_event, input) => {
  try {
    const result = await paymentController.recordPurchasePayment(input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:purchase:reversePayment", async (_event, paymentId, reason) => {
  try {
    const result = await paymentController.reversePurchasePayment(paymentId, reason);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:system:backup", async (_event, destinationPath) => {
  try {
    if (!getCurrentUser()) return failure("UNAUTHENTICATED", "Authentication is required");
    const result = await backupController.createBackup(destinationPath);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:system:restore", async (_event, sourcePath) => {
  try {
    if (!getCurrentUser()) return failure("UNAUTHENTICATED", "Authentication is required");
    const prepared = await backupController.prepareRestore(sourcePath);
    const { closeDatabase } = await import("./dbmanager-BHH6RASS.js");
    await closeDatabase();
    try {
      const result = await backupController.applyRestore(prepared.sourcePath);
      app.relaunch();
      app.exit(0);
      return success({ ...result, emergencyBackupPath: prepared.emergencyBackupPath });
    } catch (restoreError) {
      app.relaunch();
      app.exit(1);
      throw restoreError;
    }
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:system:getAutoBackupConfig", async () => {
  try {
    if (!getCurrentUser()) return failure("UNAUTHENTICATED", "Authentication is required");
    const result = await backupController.getAutoBackupConfig();
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:system:setAutoBackupConfig", async (_event, input) => {
  try {
    if (!getCurrentUser()) return failure("UNAUTHENTICATED", "Authentication is required");
    const result = await backupController.setAutoBackupConfig(input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:system:saveCurrentPageAsPdf", async (event, input = {}) => {
  try {
    if (!getCurrentUser()) return failure("UNAUTHENTICATED", "Authentication is required");
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return failure("PRINT_FAILED", "تعذر الوصول إلى نافذة المستند");
    const rawName = String((input == null ? void 0 : input.fileName) || "document").trim() || "document";
    const safeName = rawName.replace(/[\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").slice(0, 120);
    const result = await dialog.showSaveDialog(window, {
      title: "حفظ المستند بصيغة PDF",
      defaultPath: `${safeName}.pdf`,
      filters: [{ name: "PDF", extensions: ["pdf"] }]
    });
    if (result.canceled || !result.filePath) return success({ canceled: true, path: null });
    const pdf = await window.webContents.printToPDF({
      printBackground: true,
      pageSize: "A4",
      landscape: false,
      margins: { top: 0.35, bottom: 0.35, left: 0.35, right: 0.35 },
      preferCSSPageSize: true
    });
    await writeFile(result.filePath, pdf);
    return success({ canceled: false, path: result.filePath });
  } catch (e) {
    return failure(e.code || "PRINT_FAILED", e.message || "تعذر حفظ ملف PDF", e.details);
  }
});
ipcMain.handle("api:system:selectDirectory", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"]
  });
  return success({ canceled: result.canceled, path: result.canceled ? null : result.filePaths[0] });
});
ipcMain.handle("api:system:selectSaveFile", async () => {
  const result = await dialog.showSaveDialog({
    title: "Select Backup Location",
    defaultPath: `farmer-market-backup-${(/* @__PURE__ */ new Date()).toISOString().replace(/T/, "_").replace(/:/g, "-").split(".")[0]}.db`,
    filters: [{ name: "SQLite Database", extensions: ["db", "sqlite"] }]
  });
  return success({ canceled: result.canceled, path: result.canceled ? null : result.filePath });
});
ipcMain.handle("api:system:selectOpenFile", async () => {
  const result = await dialog.showOpenDialog({
    title: "Select Backup File to Restore",
    properties: ["openFile"],
    filters: [{ name: "SQLite Database", extensions: ["db", "sqlite"] }]
  });
  return success({ canceled: result.canceled, path: result.canceled ? null : result.filePaths[0] });
});
ipcMain.handle("api:saleInvoice:createSaleProcess", async (_event, input) => {
  try {
    const result = await saleInvoiceController.createSaleProcess(input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:saleInvoice:getSaleInvoice", async (_event, id) => {
  try {
    const result = await saleInvoiceController.getSaleInvoice(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:saleInvoice:getSaleInvoiceDetails", async (_event, id) => {
  try {
    const result = await saleInvoiceController.getSaleInvoiceDetails(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:saleInvoice:listSaleInvoices", async (_event, filters, pagination) => {
  try {
    const result = await saleInvoiceController.listSaleInvoices(filters, pagination);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:saleInvoice:getAllSaleInvoices", async (_event) => {
  try {
    const result = await saleInvoiceController.getAllSaleInvoices();
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:saleInvoice:getFullSaleInvoice", async (_event, id) => {
  try {
    const result = await saleInvoiceController.getFullSaleInvoice(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:saleInvoice:cancelSaleInvoice", async (_event, id, reason) => {
  try {
    const result = await saleInvoiceController.cancelSaleInvoice(id, reason);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:saleInvoice:deleteDraftSaleInvoice", async (_event, id) => {
  try {
    const result = await saleInvoiceController.deleteDraftSaleInvoice(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:saleInvoice:getAvailableBatches", async (_event, productId) => {
  try {
    const result = await saleInvoiceController.getAvailableBatches(productId);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:saleInvoiceItem:getSaleInvoiceItem", async (_event, id) => {
  try {
    const result = await saleInvoiceItemController.getSaleInvoiceItem(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:saleInvoiceItem:getAllSaleInvoiceItems", async (_event) => {
  try {
    const result = await saleInvoiceItemController.getAllSaleInvoiceItems();
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:saleType:createSaleType", async (_event, input) => {
  try {
    const result = await saleTypeController.createSaleType(input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:saleType:getSaleType", async (_event, id) => {
  try {
    const result = await saleTypeController.getSaleType(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:saleType:getAllSaleTypes", async (_event) => {
  try {
    const result = await saleTypeController.getAllSaleTypes();
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:saleType:updateSaleType", async (_event, id, input) => {
  try {
    const result = await saleTypeController.updateSaleType(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:saleType:deleteSaleType", async (_event, id) => {
  try {
    const result = await saleTypeController.deleteSaleType(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:setting:createSetting", async (_event, input) => {
  try {
    const result = await settingController.createSetting(input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:setting:getSetting", async (_event, id) => {
  try {
    const result = await settingController.getSetting(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:setting:getAllSettings", async (_event) => {
  try {
    const result = await settingController.getAllSettings();
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:setting:updateSetting", async (_event, id, input) => {
  try {
    const result = await settingController.updateSetting(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:setting:deleteSetting", async (_event, id) => {
  try {
    const result = await settingController.deleteSetting(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:stockAdjustment:createStockAdjustment", async (_event, input) => {
  try {
    const result = await stockAdjustmentController.createStockAdjustment(input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:stockAdjustment:getStockAdjustment", async (_event, id) => {
  try {
    const result = await stockAdjustmentController.getStockAdjustment(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:stockAdjustment:getAllStockAdjustments", async (_event) => {
  try {
    const result = await stockAdjustmentController.getAllStockAdjustments();
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:stockAdjustment:updateStockAdjustment", async (_event, id, input) => {
  try {
    const result = await stockAdjustmentController.updateStockAdjustment(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:stockAdjustment:deleteStockAdjustment", async (_event, id) => {
  try {
    const result = await stockAdjustmentController.deleteStockAdjustment(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:stockBatch:createStockBatch", async (_event, input) => {
  try {
    const result = await stockBatchController.createStockBatch(input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:stockBatch:getStockBatch", async (_event, id) => {
  try {
    const result = await stockBatchController.getStockBatch(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:stockBatch:getAllStockBatchs", async (_event) => {
  try {
    const result = await stockBatchController.getAllStockBatchs();
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:stockBatch:updateStockBatch", async (_event, id, input) => {
  try {
    const result = await stockBatchController.updateStockBatch(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:stockBatch:deleteStockBatch", async (_event, id) => {
  try {
    const result = await stockBatchController.deleteStockBatch(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:stockBatch:getStockSummary", async (_event) => {
  try {
    const result = await stockBatchController.getStockSummary();
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:stockBatch:getInventoryItems", async (_event, pagination, limit = 10) => {
  try {
    const result = await stockBatchController.getInventoryItems(pagination, limit);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:supplier:createSupplier", async (_event, input) => {
  try {
    const result = await supplierController.createSupplier(input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:supplier:getSupplier", async (_event, id) => {
  try {
    const result = await supplierController.getSupplier(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:supplier:getAllSuppliers", async (_event) => {
  try {
    const result = await supplierController.getAllSuppliers();
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:supplier:updateSupplier", async (_event, id, input) => {
  try {
    const result = await supplierController.updateSupplier(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:supplier:deleteSupplier", async (_event, id) => {
  try {
    const result = await supplierController.deleteSupplier(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:supplier:getSupplierTransactions", async (_event, id) => {
  try {
    const result = await supplierController.getSupplierTransactions(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:transactionCategory:createTransactionCategory", async (_event, input) => {
  try {
    const result = await transactionCategoryController.createTransactionCategory(input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:transactionCategory:getTransactionCategory", async (_event, id) => {
  try {
    const result = await transactionCategoryController.getTransactionCategory(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:transactionCategory:getAllTransactionCategorys", async (_event) => {
  try {
    const result = await transactionCategoryController.getAllTransactionCategorys();
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:transactionCategory:updateTransactionCategory", async (_event, id, input) => {
  try {
    const result = await transactionCategoryController.updateTransactionCategory(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:transactionCategory:deleteTransactionCategory", async (_event, id) => {
  try {
    const result = await transactionCategoryController.deleteTransactionCategory(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:transaction:list", async (_event, filters, pagination) => {
  try {
    const result = await transactionController.listFinancialTransactions(filters, pagination);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:transaction:getDetails", async (_event, id) => {
  try {
    const result = await transactionController.getFinancialTransactionDetails(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:transaction:createFinancial", async (_event, input) => {
  try {
    const result = await transactionController.createFinancialTransaction(input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:transaction:cancel", async (_event, id, reason) => {
  try {
    const result = await transactionController.cancelFinancialTransaction(id, reason);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:transaction:getSummary", async (_event, filters) => {
  try {
    const result = await transactionController.getFinancialTransactionsSummary(filters);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:user:createUser", async (_event, input) => {
  try {
    const result = await userController.createUser(input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:user:getUser", async (_event, id) => {
  try {
    const result = await userController.getUser(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:user:getAllUsers", async (_event) => {
  try {
    const result = await userController.getAllUsers();
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:user:updateUser", async (_event, id, input) => {
  try {
    const result = await userController.updateUser(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:user:deleteUser", async (_event, id) => {
  try {
    const result = await userController.deleteUser(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:worker:createWorker", async (_event, input) => {
  try {
    const result = await workerController.createWorker(input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:worker:getWorker", async (_event, id) => {
  try {
    const result = await workerController.getWorker(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:worker:getAllWorkers", async (_event) => {
  try {
    const result = await workerController.getAllWorkers();
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:worker:updateWorker", async (_event, id, input) => {
  try {
    const result = await workerController.updateWorker(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:worker:deleteWorker", async (_event, id) => {
  try {
    const result = await workerController.deleteWorker(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:worker:recordPayment", async (_event, input) => {
  try {
    const result = await workerController.recordWorkerPayment(input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:worker:reversePayment", async (_event, paymentId, reason) => {
  try {
    const result = await workerController.reverseWorkerPayment(paymentId, reason);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:worker:getPayments", async (_event, workerId) => {
  try {
    const result = await workerController.getWorkerPayments(workerId);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
const __dirname$1 = path$1.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path$1.join(__dirname$1, "../..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path$1.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path$1.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path$1.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: "نظام محاسبة أسواق المزارعين",
    webPreferences: {
      preload: path$1.join(__dirname$1, "../preload/preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send(
      "main-process-message",
      (/* @__PURE__ */ new Date()).toLocaleString()
    );
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path$1.join(RENDERER_DIST, "index.html"));
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
    let licenseStatus = LicenseManager$1.validateLicense();
    while (!licenseStatus.valid) {
      const response = await dialog.showMessageBox({
        type: "error",
        title: "Activation Required",
        message: `${licenseStatus.message}

Your Device ID is: ${licenseStatus.deviceId}`,
        buttons: ["Import License File", "Exit Application"],
        defaultId: 0,
        cancelId: 1
      });
      if (response.response === 0) {
        const importPath = await dialog.showOpenDialog({
          title: "Select License File",
          filters: [{ name: "License Files", extensions: ["dat"] }],
          properties: ["openFile"]
        });
        if (!importPath.canceled && importPath.filePaths.length > 0) {
          const result = LicenseManager$1.importLicense(importPath.filePaths[0]);
          if (result.success) {
            dialog.showMessageBoxSync({ type: "info", title: "Activated", message: "License imported successfully! Application will now start." });
            licenseStatus = { valid: true, message: "Success" };
          } else {
            dialog.showMessageBoxSync({ type: "error", title: "Import Failed", message: `Invalid license file:
${result.error}` });
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
    const { initDatabase } = await import("./dbmanager-BHH6RASS.js");
    await initDatabase();
    console.log("Database initialized successfully from electron/main.ts");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    app.quit();
    return;
  }
  try {
    const { createRequire: createRequire2 } = await import("node:module");
    const require2 = createRequire2(import.meta.url);
    const backupController2 = require2(path$1.join(__dirname$1, "../../src/controllers/backupController.js"));
    setInterval(() => {
      backupController2.runAutoBackupCycle().catch(console.error);
    }, 60 * 60 * 1e3);
    backupController2.runAutoBackupCycle().catch(console.error);
  } catch (error) {
    console.error("Failed to start auto-backup service:", error);
  }
  try {
    const { createRequire: createRequire2 } = await import("node:module");
    const require2 = createRequire2(import.meta.url);
    const backupController2 = require2(path$1.join(__dirname$1, "../../src/controllers/backupController.js"));
    setInterval(() => {
      backupController2.runAutoBackupCycle().catch(console.error);
    }, 60 * 60 * 1e3);
    backupController2.runAutoBackupCycle().catch(console.error);
  } catch (error) {
    console.error("Failed to start auto-backup service:", error);
  }
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
