# closeCommissionInvoice Backend — Complete AI Execution Plan

## 1. Goal

Replace the current fragile `closeCommissionInvoice` behavior with a complete, safe, auditable consignment settlement workflow.

The final backend implementation must:

- Settle a consignment purchase invoice exactly once.
- Recalculate sales from authoritative database records.
- Validate commission percentage.
- Validate the settlement cashbox.
- Prevent negative cashbox balances.
- Handle remaining stock through an explicit policy.
- Store settlement details permanently.
- Update supplier balance consistently.
- Create cashbox and stock records atomically.
- Support settlement reversal.
- Prevent duplicate or partial settlement.
- Return complete settlement details.
- Use unified error contracts.

---

# 2. Current Function Risks

The current implementation:

- Accepts invalid commission percentages.
- Does not prevent duplicate closing.
- Can make the cashbox negative.
- Adds supplier balance and pays supplier without clearly reconciling the balance.
- Treats every remaining item as spoilage.
- Directly updates the cashbox instead of using safe cashbox business logic.
- Uses potentially unsupported invoice status values.
- Does not persist full settlement details.
- Has no reversal operation.
- May record stock adjustment direction incorrectly.
- Does not validate the cashbox activity or currency.
- Does not protect against sales changing between preview and settlement.
- Does not define how returns or carry-forward stock work.

---

# 3. Non-Negotiable Settlement Rules

## Rule 1

A consignment invoice may be settled only once unless its settlement was reversed.

## Rule 2

All calculations must be performed by the backend.

## Rule 3

The renderer must not submit trusted totals.

## Rule 4

The settlement must execute in one database transaction.

## Rule 5

The cashbox must never become negative.

## Rule 6

The cashbox currency must match the settlement currency.

## Rule 7

Remaining stock treatment must be explicit.

## Rule 8

Supplier balance meaning must be defined and applied consistently.

## Rule 9

Settlement details must be persisted.

## Rule 10

A settlement reversal must restore all reversible effects atomically.

---

# Phase 1 — Define the Accounting Policy

## 4. Supplier Balance Convention

Choose and document one convention.

Recommended:

```text
positive supplier balance
= amount payable to supplier
```

Under this convention:

- Consignment sales create a payable.
- Paying the supplier reduces that payable.
- If settlement payment is immediate, the net supplier balance effect is zero.

Recommended settlement flow:

```text
increase supplier payable by supplier share
record payment to supplier
decrease supplier payable by supplier share
```

Net:

```text
0
```

Alternatively, do not modify supplier balance at all for an immediate complete settlement, but still create a payment record.

Do not increase the supplier balance and leave it increased after payment.

---

## 5. Remaining Stock Policies

Support:

```text
return_to_supplier
spoilage
carry_forward
```

Required semantics:

### Return to supplier

- Deduct remaining quantity from inventory.
- Create `consignment_return_out` stock movement.
- Record returned quantity.

### Spoilage

- Deduct remaining quantity.
- Create `consignment_spoilage_out` stock movement.
- Require reason when configured.

### Carry forward

- Keep remaining quantity in the stock batch.
- Close only the current settlement period.
- Requires settlement-period support.

If the current schema cannot support repeated periods, disable `carry_forward` initially.

---

# Phase 2 — Database Migration

## 6. Create `consignment_settlements`

Recommended table:

```ts
id
purchase_invoice_id
settlement_number
settlement_date
total_sales_amount
commission_percentage
commission_amount
supplier_share
cashbox_id
cashbox_transaction_id
payment_id nullable
currency
remaining_stock_policy
returned_quantity
spoilage_quantity
carried_quantity
status
reversed_settlement_id nullable
reversal_reason nullable
notes nullable
created_by nullable
created_at
updated_at
```

Recommended status values:

```text
completed
reversed
```

Constraints:

```text
purchase_invoice_id unique for active completed settlement
settlement_number unique
```

Indexes:

```text
purchase_invoice_id
cashbox_id
status
settlement_date
```

---

## 7. Create `consignment_settlement_items`

Recommended table:

```ts
id
settlement_id
purchase_invoice_item_id
product_id
stock_batch_id
received_quantity
sold_quantity
remaining_quantity
sales_amount
resolution_policy
resolved_quantity
stock_movement_id nullable
notes nullable
created_at
```

This permanently stores what was settled.

---

## 8. Purchase Invoice Fields

Add or confirm:

```ts
settlement_status
settled_at
consignment_settlement_id
```

Recommended settlement statuses:

```text
pending
settled
reversed
```

Do not use the general invoice payment status for consignment settlement state.

---

## 9. Stock Movement Types

Add:

```text
consignment_return_out
consignment_spoilage_out
consignment_settlement_reverse_in
```

If carry-forward periods are supported:

```text
consignment_carry_forward
```

---

# Phase 3 — Read and Preview Functions

## 10. `getConsignmentSummary`

Implement:

```ts
getConsignmentSummary(purchaseInvoiceId)
```

Required behavior:

1. Load invoice.
2. Verify `invoice_type = consignment`.
3. Load supplier.
4. Load purchase items and stock batches.
5. Load sale items linked to those batches.
6. Calculate:
   - received quantity
   - sold quantity
   - remaining quantity
   - total sales amount
7. Load existing settlement.
8. Return complete summary.

Use only non-cancelled sale invoices.

Exclude reversed or cancelled sale items according to current schema.

---

## 11. Authoritative Sales Query

The sales query must:

- Join sale items to stock batches.
- Join batches to the purchase invoice.
- Exclude cancelled sale invoices.
- Exclude reversed payments only where financially relevant.
- Sum item `line_total`.
- Sum sold quantity.

Do not trust stored summary values from the renderer.

---

## 12. `previewConsignmentClosing`

Implement:

```ts
previewConsignmentClosing(invoiceId, input)
```

This function performs all validation and calculation without changing the database.

Return:

```ts
{
  total_sales_amount,
  commission_percentage,
  commission_amount,
  supplier_share,
  remaining_quantity,
  stock_resolution_preview,
  cashbox_balance,
  cashbox_balance_after,
  currency,
  calculation_hash
}
```

Generate a `calculation_hash` or version token from:

```text
invoice
sales totals
remaining quantities
input policy
```

The closing request should submit this token.

---

# Phase 4 — Hardened Closing Function

## 13. New Function Signature

Recommended:

```ts
closeCommissionInvoice(invoiceId, {
  commission_percentage,
  cashbox_id,
  settlement_date,
  remaining_stock_policy,
  item_resolutions,
  notes,
  calculation_hash
})
```

---

## 14. Invoice Validation

Inside the transaction:

- Invoice exists.
- `invoice_type = consignment`.
- Settlement status is pending.
- No active completed settlement exists.
- Invoice is not cancelled.
- Invoice is not locked by another operation.

Errors:

```text
PURCHASE_NOT_FOUND
NOT_CONSIGNMENT_INVOICE
CONSIGNMENT_ALREADY_CLOSED
PURCHASE_ALREADY_CANCELLED
```

---

## 15. Commission Validation

Validate numeric value:

```text
0 <= commission_percentage <= 100
```

Recommended stricter policy if required:

```text
0 < commission_percentage < 100
```

Reject NaN and non-finite values.

Error:

```text
INVALID_COMMISSION_PERCENTAGE
```

---

## 16. Cashbox Validation

Load cashbox inside the same transaction.

Validate:

- Exists.
- Active.
- Currency matches.
- Balance is sufficient.
- Amount is positive or zero according to settlement.

Errors:

```text
CASHBOX_NOT_FOUND
INACTIVE_CASHBOX
CASHBOX_CURRENCY_MISMATCH
INSUFFICIENT_BALANCE
```

---

## 17. Recalculate Sales

Inside the closing transaction:

- Re-run the authoritative sales query.
- Recalculate sold quantity and total sales.
- Recalculate remaining quantities.
- Compare with `calculation_hash`.

If changed:

```text
CONSIGNMENT_SALES_CHANGED
```

Require the frontend to refresh and preview again.

---

## 18. Calculate Settlement

Backend calculation:

```ts
commissionAmount =
  roundMoney(
    totalSalesAmount * commissionPercentage / 100
  );

supplierShare =
  roundMoney(
    totalSalesAmount - commissionAmount
  );
```

Use one shared money-rounding utility.

Do not use floating-point values without normalization.

---

## 19. Persist Settlement Header

Insert into:

```text
consignment_settlements
```

Store:

- Invoice.
- Supplier settlement values.
- Cashbox.
- Currency.
- Remaining-stock policy.
- Notes.
- User.
- Date.
- Status.

Generate a unique settlement number.

---

## 20. Persist Settlement Items

For each batch/item, store:

- Received quantity.
- Sold quantity.
- Remaining quantity.
- Sales amount.
- Resolution policy.
- Resolved quantity.

This ensures the settlement can be audited later.

---

# Phase 5 — Remaining Stock Handling

## 21. Return to Supplier

For every resolved batch:

1. Validate resolved quantity.
2. Deduct remaining quantity.
3. Create stock movement:
   ```text
   consignment_return_out
   ```
4. Store before and after quantity.
5. Link movement to settlement item.

Do not create spoilage adjustments.

---

## 22. Spoilage

For every resolved batch:

1. Require a reason if configured.
2. Deduct remaining quantity.
3. Create:
   ```text
   consignment_spoilage_out
   ```
4. Optionally create a compatible stock adjustment record.
5. Store before and after quantity.
6. Link to settlement.

Ensure the adjustment sign matches the stock schema.

---

## 23. Carry Forward

Only support if schema and workflow support repeated settlement periods.

If unsupported:

```text
CARRY_FORWARD_NOT_SUPPORTED
```

Do not silently leave stock while marking the invoice fully closed.

---

# Phase 6 — Supplier and Payment Effects

## 24. Record Supplier Settlement

Recommended immediate-payment flow:

1. Create supplier payable entry if required by the balance model.
2. Create payment record linked to:
   - purchase invoice
   - supplier
   - cashbox
   - settlement
3. Immediately reduce supplier payable by paid amount.
4. Store net supplier balance before and after.

The final supplier balance must reflect the actual unpaid amount.

If settlement is fully paid:

```text
unpaid amount = 0
```

---

## 25. Payment Record

Create a payment with:

```text
payment_type = purchase
reference_type = consignment_settlement
reference_id = settlement_id
supplier_id
cashbox_id
amount = supplier_share
status = active
```

Do not rely only on a cashbox transaction.

---

# Phase 7 — Cashbox Effect

## 26. Use Transaction-Aware Cashbox Logic

Do not update:

```text
cashboxes.balance
```

through duplicated raw SQL unless the shared service explicitly supports the current transaction.

Create internal service:

```ts
cashboxService.createMovementWithDb(db, input)
```

Input:

```ts
{
  cashbox_id,
  direction: "out",
  amount: supplier_share,
  reference_type: "purchase",
  reference_id: purchase_invoice_id,
  notes
}
```

Store `cashbox_transaction_id` in the settlement.

---

# Phase 8 — Finalize Invoice

## 27. Settlement Status

Update:

```text
settlement_status = settled
settled_at = current time
consignment_settlement_id = settlement id
```

Do not use unsupported values such as:

```text
closed-complete
```

The general purchase invoice status may remain:

```text
confirmed
paid
```

according to the final financial policy.

---

## 28. Return Payload

Return:

```ts
{
  invoice,
  supplier,
  settlement,
  settlement_items,
  payment,
  cashbox,
  cashbox_movement,
  stock_movements,
  financial_summary
}
```

---

# Phase 9 — Settlement Reversal

## 29. `reverseCommissionSettlement`

Implement:

```ts
reverseCommissionSettlement(
  settlementId,
  reason
)
```

Required rules:

- Settlement exists.
- Settlement is completed.
- Settlement is not already reversed.
- Reversal is allowed by stock policy.
- Reversal will not make the cashbox negative.
- No later dependent operation blocks reversal.

---

## 30. Reversal Effects

Inside one transaction:

1. Reverse supplier payment.
2. Reverse cashbox movement.
3. Restore supplier balance.
4. Restore returned/spoiled quantities when allowed.
5. Create reverse stock movements.
6. Mark settlement reversed.
7. Update invoice settlement status.
8. Save reversal reason.
9. Preserve all original settlement records.

If spoiled stock cannot legally be restored, require a separate correction policy.

---

# Phase 10 — API Cleanup

## 31. Required APIs

```text
api:purchase:getConsignmentSummary
api:purchase:previewConsignmentClosing
api:purchase:closeCommission
api:purchase:getConsignmentSettlement
api:purchase:reverseConsignmentSettlement
```

---

## 32. Remove Unsafe Exposure

Do not expose a raw settlement-table CRUD API.

Settlement creation and reversal must use business functions only.

---

## 33. Unified Response Contract

Return:

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

# Phase 11 — Error Codes

Required errors:

```text
PURCHASE_NOT_FOUND
NOT_CONSIGNMENT_INVOICE
PURCHASE_ALREADY_CANCELLED
CONSIGNMENT_ALREADY_CLOSED
INVALID_COMMISSION_PERCENTAGE
INVALID_SETTLEMENT_DATE
INVALID_REMAINING_STOCK_POLICY
INVALID_STOCK_RESOLUTION
CARRY_FORWARD_NOT_SUPPORTED
CASHBOX_NOT_FOUND
INACTIVE_CASHBOX
CASHBOX_CURRENCY_MISMATCH
INSUFFICIENT_BALANCE
CONSIGNMENT_SALES_CHANGED
CONSIGNMENT_SETTLEMENT_NOT_FOUND
CONSIGNMENT_SETTLEMENT_ALREADY_REVERSED
CONSIGNMENT_REVERSAL_NOT_ALLOWED
CONSIGNMENT_CLOSE_FAILED
```

---

# Phase 12 — Tests

## 34. Summary Tests

Test:

- Standard invoice rejected.
- Consignment invoice loaded.
- Cancelled sales excluded.
- Sold quantity calculated.
- Remaining quantity calculated.
- Total sales calculated.
- Existing settlement returned.

---

## 35. Preview Tests

Test:

- Valid commission.
- Negative commission rejected.
- Above-100 commission rejected.
- Cashbox missing.
- Cashbox inactive.
- Currency mismatch.
- Insufficient balance.
- Each remaining-stock policy.
- Calculation hash generation.

---

## 36. Closing Tests

Test:

- Successful settlement.
- Settlement with all stock sold.
- Return-to-supplier settlement.
- Spoilage settlement.
- Duplicate closing rejected.
- Sales changed after preview.
- Cashbox rollback on failure.
- Supplier balance correctness.
- Payment record creation.
- Settlement persistence.
- Settlement item persistence.
- Stock movement creation.
- Full rollback on any error.

---

## 37. Reversal Tests

Test:

- Successful reversal.
- Double reversal rejected.
- Cashbox reversal.
- Supplier balance restoration.
- Stock restoration where allowed.
- Reversal blocked by dependent operations.
- Full rollback on failure.

---

# Phase 13 — Acceptance Criteria

The function is complete only when:

- Closing can occur only once.
- Sales are recalculated from the database.
- Commission is validated.
- Cashbox is validated.
- Currency mismatch is rejected.
- Negative balance is impossible.
- Supplier balance is correct after payment.
- Payment record exists.
- Cashbox movement exists.
- Remaining-stock policy is explicit.
- Stock movements are traceable.
- Settlement details are permanently stored.
- Unsupported status values are removed.
- Duplicate closing is impossible.
- Sales changes invalidate the preview.
- Reversal exists and is safe.
- Unified APIs exist.
- All tests pass.
- Database effects are verifiable through debug APIs.

---

# Final Execution Order

1. Define supplier balance convention.
2. Define remaining-stock policies.
3. Create settlement migrations.
4. Add stock movement types.
5. Implement summary query.
6. Implement preview.
7. Add calculation hash.
8. Harden invoice validation.
9. Harden commission validation.
10. Harden cashbox validation.
11. Recalculate sales inside transaction.
12. Persist settlement header.
13. Persist settlement items.
14. Implement return-to-supplier.
15. Implement spoilage.
16. Add supplier/payment logic.
17. Use safe cashbox service.
18. Finalize invoice settlement status.
19. Return full settlement details.
20. Implement settlement retrieval.
21. Implement reversal.
22. Add unified IPC APIs.
23. Update preload and types.
24. Run migrations.
25. Run summary tests.
26. Run preview tests.
27. Run closing tests.
28. Run reversal tests.
29. Run Electron integration tests.
30. Run production build.
31. Verify database records.

---

# Final Safety Rule

A consignment settlement must never be represented by only changing an invoice status.

It must persist the settlement, payment, cashbox effect, supplier effect, and stock resolution atomically.
