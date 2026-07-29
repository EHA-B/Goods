export type InventoryStatus = "available" | "low" | "out";

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
};

export type StockMovementType =
  | "purchase"
  | "sale"
  | "sale_return"
  | "purchase_return"
  | "adjustment_in"
  | "adjustment_out"
  | "opening_balance";

export type StockMovement = {
  id: number;
  createdAt: string;
  productId: number;
  productName: string;
  productCode: string;
  unit: string;
  type: StockMovementType;
  quantity: number;
  balanceAfter: number;
  referenceId: number | null;
  referenceNumber: string | null;
  stockBatchId: number | null;
  batchCode: string | null;
  supplierId: number | null;
  supplierName: string | null;
  notes: string | null;
};
