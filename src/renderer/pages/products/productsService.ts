export type Product = {
  id: number;
  name: string;
  code: string | null;
  unit: string;
  category: string;
  description: string;
  isActive: boolean;
};

export type ProductInput = Omit<Product, "id">;

type ProductApiRecord = {
  id: number;
  name: string;
  code: string | null;
  unit: string;
  category: string | null;
  description: string | null;
  isActive: number | boolean;
};

function getApi() {
  if (!window.stockliteApi?.products) {
    throw new Error("واجهة المنتجات غير متاحة. شغّل التطبيق داخل Electron.");
  }
  return window.stockliteApi.products;
}

function mapProduct(record: ProductApiRecord): Product {
  return {
    id: Number(record.id),
    name: record.name ?? "",
    code: record.code ?? null,
    unit: record.unit ?? "",
    category: record.category ?? "",
    description: record.description ?? "",
    isActive: Boolean(record.isActive),
  };
}

function toApiInput(input: ProductInput) {
  return {
    name: input.name.trim(),
    code: input.code?.trim() || null,
    unit: input.unit.trim(),
    category: input.category.trim() || null,
    description: input.description.trim() || null,
    isActive: input.isActive,
  };
}

export const productsService = {
  async list(): Promise<Product[]> {
    const records = await getApi().list();
    return records.map((record) => mapProduct(record));
  },

  async get(id: number): Promise<Product> {
    return mapProduct(await getApi().get(id));
  },

  async create(input: ProductInput): Promise<Product> {
    return mapProduct(await getApi().create(toApiInput(input)));
  },

  async update(id: number, input: ProductInput): Promise<Product> {
    return mapProduct(await getApi().update(id, toApiInput(input)));
  },

  async remove(id: number): Promise<void> {
    await getApi().remove(id);
  },
};

export function getProductErrorMessage(error: unknown): string {
  const candidate = error as { code?: string; message?: string };

  if (candidate?.code === "DUPLICATE_PRODUCT_CODE") {
    return "كود المنتج مستخدم مسبقًا. اختر كودًا مختلفًا.";
  }

  if (candidate?.code === "PRODUCT_IN_USE") {
    return "لا يمكن حذف المنتج لأنه مرتبط بدفعات أو حركات مخزون.";
  }

  if (candidate?.code === "NOT_FOUND") {
    return "المنتج المطلوب غير موجود.";
  }

  return candidate?.message || "حدث خطأ غير متوقع أثناء تنفيذ العملية.";
}
