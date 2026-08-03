# Cashboxes Module — Complete AI Execution Plan

## 1. Goal

Upgrade the Cashboxes module from its current partially completed state into a production-safe, accounting-consistent module.

The implementation must ensure that:

- Every cashbox balance change is traceable.
- Every balance-changing operation runs atomically in the backend.
- The frontend cannot directly mutate balances.
- Old unsafe transaction CRUD APIs are removed from renderer access.
- Opening balances, manual movements, transfers, reversals, deletion rules, summaries, currencies, and movement history all behave consistently.
- The unified API layer remains the only renderer-to-main communication path.

---

## 2. Current State Summary

The current version already includes:

- Cashbox creation.
- Cashbox updates.
- Cashbox listing.
- Cashbox details.
- Summary APIs.
- Manual movement business logic.
- Same-currency transfer business logic.
- Movement pagination and filtering.
- Movement reversal logic.
- Protected cashbox deletion logic.
- Frontend connection through the unified API layer.
- Removal of mock cashbox data.

However, the following issues remain and must all be fixed:

1. Database schema does not allow new reference types:
   - `opening_balance`
   - `adjustment`
   - `reversal`
2. `reference_id` is still required even when a manual movement has no external reference.
3. `transfer_group_id` is generated but not persisted.
4. Unsafe generic cashbox transaction CRUD remains exposed to the renderer.
5. A single transfer movement can be reversed independently, which can duplicate money.
6. Opening balance is currently counted as regular inflow.
7. Global cashbox summaries incorrectly combine different currencies.
8. Default currency is still `SAR`.
9. Currency validation is weak.
10. Cashbox name duplication policy is undefined.
11. Parent cashbox activation policy is undefined.
12. Movement date validation is weak.
13. Full movement history UX is incomplete.
14. Reversal UX is incomplete.
15. Reversal restrictions for `opening_balance` and `transfer` are incomplete.

---

## 3. Non-Negotiable Accounting Rules

The AI implementation must follow these rules:

### Rule 1

The renderer must never directly set or update:

```ts
balance
initial_balance
balance_before
balance_after
```

### Rule 2

Every balance-changing operation must run inside one backend database transaction.

### Rule 3

Approved movements must never be edited or deleted directly.

### Rule 4

Corrections must use reversals or dedicated business operations.

### Rule 5

Transfers must always create two linked movements:

```text
outgoing movement
incoming movement
```

### Rule 6

A transfer must be reversed as one complete business operation, never one side at a time.

### Rule 7

Different currencies must never be numerically added together in a single summary total.

### Rule 8

The renderer must use only unified business APIs exposed through:

```ts
window.stockliteApi.cashboxes
```

---

## 4. Files to Inspect and Modify

The AI module must inspect the exact project structure before editing, but the expected targets include:

```text
src/controllers/cashboxController.js
src/controllers/cashboxTransactionController.js
electron/apis/Apis.ts
electron/preload.ts
src/renderer/types/stocklite-api.d.ts
src/renderer/pages/cashboxes/cashboxesService.ts
src/renderer/pages/cashboxes/CashboxesPage.tsx
src/renderer/pages/cashboxes/CashboxFormPage.tsx
src/renderer/pages/cashboxes/CashboxDetailsPage.tsx
src/renderer/pages/cashboxes/CashboxTransactionFormPage.tsx
src/renderer/pages/cashboxes/CashboxTransferPage.tsx
src/main/database/migrations/*
```

Also inspect:

```text
cashboxes
cashbox_transactions
payments
sale_invoices
purchase_invoices
```

for foreign keys and deletion dependencies.

---

# Phase 1 — Database Migrations

## 5. Create a New Migration

Do not edit the original initial migration if it has already been applied.

Create a new migration, for example:

```text
20260803_cashbox_accounting_hardening.ts
```

The exact timestamp naming should follow the existing project convention.

---

## 6. Expand `reference_type`

The current allowed values are insufficient.

Target values:

```text
opening_balance
sale
purchase
expense
income
transfer
adjustment
reversal
```

Because SQLite has limitations when altering enum/check constraints, rebuild `cashbox_transactions` safely if required.

The migration must:

1. Create a temporary replacement table.
2. Copy existing data.
3. Preserve IDs.
4. Preserve foreign-key relationships.
5. Replace the old table.
6. Recreate indexes.
7. Re-enable foreign keys.
8. Verify row counts before and after migration.

---

## 7. Make `reference_id` Nullable

Change:

```text
reference_id NOT NULL
```

to:

```text
reference_id NULL
```

Reason:

Manual income, expense, or adjustment movements may exist without an external invoice or transaction record.

---

## 8. Add `transfer_group_id`

Add:

```ts
transfer_group_id string nullable
```

This value must be identical for both movements created by one transfer.

Add an index on:

```text
transfer_group_id
```

---

## 9. Add Reversal Metadata

Add or confirm:

```ts
reversed_transaction_id integer nullable
reversal_reason text nullable
```

Recommended foreign-key rule:

```text
reversed_transaction_id references cashbox_transactions.id
ON DELETE RESTRICT
```

Add an index on:

```text
reversed_transaction_id
```

---

## 10. Confirm Balance Audit Columns

Ensure the table contains:

```ts
balance_before decimal(15, 2)
balance_after decimal(15, 2)
```

If historical rows do not contain these values:

- Backfill only when safely inferable.
- Otherwise leave them nullable.
- Do not invent historical values.

---

## 11. Add Required Indexes

Ensure indexes exist for:

```text
cashbox_id
reference_type
reference_id
transaction_date
transfer_group_id
reversed_transaction_id
```

---

## 12. Migration Acceptance Criteria

The migration passes only if:

- Existing rows remain intact.
- New reference types can be inserted.
- `reference_id = NULL` is accepted.
- Both sides of a transfer can store the same `transfer_group_id`.
- Foreign keys remain valid.
- The application starts normally after migration.

---

# Phase 2 — Backend Business Logic

## 13. Cashbox Creation

Review:

```js
createCashbox(input)
```

Required behavior:

1. Validate name.
2. Validate currency.
3. Validate parent cashbox.
4. Reject negative opening balance.
5. Ignore or reject incoming `balance`.
6. Set:

```ts
balance = initial_balance
```

7. Insert the cashbox.
8. If `initial_balance > 0`, create an opening-balance movement.
9. Use one database transaction.
10. Return the created cashbox and opening movement.

Opening movement:

```ts
{
  cashbox_id,
  direction: "in",
  amount: initial_balance,
  reference_type: "opening_balance",
  reference_id: cashbox_id,
  balance_before: 0,
  balance_after: initial_balance
}
```

---

## 14. Default Currency

Replace:

```text
SAR
```

with:

```text
SYP
```

unless the project already has a configured business currency.

Preferred source order:

1. Company/application currency setting.
2. Explicit user-selected currency.
3. Fallback to `SYP`.

Do not silently default to `SAR`.

---

## 15. Currency Validation

Introduce one shared currency validator.

Initial allowed set:

```ts
const ALLOWED_CURRENCIES = new Set([
  "SYP",
  "USD",
  "EUR",
  "SAR",
]);
```

Adjust the set only if the project explicitly supports other currencies.

Reject unknown values with:

```text
INVALID_CURRENCY
```

---

## 16. Cashbox Name Duplication Policy

Adopt one of these policies and implement it consistently.

Recommended policy:

- Active cashboxes must not share the same normalized name under the same parent.
- Inactive cashboxes may retain historical names.

Normalize using:

```text
trim
case normalization
Arabic whitespace normalization where appropriate
```

Return:

```text
DUPLICATE_CASHBOX_NAME
```

---

## 17. Parent Cashbox Validation

The backend must reject:

- parent equals self
- indirect parent cycle
- missing parent
- optionally, inactive parent

Recommended policy:

Do not allow assigning a new or edited cashbox to an inactive parent.

Return:

```text
PARENT_CYCLE
INACTIVE_PARENT_CASHBOX
```

---

## 18. Restrict Cashbox Update Fields

`updateCashbox(id, input)` may update only:

```text
name
parent_id
currency
isActive
notes
```

Reject these fields:

```text
balance
initial_balance
```

with:

```text
FORBIDDEN_FIELD
```

---

## 19. Currency Change Restriction

Do not allow currency changes when the cashbox already has:

- movements
- linked payments
- linked invoices
- child cashboxes using inherited assumptions

Return:

```text
CURRENCY_CHANGE_NOT_ALLOWED
```

---

## 20. Manual Cashbox Movement

Review or implement:

```js
createCashboxMovement(input)
```

Accepted input:

```ts
{
  cashbox_id: number;
  direction: "in" | "out";
  amount: number;
  reference_type: "income" | "expense" | "adjustment";
  reference_id?: number | null;
  transaction_date?: string;
  notes?: string | null;
}
```

Required validation:

- cashbox exists
- cashbox is active
- amount is numeric
- amount > 0
- direction is valid
- reference type is valid
- date is valid
- outgoing amount does not exceed balance

Required transaction:

1. Read latest balance.
2. Calculate new balance.
3. Update cashbox.
4. Insert movement.
5. Store `balance_before`.
6. Store `balance_after`.
7. Commit.
8. Return movement and updated cashbox.

Error codes:

```text
VALIDATION_ERROR
NOT_FOUND
INACTIVE_CASHBOX
INSUFFICIENT_BALANCE
INVALID_TRANSACTION_DATE
```

---

## 21. Movement Date Validation

Accept only:

```text
YYYY-MM-DD
```

or a validated ISO timestamp if the project already uses timestamps.

Reject invalid dates.

Do not rely on SQLite to silently coerce malformed strings.

---

## 22. Same-Currency Transfer

Review or implement:

```js
transferBetweenCashboxes(input)
```

Required validation:

- source exists
- destination exists
- source != destination
- both active
- amount > 0
- same currency
- sufficient source balance

Required transaction:

1. Generate `transfer_group_id`.
2. Update source balance.
3. Insert outgoing movement.
4. Update destination balance.
5. Insert incoming movement.
6. Store the same `transfer_group_id` in both.
7. Store before/after balances.
8. Commit.
9. Return both cashboxes and movements.

Error codes:

```text
SAME_CASHBOX_TRANSFER
INACTIVE_CASHBOX
INSUFFICIENT_BALANCE
CURRENCY_MISMATCH
```

---

## 23. Prevent Single-Side Transfer Reversal

Update:

```js
reverseCashboxMovement(transactionId, reason)
```

If:

```text
reference_type = transfer
```

reject the operation with:

```text
TRANSFER_REQUIRES_GROUP_REVERSAL
```

---

## 24. Implement `reverseCashboxTransfer`

Add:

```js
reverseCashboxTransfer(transferGroupId, reason)
```

Required behavior:

1. Load both movements by `transfer_group_id`.
2. Verify exactly one incoming and one outgoing movement exist.
3. Verify neither has already been reversed.
4. Load both cashboxes.
5. Verify reversal will not produce an invalid balance.
6. Create two opposite reversal movements.
7. Update both cashbox balances.
8. Link each reversal to its original movement.
9. Execute all operations in one transaction.
10. Return both reversal movements and updated cashboxes.

Error codes:

```text
TRANSFER_NOT_FOUND
INVALID_TRANSFER_GROUP
TRANSFER_ALREADY_REVERSED
INSUFFICIENT_BALANCE_FOR_REVERSAL
```

---

## 25. Movement Reversal Restrictions

`reverseCashboxMovement` must reject:

```text
opening_balance
transfer
reversal
```

Reason:

- `opening_balance` must be corrected by a dedicated opening-balance correction policy.
- `transfer` must use grouped reversal.
- `reversal` must not be reversed recursively.

Allowed initial reversal targets:

```text
income
expense
adjustment
```

Sales and purchase-related movements should later be reversed by their owning business modules.

---

## 26. Opening Balance Correction Policy

Recommended policy:

Do not reverse the opening movement directly.

Provide a dedicated operation:

```js
adjustOpeningBalance(cashboxId, newOpeningBalance, reason)
```

Only allow it when:

- no later movements exist

Otherwise reject and require a manual adjustment movement.

This prevents rewriting cashbox history after operational use.

---

## 27. Cashbox Deletion Policy

Hard deletion is allowed only if:

```text
balance = 0
no movements
no child cashboxes
no payments
no sale invoices
no purchase invoices
no transaction links
```

Otherwise return:

```text
CASHBOX_IN_USE
```

The UI should offer deactivation instead.

---

# Phase 3 — Summary Logic

## 28. Exclude Opening Balance from Operational Inflow

Operational summary fields:

```text
total_in
total_out
```

must exclude:

```text
reference_type = opening_balance
```

Add a separate field:

```ts
opening_balance_total
```

This keeps operational activity separate from initial funding.

---

## 29. Multi-Currency Summary

Do not return one combined balance across different currencies.

Replace:

```ts
total_balance: number
```

with:

```ts
balancesByCurrency: Array<{
  currency: string;
  balance: number;
  totalIn: number;
  totalOut: number;
  openingBalance: number;
}>;
```

Also return:

```ts
activeCashboxesCount: number;
inactiveCashboxesCount: number;
```

If the application is explicitly single-currency, enforce that at cashbox creation and still return the currency with the total.

---

## 30. Cashbox Details Summary

`getCashboxDetails(id)` should return:

```ts
{
  cashbox,
  summary: {
    operational_in,
    operational_out,
    opening_balance,
    movements_count,
    reversals_count
  },
  recent_movements
}
```

Do not mix opening balance into operational inflow.

---

# Phase 4 — Unified IPC API Cleanup

## 31. Remove Unsafe Renderer-Facing Transaction CRUD

Inside:

```text
electron/apis/Apis.ts
```

remove or stop registering renderer-accessible channels for:

```text
cashboxTransaction:create
cashboxTransaction:update
cashboxTransaction:delete
```

Inside:

```text
electron/preload.ts
```

remove:

```ts
cashboxTransactions.create
cashboxTransactions.update
cashboxTransactions.remove
```

The renderer may retain read-only access only if needed.

Preferred renderer API:

```ts
cashboxes: {
  list();
  get();
  getDetails();
  summary();
  create();
  update();
  remove();
  movements();
  createMovement();
  transfer();
  reverseMovement();
  reverseTransfer();
}
```

---

## 32. Unified Response Contract

Every cashbox API must return:

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

Do not mix direct raw data returns with wrapped API responses.

---

## 33. Required Unified API Channels

Add or confirm:

```text
api:cashbox:getAll
api:cashbox:get
api:cashbox:getDetails
api:cashbox:getSummary
api:cashbox:create
api:cashbox:update
api:cashbox:delete
api:cashbox:getMovements
api:cashbox:createMovement
api:cashbox:transfer
api:cashbox:reverseMovement
api:cashbox:reverseTransfer
```

---

# Phase 5 — TypeScript Contracts

## 34. Update Renderer Types

Update:

```text
src/renderer/types/stocklite-api.d.ts
```

Define:

```ts
type Cashbox = {
  id: number;
  name: string;
  parent_id: number | null;
  parent_name: string | null;
  balance: number;
  initial_balance: number;
  currency: string;
  isActive: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
```

Define:

```ts
type CashboxMovement = {
  id: number;
  cashbox_id: number;
  direction: "in" | "out";
  amount: number;
  reference_type:
    | "opening_balance"
    | "sale"
    | "purchase"
    | "expense"
    | "income"
    | "transfer"
    | "adjustment"
    | "reversal";
  reference_id: number | null;
  transfer_group_id: string | null;
  reversed_transaction_id: number | null;
  balance_before: number | null;
  balance_after: number | null;
  transaction_date: string;
  notes: string | null;
};
```

Add complete input/output types for:

```text
summary
details
pagination
create
update
movement creation
transfer
single reversal
group transfer reversal
```

---

# Phase 6 — Frontend Refactor

## 35. Cashboxes Service

Ensure:

```text
src/renderer/pages/cashboxes/cashboxesService.ts
```

contains no mock arrays and no local balance mutation.

It must only:

- call unified APIs
- map raw backend values
- normalize numeric strings to numbers
- translate error codes where appropriate

---

## 36. Cashboxes Page

Update the summary UI to support multiple currencies.

Do not show:

```text
Total balance: 100000
```

without a currency.

Instead render one card or grouped display per currency:

```text
SYP: ...
USD: ...
EUR: ...
```

Also show:

- active count
- inactive count
- loading state
- error state
- retry
- empty state

---

## 37. Cashbox Form

Create mode fields:

```text
name
parent
opening balance
currency
status
notes
```

Edit mode fields:

```text
name
parent
currency
status
notes
```

Do not expose editable:

```text
balance
initial_balance
```

If the cashbox has movements, disable currency editing and explain why.

Filter parent options:

- exclude current cashbox
- exclude descendants
- exclude inactive parents if backend policy forbids them

---

## 38. Cashbox Details Page

Display:

- current balance
- opening balance
- currency
- parent
- status
- operational inflow
- operational outflow
- movement count
- reversal count
- recent movements

Add:

```text
View all movements
```

The page must use paginated movement API for the full history.

---

## 39. Full Movement History

Add pagination and filters:

```text
direction
reference type
date range
```

Display:

```text
date
type
direction
amount
balance before
balance after
notes
```

Clearly label:

```text
opening balance
transfer
reversal
```

---

## 40. Manual Movement Form

Fields:

```text
cashbox
movement type
amount
date
notes
```

Map:

```text
income -> in / income
expense -> out / expense
adjustment increase -> in / adjustment
adjustment decrease -> out / adjustment
```

Do not call generic cashbox transaction CRUD.

---

## 41. Transfer Form

Frontend validation:

- source != destination
- amount > 0
- same currency
- both active
- sufficient source balance

The backend remains the source of truth and must revalidate everything.

---

## 42. Reversal UX

Add a reversal action only for allowed movement types.

Flow:

1. User selects “Reverse movement”.
2. Show confirmation dialog.
3. Require reversal reason.
4. Submit through `reverseMovement`.
5. Refresh cashbox details and movement history.

Do not show single-movement reversal for transfers.

For transfer rows, show:

```text
Reverse transfer
```

and call:

```ts
reverseTransfer(transferGroupId, reason)
```

---

## 43. Opening Balance UX

Do not show “Reverse” for opening-balance movements.

If opening balance correction is supported, provide a separate action only under the backend rules.

Otherwise display opening balance as locked history.

---

## 44. Delete and Deactivate UX

Before deletion:

- show confirmation
- explain deletion rules
- handle `CASHBOX_IN_USE`

If deletion is rejected, offer:

```text
Deactivate cashbox
```

Do not silently fail.

---

## 45. Error Message Mapping

Map codes to Arabic UI messages:

```text
INVALID_CURRENCY
العملة المحددة غير مدعومة.

DUPLICATE_CASHBOX_NAME
يوجد صندوق آخر بالاسم نفسه.

PARENT_CYCLE
لا يمكن إنشاء علاقة دائرية بين الصناديق.

INACTIVE_PARENT_CASHBOX
لا يمكن اختيار صندوق غير نشط كصندوق أب.

FORBIDDEN_FIELD
لا يمكن تعديل الرصيد مباشرة.

CURRENCY_CHANGE_NOT_ALLOWED
لا يمكن تغيير العملة بعد تسجيل حركات على الصندوق.

INSUFFICIENT_BALANCE
رصيد الصندوق غير كافٍ.

CURRENCY_MISMATCH
لا يمكن التحويل بين صندوقين بعملتين مختلفتين.

TRANSFER_REQUIRES_GROUP_REVERSAL
يجب عكس التحويل كاملًا وليس حركة واحدة فقط.

TRANSFER_ALREADY_REVERSED
تم عكس هذا التحويل مسبقًا.

CASHBOX_IN_USE
لا يمكن حذف الصندوق لوجود حركات أو ارتباطات مرتبطة به.
```

---

# Phase 7 — Testing

## 46. Migration Tests

Test:

- existing data preserved
- new reference types accepted
- nullable `reference_id`
- transfer group persistence
- reversal links
- indexes created

---

## 47. Creation Tests

Test:

- zero opening balance
- positive opening balance
- negative opening balance rejection
- duplicate name
- invalid currency
- inactive parent
- opening movement creation

---

## 48. Update Tests

Test:

- valid metadata update
- balance update rejection
- initial balance update rejection
- self-parent rejection
- indirect parent cycle rejection
- currency change rejection after movement

---

## 49. Movement Tests

Test:

- income
- expense
- adjustment in
- adjustment out
- insufficient balance
- inactive cashbox
- invalid date
- nullable reference ID
- before/after balance correctness

---

## 50. Transfer Tests

Test:

- successful transfer
- transfer group stored
- same currency required
- same cashbox rejected
- inactive source rejected
- inactive destination rejected
- insufficient balance rejected
- rollback on any failure

---

## 51. Reversal Tests

Test:

- reverse income
- reverse expense
- reverse adjustment
- reject opening balance reversal
- reject transfer single-side reversal
- reject reversal of reversal
- reject double reversal
- successful grouped transfer reversal
- rollback grouped reversal on failure

---

## 52. Summary Tests

Test:

- opening balance excluded from operational inflow
- per-currency balance grouping
- per-currency inflow/outflow
- active and inactive counts
- no cross-currency arithmetic

---

## 53. Frontend Tests

Test:

- loading states
- error states
- retry
- empty states
- currency grouping
- create form
- edit restrictions
- movement form
- transfer form
- full movement history
- reversal confirmation
- transfer reversal
- Arabic RTL layout
- no mock data
- no unsafe CRUD usage
- no horizontal overflow

---

# Phase 8 — Acceptance Criteria

The AI module must not mark the task complete until all criteria pass:

- Database accepts all required movement types.
- `reference_id` supports null.
- Transfers persist `transfer_group_id`.
- Unsafe transaction create/update/delete APIs are not exposed to the renderer.
- Single transfer movement reversal is impossible.
- Transfer reversal reverses both sides atomically.
- Opening balance is separated from operational inflow.
- Summaries are grouped by currency.
- Default currency is no longer incorrectly fixed to `SAR`.
- Invalid currencies are rejected.
- Direct balance mutation is impossible from the renderer.
- Parent cycles are blocked.
- Invalid movement dates are blocked.
- Full movement history is available with pagination.
- Reversal UX is implemented.
- All mock cashbox data is removed.
- TypeScript declarations match real payloads.
- All listed tests pass.
- Electron starts successfully.
- Production build succeeds.
- Database contents can be verified through the debug table API.

---

# Final Execution Order

The AI module should implement the work in this order:

1. Inspect current files and confirm exact paths.
2. Create and test database migration.
3. Harden backend cashbox logic.
4. Add grouped transfer reversal.
5. Fix summary logic.
6. Remove unsafe unified API channels.
7. Update preload contract.
8. Update TypeScript declarations.
9. Update frontend service.
10. Update cashbox list and summary.
11. Update create/edit form.
12. Update details and full movement history.
13. Update manual movement form.
14. Update transfer form.
15. Implement movement and transfer reversal UX.
16. Add error mapping.
17. Run migration tests.
18. Run backend tests.
19. Run TypeScript checks.
20. Run Electron integration tests.
21. Run production build.
22. Verify database records with debug APIs.

---

# Final Safety Rule

No balance-changing operation may be implemented as generic CRUD.

Every balance-changing action must use a dedicated backend business function and one atomic database transaction.
