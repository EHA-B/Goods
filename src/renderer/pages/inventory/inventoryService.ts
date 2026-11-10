export type InventoryStatus = "available" | "low" | "out";

export type InventorySummary = {
  totalUnits: number;
  inventoryValue: number;
  totalPurchasedWeight: number;
  totalSoldWeight: number;
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
  purchasedWeight: number;
  soldWeight: number;
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
  productId: number;
  stockBatchId: number | null;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  reason: string;
  notes: string | null;
  createdAt: string;
};

export type ProductStockMovement = {
  id: number;
  movementType: string;
  sourceType: string;
  sourceId: number | null;
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  unitCost: number;
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
    totalQuantity: numberValue(row.current_balance ?? row.total_quantity ?? row.stock_quantity),
    purchasedWeight: numberValue(row.purchased_weight),
    soldWeight: numberValue(row.sold_weight),
    minimumStock: numberValue(row.min_limit ?? row.minimum_stock ?? row.min_stock ?? 10),
    batchesCount: 0,
    averagePurchasePrice: numberValue(row.average_purchase_price ?? row.avg_cost_base),
    stockValue: numberValue(row.total_value ?? row.stock_value),
    nearestExpiryDate: null,
    suppliersCount: numberValue(row.suppliers_count) || suppliers.length,
    supplierNames: suppliers,
    status: mapStatus(row.status),
  };
}

function mapAdjustment(row: RawRecord): StockAdjustment {
  return {
    id: numberValue(row.id),
    productId: numberValue(row.product_id),
    stockBatchId: row.stock_batch_id == null ? null : numberValue(row.stock_batch_id),
    quantity: numberValue(row.quantity),
    quantityBefore: numberValue(row.quantity_before),
    quantityAfter: numberValue(row.quantity_after),
    reason: textValue(row.reason),
    notes: nullableText(row.notes),
    createdAt: textValue(row.created_at),
  };
}

function mapMovement(row: RawRecord): ProductStockMovement {
  return {
    id: numberValue(row.id),
    movementType: textValue(row.movement_type),
    sourceType: textValue(row.source_type),
    sourceId: row.source_id == null ? null : numberValue(row.source_id),
    quantityBefore: numberValue(row.quantity_before),
    quantityChange: numberValue(row.quantity_change),
    quantityAfter: numberValue(row.quantity_after),
    unitCost: numberValue(row.unit_cost),
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
    const row = (await api().stockBatches.summary()) as RawRecord;
    return {
      totalUnits: numberValue(row.total_units),
      inventoryValue: numberValue(row.total_value),
      totalPurchasedWeight: numberValue(row.total_purchased_weight),
      totalSoldWeight: numberValue(row.total_sold_weight),
      lowStockCount: numberValue(row.low_stock_count),
      outOfStockCount: numberValue(row.out_of_stock_count),
      expiringBatchesCount: 0,
    };
  },

  async list(page = 1, limit = 100): Promise<{ items: InventoryItem[]; total: number }> {
    const result = (await api().stockBatches.inventoryItems({ page, limit })) as RawRecord;
    const rawItems = Array.isArray(result.items) ? result.items : Array.isArray(result.data) ? result.data : [];
    const pagination = (result.pagination ?? {}) as RawRecord;
    return {
      items: rawItems.map((x) => mapInventoryItem(x as RawRecord)),
      total: numberValue(result.total ?? pagination.total) || rawItems.length,
    };
  },

  async productDetails(productId: number): Promise<{
    item: InventoryItem;
    batches: StockBatch[];
    adjustments: StockAdjustment[];
    movements: ProductStockMovement[];
  }> {
    const raw = (await api().products.getWithStock(productId)) as RawRecord;
    const product = (raw.product ?? {}) as RawRecord;
    const totalQuantity = numberValue(product.stock_quantity);
    const averagePurchasePrice = numberValue(product.avg_cost_base);
    const stockValue = Math.max(0, totalQuantity) * averagePurchasePrice;
    const minimumStock = numberValue(product.min_stock ?? product.minimum_stock ?? 10);

    const rawSuppliers = Array.isArray(raw.suppliers) ? raw.suppliers : [];
    const supplierNames = [
      ...new Set(
        rawSuppliers
          .map((s) =>
            typeof s === "string"
              ? s.trim()
              : textValue((s as RawRecord)?.name ?? (s as RawRecord)?.supplier_name).trim(),
          )
          .filter(Boolean),
      ),
    ];

    const item: InventoryItem = {
      productId,
      productName: textValue(product.name),
      productCode: textValue(product.code) || "—",
      categoryName: textValue(product.category) || "غير مصنف",
      unit: textValue(product.unit) || "وحدة",
      totalQuantity,
      purchasedWeight: numberValue(raw.purchased_weight),
      soldWeight: numberValue(raw.sold_weight),
      minimumStock,
      batchesCount: 0,
      averagePurchasePrice,
      stockValue,
      nearestExpiryDate: null,
      suppliersCount: supplierNames.length,
      supplierNames,
      status: totalQuantity <= 0 ? "out" : totalQuantity <= minimumStock ? "low" : "available",
    };

    const adjustmentsRaw = Array.isArray(raw.adjustments) ? (raw.adjustments as RawRecord[]) : [];
    const adjustments = adjustmentsRaw.map(mapAdjustment).sort((a, b) => b.id - a.id);

    const movementsRaw = Array.isArray(raw.movements) ? (raw.movements as RawRecord[]) : [];
    const movements = movementsRaw.map(mapMovement).sort((a, b) => b.id - a.id);

    return { item, batches: [], adjustments, movements };
  },

  async createBatch(input: RawRecord) {
    return api().stockBatches.create(input);
  },
  async updateBatch(id: number, input: RawRecord) {
    return api().stockBatches.update(id, input);
  },
  async removeBatch(id: number) {
    return api().stockBatches.remove(id);
  },
  async adjust(productId: number, input: RawRecord) {
    return api().products.adjustStock(productId, input);
  },
};

export function getInventoryErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "حدث خطأ غير متوقع أثناء تنفيذ عملية المخزون.";
}
