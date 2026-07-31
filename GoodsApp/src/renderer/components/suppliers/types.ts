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

export type SupplierMovementType = "purchase" | "payment" | "stock_batch" | "consignment";

export type SupplierMovement = {
  id: number;
  supplierId: number;
  type: SupplierMovementType;
  reference: string;
  date: string;
  description: string;
  total: number;
  paid: number;
  remaining: number;
  status: "draft" | "confirmed" | "paid" | "cancelled" | "received";
};

export type SupplierBatch = {
  id: number;
  supplierId: number;
  productName: string;
  batchCode: string;
  originalQuantity: number;
  remainingQuantity: number;
  purchasePrice: number;
  receivedAt: string;
  expiryDate?: string;
};
