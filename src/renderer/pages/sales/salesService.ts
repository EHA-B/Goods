import type { SaleDraft, SaleInvoice, SalePayment } from "../../components/sales/types";
import { frontendCatalog } from "../../data/frontendCatalog";

let sales: SaleInvoice[] = [
  {
    id: 1,
    invoiceNumber: "SAL-00125",
    customerId: 1,
    customerName: "أحمد الخطيب",
    saleTypeId: 1,
    saleTypeName: "بيع مباشر",
    commissionPercentage: 0,
    cashboxId: 1,
    cashboxName: "الصندوق الرئيسي",
    invoiceDate: "2026-07-27",
    subtotal: 180000,
    discount: 5000,
    commissionAmount: 0,
    tax: 0,
    total: 175000,
    paidAmount: 100000,
    status: "confirmed",
    notes: "تسليم من المستودع الرئيسي",
    items: [
      { id: 1, productId: 1, stockBatchId: 1, productName: "زيت نباتي 1 لتر", batchCode: "B-2407-01", quantity: 10, availableQuantity: 36, unitPrice: 12000, costPrice: 9000, lineTotal: 120000, profit: 30000 },
      { id: 2, productId: 2, stockBatchId: 2, productName: "سكر 1 كغ", batchCode: "B-2407-11", quantity: 10, availableQuantity: 44, unitPrice: 6000, costPrice: 4800, lineTotal: 60000, profit: 12000 },
    ],
    payments: [
      { id: 1, saleId: 1, date: "2026-07-27", amount: 100000, method: "cash", cashboxName: "الصندوق الرئيسي", referenceNumber: "PAY-1001" },
    ],
  },
  {
    id: 2,
    invoiceNumber: "SAL-00131",
    customerId: 2,
    customerName: "مؤسسة النور",
    saleTypeId: 2,
    saleTypeName: "عمولة 5%",
    commissionPercentage: 5,
    cashboxId: 1,
    cashboxName: "الصندوق الرئيسي",
    invoiceDate: "2026-07-28",
    subtotal: 62000,
    discount: 0,
    commissionAmount: 3100,
    tax: 0,
    total: 65100,
    paidAmount: 65100,
    status: "paid",
    items: [
      { id: 3, productId: 3, stockBatchId: 3, productName: "أرز 1 كغ", batchCode: "B-2407-19", quantity: 10, availableQuantity: 18, unitPrice: 6200, costPrice: 5000, lineTotal: 62000, profit: 12000 },
    ],
    payments: [
      { id: 2, saleId: 2, date: "2026-07-28", amount: 65100, method: "bank", cashboxName: "الصندوق الرئيسي", referenceNumber: "TRX-8841" },
    ],
  },
];

const customers = frontendCatalog.customers();
const saleTypes = frontendCatalog.saleTypes();
const cashboxes = frontendCatalog.cashboxes();
const batches = frontendCatalog.stockBatches().map((batch) => {
  const product = frontendCatalog.product(batch.productId)!;
  const supplier = frontendCatalog.supplier(batch.supplierId);
  return { ...batch, productName: product.name, productCode: product.code, unit: product.unit, supplierName: supplier?.name ?? "-" };
});
const products = frontendCatalog.products();

export const salesService = {
  list: () => [...sales],
  getById: (id: number) => sales.find((sale) => sale.id === id),
  getLookups: () => ({ customers, saleTypes, cashboxes, products, batches }),
  remove: (id: number) => { sales = sales.filter((sale) => sale.id !== id); },
  save: (draft: SaleDraft, id?: number) => {
    const customer = customers.find((item) => item.id === draft.customerId)!;
    const saleType = saleTypes.find((item) => item.id === draft.saleTypeId)!;
    const cashbox = cashboxes.find((item) => item.id === draft.cashboxId);
    const subtotal = draft.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const commissionAmount = subtotal * draft.commissionPercentage / 100;
    const total = Math.max(0, subtotal - draft.discount + commissionAmount + draft.tax);
    const previous = id ? sales.find((sale) => sale.id === id) : undefined;
    const newId = id ?? Math.max(0, ...sales.map((sale) => sale.id)) + 1;
    const payment: SalePayment[] = draft.initialPayment > 0 ? [{ id: Date.now(), saleId: newId, date: draft.invoiceDate, amount: draft.initialPayment, method: draft.paymentMethod, cashboxName: cashbox?.name ?? "-", referenceNumber: draft.paymentReference }] : [];
    const saved: SaleInvoice = {
      ...draft,
      id: newId,
      invoiceNumber: draft.invoiceNumber || `SAL-${String(newId).padStart(5, "0")}`,
      customerName: customer.name,
      saleTypeName: saleType.name,
      cashboxName: cashbox?.name,
      subtotal,
      commissionAmount,
      total,
      paidAmount: (previous?.paidAmount ?? 0) + draft.initialPayment,
      payments: [...(previous?.payments ?? []), ...payment],
      items: draft.items.map((item, index) => ({ ...item, id: item.id || Date.now() + index, lineTotal: item.quantity * item.unitPrice, profit: item.quantity * (item.unitPrice - item.costPrice) })),
    };
    sales = previous ? sales.map((sale) => sale.id === id ? saved : sale) : [saved, ...sales];
    return saved;
  },
  addPayment: (saleId: number, payment: Omit<SalePayment, "id" | "saleId">) => {
    const sale = sales.find((item) => item.id === saleId);
    if (!sale) return;
    const saved = { ...payment, id: Date.now(), saleId };
    sale.payments = [...sale.payments, saved];
    sale.paidAmount += payment.amount;
    if (sale.paidAmount >= sale.total) sale.status = "paid";
  },
};
