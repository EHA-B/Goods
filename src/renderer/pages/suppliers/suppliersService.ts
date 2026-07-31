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
