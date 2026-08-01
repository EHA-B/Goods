/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    APP_ROOT: string;
    VITE_PUBLIC: string;
  }
}


type AppInfoApiRecord = {
  appName: string;
  appVersion: string;
  electronVersion: string;
  nodeVersion: string;
  chromiumVersion: string;
  databaseEngine: string;
  databasePath: string;
  platform: string;
  architecture: string;
  environment: "development" | "production";
};

type ProductApiRecord = {
  id: number;
  name: string;
  code: string | null;
  unit: string;
  category: string | null;
  description: string | null;
  isActive: number | boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type ProductApiInput = {
  name: string;
  code: string | null;
  unit: string;
  category?: string | null;
  description?: string | null;
  isActive?: boolean;
};

type PartyApiRecord = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  balance: number | string | null;
  notes: string | null;
  isActive: number | boolean;
  created_at: string | null;
  updated_at: string | null;
};

type PartyApiInput = {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  balance?: number;
  notes?: string | null;
  isActive?: boolean;
};

type GenericCrudApi = {
  create(input: unknown): Promise<unknown>;
  get(id: number): Promise<unknown>;
  list(): Promise<unknown[]>;
  update(id: number, input: unknown): Promise<unknown>;
  remove(id: number): Promise<unknown>;
};

interface Window {
  ipcRenderer: import("electron").IpcRenderer;
  stockliteApi: {
    system: {
      getAppInfo(): Promise<AppInfoApiRecord>;
    };
    products: {
      list(): Promise<ProductApiRecord[]>;
      get(id: number): Promise<ProductApiRecord>;
      create(input: ProductApiInput): Promise<ProductApiRecord>;
      update(id: number, input: Partial<ProductApiInput>): Promise<ProductApiRecord>;
      remove(id: number): Promise<unknown>;
      adjustStock(productId: number, input: unknown): Promise<unknown>;
      getWithStock(productId: number): Promise<unknown>;
    };
    customers: {
      list(): Promise<PartyApiRecord[]>;
      get(id: number): Promise<PartyApiRecord>;
      create(input: PartyApiInput): Promise<PartyApiRecord>;
      update(id: number, input: Partial<PartyApiInput>): Promise<PartyApiRecord>;
      remove(id: number): Promise<unknown>;
    };
    suppliers: {
      list(): Promise<PartyApiRecord[]>;
      get(id: number): Promise<PartyApiRecord>;
      create(input: PartyApiInput): Promise<PartyApiRecord>;
      update(id: number, input: Partial<PartyApiInput>): Promise<PartyApiRecord>;
      remove(id: number): Promise<unknown>;
    };
    stockBatches: GenericCrudApi & {
      summary(): Promise<Record<string, unknown>>;
      inventoryItems(pagination?: { page?: number; limit?: number }): Promise<Record<string, unknown>>;
    };
    stockAdjustments: GenericCrudApi;
    cashboxes: {
      create(input: unknown): Promise<unknown>;
      get(id: number): Promise<unknown>;
      list(): Promise<unknown[]>;
      update(id: number, input: unknown): Promise<unknown>;
      summary(): Promise<unknown>;
      transfer(fromId: number, toId: number, amount: number, date: string, notes?: string): Promise<unknown>;
    };
    cashboxTransactions: GenericCrudApi;
    payments: GenericCrudApi;
    purchaseInvoices: GenericCrudApi & {
      createFull(input: unknown): Promise<unknown>;
      getSalesDetails(id: number): Promise<unknown>;
      closeCommission(id: number, input?: unknown): Promise<unknown>;
    };
    purchaseInvoiceItems: GenericCrudApi;
    saleInvoices: GenericCrudApi & {
      getFull(id: number): Promise<unknown>;
      createProcess(input: unknown): Promise<unknown>;
    };
    saleInvoiceItems: GenericCrudApi;
    saleTypes: GenericCrudApi;
    settings: GenericCrudApi;
    transactionCategories: GenericCrudApi;
    transactions: GenericCrudApi;
    users: GenericCrudApi;
    activityLogs: GenericCrudApi;
  };
}
