import type { CloseConsignmentInput, ConsignmentClosingPreview, ConsignmentInvoiceSummary, ConsignmentSettlement } from "./consignmentTypes";

export const consignmentService = {
  async getSummary(purchaseInvoiceId: number): Promise<ConsignmentInvoiceSummary> {
    return window.stockliteApi.purchases.getConsignmentSummary(purchaseInvoiceId) as Promise<ConsignmentInvoiceSummary>;
  },

  async getCashboxes() {
    const cashboxes = await window.stockliteApi.cashboxes.list();
    return cashboxes.filter((item) => item.isActive);
  },

  async getClosingPreview(purchaseInvoiceId: number, input: CloseConsignmentInput): Promise<ConsignmentClosingPreview> {
    return window.stockliteApi.purchases.previewConsignmentClosing(purchaseInvoiceId, input) as Promise<ConsignmentClosingPreview>;
  },

  async close(purchaseInvoiceId: number, input: CloseConsignmentInput): Promise<ConsignmentSettlement> {
    return window.stockliteApi.purchases.closeCommission(purchaseInvoiceId, input) as Promise<ConsignmentSettlement>;
  },

  async getSettlement(purchaseInvoiceId: number): Promise<ConsignmentSettlement | null> {
    return window.stockliteApi.purchases.getConsignmentSettlement(purchaseInvoiceId) as Promise<ConsignmentSettlement | null>;
  },

  async reverseSettlement(purchaseInvoiceId: number, reason: string): Promise<unknown> {
    return window.stockliteApi.purchases.reverseConsignmentSettlement(purchaseInvoiceId, reason);
  }
};
