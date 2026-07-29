import type { PurchaseDraft, PurchaseInvoice, PurchasePayment } from "../../components/purchases/types";

let purchases: PurchaseInvoice[] = [
  { id: 1, invoiceNumber: "PUR-00041", supplierId: 1, supplierName: "شركة النور للتجارة", purchaseType: "standard", cashboxId: 1, cashboxName: "الصندوق الرئيسي", invoiceDate: "2026-07-25", subtotal: 252000, discount: 2000, tax: 0, total: 250000, paidAmount: 150000, status: "confirmed", notes: "توريد للمستودع الرئيسي", items: [
    { id: 1, productId: 1, productName: "زيت نباتي 1 لتر", quantity: 20, purchasePrice: 9000, lineTotal: 180000, batchCode: "B-2407-01", receivedDate: "2026-07-25", expiryDate: "2027-07-25" },
    { id: 2, productId: 2, productName: "سكر 1 كغ", quantity: 15, purchasePrice: 4800, lineTotal: 72000, batchCode: "B-2407-11", receivedDate: "2026-07-25", expiryDate: "2027-03-10" },
  ], payments: [{ id: 1, purchaseId: 1, date: "2026-07-25", amount: 150000, method: "cash", cashboxName: "الصندوق الرئيسي", referenceNumber: "PAY-2101" }] },
  { id: 2, invoiceNumber: "PUR-00045", supplierId: 2, supplierName: "مؤسسة الخير", purchaseType: "consignment", cashboxId: 1, cashboxName: "الصندوق الرئيسي", invoiceDate: "2026-07-28", subtotal: 90000, discount: 0, tax: 0, total: 90000, paidAmount: 0, status: "draft", notes: "فاتورة أمانة قيد المراجعة", items: [
    { id: 3, productId: 3, productName: "أرز 1 كغ", quantity: 18, purchasePrice: 5000, lineTotal: 90000, batchCode: "B-2407-19", receivedDate: "2026-07-28", expiryDate: "2027-01-15" },
  ], payments: [] },
];

const suppliers = [{ id: 1, name: "شركة النور للتجارة" }, { id: 2, name: "مؤسسة الخير" }, { id: 3, name: "مستودع الشام" }];
const products = [{ id: 1, name: "زيت نباتي 1 لتر" }, { id: 2, name: "سكر 1 كغ" }, { id: 3, name: "أرز 1 كغ" }];
const cashboxes = [{ id: 1, name: "الصندوق الرئيسي" }, { id: 2, name: "صندوق الفرع" }];

export const purchasesService = {
  list: () => [...purchases],
  getById: (id: number) => purchases.find((purchase) => purchase.id === id),
  getLookups: () => ({ suppliers, products, cashboxes }),
  remove: (id: number) => { purchases = purchases.filter((purchase) => purchase.id !== id); },
  save: (draft: PurchaseDraft, id?: number) => {
    const supplier = suppliers.find((item) => item.id === draft.supplierId)!;
    const cashbox = cashboxes.find((item) => item.id === draft.cashboxId);
    const subtotal = draft.items.reduce((sum, item) => sum + item.quantity * item.purchasePrice, 0);
    const total = Math.max(0, subtotal - draft.discount + draft.tax);
    const previous = id ? purchases.find((purchase) => purchase.id === id) : undefined;
    const newId = id ?? Math.max(0, ...purchases.map((purchase) => purchase.id)) + 1;
    const payment: PurchasePayment[] = draft.initialPayment > 0 ? [{ id: Date.now(), purchaseId: newId, date: draft.invoiceDate, amount: draft.initialPayment, method: draft.paymentMethod, cashboxName: cashbox?.name ?? "-", referenceNumber: draft.paymentReference }] : [];
    const saved: PurchaseInvoice = { ...draft, id: newId, invoiceNumber: draft.invoiceNumber || `PUR-${String(newId).padStart(5, "0")}`, supplierName: supplier.name, cashboxName: cashbox?.name, subtotal, total, paidAmount: (previous?.paidAmount ?? 0) + draft.initialPayment, payments: [...(previous?.payments ?? []), ...payment], items: draft.items.map((item, index) => ({ ...item, id: item.id || Date.now() + index, lineTotal: item.quantity * item.purchasePrice })) };
    purchases = previous ? purchases.map((purchase) => purchase.id === id ? saved : purchase) : [saved, ...purchases];
    return saved;
  },
  addPayment: (purchaseId: number, payment: Omit<PurchasePayment, "id" | "purchaseId">) => {
    const purchase = purchases.find((item) => item.id === purchaseId);
    if (!purchase) return;
    purchase.payments = [...purchase.payments, { ...payment, id: Date.now(), purchaseId }];
    purchase.paidAmount += payment.amount;
    if (purchase.paidAmount >= purchase.total) purchase.status = "paid";
  },
};
