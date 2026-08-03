import { getStoredSettlement, mockCashboxes, mockSummaries, storeSettlement } from "./consignmentMock";
import type { CloseConsignmentInput, ConsignmentClosingPreview, ConsignmentInvoiceSummary, ConsignmentSettlement } from "./consignmentTypes";

const delay = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));

export const consignmentService = {
  async getSummary(purchaseInvoiceId: number): Promise<ConsignmentInvoiceSummary> {
    await delay();
    const summary = mockSummaries[purchaseInvoiceId];
    if (!summary) throw Object.assign(new Error("Purchase not found"), { code: "PURCHASE_NOT_FOUND" });
    const stored = getStoredSettlement(purchaseInvoiceId);
    return { ...summary, invoice: { ...summary.invoice, settlement_status: stored ? "settled" : summary.invoice.settlement_status }, existing_settlement: stored };
  },
  async getCashboxes() { await delay(120); return mockCashboxes.filter((item) => item.isActive); },
  async getClosingPreview(purchaseInvoiceId: number, input: CloseConsignmentInput): Promise<ConsignmentClosingPreview> {
    const summary = await this.getSummary(purchaseInvoiceId);
    const cashbox = mockCashboxes.find((item) => item.id === input.cashbox_id);
    const commission = Number(input.commission_percentage);
    const commissionAmount = Math.round(summary.sales.total_sales_amount * commission / 100);
    const supplierShare = summary.sales.total_sales_amount - commissionAmount;
    const warnings: string[] = [];
    if (!cashbox) warnings.push("يجب اختيار صندوق صالح.");
    if (cashbox && cashbox.currency !== summary.invoice.currency) warnings.push("عملة الصندوق لا تطابق عملة التسوية.");
    if (cashbox && cashbox.balance < supplierShare) warnings.push("رصيد الصندوق غير كافٍ.");
    if (commission < 0 || commission > 100 || !Number.isFinite(commission)) warnings.push("نسبة العمولة يجب أن تكون بين 0 و100.");
    return { total_sales_amount: summary.sales.total_sales_amount, commission_percentage: commission, commission_amount: commissionAmount, supplier_share: supplierShare, remaining_quantity: summary.stock.remaining_quantity, currency: summary.invoice.currency, cashbox_balance: cashbox?.balance ?? 0, balance_after_settlement: (cashbox?.balance ?? 0) - supplierShare, can_submit: warnings.length === 0, warnings };
  },
  async close(purchaseInvoiceId: number, input: CloseConsignmentInput): Promise<ConsignmentSettlement> {
    await delay(450);
    if (getStoredSettlement(purchaseInvoiceId)) throw Object.assign(new Error("Already closed"), { code: "CONSIGNMENT_ALREADY_CLOSED" });
    const summary = await this.getSummary(purchaseInvoiceId);
    const preview = await this.getClosingPreview(purchaseInvoiceId, input);
    if (!preview.can_submit) throw Object.assign(new Error(preview.warnings[0]), { code: "CONSIGNMENT_CLOSE_FAILED" });
    const cashbox = mockCashboxes.find((item) => item.id === input.cashbox_id)!;
    const settlement: ConsignmentSettlement = {
      id: Date.now(), purchase_invoice_id: purchaseInvoiceId, settlement_number: `CNS-${String(purchaseInvoiceId).padStart(5, "0")}`, settlement_date: input.settlement_date,
      total_sales_amount: preview.total_sales_amount, commission_percentage: preview.commission_percentage, commission_amount: preview.commission_amount, supplier_share: preview.supplier_share,
      cashbox_id: cashbox.id, cashbox_name: cashbox.name, currency: summary.invoice.currency, remaining_stock_policy: input.remaining_stock_policy,
      spoilage_quantity: input.remaining_stock_policy === "spoilage" ? summary.stock.remaining_quantity : 0,
      returned_quantity: input.remaining_stock_policy === "return_to_supplier" ? summary.stock.remaining_quantity : 0,
      carried_quantity: input.remaining_stock_policy === "carry_forward" ? summary.stock.remaining_quantity : 0,
      status: "completed", notes: input.notes ?? null, created_at: new Date().toISOString(),
    };
    storeSettlement(purchaseInvoiceId, settlement);
    return settlement;
  },
  async getSettlement(purchaseInvoiceId: number) { await delay(); return getStoredSettlement(purchaseInvoiceId); },
};
