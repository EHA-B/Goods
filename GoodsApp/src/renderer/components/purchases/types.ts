export type PurchaseStatus = "draft" | "confirmed" | "paid" | "cancelled";
export type PurchaseType = "standard" | "consignment";
export type PaymentMethod = "cash" | "bank" | "credit_card" | "cheque" | "online";

export type PurchaseItem = {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  purchasePrice: number;
  lineTotal: number;
  batchCode: string;
  receivedDate: string;
  expiryDate?: string;
};

export type PurchasePayment = {
  id: number;
  purchaseId: number;
  date: string;
  amount: number;
  method: PaymentMethod;
  cashboxName: string;
  referenceNumber?: string;
  notes?: string;
};

export type PurchaseInvoice = {
  id: number;
  invoiceNumber: string;
  supplierId: number;
  supplierName: string;
  purchaseType: PurchaseType;
  cashboxId?: number;
  cashboxName?: string;
  invoiceDate: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  status: PurchaseStatus;
  notes?: string;
  items: PurchaseItem[];
  payments: PurchasePayment[];
};

export type PurchaseDraft = Omit<PurchaseInvoice, "id" | "invoiceNumber" | "supplierName" | "subtotal" | "total" | "paidAmount" | "payments"> & {
  invoiceNumber?: string;
  initialPayment: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
};
