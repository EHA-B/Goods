/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    APP_ROOT: string;
    VITE_PUBLIC: string;
  }
}

// ─── Shared Types ─────────────────────────────────────────────────────────────

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

// ─── Cashbox Types ────────────────────────────────────────────────────────────

type CashboxApiRecord = {
  id: number;
  name: string;
  parent_id: number | null;
  parent_name: string | null;
  balance: number;
  initial_balance: number;
  currency: string;
  isActive: number | boolean;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type CashboxMovementRecord = {
  id: number;
  cashbox_id: number;
  reference_type:
    | 'opening_balance'
    | 'sale'
    | 'purchase'
    | 'expense'
    | 'income'
    | 'transfer'
    | 'adjustment'
    | 'reversal';
  reference_id: number | null;
  amount: number;
  direction: 'in' | 'out';
  balance_before: number | null;
  balance_after: number | null;
  transfer_group_id: string | null;
  reversed_transaction_id: number | null;
  reversal_reason: string | null;
  transaction_date: string;
  notes: string | null;
  created_at: string | null;
};

type CashboxSummaryByCurrency = {
  currency: string;
  balance: number;
  totalIn: number;
  totalOut: number;
  openingBalance: number;
};

type CashboxesSummary = {
  balancesByCurrency: CashboxSummaryByCurrency[];
  activeCashboxesCount: number;
  inactiveCashboxesCount: number;
};

type CashboxDetailSummary = {
  operational_in: number;
  operational_out: number;
  opening_balance: number;
  movements_count: number;
  reversals_count: number;
};

type CashboxDetails = CashboxApiRecord & {
  summary: CashboxDetailSummary;
  /** @deprecated use summary.operational_in */
  total_in: number;
  /** @deprecated use summary.operational_out */
  total_out: number;
  /** @deprecated use summary.movements_count */
  movement_count: number;
  recent_movements: CashboxMovementRecord[];
};

type PaginatedCashboxMovements = {
  items: CashboxMovementRecord[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

type CreateCashboxMovementInput = {
  cashbox_id: number;
  direction: 'in' | 'out';
  amount: number;
  reference_type: 'income' | 'expense' | 'adjustment';
  reference_id?: number | null;
  transaction_date?: string;
  notes?: string | null;
};

type TransferCashboxesInput = {
  from_cashbox_id: number;
  to_cashbox_id: number;
  amount: number;
  transaction_date?: string;
  notes?: string | null;
};

type CashboxMovementFilters = {
  page?: number;
  limit?: number;
  direction?: 'in' | 'out';
  reference_type?: string;
  date_from?: string;
  date_to?: string;
};

type ReverseTransferResult = {
  reversal_group_id: string;
  source: { cashbox: CashboxApiRecord; reversal: CashboxMovementRecord };
  destination: { cashbox: CashboxApiRecord; reversal: CashboxMovementRecord };
  original: { out: CashboxMovementRecord; in: CashboxMovementRecord };
};

type AuthUserApiRecord = {
  id: number;
  username: string;
  full_name: string;
  role: string;
  isActive: boolean;
  last_login: string | null;
};

// ─── Window Interface ─────────────────────────────────────────────────────────

interface Window {
  stockliteApi: {
    auth: {
      login(input: { username: string; password: string }): Promise<AuthUserApiRecord>;
      logout(): Promise<{ success: true }>;
      getCurrentUser(): Promise<AuthUserApiRecord | null>;
      changePassword(input: { currentPassword: string; newPassword: string }): Promise<{ success: true; message?: string }>;
    };
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
      getTransactions(id: number): Promise<unknown>;
    };
    stockBatches: GenericCrudApi & {
      summary(): Promise<Record<string, unknown>>;
      inventoryItems(pagination?: { page?: number; limit?: number }): Promise<Record<string, unknown>>;
    };
    stockAdjustments: GenericCrudApi;
    cashboxes: {
      create(input: Partial<CashboxApiRecord> & { name: string }): Promise<CashboxApiRecord>;
      get(id: number): Promise<CashboxApiRecord>;
      list(): Promise<CashboxApiRecord[]>;
      update(id: number, input: { name?: string; parent_id?: number | null; currency?: string; isActive?: boolean; notes?: string | null }): Promise<CashboxApiRecord>;
      remove(id: number): Promise<{ success: true }>;
      summary(): Promise<CashboxesSummary>;
      getDetails(id: number): Promise<CashboxDetails>;
      movements(cashboxId: number, filters?: CashboxMovementFilters): Promise<PaginatedCashboxMovements>;
      createMovement(input: CreateCashboxMovementInput): Promise<{ movement: CashboxMovementRecord; cashbox: CashboxApiRecord }>;
      transfer(input: TransferCashboxesInput): Promise<{ transfer_group_id: string; from: { cashbox: CashboxApiRecord; movement: CashboxMovementRecord }; to: { cashbox: CashboxApiRecord; movement: CashboxMovementRecord } }>;
      reverseMovement(transactionId: number, reason: string): Promise<{ reversal: CashboxMovementRecord; original: CashboxMovementRecord; cashbox: CashboxApiRecord }>;
      reverseTransfer(transferGroupId: string, reason: string): Promise<ReverseTransferResult>;
    };
    /** Read-only access to cashbox transactions. Write operations go through cashboxes business API. */
    cashboxTransactions: {
      get(id: number): Promise<CashboxMovementRecord>;
      list(): Promise<CashboxMovementRecord[]>;
    };
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
    activityLogs: GenericCrudApi;
  };
}
