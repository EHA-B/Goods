/**
 * cashboxesService.ts
 *
 * Typed API wrappers over window.stockliteApi.cashboxes.
 * No mock data, no local state mutation — all operations go through the backend.
 */

const api = () => window.stockliteApi.cashboxes;

// Re-export backend types for use in components
export type { CashboxApiRecord as Cashbox, CashboxDetails, CashboxMovementRecord as CashboxMovement, PaginatedCashboxMovements, CreateCashboxMovementInput, TransferCashboxesInput, CashboxMovementFilters };

export const cashboxesService = {
  /** List all cashboxes */
  list: () => api().list(),

  /** Get a single cashbox */
  get: (id: number) => api().get(id),

  /** Get cashbox with stats and recent movements */
  getDetails: (id: number) => api().getDetails(id),

  /** Summary totals (total_balance, active_count, total_in, total_out) */
  summary: () => api().summary(),

  /** Create a new cashbox (balance is set from initial_balance atomically) */
  create: (input: Partial<CashboxApiRecord> & { name: string }) => api().create(input),

  /** Update allowed fields only (balance/initial_balance are rejected by backend) */
  update: (id: number, input: { name?: string; parent_id?: number | null; currency?: string; isActive?: boolean; notes?: string | null }) =>
    api().update(id, input),

  /** Hard-delete a cashbox (only succeeds if zero balance, no movements, no children) */
  remove: (id: number) => api().remove(id),

  /** Get paginated movements for a cashbox */
  movements: (cashboxId: number, filters?: CashboxMovementFilters) =>
    api().movements(cashboxId, filters),

  /** Create a manual income/expense movement (atomically updates cashbox balance) */
  createMovement: (input: CreateCashboxMovementInput) => api().createMovement(input),

  /** Transfer between two cashboxes (currency/balance/active validated by backend) */
  transfer: (input: TransferCashboxesInput) => api().transfer(input),

  /** Reverse an approved movement */
  reverseMovement: (transactionId: number, reason: string) =>
    api().reverseMovement(transactionId, reason),
};
