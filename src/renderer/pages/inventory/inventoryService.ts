export type InventoryStatus = "available" | "low" | "out";

export type InventorySummary = {
  totalUnits: number;
  inventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  expiringBatchesCount: number;
};

export type InventoryItem = {
  productId: number;
  productName: string;
  productCode: string;
  categoryName: string;
  unit: string;
  totalQuantity: number;
  minimumStock: number;
  batchesCount: number;
  averagePurchasePrice: number;
  stockValue: number;
  nearestExpiryDate: string | null;
  suppliersCount: number;
  supplierNames: string[];
  status: InventoryStatus;
};

export type StockBatch = {
  id: number;
  productId: number;
  batchCode: string;
  supplierId: number | null;
  supplierName: string | null;
  quantity: number;
  remainingQuantity: number;
  purchasePrice: number;
  receivedDate: string;
  expiryDate: string | null;
  notes: string | null;
  isActive: boolean;
};

export type StockAdjustment = {
  id: number;
  stockBatchId: number;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  reason: string;
  notes: string | null;
  createdAt: string;
};

type RawRecord = Record<string, unknown>;

const numberValue = (value: unknown) => Number(value ?? 0) || 0;
const textValue = (value: unknown) => (value == null ? "" : String(value));
const nullableText = (value: unknown) => {
  const text = textValue(value).trim();
  return text ? text : null;
};

function mapStatus(value: unknown): InventoryStatus {
  const status = textValue(value).toLowerCase();
  if (status.includes("نافد") || status === "out") return "out";
  if (status.includes("منخفض") || status === "low") return "low";
  return "available";
}

function mapInventoryItem(row: RawRecord): InventoryItem {
  const suppliers = Array.isArray(row.suppliers)
    ? row.suppliers.map(String)
    : textValue(row.suppliers).split(",").map((x) => x.trim()).filter(Boolean);

  return {
    productId: numberValue(row.product_id ?? row.id),
    productName: textValue(row.product_name ?? row.name),
    productCode: textValue(row.product_code ?? row.code) || "—",
    categoryName: textValue(row.product_category ?? row.category) || "غير مصنف",
    unit: textValue(row.product_unit ?? row.unit) || "وحدة",
    totalQuantity: numberValue(row.current_balance ?? row.total_quantity),
    minimumStock: numberValue(row.min_limit ?? row.minimum_stock ?? 10),
    batchesCount: numberValue(row.batch_count ?? row.batches_count),
    averagePurchasePrice: numberValue(row.average_purchase_price),
    stockValue: numberValue(row.total_value ?? row.stock_value),
    nearestExpiryDate: nullableText(row.nearest_expiry_date),
    suppliersCount: numberValue(row.suppliers_count) || suppliers.length,
    supplierNames: suppliers,
    status: mapStatus(row.status),
  };
}

function mapBatch(row: RawRecord): StockBatch {
  return {
    id: numberValue(row.id),
    productId: numberValue(row.product_id),
    batchCode: textValue(row.batch_code) || "—",
    supplierId: row.supplier_id == null ? null : numberValue(row.supplier_id),
    supplierName: nullableText(row.supplier_name),
    quantity: numberValue(row.quantity),
    remainingQuantity: numberValue(row.remaining_quantity),
    purchasePrice: numberValue(row.purchase_price),
    receivedDate: textValue(row.received_date),
    expiryDate: nullableText(row.expiry_date),
    notes: nullableText(row.notes),
    isActive: Boolean(Number(row.isActive ?? 1)),
  };
}

function mapAdjustment(row: RawRecord): StockAdjustment {
  return {
    id: numberValue(row.id),
    stockBatchId: numberValue(row.stock_batch_id),
    quantity: numberValue(row.quantity),
    quantityBefore: numberValue(row.quantity_before),
    quantityAfter: numberValue(row.quantity_after),
    reason: textValue(row.reason),
    notes: nullableText(row.notes),
    createdAt: textValue(row.created_at),
  };
}

function api() {
  if (!window.stockliteApi) throw new Error("واجهة StockLite غير متاحة خارج Electron.");
  return window.stockliteApi;
}

export const inventoryService = {
  async summary(): Promise<InventorySummary> {
    const row = await api().stockBatches.summary() as RawRecord;
    return {
      totalUnits: numberValue(row.total_units),
      inventoryValue: numberValue(row.total_value),
      lowStockCount: numberValue(row.low_stock_count),
      outOfStockCount: numberValue(row.out_of_stock_count),
      expiringBatchesCount: numberValue(row.expiring_soon_count),
    };
  },

  async list(page = 1, limit = 100): Promise<{ items: InventoryItem[]; total: number }> {
    const result = await api().stockBatches.inventoryItems({ page, limit }) as RawRecord;
    const rawItems = Array.isArray(result.items) ? result.items : Array.isArray(result.data) ? result.data : [];
    const pagination = (result.pagination ?? {}) as RawRecord;
    return { items: rawItems.map((x) => mapInventoryItem(x as RawRecord)), total: numberValue(result.total ?? pagination.total) || rawItems.length };
  },

  async productDetails(productId: number): Promise<{ item: InventoryItem; batches: StockBatch[]; adjustments: StockAdjustment[] }> {
    const [raw, allAdjustments] = await Promise.all([
      api().products.getWithStock(productId) as Promise<RawRecord>,
      api().stockAdjustments.list() as Promise<RawRecord[]>,
    ]);
    const product = (raw.product ?? {}) as RawRecord;
    const batchesRaw = Array.isArray(raw.stock_batches) ? raw.stock_batches as RawRecord[] : [];
    const batches = batchesRaw.map(mapBatch);
    const totalQuantity = batches.reduce((sum, batch) => sum + batch.remainingQuantity, 0);
    const stockValue = batches.reduce((sum, batch) => sum + batch.remainingQuantity * batch.purchasePrice, 0);
    const supplierNames = [...new Set(batches.map((x) => x.supplierName).filter((x): x is string => Boolean(x)))];
    const weighted = totalQuantity > 0 ? stockValue / totalQuantity : 0;
    const activeExpiry = batches.map((x) => x.expiryDate).filter((x): x is string => Boolean(x)).sort()[0] ?? null;
    const item: InventoryItem = {
      productId,
      productName: textValue(product.name),
      productCode: textValue(product.code) || "—",
      categoryName: textValue(product.category) || "غير مصنف",
      unit: textValue(product.unit) || "وحدة",
      totalQuantity,
      minimumStock: numberValue(product.minimum_stock ?? 10),
      batchesCount: batches.length,
      averagePurchasePrice: weighted,
      stockValue,
      nearestExpiryDate: activeExpiry,
      suppliersCount: supplierNames.length,
      supplierNames,
      status: totalQuantity <= 0 ? "out" : totalQuantity <= numberValue(product.minimum_stock ?? 10) ? "low" : "available",
    };
    const batchIds = new Set(batches.map((x) => x.id));
    const adjustments = (Array.isArray(allAdjustments) ? allAdjustments : []).filter((x) => batchIds.has(numberValue(x.stock_batch_id))).map(mapAdjustment).sort((a, b) => b.id - a.id);
    return { item, batches, adjustments };
  },

  async createBatch(input: RawRecord) { return api().stockBatches.create(input); },
  async updateBatch(id: number, input: RawRecord) { return api().stockBatches.update(id, input); },
  async removeBatch(id: number) { return api().stockBatches.remove(id); },
  async adjust(productId: number, input: RawRecord) { return api().products.adjustStock(productId, input); },
};

export function getInventoryErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "حدث خطأ غير متوقع أثناء تنفيذ عملية المخزون.";
}
