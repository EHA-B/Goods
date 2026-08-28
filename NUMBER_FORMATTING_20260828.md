# Global numeric display formatting

- Added `src/renderer/utils/numberFormat.ts` as the central numeric display formatter.
- Standardized displayed quantities, balances, totals, counts, percentages, inventory values and pagination counters to `en-US` numeric grouping (`1,222`, `1,234,567.5`).
- Kept identifiers, invoice numbers, batch codes, barcodes, phone numbers, dates and editable numeric inputs unmodified so commas do not break searching/editing or change identifier semantics.
- Preserved the latest reports layout work. Report screen, PDF and Excel exports continue using grouped numeric formatting and RTL report structure.
- Inventory display now explicitly uses `en-US` grouping instead of the operating-system locale.
