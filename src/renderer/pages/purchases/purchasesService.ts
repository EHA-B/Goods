/**
 * purchasesService.ts — Real API calls to the backend.
 * All mock data has been removed. All mutations go through the hardened business API.
 */

export const purchasesService = {
  /**
   * List all purchase invoices (flat list for the overview page).
   */
  list: () => window.stockliteApi.purchases.list() as unknown as Promise<PurchaseInvoiceRecord[]>,

  /**
   * List filtered + paginated purchase invoices.
   */
  listFiltered: (filters?: InvoiceListFilters, pagination?: PaginationInput) =>
    window.stockliteApi.purchases.list(filters, pagination),

  /**
   * Get a single purchase invoice row.
   */
  getById: (id: number) => window.stockliteApi.purchases.get(id) as Promise<PurchaseInvoiceRecord>,

  /**
   * Get enriched details (supplier, items, payments, financial summary).
   */
  getDetails: (id: number) => window.stockliteApi.purchases.getDetails(id),

  /**
   * Create a full purchase invoice (items, batches, stock movements, optional payment).
   */
  createFull: (input: CreatePurchaseInvoiceInput) =>
    window.stockliteApi.purchases.createFull(input),

  /**
   * Cancel a confirmed/paid invoice. Verifies no stock was sold before cancelling.
   */
  cancel: (id: number, reason: string) =>
    window.stockliteApi.purchases.cancel(id, reason),

  /**
   * Delete a draft invoice (only if it has no payments or stock batches).
   */
  deleteDraft: (id: number) => window.stockliteApi.purchases.deleteDraft(id),

  /**
   * Get stock/sales details for a purchase invoice (consignment tracking).
   */
  getSalesDetails: (id: number) => window.stockliteApi.purchases.getSalesDetails(id),

  /**
   * Close a consignment invoice.
   */
  closeCommission: (id: number, input?: unknown) =>
    window.stockliteApi.purchases.closeCommission(id, input),

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
