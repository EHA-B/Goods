# Reports layout and export reorganization

Updated the reports experience with special attention to detailed sales and purchases.

## Preview
- Detailed sales and purchase invoices are rendered as self-contained invoice cards.
- RTL is explicit at report, invoice, table, metadata, and summary levels.
- Party/status/currency information is grouped above the item table.
- Item lines stay in a clear bordered table.
- Operational information and financial totals stay inside the same invoice card below the item table.
- Numeric values remain LTR-isolated only where required for readability.
- Report-level summaries remain above invoice records.

## PDF
- A4 portrait remains enforced.
- Each invoice has an organized header, metadata area, item table, operational block, and financial block.
- Table headers repeat when a table spans pages.
- RTL alignment is explicit throughout the document.
- Generic reports and Profit & Loss remain supported.

## Excel
- Added a dedicated Excel HTML renderer instead of reusing the PDF-oriented layout.
- Report summaries are exported as structured key/value cells.
- Every detailed invoice gets its own title, metadata table, item table, operational table, and financial table.
- RTL is explicit for the worksheet content while numeric/date cells are isolated for correct display.

## Data cleanup
- Removed transport/handling labels accidentally present in the detailed sales summary.
- Restored the sales tax line in the detailed sales invoice financial summary.
