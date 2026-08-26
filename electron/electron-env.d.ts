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
  reference_display_id?: string | null;
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
  exchange_rate?: number;
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

// ─── Invoice & Payment Types ──────────────────────────────────────────────────

type InvoiceStatus = 'draft' | 'confirmed' | 'partially_paid' | 'paid' | 'cancelled';
type PaymentStatus = 'active' | 'reversed';
type PaymentMethod = 'cash' | 'bank' | 'credit_card' | 'cheque' | 'online';

type PaymentRecord = {
  id: number;
  party_type: 'customer' | 'supplier' | null;
  party_id: number | null;
  payment_type: 'sale' | 'purchase';
  invoice_id: number;
  cashbox_id: number;
  cashbox_name?: string | null;
  amount: number;
  currency: string;
  exchange_rate: number;
  amount_base: number;
  payment_date: string;
  status: PaymentStatus;
  reversed_payment_id: number | null;
  cashbox_transaction_id: number | null;
  balance_before: number | null;
  balance_after: number | null;
  reversal_reason: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type RecordSalePaymentInput = {
  sale_invoice_id: number;
  cashbox_id: number;
  amount: number;
  exchange_rate?: number;
  payment_date?: string;
  notes?: string | null;
};

type RecordPurchasePaymentInput = {
  purchase_invoice_id: number;
  cashbox_id: number;
  amount: number;
  exchange_rate?: number;
  payment_date?: string;
  notes?: string | null;
};

type InitialPaymentInput = {
  cashbox_id: number;
  amount: number;
  exchange_rate?: number;
  payment_date?: string;
  notes?: string | null;
};

type StockBatchRecord = {
  id: number;
  product_id: number;
  product_name?: string | null;
  unit?: string | null;
  supplier_id: number | null;
  supplier_name?: string | null;
  purchase_invoice_id: number | null;
  batch_code: string | null;
  quantity: number;
  remaining_quantity: number;
  purchase_price: number;
  purchase_currency?: string;
  purchase_exchange_rate?: number;
  purchase_price_base?: number;
  received_date: string | null;
  expiry_date: string | null;
  isActive: number | boolean;
  created_at: string | null;
  updated_at: string | null;
};

type InvoiceFinancialSummary = {
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  total_base: number;
  paid_base: number;
  remaining_base: number;
  currency: string;
  exchange_rate: number;
  status: InvoiceStatus;
};

type PurchaseInvoiceRecord = {
  id: number;
  invoice_number: string;
  supplier_id: number;
  supplier_name?: string | null;
  invoice_type: 'standard' | 'consignment';
  invoice_date: string;
  subtotal: number;
  discount: number;
  discount_amount: number;
  settlement_status: 'settled' | 'paid' | 'partial' | 'overdue';
  tax: number;
  total: number;
  paid_amount: number;
  remaining_amount: number;
  status: InvoiceStatus;
  currency: string;
  exchange_rate: number;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_edited?: boolean | number;
  edit_count?: number;
  last_edited_at?: string | null;
  last_edited_by?: number | null;
};

type PurchaseInvoiceDetails = {
  invoice: PurchaseInvoiceRecord;
  supplier: PartyApiRecord | null;
  items: Array<Record<string, unknown>>;
  payments: PaymentRecord[];
  financial_summary: InvoiceFinancialSummary;
  activity: Array<Record<string, unknown>>;
};

type PurchaseInvoiceItem = {
  product_id: number;
  quantity: number;
  purchase_price: number;
  batch_code?: string | null;
  received_date?: string;
  expiry_date?: string | null;
  notes?: string | null;
  batch_notes?: string | null;
};

type CreatePurchaseInvoiceInput = {
  supplier_id: number;
  invoice_number?: string;
  invoice_date?: string;
  invoice_type?: 'standard' | 'consignment';
  discount_amount?: number;
  notes?: string;
  items: PurchaseInvoiceItem[];
  initial_payment?: InitialPaymentInput;
  currency?: string;
  exchange_rate?: number;
};

type SaleInvoiceRecord = {
  id: number;
  invoice_number: string;
  customer_id: number | null;
  customer_name?: string | null;
  sale_type_id: number | null;
  cashbox_id: number | null;
  invoice_date: string;
  subtotal: number;
  discount: number;
  discount_amount: number;
  commission_percentage: number;
  commission_amount: number;
  tax: number;
  total: number;
  paid_amount: number;
  remaining_amount: number;
  status: InvoiceStatus;
  currency: string;
  exchange_rate: number;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_edited?: boolean | number;
  edit_count?: number;
  last_edited_at?: string | null;
  last_edited_by?: number | null;
};

type SaleInvoiceDetails = {
  invoice: SaleInvoiceRecord;
  customer: PartyApiRecord | null;
  items: Array<Record<string, unknown>>;
  payments: PaymentRecord[];
  financial_summary: InvoiceFinancialSummary;
  activity: Array<Record<string, unknown>>;
};

type SaleInvoiceItem = {
  product_id: number;
  stock_batch_id: number;
  quantity: number;
  sale_price: number;
  notes?: string | null;
};

type CreateSaleInvoiceInput = {
  customer_id?: number | null;
  invoice_number?: string;
  invoice_date?: string;
  discount_amount?: number;
  notes?: string;
  items: SaleInvoiceItem[];
  initial_payment?: InitialPaymentInput;
  currency?: string;
  exchange_rate?: number;
};

type InvoiceListFilters = {
  search?: string;
  status?: InvoiceStatus | '';
  date_from?: string;
  date_to?: string;
  customer_id?: number;
  supplier_id?: number;
  invoice_type?: string;
};

type PaginationInput = {
  page?: number;
  limit?: number;
};

type PaginatedInvoices<T> = {
  items: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

// ─── Window Interface ─────────────────────────────────────────────────────────

type DashboardTrendPoint = { date: string; sales: number; purchases: number; profit: number };
type DashboardApiData = {
  summary: {
    salesToday: number; salesMonth: number; salesTodayCount: number;
    purchasesToday: number; purchasesMonth: number; purchasesTodayCount: number;
    profitToday: number; profitMonth: number; cashBalance: number; cashboxesCount: number;
    customerDebt: number; supplierDebt: number; inventoryValue: number;
    lowStockCount: number; outOfStockCount: number; productsCount: number; customersCount: number; suppliersCount: number;
  };
  cashByCurrency: Array<{ currency: string; balance: number }>;
  trend: DashboardTrendPoint[];
  topProducts: Array<{ id: number; name: string; quantity: number; revenue: number }>;
  recentSales: Array<{ id: number; invoice_number: string; invoice_date: string; total: number; currency: string; exchange_rate: number; status: string; customer_name: string }>;
  recentPurchases: Array<{ id: number; invoice_number: string; invoice_date: string; total: number; currency: string; exchange_rate: number; status: string; supplier_name: string }>;
  recentTransactions: Array<{ id: number; transaction_date: string; amount: number; currency: string; type: string; description?: string; category_name?: string; cashbox_name?: string }>;
  alerts: Array<{ id: number; name: string; quantity: number }>;
};

interface Window {
  stockliteApi: {
    printDocuments: {
      payment(id: number): Promise<unknown>;
      transaction(id: number): Promise<unknown>;
      transfer(id: string): Promise<unknown>;
      customerStatement(id: number): Promise<unknown>;
      supplierStatement(id: number): Promise<unknown>;
      cashboxStatement(id: number): Promise<unknown>;
      consignment(id: number): Promise<unknown>;
    };
    dashboard: {
      get(): Promise<DashboardApiData>;
    };
    auth: {
      login(input: { username: string; password: string }): Promise<AuthUserApiRecord>;
      logout(): Promise<{ success: true }>;
      getCurrentUser(): Promise<AuthUserApiRecord | null>;
      changePassword(input: { currentPassword: string; newPassword: string }): Promise<{ success: true; message?: string }>;
    };
    system: {
      getAppInfo(): Promise<AppInfoApiRecord>;
      backup(destinationPath: string): Promise<{
        success: true;
        destination: string;
        size: number;
        createdAt: string;
      }>;
      restore(sourcePath: string): Promise<{
        success: true;
        restoredFrom: string;
        emergencyBackupPath: string;
      }>;
      getAutoBackupConfig(): Promise<{
        enabled: boolean;
        interval: "daily" | "weekly";
        directory: string;
        lastBackup: string | null;
      }>;
      setAutoBackupConfig(input: {
        enabled: boolean;
        interval: "daily" | "weekly";
        directory: string;
        lastBackup?: string | null;
      }): Promise<{
        enabled: boolean;
        interval: "daily" | "weekly";
        directory: string;
        lastBackup: string | null;
      }>;
      selectDirectory(): Promise<{ canceled: boolean; path: string | null }>;
      selectSaveFile(): Promise<{ canceled: boolean; path: string | null }>;
      selectOpenFile(): Promise<{ canceled: boolean; path: string | null }>;
      saveCurrentPageAsPdf(input?: { fileName?: string }): Promise<{ canceled: boolean; path: string | null }>;
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
    payments: {
      get(id: number): Promise<PaymentRecord>;
      list(): Promise<PaymentRecord[]>;
      listForSale(invoiceId: number): Promise<PaymentRecord[]>;
      listForPurchase(invoiceId: number): Promise<PaymentRecord[]>;
      recordSale(input: RecordSalePaymentInput): Promise<{ payment: PaymentRecord; invoice: SaleInvoiceRecord; cashbox: CashboxApiRecord }>;
      recordPurchase(input: RecordPurchasePaymentInput): Promise<{ payment: PaymentRecord; invoice: PurchaseInvoiceRecord; cashbox: CashboxApiRecord }>;
      recordGeneralReceipt(input: { party_type: string; party_id: number; cashbox_id: number; amount: number; payment_date: string; notes?: string }): Promise<any>;
      recordGeneralPayment(input: { party_type: string; party_id: number; cashbox_id: number; amount: number; payment_date: string; notes?: string }): Promise<any>;
      reverseSale(paymentId: number, reason: string): Promise<{ reversedPayment: PaymentRecord; invoice: SaleInvoiceRecord; cashbox: CashboxApiRecord }>;
      reversePurchase(paymentId: number, reason: string): Promise<{ reversedPayment: PaymentRecord; invoice: PurchaseInvoiceRecord; cashbox: CashboxApiRecord }>;
    };
    purchases: {
      get(id: number): Promise<PurchaseInvoiceRecord>;
      getAll(): Promise<PurchaseInvoiceRecord[]>;
      list(filters?: InvoiceListFilters, pagination?: PaginationInput): Promise<PaginatedInvoices<PurchaseInvoiceRecord>>;
      getDetails(id: number): Promise<PurchaseInvoiceDetails>;
      createFull(input: CreatePurchaseInvoiceInput): Promise<PurchaseInvoiceDetails>;
      update(id: number, input: CreatePurchaseInvoiceInput, password: string): Promise<PurchaseInvoiceDetails>;
      addItems(invoiceId: number, items: unknown): Promise<PurchaseInvoiceDetails>;
      cancel(id: number, reason: string): Promise<PurchaseInvoiceDetails>;
      recordPayment(input: RecordPurchasePaymentInput): Promise<{ payment: PaymentRecord; invoice: PurchaseInvoiceRecord; cashbox: CashboxApiRecord }>;
      reversePayment(paymentId: number, reason: string): Promise<{ reversedPayment: PaymentRecord; invoice: PurchaseInvoiceRecord; cashbox: CashboxApiRecord }>;
      deleteDraft(id: number): Promise<{ success: true }>;
      getSalesDetails(id: number): Promise<unknown>;
      getConsignmentSummary(id: number): Promise<unknown>;
      previewConsignmentClosing(id: number, input?: unknown): Promise<unknown>;
      closeCommission(id: number, input?: unknown): Promise<unknown>;
      getConsignmentSettlement(id: number): Promise<unknown>;
      reverseConsignmentSettlement(id: number, reason: string): Promise<unknown>;
    };
    saleInvoices: {
      get(id: number): Promise<SaleInvoiceRecord>;
      list(): Promise<SaleInvoiceRecord[]>;
      listFiltered(filters?: InvoiceListFilters, pagination?: PaginationInput): Promise<PaginatedInvoices<SaleInvoiceRecord>>;
      getDetails(id: number): Promise<SaleInvoiceDetails>;
      getFull(id: number): Promise<SaleInvoiceDetails>;
      createProcess(input: CreateSaleInvoiceInput): Promise<SaleInvoiceDetails>;
      update(id: number, input: CreateSaleInvoiceInput, password: string): Promise<SaleInvoiceDetails>;
      cancel(id: number, reason: string): Promise<SaleInvoiceDetails>;
      deleteDraft(id: number): Promise<{ success: true }>;
      availableBatches(productId: number): Promise<StockBatchRecord[]>;
    };
    saleTypes: GenericCrudApi;
    settings: GenericCrudApi;
    transactionCategories: GenericCrudApi;
    transactions: {
      list(filters?: any, pagination?: any): Promise<any>;
      getDetails(id: number): Promise<any>;
      createFinancial(input: any): Promise<any>;
      cancel(id: number, reason: string): Promise<any>;
      summary(filters?: any): Promise<any>;
    };
    reports: {
      options(): Promise<{
        customers: Array<{ value: string; label: string }>;
        suppliers: Array<{ value: string; label: string }>;
        products: Array<{ value: string; label: string }>;
        cashboxes: Array<{ value: string; label: string }>;
      }>;
      generate(input: {
        reportId: string;
        filters: Record<string, unknown>;
      }): Promise<{
        title: string;
        generatedAt: string;
        columns: Array<{
          key: string;
          label: string;
          format?: "text" | "number" | "currency" | "date";
        }>;
        rows: Array<Record<string, unknown>>;
        summary?: Array<{ label: string; value: string | number }>;
        totalRows?: number;
      }>;
      export(input: {
        reportId: string;
        filters: Record<string, unknown>;
        format: "pdf" | "excel";
      }): Promise<{
        success: boolean;
        filePath?: string;
        canceled?: boolean;
      }>;
    };
    activityLogs: {
      list: (filters?: unknown, pagination?: unknown) => Promise<unknown>;
      get: (id: number) => Promise<unknown>;
      options: () => Promise<unknown>;
    };
    notifications: {
      list: (input?: unknown) => Promise<any>;
      count: () => Promise<{ count: number }>;
      markRead: (id: number) => Promise<any>;
      markAllRead: () => Promise<any>;
      dismiss: (id: number) => Promise<any>;
    };
  };
}

// ─── Auto-Updater API (exposed via preload) ─────────────────────────────────
type UpdaterStatus =
  | { type: "idle" }
  | { type: "checking" }
  | { type: "available"; info: { version: string } }
  | { type: "not-available" }
  | { type: "downloading"; percent: number }
  | { type: "ready" }
  | { type: "error"; message: string };

interface Window {
  updaterApi: {
    /** Opens file picker to install an update manually */
    checkForUpdates: () => Promise<void>;
    /** Subscribe to status events. Returns an unsubscribe function. */
    onStatus: (cb: (status: UpdaterStatus) => void) => () => void;
  };
}
