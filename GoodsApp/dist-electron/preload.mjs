"use strict";
const electron = require("electron");
const CONTROLLER_CHANNEL = "stocklite:controllers:invoke";
async function invokeController(controller, method, ...args) {
  const result = await electron.ipcRenderer.invoke(
    CONTROLLER_CHANNEL,
    controller,
    method,
    args
  );
  if (result.ok) return result.data;
  const error = new Error(result.error.message);
  error.name = result.error.name ?? "ControllerError";
  error.code = result.error.code;
  throw error;
}
const stockliteApi = {
  controllers: {
    invoke: invokeController
  },
  activityLogs: {
    create: (input) => invokeController("activityLog", "createActivityLog", input),
    get: (id) => invokeController("activityLog", "getActivityLog", id),
    list: () => invokeController("activityLog", "getAllActivityLogs"),
    update: (id, input) => invokeController("activityLog", "updateActivityLog", id, input),
    remove: (id) => invokeController("activityLog", "deleteActivityLog", id)
  },
  cashboxes: {
    create: (input) => invokeController("cashbox", "createCashbox", input),
    get: (id) => invokeController("cashbox", "getCashbox", id),
    list: () => invokeController("cashbox", "getAllCashboxs"),
    update: (id, input) => invokeController("cashbox", "updateCashbox", id, input),
    remove: (id) => invokeController("cashbox", "deleteCashbox", id)
  },
  cashboxTransactions: {
    create: (input) => invokeController("cashboxTransaction", "createCashboxTransaction", input),
    get: (id) => invokeController("cashboxTransaction", "getCashboxTransaction", id),
    list: () => invokeController("cashboxTransaction", "getAllCashboxTransactions"),
    update: (id, input) => invokeController("cashboxTransaction", "updateCashboxTransaction", id, input),
    remove: (id) => invokeController("cashboxTransaction", "deleteCashboxTransaction", id)
  },
  customers: {
    create: (input) => invokeController("customer", "createCustomer", input),
    get: (id) => invokeController("customer", "getCustomer", id),
    list: () => invokeController("customer", "getAllCustomers"),
    update: (id, input) => invokeController("customer", "updateCustomer", id, input),
    remove: (id) => invokeController("customer", "deleteCustomer", id)
  },
  payments: {
    create: (input) => invokeController("payment", "createPayment", input),
    get: (id) => invokeController("payment", "getPayment", id),
    list: () => invokeController("payment", "getAllPayments"),
    update: (id, input) => invokeController("payment", "updatePayment", id, input),
    remove: (id) => invokeController("payment", "deletePayment", id)
  },
  products: {
    create: (input) => invokeController("product", "createProduct", input),
    get: (id) => invokeController("product", "getProduct", id),
    list: () => invokeController("product", "getAllProducts"),
    update: (id, input) => invokeController("product", "updateProduct", id, input),
    remove: (id) => invokeController("product", "deleteProduct", id),
    listStock: (pagination) => invokeController("product", "listStockProducts", pagination),
    createStock: (input) => invokeController("product", "createStockProduct", input),
    updateStock: (id, input) => invokeController("product", "updateStockProduct", id, input),
    getWithStock: (id) => invokeController("product", "getProductWithStock", id)
  },
  purchaseInvoices: {
    create: (input) => invokeController("purchaseInvoice", "createPurchaseInvoice", input),
    createFull: (input) => invokeController("purchaseInvoice", "createFullPurchaseInvoice", input),
    get: (id) => invokeController("purchaseInvoice", "getPurchaseInvoice", id),
    list: () => invokeController("purchaseInvoice", "getAllPurchaseInvoices"),
    update: (id, input) => invokeController("purchaseInvoice", "updatePurchaseInvoice", id, input),
    remove: (id) => invokeController("purchaseInvoice", "deletePurchaseInvoice", id),
    getSalesDetails: (id) => invokeController("purchaseInvoice", "getPurchaseInvoiceSalesDetails", id),
    closeCommission: (id, input) => invokeController("purchaseInvoice", "closeCommissionInvoice", id, input)
  },
  purchaseInvoiceItems: {
    create: (input) => invokeController("purchaseInvoiceItem", "createPurchaseInvoiceItem", input),
    get: (id) => invokeController("purchaseInvoiceItem", "getPurchaseInvoiceItem", id),
    list: () => invokeController("purchaseInvoiceItem", "getAllPurchaseInvoiceItems"),
    update: (id, input) => invokeController("purchaseInvoiceItem", "updatePurchaseInvoiceItem", id, input),
    remove: (id) => invokeController("purchaseInvoiceItem", "deletePurchaseInvoiceItem", id)
  },
  saleInvoices: {
    create: (input) => invokeController("saleInvoice", "createSaleInvoice", input),
    get: (id) => invokeController("saleInvoice", "getSaleInvoice", id),
    list: () => invokeController("saleInvoice", "getAllSaleInvoices"),
    update: (id, input) => invokeController("saleInvoice", "updateSaleInvoice", id, input),
    remove: (id) => invokeController("saleInvoice", "deleteSaleInvoice", id),
    getFull: (id) => invokeController("saleInvoice", "getFullSaleInvoice", id),
    createProcess: (input) => invokeController("saleInvoice", "createSaleProcess", input)
  },
  saleInvoiceItems: {
    create: (input) => invokeController("saleInvoiceItem", "createSaleInvoiceItem", input),
    get: (id) => invokeController("saleInvoiceItem", "getSaleInvoiceItem", id),
    list: () => invokeController("saleInvoiceItem", "getAllSaleInvoiceItems"),
    update: (id, input) => invokeController("saleInvoiceItem", "updateSaleInvoiceItem", id, input),
    remove: (id) => invokeController("saleInvoiceItem", "deleteSaleInvoiceItem", id)
  },
  saleTypes: {
    create: (input) => invokeController("saleType", "createSaleType", input),
    get: (id) => invokeController("saleType", "getSaleType", id),
    list: () => invokeController("saleType", "getAllSaleTypes"),
    update: (id, input) => invokeController("saleType", "updateSaleType", id, input),
    remove: (id) => invokeController("saleType", "deleteSaleType", id)
  },
  settings: {
    create: (input) => invokeController("setting", "createSetting", input),
    get: (id) => invokeController("setting", "getSetting", id),
    list: () => invokeController("setting", "getAllSettings"),
    update: (id, input) => invokeController("setting", "updateSetting", id, input),
    remove: (id) => invokeController("setting", "deleteSetting", id)
  },
  stockAdjustments: {
    create: (input) => invokeController("stockAdjustment", "createStockAdjustment", input),
    get: (id) => invokeController("stockAdjustment", "getStockAdjustment", id),
    list: () => invokeController("stockAdjustment", "getAllStockAdjustments"),
    update: (id, input) => invokeController("stockAdjustment", "updateStockAdjustment", id, input),
    remove: (id) => invokeController("stockAdjustment", "deleteStockAdjustment", id)
  },
  stockBatches: {
    create: (input) => invokeController("stockBatch", "createStockBatch", input),
    get: (id) => invokeController("stockBatch", "getStockBatch", id),
    list: () => invokeController("stockBatch", "getAllStockBatchs"),
    update: (id, input) => invokeController("stockBatch", "updateStockBatch", id, input),
    remove: (id) => invokeController("stockBatch", "deleteStockBatch", id)
  },
  suppliers: {
    create: (input) => invokeController("supplier", "createSupplier", input),
    get: (id) => invokeController("supplier", "getSupplier", id),
    list: () => invokeController("supplier", "getAllSuppliers"),
    update: (id, input) => invokeController("supplier", "updateSupplier", id, input),
    remove: (id) => invokeController("supplier", "deleteSupplier", id)
  },
  transactionCategories: {
    create: (input) => invokeController("transactionCategory", "createTransactionCategory", input),
    get: (id) => invokeController("transactionCategory", "getTransactionCategory", id),
    list: () => invokeController("transactionCategory", "getAllTransactionCategorys"),
    update: (id, input) => invokeController("transactionCategory", "updateTransactionCategory", id, input),
    remove: (id) => invokeController("transactionCategory", "deleteTransactionCategory", id)
  },
  transactions: {
    create: (input) => invokeController("transaction", "createTransaction", input),
    get: (id) => invokeController("transaction", "getTransaction", id),
    list: () => invokeController("transaction", "getAllTransactions"),
    update: (id, input) => invokeController("transaction", "updateTransaction", id, input),
    remove: (id) => invokeController("transaction", "deleteTransaction", id)
  },
  users: {
    create: (input) => invokeController("user", "createUser", input),
    get: (id) => invokeController("user", "getUser", id),
    list: () => invokeController("user", "getAllUsers"),
    update: (id, input) => invokeController("user", "updateUser", id, input),
    remove: (id) => invokeController("user", "deleteUser", id)
  }
};
electron.contextBridge.exposeInMainWorld("stockliteApi", stockliteApi);
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on: (...args) => {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...values) => listener(event, ...values));
  },
  off: (...args) => electron.ipcRenderer.off(...args),
  send: (...args) => electron.ipcRenderer.send(...args),
  invoke: (...args) => electron.ipcRenderer.invoke(...args)
});
