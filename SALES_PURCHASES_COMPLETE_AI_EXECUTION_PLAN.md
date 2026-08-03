# Sales and Purchases Readiness — Complete AI Execution Plan

## 1. Goal

Prepare the backend, unified IPC APIs, database schema, and renderer contracts so that Sales and Purchases can be connected completely and safely after the Cashboxes execution plan has been implemented.

The final implementation must support:

- Full purchase invoice lifecycle.
- Full sale invoice lifecycle.
- Partial and full payments.
- Customer and supplier balances.
- Cashbox effects.
- Stock batch creation and deduction.
- Invoice cancellation and financial reversal.
- Payment reversal.
- Inventory movement history.
- Consignment purchase handling where applicable.
- Atomic database transactions for every business operation.
- Unified API contracts for the renderer.
- No mock data.
- No direct balance mutation from the frontend.
- No generic CRUD operations for accounting-sensitive actions.

---

# 2. Dependency Assumption

This plan assumes the previous Cashboxes AI Execution Plan has already been completed and verified.

The following cashbox operations must already exist and be production-safe:

```ts
cashboxes.createMovement(...)
cashboxes.transfer(...)
cashboxes.reverseMovement(...)
cashboxes.reverseTransfer(...)
cashboxes.getDetails(...)
cashboxes.getMovements(...)
```

The cashbox module must already guarantee:

- Atomic balance updates.
- Safe movement history.
- Same-currency transfer enforcement.
- No direct renderer balance updates.
- Safe reversal behavior.
- Unified error responses.

Do not begin final Sales or Purchases integration until these cashbox guarantees pass their acceptance tests.

---

# 3. Scope

This plan covers:

## Payments

- Sale invoice payments.
- Purchase invoice payments.
- Partial payments.
- Full payments.
- Customer and supplier balance effects.
- Cashbox effects.
- Payment reversal.
- Payment history.
- Payment validation.

## Purchases

- Purchase invoice list.
- Purchase invoice creation.
- Purchase invoice items.
- Stock batch generation.
- Supplier balance updates.
- Immediate or deferred payment.
- Partial payments.
- Invoice details.
- Invoice editing policy.
- Invoice cancellation.
- Consignment purchases if currently supported.
- Printing data contracts.

## Sales

- Sale invoice list.
- Sale invoice creation.
- Sale invoice items.
- Explicit stock-batch selection.
- Stock deduction.
- Customer balance updates.
- Immediate or deferred payment.
- Partial payments.
- Invoice details.
- Invoice cancellation.
- Payment reversal.
- Printing data contracts.

## Inventory Effects

- Stock movements.
- Batch quantity validation.
- Purchase-created batches.
- Sale deductions.
- Cancellation reversals.

This plan does not cover:

- Advanced tax calculation.
- Multi-currency invoice settlement.
- Complex foreign exchange.
- Credit-note documents beyond cancellation/reversal.
- Full accounting journal entries.
- Profit-and-loss reporting.
- Advanced sales returns and purchase returns unless explicitly added in this plan.

---

# 4. Non-Negotiable Business Rules

## Rule 1

Every operation that changes more than one table must run inside one backend database transaction.

## Rule 2

The renderer must never directly update:

```text
cashbox balance
customer balance
supplier balance
stock batch remaining quantity
invoice paid amount
invoice remaining amount
invoice status
```

## Rule 3

The renderer submits the requested business action only.

The backend calculates all financial and stock effects.

## Rule 4

Generic CRUD must not be exposed for:

```text
payments
sale invoice status changes
purchase invoice status changes
stock deduction
stock restoration
customer balance mutation
supplier balance mutation
cashbox movement creation linked to invoices
```

## Rule 5

Approved payments must never be edited or deleted directly.

Corrections must use reversal operations.

## Rule 6

Approved invoices must not be hard deleted.

Draft invoices may be deleted if they have no effects.

Confirmed invoices must use cancellation with full reversal.

## Rule 7

A sale cannot create negative stock.

## Rule 8

A payment cannot exceed the invoice outstanding amount unless an explicit customer/supplier credit policy is later implemented.

## Rule 9

Every invoice effect must be traceable through:

```text
invoice
invoice items
payment records
cashbox movements
customer/supplier balance changes
stock batches or stock movements
activity logs
```

---

# Phase 1 — Database Review and Migration

## 5. Inspect Existing Tables

Inspect the actual schema for:

```text
purchase_invoices
purchase_invoice_items
sale_invoices
sale_invoice_items
payments
customers
suppliers
cashboxes
cashbox_transactions
stock_batches
stock_adjustments
stock_movements
activity_logs
```

Do not assume column names.

Map the actual schema before editing controllers or APIs.

---

## 6. Standardize Invoice Statuses

Use one consistent lifecycle for both sales and purchases.

Recommended invoice statuses:

```text
draft
confirmed
partially_paid
paid
cancelled
```

Do not use payment status values as document type values.

If consignment purchases exist, keep:

```text
invoice_type = standard | consignment
```

separate from invoice status.

For consignment settlement, use a separate field:

```text
settlement_status =
pending | partially_settled | settled
```

---

## 7. Add or Confirm Invoice Amount Columns

Both invoice tables should contain or derive safely:

```ts
subtotal decimal(15, 2)
discount_amount decimal(15, 2)
total_amount decimal(15, 2)
paid_amount decimal(15, 2)
remaining_amount decimal(15, 2)
```

Rules:

```ts
remaining_amount = total_amount - paid_amount
```

The backend must calculate these values.

The renderer must not submit trusted final totals without backend recalculation from invoice items.

---

## 8. Payment Table Hardening

Ensure `payments` supports:

```ts
id
payment_type
invoice_id
party_type
party_id
cashbox_id
amount
payment_date
notes
status
reversed_payment_id
created_at
updated_at
```

Recommended values:

```text
payment_type = sale | purchase
party_type = customer | supplier
status = active | reversed
```

Make `reversed_payment_id` nullable and indexed.

A payment should link to exactly one invoice.

---

## 9. Add Payment Audit Columns

Recommended:

```ts
cashbox_transaction_id integer nullable
balance_before decimal(15, 2) nullable
balance_after decimal(15, 2) nullable
created_by integer nullable
reversal_reason text nullable
```

`balance_before` and `balance_after` refer to the customer or supplier balance effect where useful.

---

## 10. Stock Movement Table

If no unified stock movement table exists, create:

```text
stock_movements
```

Recommended columns:

```ts
id
product_id
stock_batch_id
movement_type
quantity
quantity_before
quantity_after
reference_type
reference_id
reference_number
supplier_id
customer_id
notes
created_by
created_at
```

Recommended movement types:

```text
purchase_in
sale_out
purchase_cancel_out
sale_cancel_in
sale_return_in
purchase_return_out
adjustment_in
adjustment_out
opening_balance
```

Required indexes:

```text
product_id
stock_batch_id
movement_type
reference_type
reference_id
created_at
```

---

## 11. Invoice Number Constraints

Ensure invoice numbers are unique within their invoice type.

Recommended:

```text
purchase invoice number unique
sale invoice number unique
```

If numbers are generated automatically, generation must occur in the backend transaction.

Do not use `Date.now()` as the final accounting invoice number.

---

## 12. Database Acceptance Criteria

The schema phase passes only if:

- Invoice statuses support draft, confirmed, partially paid, paid, and cancelled.
- Payment reversal links are possible.
- Invoice totals and outstanding values are representable.
- Stock movement history is persistable.
- Foreign keys are defined correctly.
- Required indexes exist.
- Existing records remain intact.
- Migrations run successfully on a database copy.

---

# Phase 2 — Shared Financial Utilities

## 13. Create Shared Validation Utilities

Create reusable backend utilities for:

```text
positive amount validation
date validation
invoice status validation
currency matching
cashbox validation
party validation
outstanding amount calculation
numeric normalization
database error mapping
```

Avoid duplicating slightly different validation logic in sales and purchases.

---

## 14. Shared Invoice Total Calculator

Create one backend utility:

```ts
calculateInvoiceTotals(items, discount)
```

It must:

1. Validate item quantity.
2. Validate item price.
3. Calculate line totals.
4. Calculate subtotal.
5. Apply discount.
6. Prevent negative total.
7. Return normalized values.

Recommended result:

```ts
{
  normalizedItems,
  subtotal,
  discountAmount,
  totalAmount
}
```

---

## 15. Shared Invoice Payment Status Calculator

Create:

```ts
calculatePaymentState(totalAmount, paidAmount)
```

Return:

```ts
{
  remainingAmount,
  status
}
```

Rules:

```text
paid = 0 and total > 0             -> confirmed
0 < paid < total                   -> partially_paid
paid >= total                      -> paid
cancelled invoice                  -> cancelled
```

Draft status is controlled separately.

---

# Phase 3 — Payment Business Module

## 16. Remove Unsafe Generic Payment CRUD

Do not expose renderer APIs that allow:

```text
create raw payment
update payment
delete payment
```

The renderer must use:

```ts
recordSalePayment(...)
recordPurchasePayment(...)
reverseSalePayment(...)
reversePurchasePayment(...)
```

Read-only APIs may remain.

---

## 17. `recordSalePayment`

Implement:

```ts
recordSalePayment(input)
```

Accepted input:

```ts
{
  sale_invoice_id: number;
  cashbox_id: number;
  amount: number;
  payment_date: string;
  notes?: string | null;
}
```

Required transaction:

1. Load sale invoice.
2. Reject draft or cancelled invoice.
3. Load customer.
4. Load cashbox.
5. Verify cashbox is active.
6. Verify currency compatibility.
7. Calculate outstanding amount.
8. Reject `amount <= 0`.
9. Reject amount above outstanding.
10. Create payment.
11. Add money to cashbox through internal cashbox business logic.
12. Create cashbox movement:

```text
direction = in
reference_type = sale
reference_id = sale_invoice_id
```

13. Reduce customer receivable balance.
14. Update invoice `paid_amount`.
15. Update invoice `remaining_amount`.
16. Update invoice status.
17. Create activity log.
18. Commit.
19. Return updated invoice, payment, customer, and cashbox.

---

## 18. `recordPurchasePayment`

Implement:

```ts
recordPurchasePayment(input)
```

Accepted input:

```ts
{
  purchase_invoice_id: number;
  cashbox_id: number;
  amount: number;
  payment_date: string;
  notes?: string | null;
}
```

Required transaction:

1. Load purchase invoice.
2. Reject draft or cancelled invoice.
3. Load supplier.
4. Load cashbox.
5. Verify cashbox is active.
6. Verify currency compatibility.
7. Calculate outstanding amount.
8. Reject `amount <= 0`.
9. Reject amount above outstanding.
10. Reject if cashbox balance is insufficient.
11. Create payment.
12. Deduct money from cashbox through internal cashbox business logic.
13. Create cashbox movement:

```text
direction = out
reference_type = purchase
reference_id = purchase_invoice_id
```

14. Reduce supplier payable balance.
15. Update invoice paid and remaining amounts.
16. Update invoice status.
17. Create activity log.
18. Commit.
19. Return updated invoice, payment, supplier, and cashbox.

---

## 19. Payment Reversal

Implement:

```ts
reverseSalePayment(paymentId, reason)
reversePurchasePayment(paymentId, reason)
```

Required rules:

- Payment must exist.
- Payment must be active.
- Payment must not already be reversed.
- Owning invoice must not be cancelled unless reversal is part of cancellation.
- Reversal must use one database transaction.
- Original payment remains in history.
- Create a reversal payment record or mark the original as reversed with a linked reversal record.
- Reverse cashbox effect.
- Reverse customer or supplier balance effect.
- Recalculate invoice paid and remaining amounts.
- Recalculate invoice status.
- Create activity log.

Do not allow reversal to create a negative customer/supplier balance unless the accounting policy explicitly supports credit balances.

---

## 20. Payment Query APIs

Implement:

```ts
getSalePayments(invoiceId)
getPurchasePayments(invoiceId)
getPayment(paymentId)
```

Return full traceability:

```text
payment
cashbox
invoice
party
status
reversal link
cashbox transaction link
```

---

## 21. Payment Acceptance Criteria

The payment module is ready only when:

- Partial payments work.
- Full payments work.
- Overpayment is rejected.
- Purchase payment checks cashbox balance.
- Sale payment increases cashbox balance.
- Party balances update correctly.
- Payment reversal restores all effects.
- Invoice status recalculates correctly.
- Generic payment mutation APIs are hidden from the renderer.

---

# Phase 4 — Purchases Business Module

## 22. Purchase Invoice Creation Contract

Implement or harden:

```ts
createFullPurchaseInvoice(input)
```

Accepted input:

```ts
{
  supplier_id: number;
  invoice_number?: string;
  invoice_date: string;
  invoice_type: "standard" | "consignment";
  discount_amount?: number;
  notes?: string | null;
  items: Array<{
    product_id: number;
    quantity: number;
    purchase_price: number;
    batch_code?: string | null;
    received_date: string;
    expiry_date?: string | null;
  }>;
  initial_payment?: {
    cashbox_id: number;
    amount: number;
    payment_date: string;
    notes?: string | null;
  } | null;
}
```

---

## 23. `createFullPurchaseInvoice`

Required transaction:

1. Validate supplier.
2. Validate invoice date.
3. Validate invoice type.
4. Validate and normalize items.
5. Load every product.
6. Calculate totals in the backend.
7. Generate or validate invoice number.
8. Insert purchase invoice.
9. Insert invoice items.
10. Create one stock batch per item or according to the defined batching policy.
11. Set:

```text
remaining_quantity = quantity
```

12. Create `purchase_in` stock movements.
13. Increase supplier payable balance by invoice total.
14. If initial payment exists:
    - validate payment
    - validate cashbox
    - deduct cashbox balance
    - create cashbox movement
    - create payment
    - reduce supplier balance
15. Calculate paid and remaining amounts.
16. Set invoice status.
17. Create activity log.
18. Commit.
19. Return full purchase details.

Any failure must roll back everything.

---

## 24. Purchase Stock Batch Rules

For each purchase item:

- `product_id` required.
- `supplier_id` comes from invoice supplier.
- `purchase_invoice_id` comes from the created invoice.
- quantity must be greater than zero.
- purchase price must be zero or greater.
- received date required.
- expiry date optional but must not precede received date.
- `remaining_quantity` is backend-controlled.
- empty batch code becomes `NULL`.
- duplicate non-null batch codes must follow the project uniqueness rule.

---

## 25. Purchase Invoice Details

Implement:

```ts
getPurchaseInvoiceDetails(id)
```

Return:

```ts
{
  invoice,
  supplier,
  items: [
    {
      item,
      product,
      stock_batch
    }
  ],
  payments,
  financial_summary,
  activity
}
```

Do not require the renderer to join unrelated API responses.

---

## 26. Purchase List API

Implement:

```ts
listPurchaseInvoices(filters, pagination)
```

Filters:

```text
search
supplier_id
status
invoice_type
date_from
date_to
payment_status
```

Response:

```ts
{
  items,
  pagination
}
```

---

## 27. Purchase Draft Editing

Recommended policy:

Only draft purchase invoices may be freely edited.

Implement:

```ts
updateDraftPurchaseInvoice(id, input)
```

The operation must:

- recalculate totals
- replace or update items safely
- avoid stock effects until confirmation

If the current application creates confirmed invoices immediately, skip general editing and require cancellation/recreation.

Do not allow arbitrary editing of confirmed invoices with existing stock batches.

---

## 28. Purchase Confirmation

If using draft workflow, implement:

```ts
confirmPurchaseInvoice(id)
```

Confirmation creates:

- stock batches
- stock movements
- supplier balance effect
- optional initial payment effect

All in one transaction.

---

## 29. Purchase Cancellation

Implement:

```ts
cancelPurchaseInvoice(id, reason)
```

Required checks:

- invoice exists
- invoice is not already cancelled
- invoice is not draft unless deletion is more appropriate
- generated stock batches still contain their original remaining quantity
- no quantity from generated batches has been sold or adjusted incompatibly
- payments can be reversed safely

Required transaction:

1. Reverse active purchase payments.
2. Restore cashbox effects.
3. Restore supplier balance.
4. Create `purchase_cancel_out` stock movements.
5. Remove or deactivate generated stock batches according to retention policy.
6. Mark invoice cancelled.
7. Preserve invoice and items for history.
8. Create activity log.
9. Commit.

If any generated batch has been consumed, return:

```text
PURCHASE_CANNOT_BE_CANCELLED_STOCK_USED
```

---

## 30. Purchase Draft Deletion

Implement:

```ts
deleteDraftPurchaseInvoice(id)
```

Allowed only if:

```text
status = draft
no payments
no stock batches
no stock movements
```

Confirmed invoices must never be hard deleted.

---

## 31. Consignment Purchases

If `invoice_type = consignment` is supported, define rules explicitly.

Recommended:

- Stock enters inventory.
- Supplier payable may be deferred according to sold quantity.
- Settlement uses a dedicated operation.
- Do not treat consignment status as invoice status.
- Use `settlement_status`.

Implement only if the current product requirements need it.

Otherwise disable consignment in the renderer until the business rules are complete.

---

# Phase 5 — Sales Business Module

## 32. Sale Invoice Creation Contract

Implement or harden:

```ts
createSaleProcess(input)
```

Accepted input:

```ts
{
  customer_id?: number | null;
  invoice_number?: string;
  invoice_date: string;
  discount_amount?: number;
  notes?: string | null;
  items: Array<{
    product_id: number;
    stock_batch_id: number;
    quantity: number;
    sale_price: number;
  }>;
  initial_payment?: {
    cashbox_id: number;
    amount: number;
    payment_date: string;
    notes?: string | null;
  } | null;
}
```

The customer may be optional only if walk-in cash sales are explicitly supported.

---

## 33. `createSaleProcess`

Required transaction:

1. Validate customer policy.
2. Validate invoice date.
3. Validate items.
4. Load every product.
5. Load every selected stock batch.
6. Verify each batch belongs to the selected product.
7. Verify each batch is active.
8. Verify remaining quantity is sufficient.
9. Calculate totals in the backend.
10. Generate or validate invoice number.
11. Insert sale invoice.
12. Insert sale items.
13. Deduct each batch remaining quantity.
14. Create `sale_out` stock movements.
15. Increase customer receivable balance by invoice total.
16. If initial payment exists:
    - validate cashbox
    - increase cashbox balance
    - create cashbox movement
    - create payment
    - reduce customer balance
17. Calculate invoice paid and remaining amounts.
18. Set invoice status.
19. Create activity log.
20. Commit.
21. Return full sale details.

Any failure must roll back all changes.

---

## 34. Explicit Batch Selection

The renderer must submit:

```text
stock_batch_id
```

for every sale item.

The backend must not silently select FIFO or LIFO unless an explicit automatic allocation mode is later introduced.

The backend must verify:

```text
batch exists
batch belongs to product
batch is active
batch has sufficient remaining quantity
```

---

## 35. Sale Invoice Details

Implement:

```ts
getSaleInvoiceDetails(id)
```

Return:

```ts
{
  invoice,
  customer,
  items: [
    {
      item,
      product,
      stock_batch
    }
  ],
  payments,
  financial_summary,
  activity
}
```

---

## 36. Sale List API

Implement:

```ts
listSaleInvoices(filters, pagination)
```

Filters:

```text
search
customer_id
status
date_from
date_to
payment_status
```

---

## 37. Sale Draft Editing

Recommended:

- Draft invoices may be edited.
- Confirmed invoices should not be arbitrarily edited after stock deduction.

Implement:

```ts
updateDraftSaleInvoice(id, input)
```

If the system confirms immediately, require cancellation and recreation instead of editing confirmed sales.

---

## 38. Sale Cancellation

Implement:

```ts
cancelSaleInvoice(id, reason)
```

Required transaction:

1. Load invoice and items.
2. Reject already-cancelled invoice.
3. Reverse active sale payments.
4. Reverse cashbox effects.
5. Restore customer balance.
6. Add sold quantities back to the exact original stock batches.
7. Create `sale_cancel_in` stock movements.
8. Mark invoice cancelled.
9. Preserve all history.
10. Create activity log.
11. Commit.

The same original stock batches must be restored.

Do not restore quantity to a different batch.

---

## 39. Sale Draft Deletion

Implement:

```ts
deleteDraftSaleInvoice(id)
```

Allowed only if:

```text
status = draft
no stock deduction
no payments
no stock movements
```

---

## 40. Walk-In Customer Policy

Choose one policy:

### Recommended initial policy

Require a customer for credit sales.

Allow a null customer only when:

```text
remaining_amount = 0
```

This prevents unassigned receivables.

If walk-in sales are needed, create a system customer such as:

```text
Walk-in Customer
```

and use that record consistently.

---

# Phase 6 — Returns Policy

## 41. Decide Return Scope

For full production readiness, sales returns and purchase returns should use dedicated documents.

Recommended future tables:

```text
sale_returns
sale_return_items
purchase_returns
purchase_return_items
```

If returns are not currently required, explicitly disable return UI.

Do not simulate returns by editing confirmed invoices.

At minimum, cancellation must work before initial production use.

---

# Phase 7 — Unified IPC APIs

## 42. Required Payment Channels

Add:

```text
api:payment:recordSalePayment
api:payment:recordPurchasePayment
api:payment:reverseSalePayment
api:payment:reversePurchasePayment
api:payment:getSalePayments
api:payment:getPurchasePayments
api:payment:get
```

Remove unsafe renderer-facing payment create/update/delete channels.

---

## 43. Required Purchase Channels

Add:

```text
api:purchase:list
api:purchase:getDetails
api:purchase:createFull
api:purchase:updateDraft
api:purchase:confirm
api:purchase:cancel
api:purchase:deleteDraft
api:purchase:recordPayment
api:purchase:reversePayment
```

Only expose channels that match actual implemented business functions.

---

## 44. Required Sale Channels

Add:

```text
api:sale:list
api:sale:getDetails
api:sale:createProcess
api:sale:updateDraft
api:sale:cancel
api:sale:deleteDraft
api:sale:recordPayment
api:sale:reversePayment
api:sale:getAvailableBatches
```

---

## 45. Unified Response Format

Every API must return:

```ts
{
  success: true,
  data
}
```

or:

```ts
{
  success: false,
  error: {
    code,
    message,
    field?,
    details?
  }
}
```

Do not mix raw controller returns and wrapped API responses.

---

# Phase 8 — Preload Contracts

## 46. Payments API

Expose:

```ts
payments: {
  recordSale(input);
  recordPurchase(input);
  reverseSale(paymentId, reason);
  reversePurchase(paymentId, reason);
  listForSale(invoiceId);
  listForPurchase(invoiceId);
  get(paymentId);
}
```

---

## 47. Purchases API

Expose:

```ts
purchases: {
  list(filters?);
  getDetails(id);
  createFull(input);
  updateDraft(id, input);
  confirm(id);
  cancel(id, reason);
  deleteDraft(id);
  recordPayment(id, input);
  reversePayment(paymentId, reason);
}
```

---

## 48. Sales API

Expose:

```ts
sales: {
  list(filters?);
  getDetails(id);
  createProcess(input);
  updateDraft(id, input);
  cancel(id, reason);
  deleteDraft(id);
  recordPayment(id, input);
  reversePayment(paymentId, reason);
  availableBatches(productId);
}
```

---

# Phase 9 — TypeScript Contracts

## 49. Define Shared Types

Add types for:

```text
InvoiceStatus
PaymentStatus
Payment
PaymentInput
PaymentReversal
InvoicePagination
InvoiceMoneySummary
StockMovement
```

---

## 50. Define Purchase Types

Add:

```text
PurchaseInvoice
PurchaseInvoiceItem
PurchaseInvoiceDetails
CreatePurchaseInvoiceInput
UpdatePurchaseDraftInput
PurchasePaymentInput
PurchaseCancellationResult
```

---

## 51. Define Sale Types

Add:

```text
SaleInvoice
SaleInvoiceItem
SaleInvoiceDetails
CreateSaleInvoiceInput
UpdateSaleDraftInput
SalePaymentInput
SaleCancellationResult
AvailableStockBatch
```

All numeric strings returned by SQLite must be normalized in the renderer service layer.

---

# Phase 10 — Frontend Purchase Refactor

## 52. Remove Purchase Mock Data

Remove all purchase mock arrays and local mutation logic.

The frontend must use unified APIs only.

---

## 53. Purchases Page

Implement:

- real invoice list
- pagination
- search
- supplier filter
- status filter
- date filter
- loading
- error
- retry
- empty state
- payment status
- remaining amount

---

## 54. Purchase Form

Fields:

```text
supplier
invoice date
invoice type
items
product
quantity
purchase price
batch code
received date
expiry date
discount
notes
optional initial payment
cashbox
payment amount
```

The frontend may calculate a preview, but backend totals remain authoritative.

---

## 55. Purchase Details

Display:

- invoice information
- supplier
- items
- generated stock batches
- total
- paid
- remaining
- status
- payments
- cancellation state
- print action

Actions:

```text
record payment
reverse payment
cancel invoice
delete draft
edit draft
```

Show only valid actions for the current status.

---

## 56. Purchase Payment Page

Use:

```ts
payments.recordPurchase(...)
```

Fields:

```text
cashbox
amount
date
notes
```

Display outstanding amount.

Prevent entering a larger value in the UI, but backend must revalidate.

---

# Phase 11 — Frontend Sale Refactor

## 57. Remove Sale Mock Data

Remove sale mock arrays and local stock mutation.

---

## 58. Sales Page

Implement:

- real invoice list
- pagination
- search
- customer filter
- status filter
- date filter
- loading
- error
- retry
- empty state
- paid and remaining amounts

---

## 59. Sale Form

Fields:

```text
customer
invoice date
items
product
stock batch
quantity
sale price
discount
notes
optional initial payment
cashbox
payment amount
```

When product changes:

1. Load available batches.
2. Show batch code.
3. Show supplier where useful.
4. Show remaining quantity.
5. Show expiry date.
6. Prevent selecting an empty or inactive batch.

The backend remains authoritative.

---

## 60. Sale Details

Display:

- invoice information
- customer
- items
- selected stock batches
- total
- paid
- remaining
- status
- payment history
- print action

Actions:

```text
record payment
reverse payment
cancel invoice
delete draft
edit draft
```

---

## 61. Sale Payment Page

Use:

```ts
payments.recordSale(...)
```

Fields:

```text
cashbox
amount
date
notes
```

---

# Phase 12 — Printing

## 62. Purchase Print Contract

Purchase print data must come from:

```ts
purchases.getDetails(id)
```

Do not rebuild invoice joins in the print page.

Include:

```text
company settings
supplier
invoice
items
totals
paid
remaining
status
notes
```

---

## 63. Sale Print Contract

Sale print data must come from:

```ts
sales.getDetails(id)
```

Include:

```text
company settings
customer
invoice
items
totals
paid
remaining
status
notes
```

Ensure Arabic RTL layout.

---

# Phase 13 — Activity Logging

## 64. Required Activity Events

Automatically log:

```text
purchase created
purchase confirmed
purchase cancelled
purchase payment recorded
purchase payment reversed
sale created
sale confirmed
sale cancelled
sale payment recorded
sale payment reversed
```

The renderer must not create activity logs directly.

---

# Phase 14 — Error Codes

## 65. Required Payment Errors

```text
PAYMENT_AMOUNT_INVALID
PAYMENT_EXCEEDS_OUTSTANDING
PAYMENT_ALREADY_REVERSED
INVOICE_NOT_PAYABLE
CASHBOX_CURRENCY_MISMATCH
INSUFFICIENT_BALANCE
```

---

## 66. Required Purchase Errors

```text
SUPPLIER_NOT_FOUND
PURCHASE_ITEM_INVALID
PURCHASE_INVOICE_LOCKED
PURCHASE_ALREADY_CANCELLED
PURCHASE_CANNOT_BE_CANCELLED_STOCK_USED
DUPLICATE_INVOICE_NUMBER
```

---

## 67. Required Sale Errors

```text
CUSTOMER_NOT_FOUND
SALE_ITEM_INVALID
STOCK_BATCH_NOT_FOUND
STOCK_BATCH_PRODUCT_MISMATCH
INSUFFICIENT_STOCK
SALE_INVOICE_LOCKED
SALE_ALREADY_CANCELLED
```

Map all codes to clear Arabic renderer messages.

---

# Phase 15 — Testing

## 68. Payment Tests

Test:

- partial sale payment
- full sale payment
- partial purchase payment
- full purchase payment
- overpayment rejection
- insufficient cashbox balance
- inactive cashbox
- payment reversal
- double reversal rejection
- invoice status recalculation
- party balance recalculation

---

## 69. Purchase Tests

Test:

- create unpaid purchase
- create partially paid purchase
- create fully paid purchase
- stock batch creation
- supplier balance
- cashbox deduction
- rollback on item failure
- cancellation with unused batches
- cancellation rejection when stock was consumed
- payment reversal
- draft deletion

---

## 70. Sale Tests

Test:

- create unpaid sale
- create partially paid sale
- create fully paid sale
- explicit batch deduction
- insufficient stock rejection
- wrong batch/product rejection
- customer balance
- cashbox receipt
- cancellation stock restoration
- payment reversal
- draft deletion
- rollback on any failure

---

## 71. Cross-Module Tests

Test:

- purchase creates stock
- sale consumes purchased stock
- purchase cancellation blocked after sale consumption
- sale cancellation restores exact batch
- payment affects cashbox and party consistently
- payment reversal restores all linked balances
- cancelled invoice cannot receive payment
- different currency cashbox is rejected
- no orphan payment or movement records

---

## 72. Frontend Tests

Test:

- no mock data
- loading states
- error states
- retry
- empty states
- Arabic RTL
- invoice totals preview
- backend total mismatch handling
- payment dialogs
- status-dependent actions
- batch dropdown
- print pages
- no horizontal overflow

---

# Phase 16 — Acceptance Criteria

The project is ready for complete Sales and Purchases frontend integration only when:

- Cashboxes plan is fully completed.
- Payment business APIs are implemented.
- Payment reversal is implemented.
- Customer and supplier balances update atomically.
- Purchase creation creates invoice, items, batches, stock movements, balances, and optional payment atomically.
- Sale creation creates invoice, items, stock deductions, stock movements, balances, and optional payment atomically.
- Overpayment is impossible.
- Negative stock is impossible.
- Purchase cancellation is blocked when generated stock has been consumed.
- Sale cancellation restores exact original batches.
- Confirmed invoices are not hard deleted.
- Payment CRUD is not exposed to the renderer.
- Invoice status is backend-controlled.
- All APIs use the unified response format.
- TypeScript contracts match real payloads.
- No Sales or Purchases mock data remains.
- Printing uses full backend details.
- All listed tests pass.
- Electron development start succeeds.
- Production build succeeds.
- Database effects are verifiable through the debug table API.

---

# Final Execution Order

Implement in this order:

1. Confirm Cashboxes plan completion.
2. Inspect current Sales, Purchases, Payments, and Inventory schemas.
3. Create required migrations.
4. Add shared validation and total calculators.
5. Implement payment business functions.
6. Implement payment reversal.
7. Implement purchase full creation.
8. Implement purchase listing and details.
9. Implement purchase cancellation.
10. Implement sale full creation.
11. Implement sale listing and details.
12. Implement sale cancellation.
13. Add stock movement history.
14. Clean unified IPC APIs.
15. Update preload contracts.
16. Update TypeScript declarations.
17. Refactor Purchases frontend.
18. Refactor Sales frontend.
19. Connect payment pages.
20. Connect print pages.
21. Add activity logging.
22. Run migrations.
23. Run unit tests.
24. Run integration tests.
25. Run Electron end-to-end tests.
26. Run production build.
27. Verify database records using debug APIs.

---

# Final Safety Rule

No invoice, payment, stock, customer balance, supplier balance, or cashbox balance change may be implemented as isolated generic CRUD.

Every business operation must use one dedicated backend function and one atomic database transaction.
