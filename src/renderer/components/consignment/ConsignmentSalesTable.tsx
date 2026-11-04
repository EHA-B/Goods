import DataTable from "../common/DataTable";
import DataTableBody from "../common/DataTableBody";
import DataTableCell from "../common/DataTableCell";
import DataTableHead from "../common/DataTableHead";
import DataTableHeaderCell from "../common/DataTableHeaderCell";
import DataTableRow from "../common/DataTableRow";
import type { ConsignmentInvoiceItemSummary } from "../../pages/purchases/consignment/consignmentTypes";
import { money } from "../../pages/purchases/consignment/consignmentUtils";
import { formatNumber } from "../../utils/numberFormat";

export default function ConsignmentSalesTable({ items, currency }: { items: ConsignmentInvoiceItemSummary[]; currency: string }) {
  return (
    <DataTable>
      <DataTableHead>
        <DataTableRow>
          {["المنتج", "الكمية المستلمة", "سعر التسويق المرجعي", "الكمية المباعة", "قيمة المبيعات"].map((h) => (
            <DataTableHeaderCell key={h}>{h}</DataTableHeaderCell>
          ))}
        </DataTableRow>
      </DataTableHead>
      <DataTableBody>
        {items.map((item, idx) => (
          <DataTableRow key={item.purchase_invoice_item_id ?? `${item.product_id}-${idx}`}>
            <DataTableCell className="font-bold text-[var(--text-primary)]">
              {item.product_name}
              {item.product_unit ? ` (${item.product_unit})` : ""}
            </DataTableCell>
            <DataTableCell>{formatNumber(item.received_quantity)}</DataTableCell>
            <DataTableCell>{money(item.estimated_unit_price ?? 0, currency)}</DataTableCell>
            <DataTableCell>{formatNumber(item.sold_quantity)}</DataTableCell>
            <DataTableCell className="font-bold">{money(item.total_sales_amount, currency)}</DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
