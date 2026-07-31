import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { InventoryItem, InventoryStatus, StockBatch, StockMovement } from "../../components/inventory";
import { initialBatches, initialInventory, initialMovements } from "./mockData";

export type StockAdjustmentValues = { productId: number; operation: "add" | "subtract"; quantity: number; notes: string };
export type StockBatchValues = { productId: number; batchCode: string; supplierName: string; quantity: number; purchasePrice: number; receivedDate: string; expiryDate: string; notes: string };

type InventoryContextValue = {
  inventory: InventoryItem[];
  batches: StockBatch[];
  movements: StockMovement[];
  getProduct: (id: number) => InventoryItem | undefined;
  saveAdjustment: (values: StockAdjustmentValues) => void;
  saveBatch: (values: StockBatchValues) => void;
};

const InventoryContext = createContext<InventoryContextValue | null>(null);

function getStatus(quantity: number, minimumStock: number): InventoryStatus {
  if (quantity <= 0) return "out";
  if (quantity <= minimumStock) return "low";
  return "available";
}

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [inventory, setInventory] = useState(initialInventory);
  const [batches, setBatches] = useState(initialBatches);
  const [movements, setMovements] = useState(initialMovements);

  function saveAdjustment(values: StockAdjustmentValues) {
    const product = inventory.find((item) => item.productId === values.productId);
    if (!product) return;
    const signedQuantity = values.operation === "add" ? values.quantity : -values.quantity;
    const nextQuantity = product.totalQuantity + signedQuantity;
    setInventory((current) => current.map((item) => item.productId === values.productId ? {
      ...item,
      totalQuantity: nextQuantity,
      stockValue: nextQuantity * item.averagePurchasePrice,
      status: getStatus(nextQuantity, item.minimumStock),
    } : item));
    setMovements((current) => [{
      id: Date.now(), createdAt: new Date().toLocaleString("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).replace(",", ""),
      productId: product.productId, productName: product.productName, productCode: product.productCode, unit: product.unit,
      type: values.operation === "add" ? "adjustment_in" : "adjustment_out", quantity: signedQuantity, balanceAfter: nextQuantity,
      referenceId: null, referenceNumber: null, stockBatchId: null, batchCode: null, supplierId: null, supplierName: null,
      notes: values.notes || "تسوية مخزون يدوية.",
    }, ...current]);
  }

  function saveBatch(values: StockBatchValues) {
    const product = inventory.find((item) => item.productId === values.productId);
    if (!product) return;
    const batch: StockBatch = {
      id: Date.now(), productId: values.productId, batchCode: values.batchCode,
      supplierId: null, supplierName: values.supplierName || null,
      quantity: values.quantity, remainingQuantity: values.quantity,
      purchasePrice: values.purchasePrice, receivedDate: values.receivedDate,
      expiryDate: values.expiryDate || null, notes: values.notes || null,
    };
    setBatches((current) => [batch, ...current]);
    const nextQuantity = product.totalQuantity + values.quantity;
    const names = values.supplierName && !product.supplierNames.includes(values.supplierName) ? [...product.supplierNames, values.supplierName] : product.supplierNames;
    setInventory((current) => current.map((item) => item.productId === values.productId ? {
      ...item, totalQuantity: nextQuantity, batchesCount: item.batchesCount + 1,
      supplierNames: names, suppliersCount: names.length,
      averagePurchasePrice: values.purchasePrice, stockValue: nextQuantity * values.purchasePrice,
      nearestExpiryDate: values.expiryDate && (!item.nearestExpiryDate || values.expiryDate < item.nearestExpiryDate) ? values.expiryDate : item.nearestExpiryDate,
      status: getStatus(nextQuantity, item.minimumStock),
    } : item));
    setMovements((current) => [{
      id: Date.now() + 1, createdAt: new Date().toLocaleString("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).replace(",", ""),
      productId: product.productId, productName: product.productName, productCode: product.productCode, unit: product.unit,
      type: "purchase", quantity: values.quantity, balanceAfter: nextQuantity,
      referenceId: null, referenceNumber: null, stockBatchId: batch.id, batchCode: batch.batchCode,
      supplierId: null, supplierName: batch.supplierName, notes: values.notes || "إضافة دفعة مخزون.",
    }, ...current]);
  }

  const value = useMemo(() => ({ inventory, batches, movements, getProduct: (id: number) => inventory.find((item) => item.productId === id), saveAdjustment, saveBatch }), [inventory, batches, movements]);
  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) throw new Error("useInventory must be used inside InventoryProvider");
  return context;
}
