// @ts-nocheck
import { app, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function success(data) {
  return { success: true, data };
}
function failure(code, message, details) {
  return { success: false, error: { code, message, details } };
}

const activityLogController = require(path.join(__dirname, '../../src/controllers', 'activityLogController.js'));
const cashboxController = require(path.join(__dirname, '../../src/controllers', 'cashboxController.js'));
const cashboxTransactionController = require(path.join(__dirname, '../../src/controllers', 'cashboxTransactionController.js'));
const customerController = require(path.join(__dirname, '../../src/controllers', 'customerController.js'));
const paymentController = require(path.join(__dirname, '../../src/controllers', 'paymentController.js'));
const productController = require(path.join(__dirname, '../../src/controllers', 'productController.js'));
const purchaseInvoiceController = require(path.join(__dirname, '../../src/controllers', 'purchaseInvoiceController.js'));
const purchaseInvoiceItemController = require(path.join(__dirname, '../../src/controllers', 'purchaseInvoiceItemController.js'));
const saleInvoiceController = require(path.join(__dirname, '../../src/controllers', 'saleInvoiceController.js'));
const saleInvoiceItemController = require(path.join(__dirname, '../../src/controllers', 'saleInvoiceItemController.js'));
const saleTypeController = require(path.join(__dirname, '../../src/controllers', 'saleTypeController.js'));
const settingController = require(path.join(__dirname, '../../src/controllers', 'settingController.js'));
const stockAdjustmentController = require(path.join(__dirname, '../../src/controllers', 'stockAdjustmentController.js'));
const stockBatchController = require(path.join(__dirname, '../../src/controllers', 'stockBatchController.js'));
const supplierController = require(path.join(__dirname, '../../src/controllers', 'supplierController.js'));
const transactionCategoryController = require(path.join(__dirname, '../../src/controllers', 'transactionCategoryController.js'));
const transactionController = require(path.join(__dirname, '../../src/controllers', 'transactionController.js'));
const userController = require(path.join(__dirname, '../../src/controllers', 'userController.js'));


/**
 * Endpoint: api:system:getAppInfo
 * Description: Returns runtime and application information for the About page.
 */
ipcMain.handle('api:system:getAppInfo', async () => {
  try {
    const databasePath = path.join(app.getPath('userData'), 'farmer-market.db');

    return success({
      appName: 'StockLite',
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron || '',
      nodeVersion: process.versions.node || '',
      chromiumVersion: process.versions.chrome || '',
      databaseEngine: 'SQLite',
      databasePath,
      platform: process.platform,
      architecture: process.arch,
      environment: app.isPackaged ? 'production' : 'development',
    });
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:activityLog:createActivityLog
 * Description: Executes createActivityLog on activityLogController.
 * Usage: Invoked by frontend to perform createActivityLog operation.
 */
ipcMain.handle('api:activityLog:createActivityLog', async (_event, input) => {
  try {
    const result = await activityLogController.createActivityLog(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:activityLog:getActivityLog
 * Description: Executes getActivityLog on activityLogController.
 * Usage: Invoked by frontend to perform getActivityLog operation.
 */
ipcMain.handle('api:activityLog:getActivityLog', async (_event, id) => {
  try {
    const result = await activityLogController.getActivityLog(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:activityLog:getAllActivityLogs
 * Description: Executes getAllActivityLogs on activityLogController.
 * Usage: Invoked by frontend to perform getAllActivityLogs operation.
 */
ipcMain.handle('api:activityLog:getAllActivityLogs', async (_event) => {
  try {
    const result = await activityLogController.getAllActivityLogs();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:activityLog:updateActivityLog
 * Description: Executes updateActivityLog on activityLogController.
 * Usage: Invoked by frontend to perform updateActivityLog operation.
 */
ipcMain.handle('api:activityLog:updateActivityLog', async (_event, id, input) => {
  try {
    const result = await activityLogController.updateActivityLog(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:activityLog:deleteActivityLog
 * Description: Executes deleteActivityLog on activityLogController.
 * Usage: Invoked by frontend to perform deleteActivityLog operation.
 */
ipcMain.handle('api:activityLog:deleteActivityLog', async (_event, id) => {
  try {
    const result = await activityLogController.deleteActivityLog(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:cashbox:createCashbox
 * Description: Executes createCashbox on cashboxController.
 * Usage: Invoked by frontend to perform createCashbox operation.
 */
ipcMain.handle('api:cashbox:createCashbox', async (_event, input) => {
  try {
    const result = await cashboxController.createCashbox(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:cashbox:getCashbox
 * Description: Executes getCashbox on cashboxController.
 * Usage: Invoked by frontend to perform getCashbox operation.
 */
ipcMain.handle('api:cashbox:getCashbox', async (_event, id) => {
  try {
    const result = await cashboxController.getCashbox(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:cashbox:getAllCashboxs
 * Description: Executes getAllCashboxs on cashboxController.
 * Usage: Invoked by frontend to perform getAllCashboxs operation.
 */
ipcMain.handle('api:cashbox:getAllCashboxs', async (_event) => {
  try {
    const result = await cashboxController.getAllCashboxs();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:cashbox:getCashboxesSummary
 * Description: Executes getCashboxesSummary on cashboxController.
 * Usage: Invoked by frontend to perform getCashboxesSummary operation.
 */
ipcMain.handle('api:cashbox:getCashboxesSummary', async (_event) => {
  try {
    const result = await cashboxController.getCashboxesSummary();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:cashbox:reverseTransfer
 * Description: Atomically reverses both sides of a transfer using its transfer_group_id.
 * This is the only safe way to reverse a transfer movement.
 */
ipcMain.handle('api:cashbox:reverseTransfer', async (_event, transferGroupId, reason) => {
  try {
    const result = await cashboxController.reverseCashboxTransfer(transferGroupId, reason);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:cashbox:updateCashbox
 * Description: Executes updateCashbox on cashboxController.
 * Usage: Invoked by frontend to perform updateCashbox operation.
 */
ipcMain.handle('api:cashbox:updateCashbox', async (_event, id, input) => {
  try {
    const result = await cashboxController.updateCashbox(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:cashbox:getDetails
 * Description: Returns cashbox data plus total_in, total_out, movement_count, recent_movements.
 */
ipcMain.handle('api:cashbox:getDetails', async (_event, id) => {
  try {
    const result = await cashboxController.getCashboxDetails(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:cashbox:getMovements
 * Description: Returns paginated, filtered cashbox_transactions for a cashbox.
 */
ipcMain.handle('api:cashbox:getMovements', async (_event, cashboxId, filters) => {
  try {
    const result = await cashboxController.getCashboxMovements(cashboxId, filters);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:cashbox:createMovement
 * Description: Creates a manual income/expense movement and atomically updates cashbox balance.
 */
ipcMain.handle('api:cashbox:createMovement', async (_event, input) => {
  try {
    const result = await cashboxController.createCashboxMovement(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:cashbox:transferBetween
 * Description: Transfers between two cashboxes using object-based input with full validation.
 */
ipcMain.handle('api:cashbox:transferBetween', async (_event, input) => {
  try {
    const result = await cashboxController.transferBetweenCashboxes(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:cashbox:reverseMovement
 * Description: Reverses an approved movement by creating an opposite movement.
 */
ipcMain.handle('api:cashbox:reverseMovement', async (_event, transactionId, reason) => {
  try {
    const result = await cashboxController.reverseCashboxMovement(transactionId, reason);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:cashbox:deleteCashbox
 * Description: Hard-deletes a cashbox only if it has zero balance and no linked records.
 */
ipcMain.handle('api:cashbox:deleteCashbox', async (_event, id) => {
  try {
    const result = await cashboxController.deleteCashbox(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:cashboxTransaction:getCashboxTransaction
 * Description: Read-only. Returns a single cashbox transaction by ID.
 * NOTE: Create/Update/Delete of cashbox transactions is intentionally removed from
 * the renderer-accessible API. All balance-changing operations must use the
 * dedicated cashboxes business API (createMovement, transfer, reverseMovement, etc.).
 */
ipcMain.handle('api:cashboxTransaction:getCashboxTransaction', async (_event, id) => {
  try {
    const result = await cashboxTransactionController.getCashboxTransaction(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:cashboxTransaction:getAllCashboxTransactions
 * Description: Read-only. Returns all cashbox transactions.
 */
ipcMain.handle('api:cashboxTransaction:getAllCashboxTransactions', async (_event) => {
  try {
    const result = await cashboxTransactionController.getAllCashboxTransactions();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:customer:createCustomer
 * Description: Executes createCustomer on customerController.
 * Usage: Invoked by frontend to perform createCustomer operation.
 */
ipcMain.handle('api:customer:createCustomer', async (_event, input) => {
  try {
    const result = await customerController.createCustomer(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:customer:getCustomer
 * Description: Executes getCustomer on customerController.
 * Usage: Invoked by frontend to perform getCustomer operation.
 */
ipcMain.handle('api:customer:getCustomer', async (_event, id) => {
  try {
    const result = await customerController.getCustomer(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:customer:getAllCustomers
 * Description: Executes getAllCustomers on customerController.
 * Usage: Invoked by frontend to perform getAllCustomers operation.
 */
ipcMain.handle('api:customer:getAllCustomers', async (_event) => {
  try {
    const result = await customerController.getAllCustomers();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:customer:updateCustomer
 * Description: Executes updateCustomer on customerController.
 * Usage: Invoked by frontend to perform updateCustomer operation.
 */
ipcMain.handle('api:customer:updateCustomer', async (_event, id, input) => {
  try {
    const result = await customerController.updateCustomer(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:customer:deleteCustomer
 * Description: Executes deleteCustomer on customerController.
 * Usage: Invoked by frontend to perform deleteCustomer operation.
 */
ipcMain.handle('api:customer:deleteCustomer', async (_event, id) => {
  try {
    const result = await customerController.deleteCustomer(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:payment:getPayment
 * Description: Read-only. Returns a single payment by ID.
 */
ipcMain.handle('api:payment:getPayment', async (_event, id) => {
  try {
    const result = await paymentController.getPayment(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:payment:getAllPayments
 * Description: Read-only. Returns all payments.
 */
ipcMain.handle('api:payment:getAllPayments', async (_event) => {
  try {
    const result = await paymentController.getAllPayments();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:payment:getSalePayments
 * Description: Returns all active payments for a sale invoice.
 */
ipcMain.handle('api:payment:getSalePayments', async (_event, invoiceId) => {
  try {
    const result = await paymentController.getSalePayments(invoiceId);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:payment:getPurchasePayments
 * Description: Returns all active payments for a purchase invoice.
 */
ipcMain.handle('api:payment:getPurchasePayments', async (_event, invoiceId) => {
  try {
    const result = await paymentController.getPurchasePayments(invoiceId);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:payment:recordSalePayment
 * Description: Atomically records a sale payment: cashbox balance in, customer balance out, invoice status updated.
 */
ipcMain.handle('api:payment:recordSalePayment', async (_event, input) => {
  try {
    const result = await paymentController.recordSalePayment(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:payment:recordPurchasePayment
 * Description: Atomically records a purchase payment: cashbox balance out, supplier balance out, invoice status updated.
 */
ipcMain.handle('api:payment:recordPurchasePayment', async (_event, input) => {
  try {
    const result = await paymentController.recordPurchasePayment(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:payment:reverseSalePayment
 * Description: Reverses a sale payment: creates opposite cashbox movement, restores balances.
 */
ipcMain.handle('api:payment:reverseSalePayment', async (_event, paymentId, reason) => {
  try {
    const result = await paymentController.reverseSalePayment(paymentId, reason);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:payment:reversePurchasePayment
 * Description: Reverses a purchase payment: creates opposite cashbox movement, restores balances.
 */
ipcMain.handle('api:payment:reversePurchasePayment', async (_event, paymentId, reason) => {
  try {
    const result = await paymentController.reversePurchasePayment(paymentId, reason);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:product:createProduct
 * Description: Executes createProduct on productController.
 * Usage: Invoked by frontend to perform createProduct operation.
 */
ipcMain.handle('api:product:createProduct', async (_event, input) => {
  try {
    const result = await productController.createProduct(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:product:getProduct
 * Description: Executes getProduct on productController.
 * Usage: Invoked by frontend to perform getProduct operation.
 */
ipcMain.handle('api:product:getProduct', async (_event, id) => {
  try {
    const result = await productController.getProduct(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:product:getAllProducts
 * Description: Executes getAllProducts on productController.
 * Usage: Invoked by frontend to perform getAllProducts operation.
 */
ipcMain.handle('api:product:getAllProducts', async (_event) => {
  try {
    const result = await productController.getAllProducts();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:product:updateProduct
 * Description: Executes updateProduct on productController.
 * Usage: Invoked by frontend to perform updateProduct operation.
 */
ipcMain.handle('api:product:updateProduct', async (_event, id, input) => {
  try {
    const result = await productController.updateProduct(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:product:deleteProduct
 * Description: Executes deleteProduct on productController.
 * Usage: Invoked by frontend to perform deleteProduct operation.
 */
ipcMain.handle('api:product:deleteProduct', async (_event, id) => {
  try {
    const result = await productController.deleteProduct(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:product:adjustProductStock
 * Description: Executes adjustProductStock on productController.
 * Usage: Invoked by frontend to perform adjustProductStock operation.
 */
ipcMain.handle('api:product:adjustProductStock', async (_event, id, input) => {
  try {
    const result = await productController.adjustProductStock(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:product:getProductWithStock
 * Description: Executes getProductWithStock on productController.
 * Usage: Invoked by frontend to perform getProductWithStock operation.
 */
ipcMain.handle('api:product:getProductWithStock', async (_event, id) => {
  try {
    const result = await productController.getProductWithStock(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchaseInvoice:createFullPurchaseInvoice
 * Description: Atomically creates a full purchase invoice with items, batches, stock movements, supplier balance, and optional payment.
 */
ipcMain.handle('api:purchaseInvoice:createFullPurchaseInvoice', async (_event, input) => {
  try {
    const result = await purchaseInvoiceController.createFullPurchaseInvoice(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchaseInvoice:getPurchaseInvoice
 * Description: Read-only. Returns a single purchase invoice row.
 */
ipcMain.handle('api:purchaseInvoice:getPurchaseInvoice', async (_event, id) => {
  try {
    const result = await purchaseInvoiceController.getPurchaseInvoice(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchaseInvoice:getPurchaseInvoiceDetails
 * Description: Returns enriched purchase invoice with supplier, items, payments, financial summary.
 */
ipcMain.handle('api:purchaseInvoice:getPurchaseInvoiceDetails', async (_event, id) => {
  try {
    const result = await purchaseInvoiceController.getPurchaseInvoiceDetails(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchaseInvoice:listPurchaseInvoices
 * Description: Returns paginated, filtered purchase invoices.
 */
ipcMain.handle('api:purchaseInvoice:listPurchaseInvoices', async (_event, filters, pagination) => {
  try {
    const result = await purchaseInvoiceController.listPurchaseInvoices(filters, pagination);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchaseInvoice:getAllPurchaseInvoices
 * Description: Read-only. Returns all purchase invoices (legacy).
 */
ipcMain.handle('api:purchaseInvoice:getAllPurchaseInvoices', async (_event) => {
  try {
    const result = await purchaseInvoiceController.getAllPurchaseInvoices();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchaseInvoice:cancelPurchaseInvoice
 * Description: Atomically cancels a purchase invoice: verifies no stock consumed, reverses payments, restores batches and supplier balance.
 */
ipcMain.handle('api:purchaseInvoice:cancelPurchaseInvoice', async (_event, id, reason) => {
  try {
    const result = await purchaseInvoiceController.cancelPurchaseInvoice(id, reason);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchaseInvoice:deleteDraftPurchaseInvoice
 * Description: Hard-deletes a draft invoice only if it has no payments or stock batches.
 */
ipcMain.handle('api:purchaseInvoice:deleteDraftPurchaseInvoice', async (_event, id) => {
  try {
    const result = await purchaseInvoiceController.deleteDraftPurchaseInvoice(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchaseInvoice:getPurchaseInvoiceSalesDetails
 * Description: Returns sales activity on batches from a purchase invoice.
 */
ipcMain.handle('api:purchaseInvoice:getPurchaseInvoiceSalesDetails', async (_event, id) => {
  try {
    const result = await purchaseInvoiceController.getPurchaseInvoiceSalesDetails(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchaseInvoice:closeCommissionInvoice
 * Description: Closes a consignment invoice, settles supplier share, adjusts remaining stock.
 */
ipcMain.handle('api:purchaseInvoice:closeCommissionInvoice', async (_event, id, input) => {
  try {
    const result = await purchaseInvoiceController.closeCommissionInvoice(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchaseInvoiceItem:createPurchaseInvoiceItem
 * Description: Executes createPurchaseInvoiceItem on purchaseInvoiceItemController.
 * Usage: Invoked by frontend to perform createPurchaseInvoiceItem operation.
 */
ipcMain.handle('api:purchaseInvoiceItem:createPurchaseInvoiceItem', async (_event, input) => {
  try {
    const result = await purchaseInvoiceItemController.createPurchaseInvoiceItem(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchaseInvoiceItem:getPurchaseInvoiceItem
 * Description: Executes getPurchaseInvoiceItem on purchaseInvoiceItemController.
 * Usage: Invoked by frontend to perform getPurchaseInvoiceItem operation.
 */
ipcMain.handle('api:purchaseInvoiceItem:getPurchaseInvoiceItem', async (_event, id) => {
  try {
    const result = await purchaseInvoiceItemController.getPurchaseInvoiceItem(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchaseInvoiceItem:getAllPurchaseInvoiceItems
 * Description: Executes getAllPurchaseInvoiceItems on purchaseInvoiceItemController.
 * Usage: Invoked by frontend to perform getAllPurchaseInvoiceItems operation.
 */
ipcMain.handle('api:purchaseInvoiceItem:getAllPurchaseInvoiceItems', async (_event) => {
  try {
    const result = await purchaseInvoiceItemController.getAllPurchaseInvoiceItems();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchaseInvoiceItem:updatePurchaseInvoiceItem
 * Description: Executes updatePurchaseInvoiceItem on purchaseInvoiceItemController.
 * Usage: Invoked by frontend to perform updatePurchaseInvoiceItem operation.
 */
ipcMain.handle('api:purchaseInvoiceItem:updatePurchaseInvoiceItem', async (_event, id, input) => {
  try {
    const result = await purchaseInvoiceItemController.updatePurchaseInvoiceItem(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:purchaseInvoiceItem:deletePurchaseInvoiceItem
 * Description: Executes deletePurchaseInvoiceItem on purchaseInvoiceItemController.
 * Usage: Invoked by frontend to perform deletePurchaseInvoiceItem operation.
 */
ipcMain.handle('api:purchaseInvoiceItem:deletePurchaseInvoiceItem', async (_event, id) => {
  try {
    const result = await purchaseInvoiceItemController.deletePurchaseInvoiceItem(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleInvoice:createSaleProcess
 * Description: Atomically creates a sale invoice with items, stock deductions, customer balance, and optional payment.
 */
ipcMain.handle('api:saleInvoice:createSaleProcess', async (_event, input) => {
  try {
    const result = await saleInvoiceController.createSaleProcess(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleInvoice:getSaleInvoice
 * Description: Read-only. Returns a single sale invoice row.
 */
ipcMain.handle('api:saleInvoice:getSaleInvoice', async (_event, id) => {
  try {
    const result = await saleInvoiceController.getSaleInvoice(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleInvoice:getSaleInvoiceDetails
 * Description: Returns enriched sale invoice with customer, items, payments, financial summary.
 */
ipcMain.handle('api:saleInvoice:getSaleInvoiceDetails', async (_event, id) => {
  try {
    const result = await saleInvoiceController.getSaleInvoiceDetails(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleInvoice:listSaleInvoices
 * Description: Returns paginated, filtered sale invoices.
 */
ipcMain.handle('api:saleInvoice:listSaleInvoices', async (_event, filters, pagination) => {
  try {
    const result = await saleInvoiceController.listSaleInvoices(filters, pagination);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleInvoice:getAllSaleInvoices
 * Description: Read-only. Returns all sale invoices (legacy).
 */
ipcMain.handle('api:saleInvoice:getAllSaleInvoices', async (_event) => {
  try {
    const result = await saleInvoiceController.getAllSaleInvoices();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleInvoice:getFullSaleInvoice
 * Description: Returns full enriched sale invoice (alias for getSaleInvoiceDetails).
 */
ipcMain.handle('api:saleInvoice:getFullSaleInvoice', async (_event, id) => {
  try {
    const result = await saleInvoiceController.getFullSaleInvoice(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleInvoice:cancelSaleInvoice
 * Description: Atomically cancels a sale invoice: reverses payments, restores stock, reduces customer balance.
 */
ipcMain.handle('api:saleInvoice:cancelSaleInvoice', async (_event, id, reason) => {
  try {
    const result = await saleInvoiceController.cancelSaleInvoice(id, reason);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleInvoice:deleteDraftSaleInvoice
 * Description: Hard-deletes a draft sale invoice only if it has no payments.
 */
ipcMain.handle('api:saleInvoice:deleteDraftSaleInvoice', async (_event, id) => {
  try {
    const result = await saleInvoiceController.deleteDraftSaleInvoice(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleInvoice:getAvailableBatches
 * Description: Returns active stock batches with remaining quantity > 0 for a given product.
 */
ipcMain.handle('api:saleInvoice:getAvailableBatches', async (_event, productId) => {
  try {
    const result = await saleInvoiceController.getAvailableBatches(productId);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleInvoiceItem:createSaleInvoiceItem
 * Description: Executes createSaleInvoiceItem on saleInvoiceItemController.
 * Usage: Invoked by frontend to perform createSaleInvoiceItem operation.
 */
ipcMain.handle('api:saleInvoiceItem:createSaleInvoiceItem', async (_event, input) => {
  try {
    const result = await saleInvoiceItemController.createSaleInvoiceItem(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleInvoiceItem:getSaleInvoiceItem
 * Description: Executes getSaleInvoiceItem on saleInvoiceItemController.
 * Usage: Invoked by frontend to perform getSaleInvoiceItem operation.
 */
ipcMain.handle('api:saleInvoiceItem:getSaleInvoiceItem', async (_event, id) => {
  try {
    const result = await saleInvoiceItemController.getSaleInvoiceItem(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleInvoiceItem:getAllSaleInvoiceItems
 * Description: Executes getAllSaleInvoiceItems on saleInvoiceItemController.
 * Usage: Invoked by frontend to perform getAllSaleInvoiceItems operation.
 */
ipcMain.handle('api:saleInvoiceItem:getAllSaleInvoiceItems', async (_event) => {
  try {
    const result = await saleInvoiceItemController.getAllSaleInvoiceItems();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleInvoiceItem:updateSaleInvoiceItem
 * Description: Executes updateSaleInvoiceItem on saleInvoiceItemController.
 * Usage: Invoked by frontend to perform updateSaleInvoiceItem operation.
 */
ipcMain.handle('api:saleInvoiceItem:updateSaleInvoiceItem', async (_event, id, input) => {
  try {
    const result = await saleInvoiceItemController.updateSaleInvoiceItem(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleInvoiceItem:deleteSaleInvoiceItem
 * Description: Executes deleteSaleInvoiceItem on saleInvoiceItemController.
 * Usage: Invoked by frontend to perform deleteSaleInvoiceItem operation.
 */
ipcMain.handle('api:saleInvoiceItem:deleteSaleInvoiceItem', async (_event, id) => {
  try {
    const result = await saleInvoiceItemController.deleteSaleInvoiceItem(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleType:createSaleType
 * Description: Executes createSaleType on saleTypeController.
 * Usage: Invoked by frontend to perform createSaleType operation.
 */
ipcMain.handle('api:saleType:createSaleType', async (_event, input) => {
  try {
    const result = await saleTypeController.createSaleType(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleType:getSaleType
 * Description: Executes getSaleType on saleTypeController.
 * Usage: Invoked by frontend to perform getSaleType operation.
 */
ipcMain.handle('api:saleType:getSaleType', async (_event, id) => {
  try {
    const result = await saleTypeController.getSaleType(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleType:getAllSaleTypes
 * Description: Executes getAllSaleTypes on saleTypeController.
 * Usage: Invoked by frontend to perform getAllSaleTypes operation.
 */
ipcMain.handle('api:saleType:getAllSaleTypes', async (_event) => {
  try {
    const result = await saleTypeController.getAllSaleTypes();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleType:updateSaleType
 * Description: Executes updateSaleType on saleTypeController.
 * Usage: Invoked by frontend to perform updateSaleType operation.
 */
ipcMain.handle('api:saleType:updateSaleType', async (_event, id, input) => {
  try {
    const result = await saleTypeController.updateSaleType(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:saleType:deleteSaleType
 * Description: Executes deleteSaleType on saleTypeController.
 * Usage: Invoked by frontend to perform deleteSaleType operation.
 */
ipcMain.handle('api:saleType:deleteSaleType', async (_event, id) => {
  try {
    const result = await saleTypeController.deleteSaleType(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:setting:createSetting
 * Description: Executes createSetting on settingController.
 * Usage: Invoked by frontend to perform createSetting operation.
 */
ipcMain.handle('api:setting:createSetting', async (_event, input) => {
  try {
    const result = await settingController.createSetting(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:setting:getSetting
 * Description: Executes getSetting on settingController.
 * Usage: Invoked by frontend to perform getSetting operation.
 */
ipcMain.handle('api:setting:getSetting', async (_event, id) => {
  try {
    const result = await settingController.getSetting(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:setting:getAllSettings
 * Description: Executes getAllSettings on settingController.
 * Usage: Invoked by frontend to perform getAllSettings operation.
 */
ipcMain.handle('api:setting:getAllSettings', async (_event) => {
  try {
    const result = await settingController.getAllSettings();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:setting:updateSetting
 * Description: Executes updateSetting on settingController.
 * Usage: Invoked by frontend to perform updateSetting operation.
 */
ipcMain.handle('api:setting:updateSetting', async (_event, id, input) => {
  try {
    const result = await settingController.updateSetting(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:setting:deleteSetting
 * Description: Executes deleteSetting on settingController.
 * Usage: Invoked by frontend to perform deleteSetting operation.
 */
ipcMain.handle('api:setting:deleteSetting', async (_event, id) => {
  try {
    const result = await settingController.deleteSetting(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:stockAdjustment:createStockAdjustment
 * Description: Executes createStockAdjustment on stockAdjustmentController.
 * Usage: Invoked by frontend to perform createStockAdjustment operation.
 */
ipcMain.handle('api:stockAdjustment:createStockAdjustment', async (_event, input) => {
  try {
    const result = await stockAdjustmentController.createStockAdjustment(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:stockAdjustment:getStockAdjustment
 * Description: Executes getStockAdjustment on stockAdjustmentController.
 * Usage: Invoked by frontend to perform getStockAdjustment operation.
 */
ipcMain.handle('api:stockAdjustment:getStockAdjustment', async (_event, id) => {
  try {
    const result = await stockAdjustmentController.getStockAdjustment(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:stockAdjustment:getAllStockAdjustments
 * Description: Executes getAllStockAdjustments on stockAdjustmentController.
 * Usage: Invoked by frontend to perform getAllStockAdjustments operation.
 */
ipcMain.handle('api:stockAdjustment:getAllStockAdjustments', async (_event) => {
  try {
    const result = await stockAdjustmentController.getAllStockAdjustments();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:stockAdjustment:updateStockAdjustment
 * Description: Executes updateStockAdjustment on stockAdjustmentController.
 * Usage: Invoked by frontend to perform updateStockAdjustment operation.
 */
ipcMain.handle('api:stockAdjustment:updateStockAdjustment', async (_event, id, input) => {
  try {
    const result = await stockAdjustmentController.updateStockAdjustment(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:stockAdjustment:deleteStockAdjustment
 * Description: Executes deleteStockAdjustment on stockAdjustmentController.
 * Usage: Invoked by frontend to perform deleteStockAdjustment operation.
 */
ipcMain.handle('api:stockAdjustment:deleteStockAdjustment', async (_event, id) => {
  try {
    const result = await stockAdjustmentController.deleteStockAdjustment(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:stockBatch:createStockBatch
 * Description: Executes createStockBatch on stockBatchController.
 * Usage: Invoked by frontend to perform createStockBatch operation.
 */
ipcMain.handle('api:stockBatch:createStockBatch', async (_event, input) => {
  try {
    const result = await stockBatchController.createStockBatch(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:stockBatch:getStockBatch
 * Description: Executes getStockBatch on stockBatchController.
 * Usage: Invoked by frontend to perform getStockBatch operation.
 */
ipcMain.handle('api:stockBatch:getStockBatch', async (_event, id) => {
  try {
    const result = await stockBatchController.getStockBatch(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:stockBatch:getAllStockBatchs
 * Description: Executes getAllStockBatchs on stockBatchController.
 * Usage: Invoked by frontend to perform getAllStockBatchs operation.
 */
ipcMain.handle('api:stockBatch:getAllStockBatchs', async (_event) => {
  try {
    const result = await stockBatchController.getAllStockBatchs();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:stockBatch:updateStockBatch
 * Description: Executes updateStockBatch on stockBatchController.
 * Usage: Invoked by frontend to perform updateStockBatch operation.
 */
ipcMain.handle('api:stockBatch:updateStockBatch', async (_event, id, input) => {
  try {
    const result = await stockBatchController.updateStockBatch(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:stockBatch:deleteStockBatch
 * Description: Executes deleteStockBatch on stockBatchController.
 * Usage: Invoked by frontend to perform deleteStockBatch operation.
 */
ipcMain.handle('api:stockBatch:deleteStockBatch', async (_event, id) => {
  try {
    const result = await stockBatchController.deleteStockBatch(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:stockBatch:getStockSummary
 * Description: Executes getStockSummary on stockBatchController.
 * Usage: Invoked by frontend to perform getStockSummary operation.
 */
ipcMain.handle('api:stockBatch:getStockSummary', async (_event) => {
  try {
    const result = await stockBatchController.getStockSummary();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:stockBatch:getInventoryItems
 * Description: Executes getInventoryItems on stockBatchController.
 * Usage: Invoked by frontend to perform getInventoryItems operation.
 */
ipcMain.handle('api:stockBatch:getInventoryItems', async (_event, pagination, limit = 10) => {
  try {
    const result = await stockBatchController.getInventoryItems(pagination, limit);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:supplier:createSupplier
 * Description: Executes createSupplier on supplierController.
 * Usage: Invoked by frontend to perform createSupplier operation.
 */
ipcMain.handle('api:supplier:createSupplier', async (_event, input) => {
  try {
    const result = await supplierController.createSupplier(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:supplier:getSupplier
 * Description: Executes getSupplier on supplierController.
 * Usage: Invoked by frontend to perform getSupplier operation.
 */
ipcMain.handle('api:supplier:getSupplier', async (_event, id) => {
  try {
    const result = await supplierController.getSupplier(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:supplier:getAllSuppliers
 * Description: Executes getAllSuppliers on supplierController.
 * Usage: Invoked by frontend to perform getAllSuppliers operation.
 */
ipcMain.handle('api:supplier:getAllSuppliers', async (_event) => {
  try {
    const result = await supplierController.getAllSuppliers();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:supplier:updateSupplier
 * Description: Executes updateSupplier on supplierController.
 * Usage: Invoked by frontend to perform updateSupplier operation.
 */
ipcMain.handle('api:supplier:updateSupplier', async (_event, id, input) => {
  try {
    const result = await supplierController.updateSupplier(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:supplier:deleteSupplier
 * Description: Executes deleteSupplier on supplierController.
 * Usage: Invoked by frontend to perform deleteSupplier operation.
 */
ipcMain.handle('api:supplier:deleteSupplier', async (_event, id) => {
  try {
    const result = await supplierController.deleteSupplier(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:supplier:getSupplierTransactions
 * Description: Executes getSupplierTransactions on supplierController.
 * Usage: Invoked by frontend to perform getSupplierTransactions operation.
 */
ipcMain.handle('api:supplier:getSupplierTransactions', async (_event, id) => {
  try {
    const result = await supplierController.getSupplierTransactions(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:transactionCategory:createTransactionCategory
 * Description: Executes createTransactionCategory on transactionCategoryController.
 * Usage: Invoked by frontend to perform createTransactionCategory operation.
 */
ipcMain.handle('api:transactionCategory:createTransactionCategory', async (_event, input) => {
  try {
    const result = await transactionCategoryController.createTransactionCategory(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:transactionCategory:getTransactionCategory
 * Description: Executes getTransactionCategory on transactionCategoryController.
 * Usage: Invoked by frontend to perform getTransactionCategory operation.
 */
ipcMain.handle('api:transactionCategory:getTransactionCategory', async (_event, id) => {
  try {
    const result = await transactionCategoryController.getTransactionCategory(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:transactionCategory:getAllTransactionCategorys
 * Description: Executes getAllTransactionCategorys on transactionCategoryController.
 * Usage: Invoked by frontend to perform getAllTransactionCategorys operation.
 */
ipcMain.handle('api:transactionCategory:getAllTransactionCategorys', async (_event) => {
  try {
    const result = await transactionCategoryController.getAllTransactionCategorys();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:transactionCategory:updateTransactionCategory
 * Description: Executes updateTransactionCategory on transactionCategoryController.
 * Usage: Invoked by frontend to perform updateTransactionCategory operation.
 */
ipcMain.handle('api:transactionCategory:updateTransactionCategory', async (_event, id, input) => {
  try {
    const result = await transactionCategoryController.updateTransactionCategory(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:transactionCategory:deleteTransactionCategory
 * Description: Executes deleteTransactionCategory on transactionCategoryController.
 * Usage: Invoked by frontend to perform deleteTransactionCategory operation.
 */
ipcMain.handle('api:transactionCategory:deleteTransactionCategory', async (_event, id) => {
  try {
    const result = await transactionCategoryController.deleteTransactionCategory(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:transaction:createTransaction
 * Description: Executes createTransaction on transactionController.
 * Usage: Invoked by frontend to perform createTransaction operation.
 */
ipcMain.handle('api:transaction:createTransaction', async (_event, input) => {
  try {
    const result = await transactionController.createTransaction(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:transaction:getTransaction
 * Description: Executes getTransaction on transactionController.
 * Usage: Invoked by frontend to perform getTransaction operation.
 */
ipcMain.handle('api:transaction:getTransaction', async (_event, id) => {
  try {
    const result = await transactionController.getTransaction(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:transaction:getAllTransactions
 * Description: Executes getAllTransactions on transactionController.
 * Usage: Invoked by frontend to perform getAllTransactions operation.
 */
ipcMain.handle('api:transaction:getAllTransactions', async (_event) => {
  try {
    const result = await transactionController.getAllTransactions();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:transaction:updateTransaction
 * Description: Executes updateTransaction on transactionController.
 * Usage: Invoked by frontend to perform updateTransaction operation.
 */
ipcMain.handle('api:transaction:updateTransaction', async (_event, id, input) => {
  try {
    const result = await transactionController.updateTransaction(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:transaction:deleteTransaction
 * Description: Executes deleteTransaction on transactionController.
 * Usage: Invoked by frontend to perform deleteTransaction operation.
 */
ipcMain.handle('api:transaction:deleteTransaction', async (_event, id) => {
  try {
    const result = await transactionController.deleteTransaction(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:user:createUser
 * Description: Executes createUser on userController.
 * Usage: Invoked by frontend to perform createUser operation.
 */
ipcMain.handle('api:user:createUser', async (_event, input) => {
  try {
    const result = await userController.createUser(input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:user:getUser
 * Description: Executes getUser on userController.
 * Usage: Invoked by frontend to perform getUser operation.
 */
ipcMain.handle('api:user:getUser', async (_event, id) => {
  try {
    const result = await userController.getUser(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:user:getAllUsers
 * Description: Executes getAllUsers on userController.
 * Usage: Invoked by frontend to perform getAllUsers operation.
 */
ipcMain.handle('api:user:getAllUsers', async (_event) => {
  try {
    const result = await userController.getAllUsers();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:user:updateUser
 * Description: Executes updateUser on userController.
 * Usage: Invoked by frontend to perform updateUser operation.
 */
ipcMain.handle('api:user:updateUser', async (_event, id, input) => {
  try {
    const result = await userController.updateUser(id, input);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

/**
 * Endpoint: api:user:deleteUser
 * Description: Executes deleteUser on userController.
 * Usage: Invoked by frontend to perform deleteUser operation.
 */
ipcMain.handle('api:user:deleteUser', async (_event, id) => {
  try {
    const result = await userController.deleteUser(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

