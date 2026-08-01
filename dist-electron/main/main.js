import { ipcMain, app, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createRequire } from "node:module";
const require$1 = createRequire(import.meta.url);
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$2 = path.dirname(__filename$1);
function success(data) {
  return { success: true, data };
}
function failure(code, message, details) {
  return { success: false, error: { code, message, details } };
}
const activityLogController = require$1(path.join(__dirname$2, "../../src/controllers", "activityLogController.js"));
const cashboxController = require$1(path.join(__dirname$2, "../../src/controllers", "cashboxController.js"));
const cashboxTransactionController = require$1(path.join(__dirname$2, "../../src/controllers", "cashboxTransactionController.js"));
const customerController = require$1(path.join(__dirname$2, "../../src/controllers", "customerController.js"));
const paymentController = require$1(path.join(__dirname$2, "../../src/controllers", "paymentController.js"));
const productController = require$1(path.join(__dirname$2, "../../src/controllers", "productController.js"));
const purchaseInvoiceController = require$1(path.join(__dirname$2, "../../src/controllers", "purchaseInvoiceController.js"));
const purchaseInvoiceItemController = require$1(path.join(__dirname$2, "../../src/controllers", "purchaseInvoiceItemController.js"));
const saleInvoiceController = require$1(path.join(__dirname$2, "../../src/controllers", "saleInvoiceController.js"));
const saleInvoiceItemController = require$1(path.join(__dirname$2, "../../src/controllers", "saleInvoiceItemController.js"));
const saleTypeController = require$1(path.join(__dirname$2, "../../src/controllers", "saleTypeController.js"));
const settingController = require$1(path.join(__dirname$2, "../../src/controllers", "settingController.js"));
const stockAdjustmentController = require$1(path.join(__dirname$2, "../../src/controllers", "stockAdjustmentController.js"));
const stockBatchController = require$1(path.join(__dirname$2, "../../src/controllers", "stockBatchController.js"));
const supplierController = require$1(path.join(__dirname$2, "../../src/controllers", "supplierController.js"));
const transactionCategoryController = require$1(path.join(__dirname$2, "../../src/controllers", "transactionCategoryController.js"));
const transactionController = require$1(path.join(__dirname$2, "../../src/controllers", "transactionController.js"));
const userController = require$1(path.join(__dirname$2, "../../src/controllers", "userController.js"));
ipcMain.handle("api:system:getAppInfo", async () => {
  try {
    const databasePath = path.join(app.getPath("userData"), "farmer-market.db");
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
ipcMain.handle("api:activityLog:createActivityLog", async (_event, input) => {
  try {
    const result = await activityLogController.createActivityLog(input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:activityLog:getActivityLog", async (_event, id) => {
  try {
    const result = await activityLogController.getActivityLog(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:activityLog:getAllActivityLogs", async (_event) => {
  try {
    const result = await activityLogController.getAllActivityLogs();
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:activityLog:updateActivityLog", async (_event, id, input) => {
  try {
    const result = await activityLogController.updateActivityLog(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:activityLog:deleteActivityLog", async (_event, id) => {
  try {
    const result = await activityLogController.deleteActivityLog(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
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
ipcMain.handle("api:cashbox:transfer", async (_event, from_id, to_id, amount, date, notes) => {
  try {
    const result = await cashboxController.transfer(from_id, to_id, amount, date, notes);
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
ipcMain.handle("api:cashboxTransaction:createCashboxTransaction", async (_event, input) => {
  try {
    const result = await cashboxTransactionController.createCashboxTransaction(input);
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
ipcMain.handle("api:cashboxTransaction:updateCashboxTransaction", async (_event, id, input) => {
  try {
    const result = await cashboxTransactionController.updateCashboxTransaction(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:cashboxTransaction:deleteCashboxTransaction", async (_event, id) => {
  try {
    const result = await cashboxTransactionController.deleteCashboxTransaction(id);
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
ipcMain.handle("api:payment:createPayment", async (_event, input) => {
  try {
    const result = await paymentController.createPayment(input);
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
ipcMain.handle("api:payment:updatePayment", async (_event, id, input) => {
  try {
    const result = await paymentController.updatePayment(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:payment:deletePayment", async (_event, id) => {
  try {
    const result = await paymentController.deletePayment(id);
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
ipcMain.handle("api:purchaseInvoice:createPurchaseInvoice", async (_event, input) => {
  try {
    const result = await purchaseInvoiceController.createPurchaseInvoice(input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:purchaseInvoice:createFullPurchaseInvoice", async (_event, input, items) => {
  try {
    const result = await purchaseInvoiceController.createFullPurchaseInvoice(input, items);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:purchaseInvoice:getPurchaseInvoice", async (_event, id) => {
  try {
    const result = await purchaseInvoiceController.getPurchaseInvoice(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:purchaseInvoice:getAllPurchaseInvoices", async (_event) => {
  try {
    const result = await purchaseInvoiceController.getAllPurchaseInvoices();
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:purchaseInvoice:updatePurchaseInvoice", async (_event, id, input) => {
  try {
    const result = await purchaseInvoiceController.updatePurchaseInvoice(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:purchaseInvoice:deletePurchaseInvoice", async (_event, id) => {
  try {
    const result = await purchaseInvoiceController.deletePurchaseInvoice(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:purchaseInvoice:getPurchaseInvoiceSalesDetails", async (_event, id) => {
  try {
    const result = await purchaseInvoiceController.getPurchaseInvoiceSalesDetails(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:purchaseInvoice:closeCommissionInvoice", async (_event, id, input) => {
  try {
    const result = await purchaseInvoiceController.closeCommissionInvoice(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:purchaseInvoiceItem:createPurchaseInvoiceItem", async (_event, input) => {
  try {
    const result = await purchaseInvoiceItemController.createPurchaseInvoiceItem(input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:purchaseInvoiceItem:getPurchaseInvoiceItem", async (_event, id) => {
  try {
    const result = await purchaseInvoiceItemController.getPurchaseInvoiceItem(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:purchaseInvoiceItem:getAllPurchaseInvoiceItems", async (_event) => {
  try {
    const result = await purchaseInvoiceItemController.getAllPurchaseInvoiceItems();
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:purchaseInvoiceItem:updatePurchaseInvoiceItem", async (_event, id, input) => {
  try {
    const result = await purchaseInvoiceItemController.updatePurchaseInvoiceItem(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:purchaseInvoiceItem:deletePurchaseInvoiceItem", async (_event, id) => {
  try {
    const result = await purchaseInvoiceItemController.deletePurchaseInvoiceItem(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:saleInvoice:createSaleInvoice", async (_event, input) => {
  try {
    const result = await saleInvoiceController.createSaleInvoice(input);
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
ipcMain.handle("api:saleInvoice:getAllSaleInvoices", async (_event) => {
  try {
    const result = await saleInvoiceController.getAllSaleInvoices();
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:saleInvoice:updateSaleInvoice", async (_event, id, input) => {
  try {
    const result = await saleInvoiceController.updateSaleInvoice(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:saleInvoice:deleteSaleInvoice", async (_event, id) => {
  try {
    const result = await saleInvoiceController.deleteSaleInvoice(id);
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
ipcMain.handle("api:saleInvoice:createSaleProcess", async (_event, input) => {
  try {
    const result = await saleInvoiceController.createSaleProcess(input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:saleInvoiceItem:createSaleInvoiceItem", async (_event, input) => {
  try {
    const result = await saleInvoiceItemController.createSaleInvoiceItem(input);
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
ipcMain.handle("api:saleInvoiceItem:updateSaleInvoiceItem", async (_event, id, input) => {
  try {
    const result = await saleInvoiceItemController.updateSaleInvoiceItem(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:saleInvoiceItem:deleteSaleInvoiceItem", async (_event, id) => {
  try {
    const result = await saleInvoiceItemController.deleteSaleInvoiceItem(id);
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
ipcMain.handle("api:transaction:createTransaction", async (_event, input) => {
  try {
    const result = await transactionController.createTransaction(input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:transaction:getTransaction", async (_event, id) => {
  try {
    const result = await transactionController.getTransaction(id);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:transaction:getAllTransactions", async (_event) => {
  try {
    const result = await transactionController.getAllTransactions();
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:transaction:updateTransaction", async (_event, id, input) => {
  try {
    const result = await transactionController.updateTransaction(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || "UNKNOWN_ERROR", e.message || "Unknown error", e.details);
  }
});
ipcMain.handle("api:transaction:deleteTransaction", async (_event, id) => {
  try {
    const result = await transactionController.deleteTransaction(id);
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
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "../..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    title: "نظام محاسبة أسواق المزارعين",
    webPreferences: {
      preload: path.join(__dirname$1, "../preload/preload.mjs"),
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
    const { initDatabase } = await import("./dbmanager-Jx8JBaII.js");
    await initDatabase();
    console.log("Database initialized successfully from electron/main.ts");
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
