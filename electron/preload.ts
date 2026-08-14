import {
  contextBridge,
  ipcRenderer,
} from "electron";

type ApiErrorPayload = {
  code?: string;
  message?: string;
  details?: unknown;
  field?: string;
};

type ApiResponse<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error?: ApiErrorPayload;
    };

type StockLiteApiError = Error & {
  code?: string;
  details?: unknown;
  field?: string;
};

async function invokeApi<T>(
  channel: string,
  ...args: unknown[]
): Promise<T> {
  try {
    const response =
      (await ipcRenderer.invoke(
        channel,
        ...args,
      )) as ApiResponse<T>;

    if (
      response &&
      response.success === true
    ) {
      return response.data;
    }

    const payload =
      response?.error;

    const error =
      new Error(
        payload?.message ||
          "حدث خطأ غير متوقع أثناء تنفيذ العملية.",
      ) as StockLiteApiError;

    error.name =
      "StockLiteApiError";

    error.code =
      payload?.code ||
      "UNKNOWN_ERROR";

    error.details =
      payload?.details;

    error.field =
      payload?.field;

    throw error;
  } catch (error) {
    /*
     * Errors already created from the structured
     * backend response must pass through unchanged.
     */
    const current =
      error as StockLiteApiError;

    if (
      current?.name ===
      "StockLiteApiError"
    ) {
      throw current;
    }

    /*
     * ipcRenderer.invoke itself may reject.
     * Preserve as much information as possible.
     */
    const wrapped =
      new Error(
        current?.message ||
          "تعذر التواصل مع خدمة التطبيق الداخلية.",
      ) as StockLiteApiError;

    wrapped.name =
      "StockLiteApiError";

    wrapped.code =
      current?.code ||
      "IPC_ERROR";

    wrapped.details =
      current?.details;

    wrapped.field =
      current?.field;

    throw wrapped;
  }
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
  printDocuments: {
    payment: (id: number) => invokeApi("api:print:payment", id),
    transaction: (id: number) => invokeApi("api:print:transaction", id),
    transfer: (id: string) => invokeApi("api:print:transfer", id),
    customerStatement: (id: number) => invokeApi("api:print:customerStatement", id),
    supplierStatement: (id: number) => invokeApi("api:print:supplierStatement", id),
    cashboxStatement: (id: number) => invokeApi("api:print:cashboxStatement", id),
    consignment: (id: number) => invokeApi("api:print:consignment", id),
  },
  dashboard: { get: () => invokeApi("api:dashboard:get") },
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
    backup: (destinationPath: string) =>
      invokeApi("api:system:backup", destinationPath),
    restore: (sourcePath: string) =>
      invokeApi("api:system:restore", sourcePath),
    getAutoBackupConfig: () =>
      invokeApi("api:system:getAutoBackupConfig"),
    setAutoBackupConfig: (input: unknown) =>
      invokeApi("api:system:setAutoBackupConfig", input),
    selectDirectory: () =>
      invokeApi("api:system:selectDirectory"),
    selectSaveFile: () =>
      invokeApi("api:system:selectSaveFile"),
    selectOpenFile: () =>
      invokeApi("api:system:selectOpenFile"),
    saveCurrentPageAsPdf: (input?: { fileName?: string }) =>
      invokeApi("api:system:saveCurrentPageAsPdf", input),
  },
  license: {
    getDeviceId: () => invokeApi("api:license:getDeviceId"),
    getStatus: () => invokeApi("api:license:getStatus"),
    import: (sourcePath: string) => invokeApi("api:license:import", sourcePath),
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

  payments: {
    get: (id: number) =>
      invokeApi("api:payment:getPayment", id),
    list: () =>
      invokeApi("api:payment:getAllPayments"),
    listForSale: (invoiceId: number) =>
      invokeApi("api:payment:getSalePayments", invoiceId),
    listForPurchase: (invoiceId: number) =>
      invokeApi("api:payment:getPurchasePayments", invoiceId),
    recordSale: (input: unknown) =>
      invokeApi("api:payment:recordSalePayment", input),
    recordPurchase: (input: unknown) =>
      invokeApi("api:payment:recordPurchasePayment", input),
    reverseSale: (paymentId: number, reason: string) =>
      invokeApi("api:payment:reverseSalePayment", paymentId, reason),
    reversePurchase: (paymentId: number, reason: string) =>
      invokeApi("api:payment:reversePurchasePayment", paymentId, reason),
  },

  purchases: {
    list: (filters?: unknown, pagination?: unknown) =>
      invokeApi("api:purchase:list", filters, pagination),
    getDetails: (id: number) =>
      invokeApi("api:purchase:getDetails", id),
    createFull: (input: unknown) =>
      invokeApi("api:purchase:createFull", input),
    addItems: (invoiceId: number, items: unknown) =>
      invokeApi("api:purchase:addItems", invoiceId, items),
    cancel: (id: number, reason: string) =>
      invokeApi("api:purchase:cancel", id, reason),
    recordPayment: (input: unknown) =>
      invokeApi("api:purchase:recordPayment", input),
    reversePayment: (paymentId: number, reason: string) =>
      invokeApi("api:purchase:reversePayment", paymentId, reason),
    deleteDraft: (id: number) =>
      invokeApi("api:purchase:deleteDraft", id),
    getSalesDetails: (id: number) =>
      invokeApi("api:purchase:getSalesDetails", id),
    getConsignmentSummary: (id: number) =>
      invokeApi("api:purchase:getConsignmentSummary", id),
    previewConsignmentClosing: (id: number, input?: unknown) =>
      invokeApi("api:purchase:previewConsignmentClosing", id, input),
    closeCommission: (id: number, input?: unknown) =>
      invokeApi("api:purchase:closeCommission", id, input),
    getConsignmentSettlement: (id: number) =>
      invokeApi("api:purchase:getConsignmentSettlement", id),
    reverseConsignmentSettlement: (id: number, reason: string) =>
      invokeApi("api:purchase:reverseConsignmentSettlement", id, reason),
    // Read-only legacy methods
    get: (id: number) =>
      invokeApi("api:purchase:get", id),
    getAll: () =>
      invokeApi("api:purchase:getAll"),
  },

  saleInvoices: {
    get: (id: number) =>
      invokeApi("api:saleInvoice:getSaleInvoice", id),
    list: () =>
      invokeApi("api:saleInvoice:getAllSaleInvoices"),
    listFiltered: (filters?: unknown, pagination?: unknown) =>
      invokeApi("api:saleInvoice:listSaleInvoices", filters, pagination),
    getDetails: (id: number) =>
      invokeApi("api:saleInvoice:getSaleInvoiceDetails", id),
    getFull: (id: number) =>
      invokeApi("api:saleInvoice:getFullSaleInvoice", id),
    createProcess: (input: unknown) =>
      invokeApi("api:saleInvoice:createSaleProcess", input),
    cancel: (id: number, reason: string) =>
      invokeApi("api:saleInvoice:cancelSaleInvoice", id, reason),
    deleteDraft: (id: number) =>
      invokeApi("api:saleInvoice:deleteDraftSaleInvoice", id),
    availableBatches: (productId: number) =>
      invokeApi("api:saleInvoice:getAvailableBatches", productId),
  },

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

  transactions: {
    list: (filters?: unknown, pagination?: unknown) =>
      invokeApi("api:transaction:list", filters, pagination),
    getDetails: (id: number) =>
      invokeApi("api:transaction:getDetails", id),
    createFinancial: (input: unknown) =>
      invokeApi("api:transaction:createFinancial", input),
    cancel: (id: number, reason: string) =>
      invokeApi("api:transaction:cancel", id, reason),
    summary: (filters?: unknown) =>
      invokeApi("api:transaction:getSummary", filters),
  },

  reports: {
    options: () =>
      invokeApi("api:report:options"),
    generate: (input: unknown) =>
      invokeApi("api:report:generate", input),
    export: (input: unknown) =>
      invokeApi("api:report:export", input),
  },

  activityLogs: {
    list: (filters?: unknown, pagination?: unknown) => invokeApi("api:activityLog:list", filters, pagination),
    get: (id: number) => invokeApi("api:activityLog:get", id),
    options: () => invokeApi("api:activityLog:options"),
  },

  notifications: {
    list: (input?: unknown) => invokeApi("api:notification:list", input),
    count: () => invokeApi("api:notification:count"),
    markRead: (id: number) => invokeApi("api:notification:markRead", id),
    markAllRead: () => invokeApi("api:notification:markAllRead"),
    dismiss: (id: number) => invokeApi("api:notification:dismiss", id),
  },

  workers: {
    ...crudApi("worker", {
      create: "createWorker",
      get: "getWorker",
      list: "getAllWorkers",
      update: "updateWorker",
      remove: "deleteWorker",
    }),
    recordPayment: (input: unknown) =>
      invokeApi("api:worker:recordPayment", input),
    reversePayment: (paymentId: number, reason: string) =>
      invokeApi("api:worker:reversePayment", paymentId, reason),
    getPayments: (workerId: number) =>
      invokeApi("api:worker:getPayments", workerId),
  },
};

contextBridge.exposeInMainWorld("stockliteApi", stockliteApi);
