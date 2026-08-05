"use strict";
const electron = require("electron");
async function invokeApi(channel, ...args) {
  const response = await electron.ipcRenderer.invoke(
    channel,
    ...args
  );
  if (!response || response.success !== true) {
    const payload = response == null ? void 0 : response.error;
    const error = new Error(
      (payload == null ? void 0 : payload.message) || "حدث خطأ غير متوقع أثناء تنفيذ العملية."
    );
    error.code = (payload == null ? void 0 : payload.code) || "UNKNOWN_ERROR";
    error.details = payload == null ? void 0 : payload.details;
    throw error;
  }
  return response.data;
}
const crudApi = (entity, methodNames) => ({
  create: (input) => invokeApi(`api:${entity}:${methodNames.create}`, input),
  get: (id) => invokeApi(`api:${entity}:${methodNames.get}`, id),
  list: () => invokeApi(`api:${entity}:${methodNames.list}`),
  update: (id, input) => invokeApi(`api:${entity}:${methodNames.update}`, id, input),
  remove: (id) => invokeApi(`api:${entity}:${methodNames.remove}`, id)
});
const stockliteApi = {
  printDocuments: {
    payment: (id) => invokeApi("api:print:payment", id),
    transaction: (id) => invokeApi("api:print:transaction", id),
    transfer: (id) => invokeApi("api:print:transfer", id),
    customerStatement: (id) => invokeApi("api:print:customerStatement", id),
    supplierStatement: (id) => invokeApi("api:print:supplierStatement", id),
    cashboxStatement: (id) => invokeApi("api:print:cashboxStatement", id),
    consignment: (id) => invokeApi("api:print:consignment", id)
  },
  dashboard: { get: () => invokeApi("api:dashboard:get") },
  auth: {
    login: (input) => invokeApi("api:auth:login", input),
    logout: () => invokeApi("api:auth:logout"),
    getCurrentUser: () => invokeApi("api:auth:getCurrentUser"),
    changePassword: (input) => invokeApi("api:auth:changePassword", input)
  },
  system: {
    getAppInfo: () => invokeApi("api:system:getAppInfo"),
    backup: (destinationPath) => invokeApi("api:system:backup", destinationPath),
    restore: (sourcePath) => invokeApi("api:system:restore", sourcePath),
    getAutoBackupConfig: () => invokeApi("api:system:getAutoBackupConfig"),
    setAutoBackupConfig: (input) => invokeApi("api:system:setAutoBackupConfig", input),
    selectDirectory: () => invokeApi("api:system:selectDirectory"),
    selectSaveFile: () => invokeApi("api:system:selectSaveFile"),
    selectOpenFile: () => invokeApi("api:system:selectOpenFile")
  },
  products: {
    ...crudApi("product", {
      create: "createProduct",
      get: "getProduct",
      list: "getAllProducts",
      update: "updateProduct",
      remove: "deleteProduct"
    }),
    adjustStock: (productId, input) => invokeApi("api:product:adjustProductStock", productId, input),
    getWithStock: (productId) => invokeApi("api:product:getProductWithStock", productId)
  },
  customers: crudApi("customer", {
    create: "createCustomer",
    get: "getCustomer",
    list: "getAllCustomers",
    update: "updateCustomer",
    remove: "deleteCustomer"
  }),
  suppliers: {
    ...crudApi("supplier", {
      create: "createSupplier",
      get: "getSupplier",
      list: "getAllSuppliers",
      update: "updateSupplier",
      remove: "deleteSupplier"
    }),
    getTransactions: (id) => invokeApi("api:supplier:getSupplierTransactions", id)
  },
  stockBatches: {
    ...crudApi("stockBatch", {
      create: "createStockBatch",
      get: "getStockBatch",
      list: "getAllStockBatchs",
      update: "updateStockBatch",
      remove: "deleteStockBatch"
    }),
    summary: () => invokeApi("api:stockBatch:getStockSummary"),
    inventoryItems: (pagination) => invokeApi("api:stockBatch:getInventoryItems", pagination)
  },
  stockAdjustments: crudApi("stockAdjustment", {
    create: "createStockAdjustment",
    get: "getStockAdjustment",
    list: "getAllStockAdjustments",
    update: "updateStockAdjustment",
    remove: "deleteStockAdjustment"
  }),
  cashboxes: {
    create: (input) => invokeApi("api:cashbox:createCashbox", input),
    get: (id) => invokeApi("api:cashbox:getCashbox", id),
    list: () => invokeApi("api:cashbox:getAllCashboxs"),
    update: (id, input) => invokeApi("api:cashbox:updateCashbox", id, input),
    remove: (id) => invokeApi("api:cashbox:deleteCashbox", id),
    summary: () => invokeApi("api:cashbox:getCashboxesSummary"),
    getDetails: (id) => invokeApi("api:cashbox:getDetails", id),
    movements: (cashboxId, filters) => invokeApi("api:cashbox:getMovements", cashboxId, filters),
    createMovement: (input) => invokeApi("api:cashbox:createMovement", input),
    transfer: (input) => invokeApi("api:cashbox:transferBetween", input),
    reverseMovement: (transactionId, reason) => invokeApi("api:cashbox:reverseMovement", transactionId, reason),
    reverseTransfer: (transferGroupId, reason) => invokeApi("api:cashbox:reverseTransfer", transferGroupId, reason)
  },
  // cashboxTransactions: read-only access retained for diagnostic/admin purposes.
  // IMPORTANT: create/update/remove are intentionally excluded — all balance-changing
  // operations must go through the cashboxes business API above.
  cashboxTransactions: {
    get: (id) => invokeApi("api:cashboxTransaction:getCashboxTransaction", id),
    list: () => invokeApi("api:cashboxTransaction:getAllCashboxTransactions")
  },
  payments: {
    get: (id) => invokeApi("api:payment:getPayment", id),
    list: () => invokeApi("api:payment:getAllPayments"),
    listForSale: (invoiceId) => invokeApi("api:payment:getSalePayments", invoiceId),
    listForPurchase: (invoiceId) => invokeApi("api:payment:getPurchasePayments", invoiceId),
    recordSale: (input) => invokeApi("api:payment:recordSalePayment", input),
    recordPurchase: (input) => invokeApi("api:payment:recordPurchasePayment", input),
    reverseSale: (paymentId, reason) => invokeApi("api:payment:reverseSalePayment", paymentId, reason),
    reversePurchase: (paymentId, reason) => invokeApi("api:payment:reversePurchasePayment", paymentId, reason)
  },
  purchases: {
    list: (filters, pagination) => invokeApi("api:purchase:list", filters, pagination),
    getDetails: (id) => invokeApi("api:purchase:getDetails", id),
    createFull: (input) => invokeApi("api:purchase:createFull", input),
    cancel: (id, reason) => invokeApi("api:purchase:cancel", id, reason),
    recordPayment: (input) => invokeApi("api:purchase:recordPayment", input),
    reversePayment: (paymentId, reason) => invokeApi("api:purchase:reversePayment", paymentId, reason),
    deleteDraft: (id) => invokeApi("api:purchase:deleteDraft", id),
    getSalesDetails: (id) => invokeApi("api:purchase:getSalesDetails", id),
    getConsignmentSummary: (id) => invokeApi("api:purchase:getConsignmentSummary", id),
    previewConsignmentClosing: (id, input) => invokeApi("api:purchase:previewConsignmentClosing", id, input),
    closeCommission: (id, input) => invokeApi("api:purchase:closeCommission", id, input),
    getConsignmentSettlement: (id) => invokeApi("api:purchase:getConsignmentSettlement", id),
    reverseConsignmentSettlement: (id, reason) => invokeApi("api:purchase:reverseConsignmentSettlement", id, reason),
    // Read-only legacy methods
    get: (id) => invokeApi("api:purchase:get", id),
    getAll: () => invokeApi("api:purchase:getAll")
  },
  saleInvoices: {
    get: (id) => invokeApi("api:saleInvoice:getSaleInvoice", id),
    list: () => invokeApi("api:saleInvoice:getAllSaleInvoices"),
    listFiltered: (filters, pagination) => invokeApi("api:saleInvoice:listSaleInvoices", filters, pagination),
    getDetails: (id) => invokeApi("api:saleInvoice:getSaleInvoiceDetails", id),
    getFull: (id) => invokeApi("api:saleInvoice:getFullSaleInvoice", id),
    createProcess: (input) => invokeApi("api:saleInvoice:createSaleProcess", input),
    cancel: (id, reason) => invokeApi("api:saleInvoice:cancelSaleInvoice", id, reason),
    deleteDraft: (id) => invokeApi("api:saleInvoice:deleteDraftSaleInvoice", id),
    availableBatches: (productId) => invokeApi("api:saleInvoice:getAvailableBatches", productId)
  },
  saleTypes: crudApi("saleType", {
    create: "createSaleType",
    get: "getSaleType",
    list: "getAllSaleTypes",
    update: "updateSaleType",
    remove: "deleteSaleType"
  }),
  settings: crudApi("setting", {
    create: "createSetting",
    get: "getSetting",
    list: "getAllSettings",
    update: "updateSetting",
    remove: "deleteSetting"
  }),
  transactionCategories: crudApi("transactionCategory", {
    create: "createTransactionCategory",
    get: "getTransactionCategory",
    list: "getAllTransactionCategorys",
    update: "updateTransactionCategory",
    remove: "deleteTransactionCategory"
  }),
  transactions: {
    list: (filters, pagination) => invokeApi("api:transaction:list", filters, pagination),
    getDetails: (id) => invokeApi("api:transaction:getDetails", id),
    createFinancial: (input) => invokeApi("api:transaction:createFinancial", input),
    cancel: (id, reason) => invokeApi("api:transaction:cancel", id, reason),
    summary: (filters) => invokeApi("api:transaction:getSummary", filters)
  },
  activityLogs: {
    list: (filters, pagination) => invokeApi("api:activityLog:list", filters, pagination),
    get: (id) => invokeApi("api:activityLog:get", id),
    options: () => invokeApi("api:activityLog:options")
  },
  notifications: {
    list: (input) => invokeApi("api:notification:list", input),
    count: () => invokeApi("api:notification:count"),
    markRead: (id) => invokeApi("api:notification:markRead", id),
    markAllRead: () => invokeApi("api:notification:markAllRead"),
    dismiss: (id) => invokeApi("api:notification:dismiss", id)
  }
};
electron.contextBridge.exposeInMainWorld("stockliteApi", stockliteApi);
