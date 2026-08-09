import type { CloseConsignmentInput, ConsignmentClosingPreview, ConsignmentInvoiceSummary, ConsignmentSettlement } from "./consignmentTypes";

export const consignmentService = {
  getSummary: (purchaseInvoiceId: number) =>
    window.stockliteApi.purchases.getConsignmentSummary(purchaseInvoiceId) as Promise<ConsignmentInvoiceSummary>,

  async getCashboxes() {
    const cashboxes = await window.stockliteApi.cashboxes.list();
    return cashboxes.filter((item) => item.isActive);
  },

  getClosingPreview: (purchaseInvoiceId: number, input: CloseConsignmentInput) =>
    window.stockliteApi.purchases.previewConsignmentClosing(purchaseInvoiceId, input) as Promise<ConsignmentClosingPreview>,

  close: (purchaseInvoiceId: number, input: CloseConsignmentInput) =>
    window.stockliteApi.purchases.closeCommission(purchaseInvoiceId, input) as Promise<ConsignmentSettlement>,

  getSettlement: (purchaseInvoiceId: number) =>
    window.stockliteApi.purchases.getConsignmentSettlement(purchaseInvoiceId) as Promise<ConsignmentSettlement | null>,

  reverseSettlement: (settlementId: number, reason: string) =>
    window.stockliteApi.purchases.reverseConsignmentSettlement(settlementId, reason) as Promise<ConsignmentSettlement>,
};
