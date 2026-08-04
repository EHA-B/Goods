# Financial Transactions Module — Complete AI Execution Plan

## 1. Goal

Upgrade the Financial Transactions module from basic CRUD into a production-safe financial workflow that keeps:

- `transactions`
- `cashboxes`
- `cashbox_transactions`
- transaction categories
- summaries
- activity logs

fully consistent.

The final implementation must ensure that:

- Income increases the selected cashbox balance.
- Expense decreases the selected cashbox balance.
- Expenses cannot exceed the available balance.
- Every financial transaction creates a linked cashbox movement.
- Every balance-changing operation runs atomically in the backend.
- Approved transactions are not edited or deleted unsafely.
- Corrections use cancellation/reversal logic.
- Transaction categories cannot be deleted or retyped when already in use.
- The frontend uses unified APIs only.
- No mock data remains.
- The renderer never calculates or directly persists cashbox balances.

---

# 2. Dependency Assumption

This plan assumes the Cashboxes AI Execution Plan has already been completed.

The following operations must already be production-safe:

```ts
cashboxes.createMovement(...)
cashboxes.reverseMovement(...)
cashboxes.getDetails(...)
cashboxes.getMovements(...)
```

The cashbox module must already guarantee:

- atomic balance updates
- active cashbox validation
- insufficient balance protection
- currency validation
- movement reversal
- no direct renderer balance mutation
- unified response handling

Do not implement duplicated cashbox balance logic inside the Financial Transactions module.

The Financial Transactions module should call internal cashbox business functions or share the same transaction-aware service layer.

---

# 3. Current State Summary

The current project already includes:

- Transaction category CRUD.
- Transaction CRUD.
- Real database connection for transaction pages.
- Transaction list, create, edit, details, and delete screens.
- Category list, create, edit, and delete screens.
- Protection against deleting an in-use category.
- Removal of previous mock transaction data.
- Loading, error, retry, and empty states.

However, the following financial risks remain:

1. Creating a transaction does not update the cashbox balance.
2. Creating a transaction does not create a cashbox movement.
3. Updating a transaction does not reverse the old financial effect.
4. Deleting a transaction does not reverse the cashbox effect.
5. Generic transaction CRUD is still treated as a business operation.
6. No transaction status or cancellation lifecycle exists.
7. No reliable link exists between a transaction and its cashbox movement.
8. Category type may still be changed after use.
9. Financial summaries may include cancelled transactions.
10. Multi-currency values may be combined incorrectly.
11. Pagination and backend filtering are incomplete.
12. Activity logging is incomplete.

---

# 4. Non-Negotiable Financial Rules

## Rule 1

The renderer must never directly update:

```text
cashboxes.balance
cashbox_transactions.balance_before
cashbox_transactions.balance_after
transactions.status
```

## Rule 2

Every transaction that changes a cashbox balance must run in one backend database transaction.

## Rule 3

A transaction must always have exactly one financial effect:

```text
income  -> cashbox movement in
expense -> cashbox movement out
```

## Rule 4

Approved transactions must not be hard deleted.

## Rule 5

Approved transactions must not be edited by simply updating the row.

## Rule 6

Corrections must use:

```text
cancel transaction
reverse transaction
```

while preserving history.

## Rule 7

An expense must never create a negative cashbox balance.

## Rule 8

Transaction category type must not change after the category has been used.

## Rule 9

Different currencies must not be combined in one numeric summary.

## Rule 10

The renderer must use business APIs, not generic CRUD, for financial operations.

---

# Phase 1 — Database Review and Migration

## 5. Inspect Existing Tables

Inspect the actual schema for:

```text
transactions
transaction_categories
cashboxes
cashbox_transactions
activity_logs
```

Confirm actual column names before writing migrations or controller logic.

---

## 6. Harden `transactions`

Add or confirm these columns:

```ts
status string default "active"
cashbox_transaction_id integer nullable
cancelled_at timestamp nullable
cancellation_reason text nullable
reversed_transaction_id integer nullable
created_by integer nullable
created_at timestamp
updated_at timestamp
```

Recommended status values:

```text
active
cancelled
```

Do not use hard deletion for approved financial records.

---

## 7. Add Foreign-Key Links

Recommended relationships:

```text
transactions.cashbox_transaction_id
  -> cashbox_transactions.id
  ON DELETE RESTRICT
```

```text
transactions.reversed_transaction_id
  -> transactions.id
  ON DELETE RESTRICT
```

Add indexes on:

```text
cashbox_transaction_id
reversed_transaction_id
status
transaction_date
category_id
cashbox_id
```

---

## 8. Category Type Rules

Ensure `transaction_categories` contains:

```ts
type = "income" | "expense"
isActive
```

Add or confirm indexes on:

```text
type
isActive
```

Do not change the schema unless necessary, but enforce type locking in backend logic.

---

## 9. Migration Acceptance Criteria

The migration passes only if:

- Existing transactions remain intact.
- New status columns work.
- Cancellation metadata can be stored.
- Transaction-to-cashbox-movement links work.
- Reversal links work.
- Foreign keys remain valid.
- Existing application startup still succeeds.

---

# Phase 2 — Shared Validation and Error Mapping

## 10. Create Shared Validators

Create reusable validators for:

```text
positive amount
valid date
active cashbox
active category
category type
currency compatibility
transaction status
```

Avoid duplicate validation logic across controllers.

---

## 11. Required Error Codes

Use consistent error codes:

```text
VALIDATION_ERROR
NOT_FOUND
INACTIVE_CASHBOX
INACTIVE_CATEGORY
CATEGORY_TYPE_MISMATCH
CATEGORY_IN_USE
CATEGORY_TYPE_LOCKED
INSUFFICIENT_BALANCE
TRANSACTION_ALREADY_CANCELLED
TRANSACTION_LOCKED
CURRENCY_MISMATCH
INVALID_TRANSACTION_DATE
```

---

# Phase 3 — Transaction Category Hardening

## 12. Category Creation

`createTransactionCategory(input)` must validate:

- name is present
- type is `income` or `expense`
- duplicate normalized name/type policy
- status default

Recommended duplicate rule:

Do not allow two active categories with the same normalized name and type.

---

## 13. Category Update

Allow updating:

```text
name
isActive
notes
```

Allow changing `type` only when the category has never been used.

If transactions reference the category, reject type change with:

```text
CATEGORY_TYPE_LOCKED
```

---

## 14. Category Delete

Keep the current protection:

- if category is used, reject with `CATEGORY_IN_USE`
- if unused, allow deletion

Recommended alternative:

Prefer deactivation for used categories.

---

# Phase 4 — Financial Transaction Business Functions

## 15. Remove Unsafe Generic Mutation Flow

Do not let the renderer treat these as final business operations:

```text
transactions.create
transactions.update
transactions.remove
```

The renderer must use:

```ts
createFinancialTransaction(...)
cancelFinancialTransaction(...)
getFinancialTransactionDetails(...)
listFinancialTransactions(...)
```

Read-only generic access may remain internally if needed.

---

## 16. `createFinancialTransaction`

Implement:

```ts
createFinancialTransaction(input)
```

Accepted input:

```ts
{
  type: "income" | "expense";
  category_id: number;
  cashbox_id: number;
  amount: number;
  transaction_date: string;
  description?: string | null;
  notes?: string | null;
}
```

Required validation:

1. Type is valid.
2. Category exists.
3. Category is active.
4. Category type matches transaction type.
5. Cashbox exists.
6. Cashbox is active.
7. Amount is numeric.
8. Amount is greater than zero.
9. Date is valid.
10. Expense does not exceed cashbox balance.
11. Currency rules are respected.

Required backend transaction:

1. Load category.
2. Load cashbox.
3. Validate current cashbox balance.
4. Insert transaction row with `status = active`.
5. Create cashbox movement through internal cashbox business logic:
   - income -> `direction = in`, `reference_type = income`
   - expense -> `direction = out`, `reference_type = expense`
6. Use the created transaction ID as `reference_id`.
7. Store the created cashbox movement ID in `cashbox_transaction_id`.
8. Create activity log.
9. Commit.
10. Return:
   - transaction
   - category
   - cashbox
   - cashbox movement

Any failure must roll back everything.

---

## 17. Amount and Direction Mapping

Use this exact mapping:

```text
transaction type = income
cashbox direction = in
cashbox reference_type = income
```

```text
transaction type = expense
cashbox direction = out
cashbox reference_type = expense
```

Do not infer transaction type from the amount sign.

Store all transaction amounts as positive values.

---

## 18. `getFinancialTransactionDetails`

Implement:

```ts
getFinancialTransactionDetails(id)
```

Return:

```ts
{
  transaction,
  category,
  cashbox,
  cashbox_movement,
  reversal_transaction,
  activity
}
```

The renderer must not join unrelated calls manually.

---

## 19. `listFinancialTransactions`

Implement:

```ts
listFinancialTransactions(filters, pagination)
```

Supported filters:

```text
search
type
category_id
cashbox_id
status
date_from
date_to
currency
```

Response:

```ts
{
  items,
  pagination: {
    page,
    limit,
    total,
    totalPages
  }
}
```

Sort by:

```text
transaction_date DESC
id DESC
```

---

# Phase 5 — Cancellation and Reversal

## 20. Do Not Hard Delete Active Transactions

Remove or stop exposing hard delete for approved transactions.

Draft mode is not necessary for this module unless the product explicitly adds it.

Use cancellation instead.

---

## 21. `cancelFinancialTransaction`

Implement:

```ts
cancelFinancialTransaction(id, reason)
```

Required behavior:

1. Load transaction.
2. Reject if already cancelled.
3. Load linked cashbox movement.
4. Load cashbox.
5. Validate reversal safety.
6. Create opposite cashbox movement:
   - original income -> reversal out
   - original expense -> reversal in
7. Update cashbox balance atomically.
8. Mark transaction as cancelled.
9. Save `cancelled_at`.
10. Save `cancellation_reason`.
11. Link reversal movement or reversal transaction.
12. Create activity log.
13. Commit.
14. Return updated transaction and reversal effect.

Required error:

```text
TRANSACTION_ALREADY_CANCELLED
```

---

## 22. Income Cancellation Safety

Cancelling an income removes money from the cashbox.

Before cancellation, verify:

```text
cashbox balance >= original income amount
```

If not, reject with:

```text
INSUFFICIENT_BALANCE
```

Do not create a negative balance.

---

## 23. Expense Cancellation

Cancelling an expense returns money to the cashbox.

This operation normally increases the balance and should be safe unless other accounting constraints exist.

---

## 24. Prevent Cancellation of Cancellation

Do not allow cancellation or reversal records to be cancelled recursively.

Keep the lifecycle simple:

```text
active -> cancelled
```

---

# Phase 6 — Transaction Update Policy

## 25. Preferred Policy

Do not allow direct editing after creation.

Recommended UI behavior:

- show transaction details
- allow cancellation
- allow creating a replacement transaction

This is safer and preserves audit history.

---

## 26. Minimal Alternative

If editing must remain temporarily:

1. Only allow editing description and notes.
2. Lock:
   - type
   - category
   - cashbox
   - amount
   - transaction date

Do not change financial fields without a full reversal/reapply workflow.

---

# Phase 7 — Summary Logic

## 27. Financial Summary API

Implement:

```ts
getFinancialTransactionsSummary(filters)
```

Return grouped values by currency:

```ts
{
  byCurrency: [
    {
      currency,
      totalIncome,
      totalExpense,
      net
    }
  ],
  activeTransactionsCount,
  cancelledTransactionsCount
}
```

Rules:

- only active transactions affect totals
- cancelled transactions are excluded
- do not add different currencies together

---

## 28. Category Summary

Optional:

```ts
getCategorySummary(filters)
```

Return:

```text
category
type
transaction count
total amount by currency
```

This is useful for future reporting.

---

# Phase 8 — Unified IPC API Cleanup

## 29. Required Channels

Add or confirm:

```text
api:transaction:list
api:transaction:getDetails
api:transaction:createFinancial
api:transaction:cancel
api:transaction:getSummary
```

Category channels:

```text
api:transactionCategory:list
api:transactionCategory:get
api:transactionCategory:create
api:transactionCategory:update
api:transactionCategory:delete
```

---

## 30. Remove Unsafe Renderer Channels

Stop exposing mutation channels such as:

```text
api:transaction:createTransaction
api:transaction:updateTransaction
api:transaction:deleteTransaction
```

unless they are kept strictly internal.

The renderer should only use business-safe APIs.

---

## 31. Unified Response Format

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

---

# Phase 9 — Preload Contract

## 32. Transactions API

Expose:

```ts
transactions: {
  list(filters?);
  getDetails(id);
  createFinancial(input);
  cancel(id, reason);
  summary(filters?);
}
```

Do not expose direct balance-changing CRUD.

---

## 33. Categories API

Expose:

```ts
transactionCategories: {
  list();
  get(id);
  create(input);
  update(id, input);
  remove(id);
}
```

---

# Phase 10 — TypeScript Types

## 34. Transaction Types

Define:

```ts
type FinancialTransactionStatus =
  | "active"
  | "cancelled";
```

```ts
type FinancialTransaction = {
  id: number;
  type: "income" | "expense";
  category_id: number;
  category_name: string;
  cashbox_id: number;
  cashbox_name: string;
  amount: number;
  transaction_date: string;
  description: string | null;
  notes: string | null;
  status: FinancialTransactionStatus;
  cashbox_transaction_id: number | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
};
```

Add input and response types for:

```text
create
details
list
pagination
summary
cancellation
```

---

## 35. Category Types

Define:

```ts
type TransactionCategory = {
  id: number;
  name: string;
  type: "income" | "expense";
  isActive: boolean;
  notes: string | null;
  transactions_count: number;
};
```

---

# Phase 11 — Frontend Refactor

## 36. Transactions Service

Ensure:

```text
src/renderer/pages/transactions/transactionsService.ts
```

contains no mock arrays and no local cashbox mutation.

It should:

- call unified APIs
- normalize SQLite numeric strings
- map backend errors
- expose typed functions

---

## 37. Transactions Page

Implement:

- real transaction list
- pagination
- search
- type filter
- category filter
- cashbox filter
- status filter
- date filter
- loading
- error
- retry
- empty state
- currency-aware summary

Do not crash when the API returns an empty list.

---

## 38. Transaction Form

Fields:

```text
type
category
cashbox
amount
date
description
notes
```

Behavior:

- filter categories by selected type
- filter out inactive categories
- filter out inactive cashboxes
- show current cashbox balance
- prevent expense amount above balance in the UI
- backend remains authoritative

Submit through:

```ts
transactions.createFinancial(...)
```

---

## 39. Transaction Details

Display:

- type
- category
- cashbox
- amount
- date
- description
- notes
- status
- linked cashbox movement
- cancellation information

Actions:

```text
cancel transaction
```

Do not show hard delete for active transactions.

---

## 40. Cancel Transaction UX

Flow:

1. User clicks cancel.
2. Show confirmation dialog.
3. Require cancellation reason.
4. Submit through:
   ```ts
   transactions.cancel(id, reason)
   ```
5. Refresh list, details, summary, and cashbox data.
6. Show success/error toast.

---

## 41. Category Page

Implement:

- real category list
- transaction count
- type filter
- status filter
- loading
- error
- retry
- empty state

Disable delete button when:

```text
transactions_count > 0
```

---

## 42. Category Form

Allow:

```text
name
type
status
notes
```

When editing an in-use category:

- disable type field
- explain that category type cannot be changed after use

---

# Phase 12 — Error Mapping

## 43. Arabic UI Messages

Map:

```text
CATEGORY_IN_USE
لا يمكن حذف التصنيف لأنه مستخدم في معاملات مالية.

CATEGORY_TYPE_LOCKED
لا يمكن تغيير نوع التصنيف بعد استخدامه.

INACTIVE_CATEGORY
التصنيف المحدد غير نشط.

CATEGORY_TYPE_MISMATCH
نوع التصنيف لا يتوافق مع نوع المعاملة.

INACTIVE_CASHBOX
لا يمكن تنفيذ المعاملة على صندوق غير نشط.

INSUFFICIENT_BALANCE
رصيد الصندوق غير كافٍ لتنفيذ المصروف.

TRANSACTION_ALREADY_CANCELLED
تم إلغاء هذه المعاملة مسبقًا.

INVALID_TRANSACTION_DATE
تاريخ المعاملة غير صالح.
```

---

# Phase 13 — Activity Logging

## 44. Required Events

Automatically log:

```text
financial transaction created
financial transaction cancelled
transaction category created
transaction category updated
transaction category deleted
```

The renderer must not create activity logs directly.

---

# Phase 14 — Testing

## 45. Category Tests

Test:

- create income category
- create expense category
- duplicate category rule
- update unused category type
- reject type change after use
- reject delete when used
- delete unused category
- deactivate category

---

## 46. Transaction Creation Tests

Test:

- create income
- create expense
- income increases cashbox balance
- expense decreases cashbox balance
- cashbox movement created
- category type mismatch rejected
- inactive category rejected
- inactive cashbox rejected
- zero amount rejected
- negative amount rejected
- invalid date rejected
- insufficient balance rejected
- rollback on any failure

---

## 47. Cancellation Tests

Test:

- cancel income
- cancel expense
- cashbox effect reversed
- original transaction preserved
- cancellation metadata stored
- double cancellation rejected
- insufficient balance blocks income cancellation
- rollback on failure

---

## 48. Summary Tests

Test:

- active income included
- active expense included
- cancelled transaction excluded
- net calculated correctly
- different currencies grouped separately
- no cross-currency arithmetic

---

## 49. Frontend Tests

Test:

- page no longer crashes
- loading state
- error state
- retry
- empty state
- create form
- category filtering
- insufficient balance warning
- cancellation dialog
- category type lock
- pagination
- Arabic RTL
- no horizontal overflow
- no mock data

---

# Phase 15 — Acceptance Criteria

The module is complete only when:

- Creating income updates the cashbox and creates a movement atomically.
- Creating expense updates the cashbox and creates a movement atomically.
- Expenses cannot create negative balances.
- Transaction and movement are linked.
- Active transactions cannot be hard deleted.
- Cancellation reverses the cashbox effect atomically.
- Category type cannot change after use.
- Used categories cannot be deleted.
- Cancelled transactions are excluded from totals.
- Different currencies are summarized separately.
- Generic unsafe mutation APIs are not exposed to the renderer.
- TypeScript contracts match real payloads.
- No mock transaction data remains.
- The transactions page does not crash.
- All tests pass.
- Electron development startup succeeds.
- Production build succeeds.
- Database effects can be verified through the debug table API.

---

# Final Execution Order

Implement in this order:

1. Confirm Cashboxes plan completion.
2. Inspect transaction and category schema.
3. Create migration.
4. Add shared validators.
5. Harden category rules.
6. Implement `createFinancialTransaction`.
7. Implement transaction details.
8. Implement list and filters.
9. Implement cancellation.
10. Implement summary.
11. Clean unified IPC channels.
12. Update preload.
13. Update TypeScript types.
14. Refactor transaction service.
15. Update transactions page.
16. Update transaction form.
17. Update transaction details.
18. Update category pages.
19. Add error mapping.
20. Add activity logging.
21. Run migrations.
22. Run backend tests.
23. Run frontend tests.
24. Run Electron integration tests.
25. Run production build.
26. Verify database records using debug APIs.

---

# Final Safety Rule

No financial transaction may change a cashbox balance through generic CRUD.

Every balance-changing operation must use one dedicated backend business function and one atomic database transaction.
