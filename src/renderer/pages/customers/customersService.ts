export type Customer = {
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

export type CustomerInput = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  balance?: number;
  notes?: string;
  isActive?: boolean;
};

type CustomerApiRow = {
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
  if (!window.stockliteApi?.customers) {
    throw new Error(
      "واجهة العملاء غير متاحة. شغّل التطبيق داخل Electron وليس في المتصفح.",
    );
  }
  return window.stockliteApi.customers;
}

function mapCustomer(row: CustomerApiRow): Customer {
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

function normalizeInput(input: CustomerInput): CustomerInput {
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

export const customersService = {
  async list() {
    const rows = (await getApi().list()) as CustomerApiRow[];
    return rows.map(mapCustomer);
  },
  async get(id: number) {
    const row = (await getApi().get(id)) as CustomerApiRow;
    return mapCustomer(row);
  },
  async create(input: CustomerInput) {
    const row = (await getApi().create(normalizeInput(input))) as CustomerApiRow;
    return mapCustomer(row);
  },
  async update(id: number, input: CustomerInput) {
    const row = (await getApi().update(id, normalizeInput(input))) as CustomerApiRow;
    return mapCustomer(row);
  },
  async remove(id: number) {
    return getApi().remove(id);
  },
};

export function getCustomerErrorMessage(error: unknown) {
  const typedError = error as Error & { code?: string };
  switch (typedError?.code) {
    case "CUSTOMER_IN_USE":
      return "لا يمكن حذف العميل لوجود فواتير أو مدفوعات مرتبطة به. يمكنك إيقافه بدلًا من ذلك.";
    case "NOT_FOUND":
      return "العميل غير موجود أو تم حذفه.";
    case "VALIDATION_ERROR":
      return typedError.message || "تحقق من بيانات العميل.";
    default:
      return typedError?.message || "حدث خطأ غير متوقع أثناء معالجة العميل.";
  }
}
