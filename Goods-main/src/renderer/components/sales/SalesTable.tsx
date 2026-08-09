import { Eye, Trash2, XCircle } from "lucide-react";
import DataTable from "../common/DataTable";
import DataTableBody from "../common/DataTableBody";
import DataTableCell from "../common/DataTableCell";
import DataTableHead from "../common/DataTableHead";
import DataTableHeaderCell from "../common/DataTableHeaderCell";
import DataTableRow from "../common/DataTableRow";
import { Button } from "../ui";
import SaleStatusBadge from "./SaleStatusBadge";
const money = (value: number) => value.toLocaleString("en-US");
export default function SalesTable({ sales, onView, onDelete }: { sales: SaleInvoiceRecord[]; onView: (sale: SaleInvoiceRecord) => void; onDelete: (sale: SaleInvoiceRecord) => void; }) {
  return <DataTable><DataTableHead><DataTableRow>{["رقم الفاتورة", "التاريخ", "العميل", "الإجمالي", "المدفوع", "المتبقي", "الحالة", "الإجراءات"].map((h) => <DataTableHeaderCell key={h}>{h}</DataTableHeaderCell>)}</DataTableRow></DataTableHead><DataTableBody>{sales.map((sale) => <DataTableRow key={sale.id}>
    <DataTableCell className="font-bold text-[var(--text-primary)]">{sale.invoice_number}</DataTableCell><DataTableCell>{sale.invoice_date}</DataTableCell><DataTableCell>{sale.customer_name ?? "بيع نقدي"}</DataTableCell><DataTableCell>{money(sale.total)}</DataTableCell><DataTableCell>{money(sale.paid_amount)}</DataTableCell><DataTableCell>{money(sale.remaining_amount)}</DataTableCell><DataTableCell><SaleStatusBadge status={sale.status as never} /></DataTableCell>
    <DataTableCell><div className="flex items-center gap-2"><Button size="sm" variant="secondary" startIcon={<Eye size={15} />} onClick={() => onView(sale)}>استعراض</Button>{sale.status !== "cancelled" && <Button size="sm" variant="danger" startIcon={sale.status === "draft" ? <Trash2 size={15} /> : <XCircle size={15} />} onClick={() => onDelete(sale)}>{sale.status === "draft" ? "حذف" : "إلغاء"}</Button>}</div></DataTableCell>
  </DataTableRow>)}</DataTableBody></DataTable>;
}
