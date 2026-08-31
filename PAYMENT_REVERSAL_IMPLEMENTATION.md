# Safe Payment Reversal Implementation

## Scope

This implementation hardens purchase and sale payment reversal without changing inventory quantities, invoice-item editing rules, purchase transport/handling responsibility, drafts, pagination, or unrelated UI.

## Root causes addressed

- Payment reversal previously duplicated accounting logic in controller methods.
- Reversal cashbox movements were not canonically linked to the exact original movement through `reversed_transaction_id`.
- The renderer used `window.prompt()` and did not require backend-verified password protection.
- Cashbox purchase/sale movements intentionally could not be directly reversed, but the UI did not clearly provide a path to manage the related payment.
- Expected payment-reversal domain failures could fall through to a generic unexpected-error message.
- Purchase and sale cancellation had separate payment reversal behavior instead of reusing one authoritative operation.

## Final architecture

`src/controllers/paymentReversalService.js` is the authoritative internal financial reversal implementation for ordinary purchase and sale invoice payments.

For each reversal, inside the caller's SQLite transaction it:

1. Loads and validates the original active payment.
2. Loads the related invoice and party.
3. Loads the exact original cashbox transaction using `payments.cashbox_transaction_id`.
4. Rejects an already-reversed movement using `cashbox_transactions.reversed_transaction_id`.
5. Restores the exact historical cashbox effect using the original cashbox transaction amount/direction.
6. Creates an opposite cashbox transaction linked with `reversed_transaction_id`.
7. Restores the supplier/customer balance using the persisted base amount, with a legacy fallback when needed.
8. Marks the original payment `reversed` without deleting it.
9. Creates an explicit `purchase_reversal` / `sale_reversal` audit payment linked to the reversal cashbox transaction and original payment.
10. Recalculates invoice paid/remaining/status from active original-type payments only.
11. Writes a structured activity log.

The outer purchase/sale controller starts the write transaction with `BEGIN IMMEDIATE TRANSACTION`, so repeat requests are serialized and the operation is atomic.

## Password protection

The Electron IPC handlers for purchase and sale payment reversal verify the current user's password in the backend before invoking the accounting operation. Passwords are not included in accounting activity payloads or technical reversal logs.

## Cashbox behavior

Direct cashbox reversal remains restricted to the existing manual reversible movement types. Purchase/sale payment-generated movements are not raw-reversed from the cashbox controller. The cashbox UI exposes `إدارة الدفعة`, which opens the related invoice, where the same protected payment reversal flow is used. Reversed original movements display `تم عكس الحركة`.

## Multi-currency behavior

The cashbox inverse uses the exact original persisted cashbox transaction amount. Party/base accounting uses persisted `amount_base` when valid and falls back to the historical payment exchange rate for legacy rows. Invoice paid state is recalculated in invoice currency using active payment records and persisted historical conversion data; no current exchange rate is fetched or substituted.

## Invoice cancellation

Purchase and sale invoice cancellation now reuse the same internal payment reversal service for each active payment within the existing cancellation database transaction. After active payments are financially undone, cancellation removes the full original invoice receivable/payable and continues the existing inventory cancellation logic.

## Consignment compatibility

An ordinary purchase payment that is linked to a completed consignment settlement is blocked from direct payment reversal with `PAYMENT_LINKED_CONSIGNMENT_SETTLEMENT`. It must be handled by the dedicated consignment-settlement reversal workflow to avoid bypassing settlement-specific accounting.

## Legacy compatibility

Existing `purchase_refund` behavior is not deleted or reinterpreted by this change. The new reversal path creates explicit `purchase_reversal` / `sale_reversal` audit rows while invoice paid totals continue to count only active `purchase` / `sale` payments. Existing schema columns `reversed_transaction_id`, `reversed_payment_id`, and `reversal_reason` are reused, so no new database migration is required.

## UI and reporting/printing

- Purchase and sale invoice details use a reusable protected `PaymentReversalDialog` instead of `window.prompt()`.
- Reversed original payments remain visible and display their reversal status/reason.
- Global payments distinguish purchase/sale reversal rows and classify their cash direction correctly.
- Printable payment documents and customer/supplier statements understand the reversal payment types.
- Existing reports that compute invoice payment totals continue to use active original payment types only, so audit reversal rows do not inflate paid totals.
- Activity-log Arabic formatting includes the new reversal fields and values.

## Validation performed

- `node --check` passed for all modified JavaScript controllers/services.
- No unresolved Git conflict markers remain.
- Static TypeScript parsing was attempted with the available global `tsc`; the uploaded project has no `node_modules`, so the output contains missing React/Electron/dependency type errors. No new TypeScript parser/conflict-marker errors were found in the modified files after cleanup.
- The final project archive is checked with ZIP integrity testing.

## Files changed

- `electron/apis/Apis.ts`
- `electron/electron-env.d.ts`
- `electron/preload.ts`
- `src/controllers/cashboxController.js`
- `src/controllers/paymentController.js`
- `src/controllers/paymentReversalService.js` (new)
- `src/controllers/printController.js`
- `src/controllers/purchaseInvoiceController.js`
- `src/controllers/saleInvoiceController.js`
- `src/renderer/components/payments/PaymentReversalDialog.tsx` (new)
- `src/renderer/lib/errorMessages.ar.ts`
- `src/renderer/pages/activity-logs/activityLogsUtils.ts`
- `src/renderer/pages/cashboxes/CashboxDetailsPage.tsx`
- `src/renderer/pages/cashboxes/CashboxMovementsPage.tsx`
- `src/renderer/pages/invoices/DocumentPrintPage.tsx`
- `src/renderer/pages/payments/PaymentsPage.tsx`
- `src/renderer/pages/purchases/PurchaseDetailsPage.tsx`
- `src/renderer/pages/purchases/purchasesService.ts`
- `src/renderer/pages/sales/SaleDetailsPage.tsx`
- `src/renderer/pages/sales/salesService.ts`
- `PAYMENT_REVERSAL_IMPLEMENTATION.md` (new)
