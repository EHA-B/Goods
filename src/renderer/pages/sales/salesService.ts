/**
 * salesService.ts — Real API calls to the backend.
 * All mock data has been removed. All mutations go through the hardened business API.
 */

export const salesService = {
  /**
   * List all sale invoices (flat list for the overview page).
   */
  list: () => window.stockliteApi.saleInvoices.list() as Promise<SaleInvoiceRecord[]>,

  /**
   * List filtered + paginated sale invoices.
   */
  listFiltered: (filters?: InvoiceListFilters, pagination?: PaginationInput) =>
    window.stockliteApi.saleInvoices.listFiltered(filters, pagination),

  /**
   * Get a single sale invoice row.
   */
  getById: (id: number) => window.stockliteApi.saleInvoices.get(id) as Promise<SaleInvoiceRecord>,

  /**
   * Get enriched sale invoice details (customer, items, payments, financial summary).
   */
  getDetails: (id: number) => window.stockliteApi.saleInvoices.getDetails(id),

  /**
   * Create a full sale process (stock deduction, customer balance, optional payment).
   */
  createProcess: (input: CreateSaleInvoiceInput) =>
    window.stockliteApi.saleInvoices.createProcess(input),

  /**
   * Cancel a sale invoice. Restores stock, reverses payments.
   */
  cancel: (id: number, reason: string) =>
    window.stockliteApi.saleInvoices.cancel(id, reason),

  /**
   * Delete a draft sale invoice (only if no payments).
   */
  deleteDraft: (id: number) => window.stockliteApi.saleInvoices.deleteDraft(id),

  /**
   * Get available stock batches for a product (for the sale form).
   */
  getAvailableBatches: (productId: number) =>
    window.stockliteApi.saleInvoices.availableBatches(productId),

  // ─── Lookup helpers ─────────────────────────────────────────────────────

  getLookups: async () => {
    const [customers, cashboxes] = await Promise.all([
      window.stockliteApi.customers.list(),
      window.stockliteApi.cashboxes.list(),
    ]);
    return { customers, cashboxes };
  },

  getProducts: () => window.stockliteApi.products.list(),
};
