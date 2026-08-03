import { contextBridge, ipcRenderer } from "electron";

type ApiErrorPayload = {
  code?: string;
  message?: string;
  details?: unknown;
};

type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error?: ApiErrorPayload };

async function invokeApi<T>(
  channel: string,
  ...args: unknown[]
): Promise<T> {
  const response = (await ipcRenderer.invoke(
    channel,
    ...args,
  )) as ApiResponse<T>;

  if (!response || response.success !== true) {
    const payload = response?.error;
    const error = new Error(
      payload?.message || "حدث خطأ غير متوقع أثناء تنفيذ العملية.",
    ) as Error & {
      code?: string;
      details?: unknown;
    };

    error.code = payload?.code || "UNKNOWN_ERROR";
    error.details = payload?.details;
    throw error;
  }

  return response.data;
}

const crudApi = (entity: string, methodNames: {
  create: string;
  get: string;
  list: string;
  update: string;
  remove: string;
}) => ({
  create: (input: unknown) =>
    invokeApi(`api:${entity}:${methodNames.create}`, input),
  get: (id: number) =>
    invokeApi(`api:${entity}:${methodNames.get}`, id),
  list: () =>
    invokeApi(`api:${entity}:${methodNames.list}`),
  update: (id: number, input: unknown) =>
    invokeApi(`api:${entity}:${methodNames.update}`, id, input),
  remove: (id: number) =>
    invokeApi(`api:${entity}:${methodNames.remove}`, id),
});

const stockliteApi = {
  auth: {
    login: (input: { username: string; password: string }) =>
      invokeApi("api:auth:login", input),
    logout: () => invokeApi("api:auth:logout"),
    getCurrentUser: () => invokeApi("api:auth:getCurrentUser"),
    changePassword: (input: { currentPassword: string; newPassword: string }) =>
      invokeApi("api:auth:changePassword", input),
  },
  system: {
    getAppInfo: () =>
      invokeApi("api:system:getAppInfo"),
  },
  products: {
    ...crudApi("product", {
      create: "createProduct",
      get: "getProduct",
      list: "getAllProducts",
      update: "updateProduct",
      remove: "deleteProduct",
    }),
    adjustStock: (productId: number, input: unknown) =>
      invokeApi("api:product:adjustProductStock", productId, input),
    getWithStock: (productId: number) =>
      invokeApi("api:product:getProductWithStock", productId),
  },

  customers: crudApi("customer", {
    create: "createCustomer",
    get: "getCustomer",
    list: "getAllCustomers",
    update: "updateCustomer",
    remove: "deleteCustomer",
  }),

  suppliers: {
    ...crudApi("supplier", {
      create: "createSupplier",
      get: "getSupplier",
      list: "getAllSuppliers",
      update: "updateSupplier",
      remove: "deleteSupplier",
    }),
    getTransactions: (id: number) =>
      invokeApi("api:supplier:getSupplierTransactions", id),
  },

  stockBatches: {
    ...crudApi("stockBatch", {
      create: "createStockBatch",
      get: "getStockBatch",
      list: "getAllStockBatchs",
      update: "updateStockBatch",
      remove: "deleteStockBatch",
    }),
    summary: () =>
      invokeApi("api:stockBatch:getStockSummary"),
    inventoryItems: (pagination?: { page?: number; limit?: number }) =>
      invokeApi("api:stockBatch:getInventoryItems", pagination),
  },

  stockAdjustments: crudApi("stockAdjustment", {
    create: "createStockAdjustment",
    get: "getStockAdjustment",
    list: "getAllStockAdjustments",
    update: "updateStockAdjustment",
    remove: "deleteStockAdjustment",
  }),

  cashboxes: {
    create: (input: unknown) =>
      invokeApi("api:cashbox:createCashbox", input),
    get: (id: number) =>
      invokeApi("api:cashbox:getCashbox", id),
    list: () =>
      invokeApi("api:cashbox:getAllCashboxs"),
    update: (id: number, input: unknown) =>
      invokeApi("api:cashbox:updateCashbox", id, input),
    remove: (id: number) =>
      invokeApi("api:cashbox:deleteCashbox", id),
    summary: () =>
      invokeApi("api:cashbox:getCashboxesSummary"),
    getDetails: (id: number) =>
      invokeApi("api:cashbox:getDetails", id),
    movements: (cashboxId: number, filters?: unknown) =>
      invokeApi("api:cashbox:getMovements", cashboxId, filters),
    createMovement: (input: unknown) =>
      invokeApi("api:cashbox:createMovement", input),
    transfer: (input: unknown) =>
      invokeApi("api:cashbox:transferBetween", input),
    reverseMovement: (transactionId: number, reason: string) =>
      invokeApi("api:cashbox:reverseMovement", transactionId, reason),
    reverseTransfer: (transferGroupId: string, reason: string) =>
      invokeApi("api:cashbox:reverseTransfer", transferGroupId, reason),
  },

  // cashboxTransactions: read-only access retained for diagnostic/admin purposes.
  // IMPORTANT: create/update/remove are intentionally excluded — all balance-changing
  // operations must go through the cashboxes business API above.
  cashboxTransactions: {
    get: (id: number) =>
      invokeApi("api:cashboxTransaction:getCashboxTransaction", id),
    list: () =>
      invokeApi("api:cashboxTransaction:getAllCashboxTransactions"),
  },

  payments: crudApi("payment", {
    create: "createPayment",
    get: "getPayment",
    list: "getAllPayments",
    update: "updatePayment",
    remove: "deletePayment",
  }),

  purchaseInvoices: {
    ...crudApi("purchaseInvoice", {
      create: "createPurchaseInvoice",
      get: "getPurchaseInvoice",
      list: "getAllPurchaseInvoices",
      update: "updatePurchaseInvoice",
      remove: "deletePurchaseInvoice",
    }),
    createFull: (input: unknown) =>
      invokeApi("api:purchaseInvoice:createFullPurchaseInvoice", input),
    getSalesDetails: (id: number) =>
      invokeApi("api:purchaseInvoice:getPurchaseInvoiceSalesDetails", id),
    closeCommission: (id: number, input?: unknown) =>
      invokeApi("api:purchaseInvoice:closeCommissionInvoice", id, input),
  },

  purchaseInvoiceItems: crudApi("purchaseInvoiceItem", {
    create: "createPurchaseInvoiceItem",
    get: "getPurchaseInvoiceItem",
    list: "getAllPurchaseInvoiceItems",
    update: "updatePurchaseInvoiceItem",
    remove: "deletePurchaseInvoiceItem",
  }),

  saleInvoices: {
    ...crudApi("saleInvoice", {
      create: "createSaleInvoice",
      get: "getSaleInvoice",
      list: "getAllSaleInvoices",
      update: "updateSaleInvoice",
      remove: "deleteSaleInvoice",
    }),
    getFull: (id: number) =>
      invokeApi("api:saleInvoice:getFullSaleInvoice", id),
    createProcess: (input: unknown) =>
      invokeApi("api:saleInvoice:createSaleProcess", input),
  },

  saleInvoiceItems: crudApi("saleInvoiceItem", {
    create: "createSaleInvoiceItem",
    get: "getSaleInvoiceItem",
    list: "getAllSaleInvoiceItems",
    update: "updateSaleInvoiceItem",
    remove: "deleteSaleInvoiceItem",
  }),

  saleTypes: crudApi("saleType", {
    create: "createSaleType",
    get: "getSaleType",
    list: "getAllSaleTypes",
    update: "updateSaleType",
    remove: "deleteSaleType",
  }),

  settings: crudApi("setting", {
    create: "createSetting",
    get: "getSetting",
    list: "getAllSettings",
    update: "updateSetting",
    remove: "deleteSetting",
  }),

  transactionCategories: crudApi("transactionCategory", {
    create: "createTransactionCategory",
    get: "getTransactionCategory",
    list: "getAllTransactionCategorys",
    update: "updateTransactionCategory",
    remove: "deleteTransactionCategory",
  }),

  transactions: crudApi("transaction", {
    create: "createTransaction",
    get: "getTransaction",
    list: "getAllTransactions",
    update: "updateTransaction",
    remove: "deleteTransaction",
  }),

  activityLogs: crudApi("activityLog", {
    create: "createActivityLog",
    get: "getActivityLog",
    list: "getAllActivityLogs",
    update: "updateActivityLog",
    remove: "deleteActivityLog",
  }),
};

contextBridge.exposeInMainWorld("stockliteApi", stockliteApi);
