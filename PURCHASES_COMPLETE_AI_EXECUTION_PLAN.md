# Purchases Module — Complete AI Execution Plan

## 1. Goal

Upgrade the existing Purchases module into a complete, production-safe workflow while preserving and hardening the current `createFullPurchaseInvoice` implementation.

The completed Purchases module must support:

- Purchase invoice creation.
- Purchase invoice items.
- Stock batch creation.
- Supplier balance updates.
- Full, partial, and unpaid purchases.
- Initial and later payments.
- Cashbox integration.
- Purchase invoice details and listing.
- Safe purchase cancellation.
- Payment reversal.
- Stock movement history.
- Standard and consignment purchase types.
- Unified IPC APIs.
- No unsafe renderer-facing CRUD.
- Atomic database transactions for all business operations.

---

## 2. Current State Summary

The current `createFullPurchaseInvoice(input, items)` already:

- Validates invoice number exists.
- Validates items array is not empty.
- Starts one SQLite transaction.
- Creates the purchase invoice.
- Creates purchase invoice items.
- Creates one stock batch for each item.
- Sets `remaining_quantity = quantity`.
- Uses the item unit price as purchase price.
- Rolls back on failure.

However, it currently has these issues:

1. Totals are trusted from renderer input.
2. Item `line_total` may be trusted from renderer input.
3. Quantity and unit price are not validated as positive values.
4. Supplier existence and activity are not validated.
5. Product existence and activity are not validated.
6. Invoice date and expiry date are not validated.
7. Paid amount is stored but no payment is created.
8. Cashbox is not updated.
9. Supplier balance is not updated.
10. Partial payment status is not supported.
11. `remaining_amount` is not stored.
12. Invoice status is renderer-controlled.
13. Invoice type and status values are inconsistent.
14. Consignment statuses use values not defined by the original schema.
15. Batch received date always uses invoice date.
16. Duplicate batch code errors are not translated clearly.
17. Invoice-number generation logic is effectively unused.
18. The function requires `invoice_number`, so the fallback generation can never run.
19. No stock movement history is created.
20. No purchase cancellation exists.
21. Unsafe invoice/item CRUD remains exposed.
22. The function returns only the invoice header, not full details.
23. Supplier balance and payment effects are not atomic because they do not exist.
24. Purchase invoice item CRUD allows modifying confirmed invoice items independently.
25. Generic purchase invoice update/delete can break stock and financial consistency.

---

# 3. Non-Negotiable Purchase Rules

## Rule 1

The renderer must never directly control:

```text
subtotal
line_total
total
paid_amount
remaining_amount
status
remaining_quantity
supplier balance
cashbox balance
```

## Rule 2

Every full purchase operation must run inside one backend database transaction.

## Rule 3

Quantity must be greater than zero.

## Rule 4

Purchase price must be zero or greater.

## Rule 5

Every purchase item must create a traceable stock batch or follow one explicit batching policy.

## Rule 6

A confirmed purchase invoice must never be hard deleted.

## Rule 7

Corrections must use cancellation or reversal.

## Rule 8

Purchase cancellation must be rejected if any generated stock has already been consumed.

## Rule 9

Payments must never exceed the invoice outstanding amount.

## Rule 10

The renderer must use business APIs only, not generic invoice/item/payment CRUD.

---

# Phase 1 — Database Review and Migration

## 4. Inspect Existing Tables

Inspect the actual schema for:

```text
purchase_invoices
purchase_invoice_items
stock_batches
stock_movements
payments
suppliers
cashboxes
cashbox_transactions
stock_adjustments
activity_logs
```

Do not assume column names.

---

## 5. Standardize Purchase Invoice Statuses

Recommended statuses:

```text
draft
confirmed
partially_paid
paid
cancelled
```

For consignment purchases, do not store settlement state in the main invoice status.

Use separate fields:

```text
invoice_type = standard | consignment
settlement_status = pending | partially_settled | settled
```

Do not use ad hoc statuses such as:

```text
commission-pending
closed-complete
```

unless the schema explicitly supports them.

---

## 6. Add or Confirm Financial Columns

Ensure `purchase_invoices` supports:

```ts
subtotal decimal(15, 2)
discount decimal(15, 2)
tax decimal(15, 2)
total decimal(15, 2)
paid_amount decimal(15, 2)
remaining_amount decimal(15, 2)
status string
cancelled_at timestamp nullable
cancellation_reason text nullable
```

Backend rule:

```ts
remaining_amount = total - paid_amount
```

---

## 7. Add Consignment Settlement Fields

If consignment is required, add:

```ts
settlement_status string default "pending"
settled_amount decimal(15, 2) default 0
closed_at timestamp nullable
```

Keep consignment settlement separate from payment status.

---

## 8. Stock Movement Table

If no unified stock movement table exists, create:

```text
stock_movements
```

Recommended fields:

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
supplier_id
notes
created_at
```

Required purchase movement types:

```text
purchase_in
purchase_cancel_out
purchase_return_out
```

---

## 9. Invoice Number Uniqueness

Keep or add a unique constraint on:

```text
purchase_invoices.invoice_number
```

Choose one policy:

- Renderer must provide invoice number and backend validates uniqueness.
- Or backend generates invoice number.

Do not require the number and also keep unreachable fallback generation logic.

---

# Phase 2 — Validation and Calculation

## 10. Purchase Input Validator

Create one reusable validator for:

```text
supplier
invoice type
invoice date
items
quantity
unit price
batch code
received date
expiry date
discount
tax
initial payment
cashbox
payment date
```

---

## 11. Purchase Totals Calculator

Create:

```ts
calculatePurchaseTotals(items, discount, tax)
```

Required behavior:

1. Normalize quantity.
2. Normalize unit price.
3. Reject quantity <= 0.
4. Reject unit price < 0.
5. Calculate each line total.
6. Calculate subtotal.
7. Apply discount.
8. Apply tax.
9. Prevent negative final total.
10. Return normalized items and totals.

Recommended output:

```ts
{
  normalizedItems,
  subtotal,
  discount,
  tax,
  total
}
```

---

## 12. Payment Status Calculator

Create:

```ts
calculatePurchasePaymentStatus(total, paidAmount)
```

Rules:

```text
paid = 0 -> confirmed
0 < paid < total -> partially_paid
paid = total -> paid
paid > total -> reject
```

---

## 13. Date Validation

Validate:

```text
invoice_date
received_date
expiry_date
payment_date
```

Rules:

- Valid ISO or `YYYY-MM-DD`.
- `expiry_date >= received_date`.
- Reject malformed dates.

Required errors:

```text
INVALID_INVOICE_DATE
INVALID_RECEIVED_DATE
INVALID_EXPIRY_DATE
INVALID_PAYMENT_DATE
```

---

# Phase 3 — Harden `createFullPurchaseInvoice`

## 14. Preserve the Existing Function

Do not rewrite from scratch unless necessary.

Refactor it into clear internal steps:

```text
validate input
load supplier
load products
calculate totals
begin transaction
create invoice
create items
create batches
create stock movements
update supplier balance
process initial payment
set status
commit
return full details
```

---

## 15. Accepted Input Contract

```ts
type CreatePurchaseInput = {
  supplier_id: number;
  invoice_number: string;
  invoice_type: "standard" | "consignment";
  invoice_date: string;
  discount?: number;
  tax?: number;
  notes?: string | null;

  items: Array<{
    product_id: number;
    quantity: number;
    unit_price: number;
    batch_code?: string | null;
    received_date?: string;
    expiry_date?: string | null;
    notes?: string | null;
    batch_notes?: string | null;
  }>;

  initial_payment?: {
    cashbox_id: number;
    amount: number;
    payment_date: string;
    payment_method?: string;
    reference_number?: string | null;
    notes?: string | null;
  } | null;
};
```

Remove renderer-controlled:

```text
subtotal
line_total
total
paid_amount
remaining_amount
status
remaining_quantity
```

---

## 16. Supplier Validation

Before transaction:

- Supplier must exist.
- Supplier must be active.

Required errors:

```text
SUPPLIER_NOT_FOUND
INACTIVE_SUPPLIER
```

---

## 17. Product Validation

For every item:

- Product must exist.
- Product must be active.

Required errors:

```text
PRODUCT_NOT_FOUND
INACTIVE_PRODUCT
```

---

## 18. Item Validation

For every item:

```text
quantity > 0
unit_price >= 0
```

Do not allow renderer-provided `line_total`.

Calculate:

```ts
lineTotal = quantity * unitPrice
```

---

## 19. Batch Creation Rules

For every item:

```text
product_id = item.product_id
supplier_id = invoice.supplier_id
purchase_invoice_id = created invoice ID
quantity = item.quantity
remaining_quantity = item.quantity
purchase_price = item.unit_price
received_date = item.received_date ?? invoice_date
expiry_date = optional validated date
isActive = true
```

Batch code policy:

- Use provided non-empty batch code.
- Or generate a deterministic unique code.
- Reject duplicates with `DUPLICATE_BATCH_CODE`.

Do not generate from an invoice number without validating uniqueness.

---

## 20. Stock Movement Creation

After every batch creation, insert:

```text
movement_type = purchase_in
quantity = item.quantity
quantity_before = 0
quantity_after = item.quantity
reference_type = purchase
reference_id = purchase_invoice_id
```

Link the movement to the created batch.

---

## 21. Supplier Balance Effect

For a standard purchase:

```ts
supplierPayableIncrease = total - initialPaymentAmount
```

Update supplier balance by the outstanding amount.

If fully paid:

```text
supplier balance effect = 0
```

For consignment:

- Follow the explicitly defined settlement policy.
- Do not automatically apply standard supplier payable rules unless required.

---

## 22. Initial Payment Validation

If initial payment exists:

1. Cashbox must exist.
2. Cashbox must be active.
3. Amount > 0.
4. Amount <= total.
5. Cashbox balance must be sufficient.
6. Currency must be compatible.
7. Payment date must be valid.

Required errors:

```text
CASHBOX_NOT_FOUND
INACTIVE_CASHBOX
PAYMENT_AMOUNT_INVALID
PAYMENT_EXCEEDS_TOTAL
INSUFFICIENT_BALANCE
CASHBOX_CURRENCY_MISMATCH
```

---

## 23. Initial Payment Processing

Inside the same transaction:

1. Create payment.
2. Deduct cashbox balance.
3. Create cashbox movement:
   ```text
   direction = out
   reference_type = purchase
   reference_id = purchase_invoice_id
   ```
4. Store cashbox movement link if supported.
5. Reduce supplier payable effect.
6. Update invoice paid amount.
7. Update remaining amount.
8. Set payment status.

Prefer transaction-aware cashbox business logic rather than direct duplicated SQL.

---

## 24. Full Return Payload

Return:

```ts
{
  invoice,
  supplier,
  items: [
    {
      item,
      product,
      stock_batch,
      stock_movement
    }
  ],
  initial_payment,
  financial_summary
}
```

Do not return only the invoice header.

---

# Phase 4 — Purchase Queries

## 25. Purchase List API

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

Response includes:

```text
invoice number
date
supplier
type
total
paid
remaining
status
```

---

## 26. Purchase Details API

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
  stock_movements,
  financial_summary,
  activity
}
```

---

# Phase 5 — Later Purchase Payments

## 27. `recordPurchasePayment`

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
  payment_method?: string;
  reference_number?: string | null;
  notes?: string | null;
}
```

Required transaction:

1. Load invoice.
2. Reject cancelled invoice.
3. Load supplier.
4. Load cashbox.
5. Verify active cashbox.
6. Calculate outstanding amount.
7. Reject overpayment.
8. Reject insufficient cashbox balance.
9. Create payment.
10. Deduct cashbox.
11. Create cashbox movement.
12. Reduce supplier payable balance.
13. Update invoice paid amount.
14. Update remaining amount.
15. Recalculate status.
16. Commit.

---

## 28. Purchase Payment Reversal

Implement:

```ts
reversePurchasePayment(paymentId, reason)
```

Required behavior:

1. Payment exists.
2. Payment is active.
3. Payment is not already reversed.
4. Increase cashbox balance.
5. Create opposite cashbox movement.
6. Increase supplier payable balance.
7. Reduce invoice paid amount.
8. Increase remaining amount.
9. Recalculate status.
10. Link reversal.
11. Commit.

---

# Phase 6 — Purchase Cancellation

## 29. Implement `cancelPurchaseInvoice`

```ts
cancelPurchaseInvoice(id, reason)
```

Required checks:

- Invoice exists.
- Invoice is not already cancelled.
- Generated batches still contain original remaining quantities.
- No sold or adjusted stock makes cancellation unsafe.
- Payments can be reversed safely.

Required transaction:

1. Load invoice.
2. Load items and generated batches.
3. Verify no batch quantity has been consumed.
4. Reverse active payments.
5. Reverse cashbox effects.
6. Restore supplier balance.
7. Create `purchase_cancel_out` stock movements.
8. Deactivate or remove generated batches according to policy.
9. Mark invoice cancelled.
10. Save reason and timestamp.
11. Preserve invoice and item history.
12. Commit.

Required error:

```text
PURCHASE_CANNOT_BE_CANCELLED_STOCK_USED
```

---

## 30. Batch Cancellation Rule

A purchase can be cancelled only when:

```text
remaining_quantity = original quantity
```

for every generated batch, unless a more advanced return workflow is implemented.

---

# Phase 7 — Editing Policy

## 31. Recommended Policy

Only draft invoices may be edited.

Confirmed invoices should be:

```text
cancelled
then recreated
```

Do not directly update confirmed invoice items or generated batches.

---

## 32. Remove Unsafe Item CRUD

Stop exposing renderer mutation APIs for:

```text
purchaseInvoiceItems.create
purchaseInvoiceItems.update
purchaseInvoiceItems.remove
```

The item controller may remain internal for business-service use.

---

## 33. Remove Unsafe Invoice Mutation

Stop exposing generic:

```text
createPurchaseInvoice
updatePurchaseInvoice
deletePurchaseInvoice
```

for confirmed invoices.

Use:

```text
createFullPurchaseInvoice
updateDraftPurchaseInvoice
cancelPurchaseInvoice
deleteDraftPurchaseInvoice
```

---

# Phase 8 — Consignment Purchases

## 34. Separate Consignment Logic

Do not mix commission settlement states into invoice payment status.

Use:

```text
invoice_type = consignment
settlement_status = pending | partially_settled | settled
```

---

## 35. Harden `closeCommissionInvoice`

Before using it:

- Validate commission percentage range.
- Validate cashbox exists and is active.
- Reject insufficient cashbox balance.
- Prevent repeated closing.
- Use valid schema status values.
- Create stock movements for spoilage.
- Use transaction-aware cashbox logic.
- Define supplier balance direction clearly.
- Preserve settlement details.
- Add `closed_at`.
- Prevent negative cashbox balance.

---

# Phase 9 — Unified IPC APIs

## 36. Required Channels

```text
api:purchase:list
api:purchase:getDetails
api:purchase:createFull
api:purchase:cancel
api:purchase:recordPayment
api:purchase:reversePayment
```

Optional draft channels:

```text
api:purchase:updateDraft
api:purchase:deleteDraft
```

Consignment:

```text
api:purchase:getSalesDetails
api:purchase:closeCommission
```

---

## 37. Unified Response Contract

Every API returns:

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

---

# Phase 10 — Preload Contract

## 38. Purchases API

Expose:

```ts
purchases: {
  list(filters?);
  getDetails(id);
  createFull(input);
  cancel(id, reason);
  recordPayment(id, input);
  reversePayment(paymentId, reason);
}
```

Optional:

```ts
updateDraft(id, input);
deleteDraft(id);
getSalesDetails(id);
closeCommission(id, input);
```

Do not expose generic item or payment mutation.

---

# Phase 11 — Frontend Refactor

## 39. Purchases List Page

Connect:

- real list
- pagination
- search
- supplier filter
- status filter
- type filter
- date filter
- total/paid/remaining
- loading
- error
- retry
- empty state

---

## 40. Purchase Form

Fields:

```text
supplier
invoice number
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
tax
notes
optional initial payment
cashbox
payment amount
payment date
```

Frontend calculations are preview only.

---

## 41. Purchase Details Page

Display:

```text
invoice
supplier
items
generated batches
stock movements
payments
total
paid
remaining
status
cancellation information
```

Actions:

```text
record payment
reverse payment
cancel purchase
print
```

---

## 42. Payment Page

Display:

```text
invoice total
already paid
outstanding
cashbox balance
```

Prevent entering an amount above outstanding, but backend revalidates.

---

## 43. Cancel Purchase UX

Require:

- Confirmation.
- Cancellation reason.
- Explanation that cancellation is blocked if stock has been used.

---

# Phase 12 — Printing

## 44. Purchase Print Contract

Use:

```ts
purchases.getDetails(id)
```

Include:

```text
company settings
invoice number
invoice date
supplier
items
batch details
subtotal
discount
tax
total
paid
remaining
status
notes
```

---

# Phase 13 — Error Codes

## 45. Required Errors

```text
SUPPLIER_NOT_FOUND
INACTIVE_SUPPLIER
PRODUCT_NOT_FOUND
INACTIVE_PRODUCT
INVALID_PURCHASE_QUANTITY
INVALID_PURCHASE_PRICE
INVALID_INVOICE_DATE
INVALID_RECEIVED_DATE
INVALID_EXPIRY_DATE
DUPLICATE_INVOICE_NUMBER
DUPLICATE_BATCH_CODE
CASHBOX_NOT_FOUND
INACTIVE_CASHBOX
PAYMENT_AMOUNT_INVALID
PAYMENT_EXCEEDS_TOTAL
PAYMENT_EXCEEDS_OUTSTANDING
INSUFFICIENT_BALANCE
CASHBOX_CURRENCY_MISMATCH
PURCHASE_NOT_FOUND
PURCHASE_ALREADY_CANCELLED
PURCHASE_INVOICE_LOCKED
PURCHASE_CANNOT_BE_CANCELLED_STOCK_USED
PAYMENT_ALREADY_REVERSED
```

Map all to clear Arabic frontend messages.

---

# Phase 14 — Testing

## 46. Creation Tests

Test:

- unpaid standard purchase
- partially paid purchase
- fully paid purchase
- consignment purchase
- invalid supplier
- inactive supplier
- invalid product
- inactive product
- zero quantity
- negative quantity
- negative unit price
- duplicate invoice number
- duplicate batch code
- invalid dates
- overpayment
- insufficient cashbox balance
- rollback on any item failure

---

## 47. Stock Tests

Test:

- one batch per item
- correct remaining quantity
- stock movement creation
- received date handling
- expiry validation
- multiple items
- rollback removes all batches

---

## 48. Supplier Balance Tests

Test:

- unpaid purchase increases supplier balance by total
- partial payment increases by remaining amount
- full payment leaves no payable increase
- later payment reduces balance
- payment reversal increases balance
- cancellation restores original balance

---

## 49. Cashbox Tests

Test:

- initial payment decreases cashbox
- later payment decreases cashbox
- payment reversal restores cashbox
- insufficient balance blocks payment
- cancellation reverses payments
- rollback on failure

---

## 50. Cancellation Tests

Test:

- cancel unpaid purchase with unused stock
- cancel partially paid purchase
- cancel fully paid purchase
- reject cancellation after stock consumption
- restore supplier balance
- reverse payments
- remove/deactivate batches
- create cancellation stock movements
- double cancellation rejection

---

## 51. API Security Tests

Verify renderer cannot call:

```text
generic purchase create
generic purchase update
generic purchase delete
generic item mutation
generic payment mutation
```

---

# Phase 15 — Acceptance Criteria

The Purchases module is complete only when:

- Backend calculates all totals.
- Quantity cannot be zero or negative.
- Unit price cannot be negative.
- Supplier and products are validated.
- Every item creates a valid batch.
- Stock movement history is created.
- Supplier balance updates atomically.
- Full, partial, and unpaid statuses work.
- Overpayment is impossible.
- Cashbox integration is safe.
- Later payments work.
- Payment reversal works.
- Purchase cancellation reverses all effects.
- Cancellation is blocked after stock consumption.
- Confirmed invoices cannot be hard deleted.
- Unsafe generic APIs are not exposed.
- Invoice numbers and batch codes are unique.
- Details and list APIs are complete.
- Consignment state is separated from payment state.
- Printing uses backend details.
- TypeScript contracts match responses.
- All tests pass.
- Electron development startup succeeds.
- Production build succeeds.
- Database effects are verifiable through debug APIs.

---

# Final Execution Order

1. Inspect schema and current purchase controllers.
2. Create required migration.
3. Add validators and total calculator.
4. Harden `createFullPurchaseInvoice`.
5. Validate supplier and products.
6. Calculate totals in backend.
7. Harden batch creation.
8. Add stock movement history.
9. Add supplier balance effect.
10. Add initial payment logic.
11. Add details API.
12. Add list API.
13. Add later payment.
14. Add payment reversal.
15. Add purchase cancellation.
16. Harden consignment closing.
17. Remove unsafe generic APIs.
18. Update unified IPC.
19. Update preload.
20. Update TypeScript contracts.
21. Refactor Purchases frontend.
22. Connect payment UI.
23. Connect cancellation UI.
24. Connect printing.
25. Run migrations.
26. Run creation tests.
27. Run stock tests.
28. Run supplier balance tests.
29. Run cashbox tests.
30. Run cancellation tests.
31. Run frontend tests.
32. Run Electron integration tests.
33. Run production build.
34. Verify database records through debug APIs.

---

# Final Safety Rule

No Purchase operation may update invoice, stock batch, supplier balance, payment, or cashbox state through isolated generic CRUD.

Every Purchase business operation must use one dedicated backend function and one atomic database transaction.
