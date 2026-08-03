/**
 * cashboxesService.ts
 *
 * Typed API wrappers over window.stockliteApi.cashboxes.
 * No mock data, no local state mutation — all operations go through the backend.
 */

const api = () => window.stockliteApi.cashboxes;

// Note: CashboxApiRecord, CashboxMovementRecord, CashboxDetails, PaginatedCashboxMovements,
// CreateCashboxMovementInput, TransferCashboxesInput, CashboxMovementFilters, CashboxesSummary,
// CashboxSummaryByCurrency, and ReverseTransferResult are declared globally in electron-env.d.ts
// and are available throughout the renderer without importing.

// Arabic error code → user-friendly message mapping
export const CASHBOX_ERROR_MESSAGES: Record<string, string> = {
  INVALID_CURRENCY:                'العملة المحددة غير مدعومة.',
  DUPLICATE_CASHBOX_NAME:          'يوجد صندوق آخر بالاسم نفسه.',
  PARENT_CYCLE:                    'لا يمكن إنشاء علاقة دائرية بين الصناديق.',
  INACTIVE_PARENT_CASHBOX:         'لا يمكن اختيار صندوق غير نشط كصندوق أب.',
  FORBIDDEN_FIELD:                 'لا يمكن تعديل الرصيد مباشرة.',
  CURRENCY_CHANGE_NOT_ALLOWED:     'لا يمكن تغيير العملة بعد تسجيل حركات على الصندوق.',
  INSUFFICIENT_BALANCE:            'رصيد الصندوق غير كافٍ.',
  CURRENCY_MISMATCH:               'لا يمكن التحويل بين صندوقين بعملتين مختلفتين.',
  SAME_CASHBOX_TRANSFER:           'لا يمكن التحويل إلى نفس الصندوق.',
  TRANSFER_REQUIRES_GROUP_REVERSAL:'يجب عكس التحويل كاملًا وليس حركة واحدة فقط.',
  TRANSFER_ALREADY_REVERSED:       'تم عكس هذا التحويل مسبقًا.',
  CASHBOX_IN_USE:                  'لا يمكن حذف الصندوق لوجود حركات أو ارتباطات مرتبطة به.',
  INACTIVE_CASHBOX:                'الصندوق غير نشط.',
  NOT_FOUND:                       'الصندوق غير موجود.',
  MOVEMENT_ALREADY_REVERSED:       'تمت إعادة هذه الحركة مسبقًا.',
  CANNOT_REVERSE_OPENING_BALANCE:  'لا يمكن عكس رصيد الافتتاح مباشرةً.',
  CANNOT_REVERSE_REVERSAL:         'لا يمكن عكس حركة عكس مرةً أخرى.',
  INVALID_TRANSACTION_DATE:        'تنسيق التاريخ غير صحيح. يجب أن يكون YYYY-MM-DD.',
  INSUFFICIENT_BALANCE_FOR_REVERSAL: 'الرصيد غير كافٍ لإتمام عكس التحويل.',
};

/** Translate a backend error code to an Arabic UI message */
export function translateCashboxError(e: unknown): string {
  const err = e as { code?: string; message?: string };
  return CASHBOX_ERROR_MESSAGES[err.code ?? ''] ?? err.message ?? 'حدث خطأ غير متوقع.';
}

export const cashboxesService = {
  /** List all cashboxes */
  list: () => api().list(),

  /** Get a single cashbox */
  get: (id: number) => api().get(id),

  /** Get cashbox with stats and recent movements */
  getDetails: (id: number) => api().getDetails(id),

  /** Multi-currency summary (balancesByCurrency, activeCashboxesCount, inactiveCashboxesCount) */
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

  /** Create a manual income/expense/adjustment movement (atomically updates cashbox balance) */
  createMovement: (input: CreateCashboxMovementInput) => api().createMovement(input),

  /** Transfer between two cashboxes (currency/balance/active validated by backend) */
  transfer: (input: TransferCashboxesInput) => api().transfer(input),

  /** Reverse an approved income/expense/adjustment movement */
  reverseMovement: (transactionId: number, reason: string) =>
    api().reverseMovement(transactionId, reason),

  /** Atomically reverse both sides of a transfer */
  reverseTransfer: (transferGroupId: string, reason: string) =>
    api().reverseTransfer(transferGroupId, reason),
};
