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
  auth: {
    login: (input) => invokeApi("api:auth:login", input),
    logout: () => invokeApi("api:auth:logout"),
    getCurrentUser: () => invokeApi("api:auth:getCurrentUser"),
    changePassword: (input) => invokeApi("api:auth:changePassword", input)
  },
  system: {
    getAppInfo: () => invokeApi("api:system:getAppInfo")
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
  purchaseInvoices: {
    get: (id) => invokeApi("api:purchaseInvoice:getPurchaseInvoice", id),
    list: () => invokeApi("api:purchaseInvoice:getAllPurchaseInvoices"),
    listFiltered: (filters, pagination) => invokeApi("api:purchaseInvoice:listPurchaseInvoices", filters, pagination),
    getDetails: (id) => invokeApi("api:purchaseInvoice:getPurchaseInvoiceDetails", id),
    createFull: (input) => invokeApi("api:purchaseInvoice:createFullPurchaseInvoice", input),
    cancel: (id, reason) => invokeApi("api:purchaseInvoice:cancelPurchaseInvoice", id, reason),
    deleteDraft: (id) => invokeApi("api:purchaseInvoice:deleteDraftPurchaseInvoice", id),
    getSalesDetails: (id) => invokeApi("api:purchaseInvoice:getPurchaseInvoiceSalesDetails", id),
    closeCommission: (id, input) => invokeApi("api:purchaseInvoice:closeCommissionInvoice", id, input)
  },
  purchaseInvoiceItems: crudApi("purchaseInvoiceItem", {
    create: "createPurchaseInvoiceItem",
    get: "getPurchaseInvoiceItem",
    list: "getAllPurchaseInvoiceItems",
    update: "updatePurchaseInvoiceItem",
    remove: "deletePurchaseInvoiceItem"
  }),
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
  saleInvoiceItems: crudApi("saleInvoiceItem", {
    create: "createSaleInvoiceItem",
    get: "getSaleInvoiceItem",
    list: "getAllSaleInvoiceItems",
    update: "updateSaleInvoiceItem",
    remove: "deleteSaleInvoiceItem"
  }),
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
  transactions: crudApi("transaction", {
    create: "createTransaction",
    get: "getTransaction",
    list: "getAllTransactions",
    update: "updateTransaction",
    remove: "deleteTransaction"
  }),
  activityLogs: crudApi("activityLog", {
    create: "createActivityLog",
    get: "getActivityLog",
    list: "getAllActivityLogs",
    update: "updateActivityLog",
    remove: "deleteActivityLog"
  })
};
electron.contextBridge.exposeInMainWorld("stockliteApi", stockliteApi);
