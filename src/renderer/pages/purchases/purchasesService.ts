/**
 * Purchases API service.
 * All writes use the hardened purchase/payment business APIs.
 */
export const purchasesService = {
  list: (filters?: InvoiceListFilters, pagination?: PaginationInput) =>
    window.stockliteApi.purchases.list(filters, pagination),

  getById: (id: number) => window.stockliteApi.purchases.get(id),
  getDetails: (id: number) => window.stockliteApi.purchases.getDetails(id),
  createFull: (input: CreatePurchaseInvoiceInput) =>
    window.stockliteApi.purchases.createFull(input),
  addItems: (invoiceId: number, items: unknown) =>
    window.stockliteApi.purchases.addItems(invoiceId, items),
  cancel: (id: number, reason: string) =>
    window.stockliteApi.purchases.cancel(id, reason),
  deleteDraft: (id: number) => window.stockliteApi.purchases.deleteDraft(id),
  recordPayment: (input: RecordPurchasePaymentInput) =>
    window.stockliteApi.purchases.recordPayment(input),
  reversePayment: (paymentId: number, reason: string) =>
    window.stockliteApi.purchases.reversePayment(paymentId, reason),
  getSalesDetails: (id: number) => window.stockliteApi.purchases.getSalesDetails(id),
  closeCommission: (id: number, input?: unknown) =>
    window.stockliteApi.purchases.closeCommission(id, input),

  getLookups: async () => {
    const [suppliersRaw, cashboxesRaw] = await Promise.all([
      window.stockliteApi.suppliers.list(),
      window.stockliteApi.cashboxes.list(),
    ]);
    const suppliers = (suppliersRaw as PartyApiRecord[]).filter((item) => Boolean(item.isActive));
    const cashboxes = (cashboxesRaw as CashboxApiRecord[]).filter((item) => Boolean(item.isActive));
    return { suppliers, cashboxes };
  },

  getProducts: async () => {
    const products = await window.stockliteApi.products.list() as ProductApiRecord[];
    return products.filter((item) => Boolean(item.isActive));
  },
};
