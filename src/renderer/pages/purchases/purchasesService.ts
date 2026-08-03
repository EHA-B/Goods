/**
 * purchasesService.ts — Real API calls to the backend.
 * All mock data has been removed. All mutations go through the hardened business API.
 */

export const purchasesService = {
  /**
   * List all purchase invoices (flat list for the overview page).
   */
  list: () => window.stockliteApi.purchaseInvoices.list() as Promise<PurchaseInvoiceRecord[]>,

  /**
   * List filtered + paginated purchase invoices.
   */
  listFiltered: (filters?: InvoiceListFilters, pagination?: PaginationInput) =>
    window.stockliteApi.purchaseInvoices.listFiltered(filters, pagination),

  /**
   * Get a single purchase invoice row.
   */
  getById: (id: number) => window.stockliteApi.purchaseInvoices.get(id) as Promise<PurchaseInvoiceRecord>,

  /**
   * Get enriched details (supplier, items, payments, financial summary).
   */
  getDetails: (id: number) => window.stockliteApi.purchaseInvoices.getDetails(id),

  /**
   * Create a full purchase invoice (items, batches, stock movements, optional payment).
   */
  createFull: (input: CreatePurchaseInvoiceInput) =>
    window.stockliteApi.purchaseInvoices.createFull(input),

  /**
   * Cancel a confirmed/paid invoice. Verifies no stock was sold before cancelling.
   */
  cancel: (id: number, reason: string) =>
    window.stockliteApi.purchaseInvoices.cancel(id, reason),

  /**
   * Delete a draft invoice (only if it has no payments or stock batches).
   */
  deleteDraft: (id: number) => window.stockliteApi.purchaseInvoices.deleteDraft(id),

  /**
   * Get stock/sales details for a purchase invoice (consignment tracking).
   */
  getSalesDetails: (id: number) => window.stockliteApi.purchaseInvoices.getSalesDetails(id),

  /**
   * Close a consignment invoice.
   */
  closeCommission: (id: number, input?: unknown) =>
    window.stockliteApi.purchaseInvoices.closeCommission(id, input),

  // ─── Lookup helpers ─────────────────────────────────────────────────────

  getLookups: async () => {
    const [suppliers, cashboxes] = await Promise.all([
      window.stockliteApi.suppliers.list(),
      window.stockliteApi.cashboxes.list(),
    ]);
    return { suppliers, cashboxes };
  },

  getProducts: () => window.stockliteApi.products.list(),
};
