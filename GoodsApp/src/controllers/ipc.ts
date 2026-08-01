import { app, ipcMain } from 'electron';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);

export const CONTROLLER_IPC_CHANNEL = 'stocklite:controllers:invoke';

type ControllerName = keyof typeof controllerDefinitions;

type ControllerDefinition = {
  file: string;
  methods: readonly string[];
};

const controllerDefinitions = {
  activityLog: {
    file: 'activityLogController.js',
    methods: ['createActivityLog', 'getActivityLog', 'getAllActivityLogs', 'updateActivityLog', 'deleteActivityLog'],
  },
  cashbox: {
    file: 'cashboxController.js',
    methods: ['createCashbox', 'getCashbox', 'getAllCashboxs', 'updateCashbox', 'deleteCashbox'],
  },
  cashboxTransaction: {
    file: 'cashboxTransactionController.js',
    methods: ['createCashboxTransaction', 'getCashboxTransaction', 'getAllCashboxTransactions', 'updateCashboxTransaction', 'deleteCashboxTransaction'],
  },
  customer: {
    file: 'customerController.js',
    methods: ['createCustomer', 'getCustomer', 'getAllCustomers', 'updateCustomer', 'deleteCustomer'],
  },
  payment: {
    file: 'paymentController.js',
    methods: ['createPayment', 'getPayment', 'getAllPayments', 'updatePayment', 'deletePayment'],
  },
  //use createStockProduct,updatestockproduct and getstockproduct for creating stock products, it's handles creating stock batches automatically and all logic
  product: {
    file: 'productController.js',
    methods: ['createProduct', 'getProduct', 'getAllProducts', 'updateProduct', 'deleteProduct', 'listStockProducts', 'createStockProduct', 'updateStockProduct', 'getProductWithStock'],
  },
  //use createFullPurchaseIncoice for creating purchase invoices, it's handles creating stock batches automatically and all logic
  purchaseInvoice: {
    file: 'purchaseInvoiceController.js',
    methods: ['createPurchaseInvoice', 'createFullPurchaseInvoice', 'getPurchaseInvoice', 'getAllPurchaseInvoices', 'updatePurchaseInvoice', 'deletePurchaseInvoice', 'getPurchaseInvoiceSalesDetails', 'closeCommissionInvoice'],
  },
  purchaseInvoiceItem: {
    file: 'purchaseInvoiceItemController.js',
    methods: ['createPurchaseInvoiceItem', 'getPurchaseInvoiceItem', 'getAllPurchaseInvoiceItems', 'updatePurchaseInvoiceItem', 'deletePurchaseInvoiceItem'],
  },
  //use createSaleProcess for creating sale invoices 
  saleInvoice: {
    file: 'saleInvoiceController.js',
    methods: ['createSaleInvoice', 'getSaleInvoice', 'getAllSaleInvoices', 'updateSaleInvoice', 'deleteSaleInvoice', 'getFullSaleInvoice', 'createSaleProcess'],
  },
  saleInvoiceItem: {
    file: 'saleInvoiceItemController.js',
    methods: ['createSaleInvoiceItem', 'getSaleInvoiceItem', 'getAllSaleInvoiceItems', 'updateSaleInvoiceItem', 'deleteSaleInvoiceItem'],
  },
  saleType: {
    file: 'saleTypeController.js',  
    methods: ['createSaleType', 'getSaleType', 'getAllSaleTypes', 'updateSaleType', 'deleteSaleType'],
  },
  setting: {
    file: 'settingController.js',
    methods: ['createSetting', 'getSetting', 'getAllSettings', 'updateSetting', 'deleteSetting'],
  },
  stockAdjustment: {
    file: 'stockAdjustmentController.js',
    methods: ['createStockAdjustment', 'getStockAdjustment', 'getAllStockAdjustments', 'updateStockAdjustment', 'deleteStockAdjustment'],
  },
  stockBatch: {
    file: 'stockBatchController.js',
    methods: ['createStockBatch', 'getStockBatch', 'getAllStockBatchs', 'updateStockBatch', 'deleteStockBatch'],
  },
  supplier: {
    file: 'supplierController.js',
    methods: ['createSupplier', 'getSupplier', 'getAllSuppliers', 'updateSupplier', 'deleteSupplier'],
  },
  transactionCategory: {
    file: 'transactionCategoryController.js',
    methods: ['createTransactionCategory', 'getTransactionCategory', 'getAllTransactionCategorys', 'updateTransactionCategory', 'deleteTransactionCategory'],
  },
  transaction: {
    file: 'transactionController.js',
    methods: ['createTransaction', 'getTransaction', 'getAllTransactions', 'updateTransaction', 'deleteTransaction'],
  },
  user: {
    file: 'userController.js',
    methods: ['createUser', 'getUser', 'getAllUsers', 'updateUser', 'deleteUser'],
  },
} as const satisfies Record<string, ControllerDefinition>;

const controllerCache = new Map<ControllerName, Record<string, (...args: unknown[]) => unknown>>();

function getControllersDirectory(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'src', 'controllers');
  }

  return path.join(process.env.APP_ROOT ?? app.getAppPath(), 'src', 'controllers');
}

function getController(name: ControllerName) {
  const cached = controllerCache.get(name);
  if (cached) return cached;

  const definition = controllerDefinitions[name];
  const modulePath = path.join(getControllersDirectory(), definition.file);
  const loaded = require(modulePath) as Record<string, (...args: unknown[]) => unknown>;
  controllerCache.set(name, loaded);
  return loaded;
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      code: (error as Error & { code?: string }).code ?? 'CONTROLLER_ERROR',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
  }

  if (error && typeof error === 'object') {
    const value = error as { name?: string; message?: string; code?: string };
    return {
      name: value.name ?? 'ControllerError',
      message: value.message ?? 'حدث خطأ أثناء تنفيذ العملية',
      code: value.code ?? 'CONTROLLER_ERROR',
    };
  }

  return {
    name: 'ControllerError',
    message: String(error ?? 'حدث خطأ غير معروف'),
    code: 'CONTROLLER_ERROR',
  };
}

function isControllerName(value: string): value is ControllerName {
  return Object.prototype.hasOwnProperty.call(controllerDefinitions, value);
}

export function registerControllerIpc() {
  ipcMain.removeHandler(CONTROLLER_IPC_CHANNEL);

  ipcMain.handle(
    CONTROLLER_IPC_CHANNEL,
    async (_event, controllerName: string, methodName: string, args: unknown[] = []) => {
      if (!isControllerName(controllerName)) {
        return { ok: false, error: { code: 'UNKNOWN_CONTROLLER', message: `Unknown controller: ${controllerName}` } };
      }

      const definition = controllerDefinitions[controllerName];
      if (!definition.methods.includes(methodName as never)) {
        return { ok: false, error: { code: 'UNKNOWN_METHOD', message: `Method ${methodName} is not allowed on ${controllerName}` } };
      }

      if (!Array.isArray(args)) {
        return { ok: false, error: { code: 'INVALID_ARGUMENTS', message: 'Controller arguments must be an array' } };
      }

      try {
        const controller = getController(controllerName);
        const method = controller[methodName];

        if (typeof method !== 'function') {
          return { ok: false, error: { code: 'METHOD_NOT_IMPLEMENTED', message: `${methodName} is not implemented` } };
        }

        const data = await method.apply(controller, args);
        return { ok: true, data };
      } catch (error) {
        console.error(`[IPC] ${controllerName}.${methodName} failed`, error);
        return { ok: false, error: normalizeError(error) };
      }
    },
  );
}
