export type Supplier = {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  balance: number;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};


export type SupplierPayment = {
  id: number;
  invoiceId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber: string;
  notes: string;
  status: string;
  cashboxName: string;
};

export type SupplierPurchase = {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceType: string;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
};

export type SupplierStockBatch = {
  id: number;
  productId: number;
  productName: string;
  batchCode: string;
  quantity: number;
  remainingQuantity: number;
  purchasePrice: number;
  receivedDate: string;
  expiryDate: string;
  isActive: boolean;
};

export type SupplierTransactions = {
  payments: SupplierPayment[];
  purchases: SupplierPurchase[];
  stockBatches: SupplierStockBatch[];
};

type SupplierTransactionsApi = {
  payments?: Array<Record<string, unknown>>;
  purchases?: Array<Record<string, unknown>>;
  stockBatches?: Array<Record<string, unknown>>;
};

export type SupplierInput = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  balance?: number;
  notes?: string;
  isActive?: boolean;
};

type SupplierApiRow = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  balance: number | string | null;
  notes: string | null;
  isActive: boolean | number;
  created_at: string | null;
  updated_at: string | null;
};

function getApi() {
  if (!window.stockliteApi?.suppliers) {
    throw new Error(
      "واجهة الموردين غير متاحة. شغّل التطبيق داخل Electron وليس في المتصفح.",
    );
  }
  return window.stockliteApi.suppliers;
}

function mapSupplier(row: SupplierApiRow): Supplier {
  return {
    id: Number(row.id),
    name: row.name ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    address: row.address ?? "",
    balance: Number(row.balance ?? 0),
    notes: row.notes ?? "",
    isActive: Boolean(row.isActive),
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

function normalizeInput(input: SupplierInput): SupplierInput {
  return {
    name: input.name.trim(),
    phone: input.phone?.trim() ?? "",
    email: input.email?.trim() ?? "",
    address: input.address?.trim() ?? "",
    balance: Number(input.balance ?? 0),
    notes: input.notes?.trim() ?? "",
    isActive: input.isActive ?? true,
  };
}

export const suppliersService = {
  async list() {
    const rows = (await getApi().list()) as SupplierApiRow[];
    return rows.map(mapSupplier);
  },

  async get(id: number) {
    const row = (await getApi().get(id)) as SupplierApiRow;
    return mapSupplier(row);
  },

  async create(input: SupplierInput) {
    const row = (await getApi().create(normalizeInput(input))) as SupplierApiRow;
    return mapSupplier(row);
  },

  async update(id: number, input: SupplierInput) {
    const row = (await getApi().update(
      id,
      normalizeInput(input),
    )) as SupplierApiRow;
    return mapSupplier(row);
  },

  async remove(id: number) {
    return getApi().remove(id);
  },

  async getTransactions(id: number): Promise<SupplierTransactions> {
    const result = (await getApi().getTransactions(id)) as SupplierTransactionsApi;

    return {
      payments: (result.payments ?? []).map((row) => ({
        id: Number(row.id ?? 0),
        invoiceId: Number(row.invoice_id ?? 0),
        amount: Number(row.amount ?? 0),
        paymentDate: String(row.payment_date ?? ""),
        paymentMethod: String(row.payment_method ?? "cash"),
        referenceNumber: String(row.reference_number ?? ""),
        notes: String(row.notes ?? ""),
        status: String(row.status ?? "active"),
        cashboxName: String(row.cashbox_name ?? ""),
      })),
      purchases: (result.purchases ?? []).map((row) => ({
        id: Number(row.id ?? 0),
        invoiceNumber: String(row.invoice_number ?? ""),
        invoiceDate: String(row.invoice_date ?? ""),
        invoiceType: String(row.invoice_type ?? "standard"),
        total: Number(row.total ?? 0),
        paidAmount: Number(row.paid_amount ?? 0),
        remainingAmount: Number(row.remaining_amount ?? 0),
        status: String(row.status ?? "confirmed"),
      })),
      stockBatches: (result.stockBatches ?? []).map((row) => ({
        id: Number(row.id ?? 0),
        productId: Number(row.product_id ?? 0),
        productName: String(row.product_name ?? ""),
        batchCode: String(row.batch_code ?? ""),
        quantity: Number(row.quantity ?? 0),
        remainingQuantity: Number(row.remaining_quantity ?? 0),
        purchasePrice: Number(row.purchase_price ?? 0),
        receivedDate: String(row.received_date ?? ""),
        expiryDate: String(row.expiry_date ?? ""),
        isActive: Boolean(row.isActive),
      })),
    };
  },
};

export function getSupplierErrorMessage(error: unknown) {
  const typedError = error as Error & { code?: string };

  switch (typedError?.code) {
    case "SUPPLIER_IN_USE":
      return "لا يمكن حذف المورد لوجود فواتير أو دفعات مخزون مرتبطة به. يمكنك إيقافه بدلًا من ذلك.";
    case "NOT_FOUND":
      return "المورد غير موجود أو تم حذفه.";
    case "VALIDATION_ERROR":
      return typedError.message || "تحقق من بيانات المورد.";
    default:
      return typedError?.message || "حدث خطأ غير متوقع أثناء معالجة المورد.";
  }
}
