import type { ConsignmentCashbox, ConsignmentInvoiceSummary, ConsignmentSettlement } from "./consignmentTypes";

export const mockCashboxes: ConsignmentCashbox[] = [
  { id: 1, name: "الصندوق الرئيسي", currency: "SYP", balance: 650000, isActive: true },
  { id: 2, name: "صندوق المبيعات", currency: "SYP", balance: 280000, isActive: true },
  { id: 3, name: "صندوق الدولار", currency: "USD", balance: 1200, isActive: true },
];

export const mockSummaries: Record<number, ConsignmentInvoiceSummary> = {
  2: {
    invoice: { id: 2, invoice_number: "PUR-00045", invoice_date: "2026-07-28", supplier_id: 2, supplier_name: "مؤسسة الخير", invoice_type: "consignment", status: "confirmed", settlement_status: "pending", currency: "SYP" },
    sales: { total_sales_amount: 72000, sold_quantity: 12, sales_count: 5 },
    stock: { received_quantity: 18, sold_quantity: 12, remaining_quantity: 6, damaged_quantity: 0, returned_quantity: 0 },
    items: [
      { purchase_invoice_item_id: 3, product_id: 3, product_name: "أرز 1 كغ", stock_batch_id: 19, batch_code: "B-2407-19", received_quantity: 18, sold_quantity: 12, remaining_quantity: 6, total_sales_amount: 72000, expiry_date: "2027-01-15" },
    ],
    existing_settlement: null,
  },
};

const settlements = new Map<number, ConsignmentSettlement>();
export const getStoredSettlement = (id: number) => settlements.get(id) ?? null;
export const storeSettlement = (id: number, settlement: ConsignmentSettlement) => settlements.set(id, settlement);
