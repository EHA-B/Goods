import DataTable from "../common/DataTable";
import DataTableBody from "../common/DataTableBody";
import DataTableCell from "../common/DataTableCell";
import DataTableHead from "../common/DataTableHead";
import DataTableHeaderCell from "../common/DataTableHeaderCell";
import DataTableRow from "../common/DataTableRow";
import type { ConsignmentInvoiceItemSummary } from "../../pages/purchases/consignment/consignmentTypes";
import { money } from "../../pages/purchases/consignment/consignmentUtils";

export default function ConsignmentSalesTable({ items, currency }: { items: ConsignmentInvoiceItemSummary[]; currency: string }) {
  return <DataTable><DataTableHead><DataTableRow>{["المنتج", "كود الدفعة", "المستلم", "المباع", "المتبقي", "قيمة المبيعات", "الانتهاء"].map((h) => <DataTableHeaderCell key={h}>{h}</DataTableHeaderCell>)}</DataTableRow></DataTableHead><DataTableBody>{items.map((item) => <DataTableRow key={item.stock_batch_id}><DataTableCell className="font-bold text-[var(--text-primary)]">{item.product_name}</DataTableCell><DataTableCell>{item.batch_code || "-"}</DataTableCell><DataTableCell>{item.received_quantity}</DataTableCell><DataTableCell>{item.sold_quantity}</DataTableCell><DataTableCell>{item.remaining_quantity}</DataTableCell><DataTableCell className="font-bold">{money(item.total_sales_amount, currency)}</DataTableCell><DataTableCell>{item.expiry_date || "-"}</DataTableCell></DataTableRow>)}</DataTableBody></DataTable>;
}
