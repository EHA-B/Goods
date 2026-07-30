export type SaleStatus = "draft" | "confirmed" | "paid" | "cancelled";
export type PaymentMethod = "cash" | "bank" | "credit_card" | "cheque" | "online";

export type SaleItem = {
  id: number;
  productId: number;
  stockBatchId: number;
  productName: string;
  batchCode: string;
  quantity: number;
  availableQuantity: number;
  unitPrice: number;
  costPrice: number;
  lineTotal: number;
  profit: number;
};

export type SalePayment = {
  id: number;
  saleId: number;
  date: string;
  amount: number;
  method: PaymentMethod;
  cashboxName: string;
  referenceNumber?: string;
  notes?: string;
};

export type SaleInvoice = {
  id: number;
  invoiceNumber: string;
  customerId: number;
  customerName: string;
  saleTypeId: number;
  saleTypeName: string;
  commissionPercentage: number;
  cashboxId?: number;
  cashboxName?: string;
  invoiceDate: string;
  subtotal: number;
  discount: number;
  commissionAmount: number;
  tax: number;
  total: number;
  paidAmount: number;
  status: SaleStatus;
  notes?: string;
  items: SaleItem[];
  payments: SalePayment[];
};

export type SaleDraft = Omit<SaleInvoice, "id" | "invoiceNumber" | "subtotal" | "commissionAmount" | "total" | "paidAmount" | "payments"> & {
  invoiceNumber?: string;
  initialPayment: number;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
};
