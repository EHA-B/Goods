import { contextBridge, ipcRenderer } from 'electron';

const CONTROLLER_CHANNEL = 'stocklite:controllers:invoke';

type ControllerResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { name?: string; message: string; code?: string; stack?: string } };

async function invokeController<T>(controller: string, method: string, ...args: unknown[]): Promise<T> {
  const result = await ipcRenderer.invoke(
    CONTROLLER_CHANNEL,
    controller,
    method,
    args,
  ) as ControllerResult<T>;

  if (result.ok) return result.data;

  const error = new Error(result.error.message) as Error & { code?: string };
  error.name = result.error.name ?? 'ControllerError';
  error.code = result.error.code;
  throw error;
}

const stockliteApi = {
  controllers: {
    invoke: invokeController,
  },

  activityLogs: {
    create: (input: unknown) => invokeController('activityLog', 'createActivityLog', input),
    get: (id: number) => invokeController('activityLog', 'getActivityLog', id),
    list: () => invokeController('activityLog', 'getAllActivityLogs'),
    update: (id: number, input: unknown) => invokeController('activityLog', 'updateActivityLog', id, input),
    remove: (id: number) => invokeController('activityLog', 'deleteActivityLog', id),
  },

  cashboxes: {
    create: (input: unknown) => invokeController('cashbox', 'createCashbox', input),
    get: (id: number) => invokeController('cashbox', 'getCashbox', id),
    list: () => invokeController('cashbox', 'getAllCashboxs'),
    update: (id: number, input: unknown) => invokeController('cashbox', 'updateCashbox', id, input),
    remove: (id: number) => invokeController('cashbox', 'deleteCashbox', id),
  },

  cashboxTransactions: {
    create: (input: unknown) => invokeController('cashboxTransaction', 'createCashboxTransaction', input),
    get: (id: number) => invokeController('cashboxTransaction', 'getCashboxTransaction', id),
    list: () => invokeController('cashboxTransaction', 'getAllCashboxTransactions'),
    update: (id: number, input: unknown) => invokeController('cashboxTransaction', 'updateCashboxTransaction', id, input),
    remove: (id: number) => invokeController('cashboxTransaction', 'deleteCashboxTransaction', id),
  },

  customers: {
    create: (input: unknown) => invokeController('customer', 'createCustomer', input),
    get: (id: number) => invokeController('customer', 'getCustomer', id),
    list: () => invokeController('customer', 'getAllCustomers'),
    update: (id: number, input: unknown) => invokeController('customer', 'updateCustomer', id, input),
    remove: (id: number) => invokeController('customer', 'deleteCustomer', id),
  },

  payments: {
    create: (input: unknown) => invokeController('payment', 'createPayment', input),
    get: (id: number) => invokeController('payment', 'getPayment', id),
    list: () => invokeController('payment', 'getAllPayments'),
    update: (id: number, input: unknown) => invokeController('payment', 'updatePayment', id, input),
    remove: (id: number) => invokeController('payment', 'deletePayment', id),
  },

  products: {
    create: (input: unknown) => invokeController('product', 'createProduct', input),
    get: (id: number) => invokeController('product', 'getProduct', id),
    list: () => invokeController('product', 'getAllProducts'),
    update: (id: number, input: unknown) => invokeController('product', 'updateProduct', id, input),
    remove: (id: number) => invokeController('product', 'deleteProduct', id),
    listStock: (pagination?: { page?: number; limit?: number }) => invokeController('product', 'listStockProducts', pagination),
    createStock: (input: unknown) => invokeController('product', 'createStockProduct', input),
    updateStock: (id: number, input: unknown) => invokeController('product', 'updateStockProduct', id, input),
    getWithStock: (id: number) => invokeController('product', 'getProductWithStock', id),
  },

  purchaseInvoices: {
    create: (input: unknown) => invokeController('purchaseInvoice', 'createPurchaseInvoice', input),
    createFull: (input: unknown) => invokeController('purchaseInvoice', 'createFullPurchaseInvoice', input),
    get: (id: number) => invokeController('purchaseInvoice', 'getPurchaseInvoice', id),
    list: () => invokeController('purchaseInvoice', 'getAllPurchaseInvoices'),
    update: (id: number, input: unknown) => invokeController('purchaseInvoice', 'updatePurchaseInvoice', id, input),
    remove: (id: number) => invokeController('purchaseInvoice', 'deletePurchaseInvoice', id),
    getSalesDetails: (id: number) => invokeController('purchaseInvoice', 'getPurchaseInvoiceSalesDetails', id),
    closeCommission: (id: number, input?: unknown) => invokeController('purchaseInvoice', 'closeCommissionInvoice', id, input),
  },

  purchaseInvoiceItems: {
    create: (input: unknown) => invokeController('purchaseInvoiceItem', 'createPurchaseInvoiceItem', input),
    get: (id: number) => invokeController('purchaseInvoiceItem', 'getPurchaseInvoiceItem', id),
    list: () => invokeController('purchaseInvoiceItem', 'getAllPurchaseInvoiceItems'),
    update: (id: number, input: unknown) => invokeController('purchaseInvoiceItem', 'updatePurchaseInvoiceItem', id, input),
    remove: (id: number) => invokeController('purchaseInvoiceItem', 'deletePurchaseInvoiceItem', id),
  },

  saleInvoices: {
    create: (input: unknown) => invokeController('saleInvoice', 'createSaleInvoice', input),
    get: (id: number) => invokeController('saleInvoice', 'getSaleInvoice', id),
    list: () => invokeController('saleInvoice', 'getAllSaleInvoices'),
    update: (id: number, input: unknown) => invokeController('saleInvoice', 'updateSaleInvoice', id, input),
    remove: (id: number) => invokeController('saleInvoice', 'deleteSaleInvoice', id),
    getFull: (id: number) => invokeController('saleInvoice', 'getFullSaleInvoice', id),
    createProcess: (input: unknown) => invokeController('saleInvoice', 'createSaleProcess', input),
  },

  saleInvoiceItems: {
    create: (input: unknown) => invokeController('saleInvoiceItem', 'createSaleInvoiceItem', input),
    get: (id: number) => invokeController('saleInvoiceItem', 'getSaleInvoiceItem', id),
    list: () => invokeController('saleInvoiceItem', 'getAllSaleInvoiceItems'),
    update: (id: number, input: unknown) => invokeController('saleInvoiceItem', 'updateSaleInvoiceItem', id, input),
    remove: (id: number) => invokeController('saleInvoiceItem', 'deleteSaleInvoiceItem', id),
  },

  saleTypes: {
    create: (input: unknown) => invokeController('saleType', 'createSaleType', input),
    get: (id: number) => invokeController('saleType', 'getSaleType', id),
    list: () => invokeController('saleType', 'getAllSaleTypes'),
    update: (id: number, input: unknown) => invokeController('saleType', 'updateSaleType', id, input),
    remove: (id: number) => invokeController('saleType', 'deleteSaleType', id),
  },

  settings: {
    create: (input: unknown) => invokeController('setting', 'createSetting', input),
    get: (id: number) => invokeController('setting', 'getSetting', id),
    list: () => invokeController('setting', 'getAllSettings'),
    update: (id: number, input: unknown) => invokeController('setting', 'updateSetting', id, input),
    remove: (id: number) => invokeController('setting', 'deleteSetting', id),
  },

  stockAdjustments: {
    create: (input: unknown) => invokeController('stockAdjustment', 'createStockAdjustment', input),
    get: (id: number) => invokeController('stockAdjustment', 'getStockAdjustment', id),
    list: () => invokeController('stockAdjustment', 'getAllStockAdjustments'),
    update: (id: number, input: unknown) => invokeController('stockAdjustment', 'updateStockAdjustment', id, input),
    remove: (id: number) => invokeController('stockAdjustment', 'deleteStockAdjustment', id),
  },

  stockBatches: {
    create: (input: unknown) => invokeController('stockBatch', 'createStockBatch', input),
    get: (id: number) => invokeController('stockBatch', 'getStockBatch', id),
    list: () => invokeController('stockBatch', 'getAllStockBatchs'),
    update: (id: number, input: unknown) => invokeController('stockBatch', 'updateStockBatch', id, input),
    remove: (id: number) => invokeController('stockBatch', 'deleteStockBatch', id),
  },

  suppliers: {
    create: (input: unknown) => invokeController('supplier', 'createSupplier', input),
    get: (id: number) => invokeController('supplier', 'getSupplier', id),
    list: () => invokeController('supplier', 'getAllSuppliers'),
    update: (id: number, input: unknown) => invokeController('supplier', 'updateSupplier', id, input),
    remove: (id: number) => invokeController('supplier', 'deleteSupplier', id),
  },

  transactionCategories: {
    create: (input: unknown) => invokeController('transactionCategory', 'createTransactionCategory', input),
    get: (id: number) => invokeController('transactionCategory', 'getTransactionCategory', id),
    list: () => invokeController('transactionCategory', 'getAllTransactionCategorys'),
    update: (id: number, input: unknown) => invokeController('transactionCategory', 'updateTransactionCategory', id, input),
    remove: (id: number) => invokeController('transactionCategory', 'deleteTransactionCategory', id),
  },

  transactions: {
    create: (input: unknown) => invokeController('transaction', 'createTransaction', input),
    get: (id: number) => invokeController('transaction', 'getTransaction', id),
    list: () => invokeController('transaction', 'getAllTransactions'),
    update: (id: number, input: unknown) => invokeController('transaction', 'updateTransaction', id, input),
    remove: (id: number) => invokeController('transaction', 'deleteTransaction', id),
  },

  users: {
    create: (input: unknown) => invokeController('user', 'createUser', input),
    get: (id: number) => invokeController('user', 'getUser', id),
    list: () => invokeController('user', 'getAllUsers'),
    update: (id: number, input: unknown) => invokeController('user', 'updateUser', id, input),
    remove: (id: number) => invokeController('user', 'deleteUser', id),
  },
};

contextBridge.exposeInMainWorld('stockliteApi', stockliteApi);

// Backward compatibility. New renderer code should use window.stockliteApi.
contextBridge.exposeInMainWorld('ipcRenderer', {
  on: (...args: Parameters<typeof ipcRenderer.on>) => {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...values) => listener(event, ...values));
  },
  off: (...args: Parameters<typeof ipcRenderer.off>) => ipcRenderer.off(...args),
  send: (...args: Parameters<typeof ipcRenderer.send>) => ipcRenderer.send(...args),
  invoke: (...args: Parameters<typeof ipcRenderer.invoke>) => ipcRenderer.invoke(...args),
});
