export type { InventoryItem, InventoryStatus, StockBatch } from "../../pages/inventory/inventoryService";

export type StockMovementType = "adjustment_in" | "adjustment_out";
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
