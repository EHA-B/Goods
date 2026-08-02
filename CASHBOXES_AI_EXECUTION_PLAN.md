# Cashboxes Module — Specific Execution Plan for AI Implementation

## 1. Objective

Refactor and complete the Cashboxes module so that:

- Cashbox balances are always consistent with their transaction history.
- Opening balances are traceable.
- Manual cash movements update balances atomically.
- Transfers are safe and currency-aware.
- Cashbox transaction records cannot be edited or deleted in a way that breaks accounting integrity.
- The frontend no longer depends on mock data.
- The unified IPC API layer remains the only communication layer between Electron Main and Renderer.

## 2. Scope

This plan covers:

- Cashbox creation
- Cashbox update
- Cashbox listing
- Cashbox details
- Opening balance
- Manual cash movements
- Cashbox transfers
- Cashbox movement history
- Cashbox deletion/deactivation policy
- Unified IPC API integration
- Frontend replacement of mock data

This plan does **not** cover:

- Sales payments
- Purchase payments
- General financial transactions
- Exchange-rate conversions
- Full accounting ledger
- Reports outside the cashbox module

These dependencies will be integrated later after the cashbox business rules are stable.

## 3. Current Risks

### 3.1 Cashbox creation accepts both `balance` and `initial_balance`

This allows the renderer to submit inconsistent values.

Required rule:

```ts
balance = initial_balance
```

The renderer must never control `balance` directly.

### 3.2 Opening balance has no transaction record

A cashbox may start with a non-zero balance, but no movement explains where that balance came from.

Required behavior:

- Set `balance = initial_balance`.
- Create an opening-balance movement when the initial balance is greater than zero.

### 3.3 Cashbox update allows direct balance modification

Direct balance updates bypass movement history.

Required behavior:

Only these fields may be updated:

```ts
name
parent_id
currency
isActive
notes
```

The following fields must not be accepted through the general update endpoint:

```ts
balance
initial_balance
```

### 3.4 Cashbox transaction CRUD does not update cashbox balance

Creating, editing, or deleting a row in `cashbox_transactions` currently risks producing a mismatch between:

- `cashboxes.balance`
- the movement history

Required rule:

No frontend feature may use generic transaction CRUD for business operations.

### 3.5 Transfers need stricter validation

Transfers must reject:

- zero or negative amounts
- transfers to the same cashbox
- inactive source or destination cashboxes
- insufficient source balance
- different currencies without an exchange-rate workflow

### 3.6 Cashbox deletion policy is undefined

Hard deletion can break linked records.

Recommended policy:

- Prefer deactivation.
- Allow hard deletion only for an unused zero-balance cashbox.

### 3.7 Parent-child cycles are not prevented

The backend must reject:

- a cashbox being its own parent
- indirect cycles such as `A -> B -> A`

## 4. Target Architecture

Use the unified API file only:

```text
electron/apis/Apis.ts
```

Do not create separate IPC files for the cashbox module.

The renderer must access cashbox operations only through:

```ts
window.stockliteApi.cashboxes
```

and, where needed:

```ts
window.stockliteApi.cashboxTransactions
```

However, the frontend must use business methods rather than unsafe generic transaction CRUD.

## 5. Database Changes

### 5.1 Add `opening_balance` as a movement reference type

Update the allowed values for:

```text
cashbox_transactions.reference_type
```

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

If the current SQLite schema uses a check constraint or enum-like definition, create a new migration that safely rebuilds the affected table if necessary.

### 5.2 Recommended additional columns

If they do not already exist, add:

```ts
balance_before decimal(15, 2)
balance_after decimal(15, 2)
transfer_group_id string nullable
reversed_transaction_id integer nullable
created_by integer nullable
```

Purpose:

- `balance_before` and `balance_after` provide auditability.
- `transfer_group_id` links the incoming and outgoing transfer movements.
- `reversed_transaction_id` supports safe reversal.
- `created_by` supports later audit-log integration.

### 5.3 Required indexes

Add indexes for:

```text
cashbox_id
reference_type
reference_id
transaction_date
transfer_group_id
```

## 6. Backend Business Functions

Implement business functions in the cashbox controller layer or a dedicated cashbox service layer.

Generic CRUD may remain for internal use, but the renderer must not call it for balance-changing actions.

### 6.1 `createCashbox(input)`

#### Accepted input

```ts
type CreateCashboxInput = {
  name: string;
  parent_id?: number | null;
  initial_balance?: number;
  currency: string;
  isActive?: boolean;
  notes?: string | null;
};
```

#### Required behavior

1. Validate `name`.
2. Normalize and validate `initial_balance`.
3. Reject a negative opening balance unless explicitly supported by the business.
4. Validate `currency`.
5. Validate `parent_id`.
6. Begin a database transaction.
7. Insert the cashbox with `balance = initial_balance`.
8. If `initial_balance > 0`, create an opening-balance movement.
9. Commit.
10. Return the created cashbox.

#### Opening movement

```ts
{
  cashbox_id,
  direction: "in",
  amount: initial_balance,
  reference_type: "opening_balance",
  reference_id: cashbox_id,
  balance_before: 0,
  balance_after: initial_balance,
  transaction_date: currentDate,
  notes: "Opening balance"
}
```

### 6.2 `updateCashbox(id, input)`

#### Accepted fields

```ts
type UpdateCashboxInput = {
  name?: string;
  parent_id?: number | null;
  currency?: string;
  isActive?: boolean;
  notes?: string | null;
};
```

#### Forbidden fields

Reject or ignore:

```text
balance
initial_balance
```

Rejecting them with a clear validation error is preferred.

#### Required behavior

1. Verify the cashbox exists.
2. Validate parent relationships.
3. Prevent self-parenting.
4. Prevent parent cycles.
5. Prevent changing currency when the cashbox already has movements, unless a dedicated migration workflow is later added.
6. Update only approved fields.
7. Return the updated cashbox.

### 6.3 `createCashboxMovement(input)`

This is the required business function for a manual income or expense.

#### Accepted input

```ts
type CreateCashboxMovementInput = {
  cashbox_id: number;
  direction: "in" | "out";
  amount: number;
  reference_type: "income" | "expense" | "adjustment";
  reference_id?: number | null;
  transaction_date?: string;
  notes?: string | null;
};
```

#### Required behavior

1. Validate the input.
2. Ensure `amount > 0`.
3. Load the cashbox.
4. Ensure the cashbox is active.
5. Read the latest balance inside the same transaction.
6. Calculate the new balance.
7. Reject if the new balance is negative.
8. Update the cashbox balance.
9. Insert the movement with `balance_before` and `balance_after`.
10. Commit.
11. Return the created movement and updated cashbox.

Required error code:

```text
INSUFFICIENT_BALANCE
```

### 6.4 `transferBetweenCashboxes(input)`

#### Accepted input

```ts
type TransferCashboxesInput = {
  from_cashbox_id: number;
  to_cashbox_id: number;
  amount: number;
  transaction_date?: string;
  notes?: string | null;
};
```

#### Required behavior

1. Validate both IDs.
2. Reject equal source and destination IDs.
3. Validate `amount > 0`.
4. Load both cashboxes inside one transaction.
5. Ensure both cashboxes are active.
6. Ensure both currencies match.
7. Ensure the source balance is sufficient.
8. Generate one `transfer_group_id`.
9. Update the source balance.
10. Insert the outgoing transfer movement.
11. Update the destination balance.
12. Insert the incoming transfer movement.
13. Commit.
14. Return both updated cashboxes and both movements.

Required error codes:

```text
VALIDATION_ERROR
NOT_FOUND
INACTIVE_CASHBOX
INSUFFICIENT_BALANCE
CURRENCY_MISMATCH
```

### 6.5 `getCashboxMovements(cashboxId, filters)`

Do not load all cashbox transactions and filter them in the renderer.

#### Recommended input

```ts
type CashboxMovementFilters = {
  page?: number;
  limit?: number;
  direction?: "in" | "out";
  reference_type?: string;
  date_from?: string;
  date_to?: string;
};
```

#### Recommended response

```ts
{
  items: CashboxMovement[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

Sort by:

```text
transaction_date DESC
id DESC
```

### 6.6 `getCashboxDetails(id)`

Return a complete details payload containing:

- cashbox data
- total inflow
- total outflow
- movement count
- recent movements

This avoids multiple unnecessary renderer calls.

### 6.7 `reverseCashboxMovement(transactionId, reason)`

Do not edit or delete an approved movement.

Required behavior:

1. Load the original movement.
2. Reject if it has already been reversed.
3. Create an opposite movement.
4. Update the cashbox balance.
5. Link the reversal to the original movement.
6. Execute everything inside one transaction.

### 6.8 `deleteCashbox(id)`

Allow hard deletion only when all conditions are true:

```text
balance = 0
no cashbox transactions
no child cashboxes
no linked payments
no linked invoices
```

Otherwise return:

```text
CASHBOX_IN_USE
```

The frontend should offer deactivation instead.

## 7. Unified IPC API Changes

Inside:

```text
electron/apis/Apis.ts
```

Add or confirm these channels:

```text
api:cashbox:getAll
api:cashbox:get
api:cashbox:getDetails
api:cashbox:create
api:cashbox:update
api:cashbox:delete
api:cashbox:getSummary
api:cashbox:getMovements
api:cashbox:createMovement
api:cashbox:transfer
api:cashbox:reverseMovement
```

All channels must return the unified response structure:

```ts
type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
    field?: string;
    details?: unknown;
  };
};
```

Do not expose unsafe generic movement update/delete channels to the renderer.

## 8. Preload API Contract

Expose a stable renderer API:

```ts
cashboxes: {
  list(): Promise<Cashbox[]>;
  get(id: number): Promise<Cashbox>;
  getDetails(id: number): Promise<CashboxDetails>;
  summary(): Promise<CashboxSummary>;
  create(input: CreateCashboxInput): Promise<Cashbox>;
  update(id: number, input: UpdateCashboxInput): Promise<Cashbox>;
  remove(id: number): Promise<{ success: true }>;
  movements(cashboxId: number, filters?: CashboxMovementFilters): Promise<PaginatedCashboxMovements>;
  createMovement(input: CreateCashboxMovementInput): Promise<CreateCashboxMovementResult>;
  transfer(input: TransferCashboxesInput): Promise<CashboxTransferResult>;
  reverseMovement(transactionId: number, reason: string): Promise<CashboxReversalResult>;
}
```

Use the existing unified invoke wrapper to unwrap:

```ts
{ success, data, error }
```

## 9. Frontend Refactor

### 9.1 Remove mock data

Remove cashbox mock arrays and state mutations from:

```text
src/renderer/pages/cashboxes/cashboxesService.ts
```

Replace the file with typed API mapping functions, or replace it entirely with:

```text
src/renderer/services/cashboxesApi.ts
```

No cashbox balance may be calculated or mutated locally.

### 9.2 `CashboxesPage.tsx`

Required behavior:

- Load summary and cashboxes from the API.
- Add loading, error, empty, and retry states.
- Search by name.
- Filter by active/inactive.
- Display real balances.
- Use English digits for numeric values.
- Display currency next to every monetary value.
- Keep the add-cashbox action.
- Do not expose delete unless the backend deletion policy is implemented.

### 9.3 `CashboxFormPage.tsx`

Create mode fields:

```text
name
parent cashbox
initial balance
currency
status
notes
```

Do not include `balance`.

Edit mode fields:

```text
name
parent cashbox
currency
status
notes
```

Do not show editable `balance` or `initial_balance`.

### 9.4 `CashboxDetailsPage.tsx`

Display:

- Cashbox identity
- Current balance
- Opening balance
- Currency
- Parent cashbox
- Status
- Total inflow
- Total outflow
- Movement count
- Real movement history
- Transfer action
- Manual movement action

Do not offer direct transaction editing or deletion.

### 9.5 `CashboxTransactionFormPage.tsx`

Rename the UI concept to a manual cash movement.

Fields:

```text
cashbox
movement type: income | expense
amount
date
notes
```

Map:

```text
income  -> direction: in, reference_type: income
expense -> direction: out, reference_type: expense
```

Submit through:

```ts
api.cashboxes.createMovement(...)
```

Do not submit through generic `cashboxTransactions.create()`.

### 9.6 `CashboxTransferPage.tsx`

Fields:

```text
source cashbox
destination cashbox
amount
date
notes
```

Frontend validation:

- Source and destination must differ.
- Amount must be positive.
- Currencies must match.
- Source must have enough balance.
- Both cashboxes must be active.

The backend must revalidate every rule.

## 10. Error Handling

Map backend error codes to clear Arabic messages.

Recommended mapping:

```text
VALIDATION_ERROR
The submitted data is incomplete or invalid.

NOT_FOUND
The requested cashbox was not found.

INACTIVE_CASHBOX
The operation cannot be executed on an inactive cashbox.

INSUFFICIENT_BALANCE
The cashbox balance is insufficient for this operation.

CURRENCY_MISMATCH
Transfers between cashboxes with different currencies are not allowed.

CASHBOX_IN_USE
The cashbox cannot be deleted because it has related movements or references.

PARENT_CYCLE
A circular parent relationship between cashboxes is not allowed.

MOVEMENT_ALREADY_REVERSED
This movement has already been reversed.
```

## 11. Migration Strategy

1. Back up the database before applying migrations.
2. Add required transaction columns.
3. Add or update the allowed `reference_type` values.
4. Backfill missing `balance_before` and `balance_after` where possible.
5. Mark historical opening balances explicitly if they can be inferred safely.
6. Do not invent historical movement records when the original source cannot be determined.
7. Verify foreign keys and indexes.
8. Run migrations automatically during application startup if this matches the current project architecture.

## 12. Test Plan

### 12.1 Cashbox creation

- Create with zero opening balance.
- Create with positive opening balance.
- Verify `balance = initial_balance`.
- Verify opening movement is created.
- Verify negative opening balance is rejected.
- Verify empty name is rejected.

### 12.2 Cashbox update

- Update name.
- Update parent.
- Update notes.
- Attempt to update balance.
- Attempt to update initial balance.
- Attempt self-parenting.
- Attempt an indirect parent cycle.
- Attempt changing currency after movements exist.

### 12.3 Manual movement

- Create income.
- Create expense.
- Verify balance changes correctly.
- Verify `balance_before` and `balance_after`.
- Reject zero amount.
- Reject negative amount.
- Reject expense above balance.
- Reject movement on inactive cashbox.

### 12.4 Transfer

- Successful same-currency transfer.
- Verify source outgoing movement.
- Verify destination incoming movement.
- Verify both share `transfer_group_id`.
- Reject same source and destination.
- Reject insufficient balance.
- Reject inactive source.
- Reject inactive destination.
- Reject currency mismatch.
- Confirm full rollback if any insert/update fails.

### 12.5 Reversal

- Reverse an income.
- Reverse an expense.
- Verify balance is restored.
- Reject double reversal.
- Verify original history remains intact.

### 12.6 Delete/deactivate

- Delete an unused zero-balance cashbox.
- Reject cashbox with balance.
- Reject cashbox with movements.
- Reject cashbox with children.
- Deactivate a used cashbox.
- Confirm inactive cashboxes cannot be used for new movements.

### 12.7 Frontend

- Loading state.
- Empty state.
- Retry after API failure.
- Search and filters.
- Correct currency suffix.
- Correct English digits.
- No mock records.
- No horizontal overflow.
- Arabic RTL layout.
- Confirmation dialog where appropriate.

## 13. Acceptance Criteria

The module is considered complete only when all conditions below are true:

- No cashbox screen uses mock data.
- The renderer cannot set or update `balance` directly.
- Every opening balance has a traceable movement.
- Every manual movement updates both the cashbox balance and movement history atomically.
- Every transfer updates both cashboxes and creates two linked movements atomically.
- Expenses cannot produce a negative balance.
- Cross-currency transfers are rejected.
- Approved movements cannot be edited or deleted directly.
- Reversals preserve history.
- Cashbox detail pages show real movement data.
- Backend and frontend use the unified API contract.
- TypeScript contracts match actual API payloads.
- Error messages are clear and localized.
- All listed tests pass.

## 14. Recommended Execution Order

### Phase 1 — Database

1. Add movement reference types.
2. Add audit columns.
3. Add indexes.
4. Test migration against a copy of the current database.

### Phase 2 — Backend Business Logic

1. Refactor cashbox creation.
2. Restrict cashbox updates.
3. Implement manual movement.
4. Harden transfers.
5. Implement movement retrieval.
6. Implement reversal.
7. Implement deletion/deactivation rules.

### Phase 3 — Unified APIs

1. Add unified IPC channels.
2. Remove unsafe renderer-facing channels.
3. Update preload contract.
4. Update TypeScript declarations.

### Phase 4 — Frontend

1. Replace mock service.
2. Link cashbox list and summary.
3. Link create/edit form.
4. Link details and movements.
5. Link manual movement form.
6. Link transfer form.
7. Add errors, loading, empty states, and notifications.

### Phase 5 — Verification

1. Run migrations.
2. Run backend unit tests.
3. Run integration tests.
4. Run TypeScript and build checks.
5. Perform manual Electron end-to-end testing.
6. Verify records using the debug table API.

## 15. Final Implementation Rule

Any operation that changes a cashbox balance must be implemented as one atomic backend transaction.

The frontend may request an operation, but it must never calculate, trust, or directly persist the final cashbox balance.
