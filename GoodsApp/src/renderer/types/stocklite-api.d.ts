export {};

type UnknownRecord = Record<string, unknown>;

type CrudApi = {
  create(input: UnknownRecord): Promise<unknown>;
  get(id: number): Promise<unknown>;
  list(): Promise<unknown[]>;
  update(id: number, input: UnknownRecord): Promise<unknown>;
  remove(id: number): Promise<{ success: boolean; message?: string }>;
};

type ControllerInvoker = {
  invoke<T = unknown>(controller: string, method: string, ...args: unknown[]): Promise<T>;
};

type StockLiteApi = {
  controllers: ControllerInvoker;
  activityLogs: CrudApi;
  cashboxes: CrudApi;
  cashboxTransactions: CrudApi;
  customers: CrudApi;
  payments: CrudApi;
  products: CrudApi & {
    listStock(pagination?: { page?: number; limit?: number }): Promise<unknown>;
    createStock(input: UnknownRecord): Promise<unknown>;
    updateStock(id: number, input: UnknownRecord): Promise<unknown>;
    getWithStock(id: number): Promise<unknown>;
  };
  purchaseInvoices: CrudApi & {
    createFull(input: UnknownRecord): Promise<unknown>;
    getSalesDetails(id: number): Promise<unknown>;
    closeCommission(id: number, input?: UnknownRecord): Promise<unknown>;
  };
  purchaseInvoiceItems: CrudApi;
  saleInvoices: CrudApi & {
    getFull(id: number): Promise<unknown>;
    createProcess(input: UnknownRecord): Promise<unknown>;
  };
  saleInvoiceItems: CrudApi;
  saleTypes: CrudApi;
  settings: CrudApi;
  stockAdjustments: CrudApi;
  stockBatches: CrudApi;
  suppliers: CrudApi;
  transactionCategories: CrudApi;
  transactions: CrudApi;
  users: CrudApi;
};

declare global {
  interface Window {
    stockliteApi: StockLiteApi;
  }
}
