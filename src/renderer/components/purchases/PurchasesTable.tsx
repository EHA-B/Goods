import { Eye, Trash2, XCircle } from "lucide-react";
import DataTable from "../common/DataTable";
import DataTableBody from "../common/DataTableBody";
import DataTableCell from "../common/DataTableCell";
import DataTableHead from "../common/DataTableHead";
import DataTableHeaderCell from "../common/DataTableHeaderCell";
import DataTableRow from "../common/DataTableRow";
import { Button } from "../ui";
import PurchaseStatusBadge from "./PurchaseStatusBadge";

const money = (value: number) => Number(value ?? 0).toLocaleString("en-US");
const typeLabels = { standard: "عادية", consignment: "أمانة" };

export default function PurchasesTable({ purchases, onView, onDelete }: {
  purchases: PurchaseInvoiceRecord[];
  onView: (purchase: PurchaseInvoiceRecord) => void;
  onDelete: (purchase: PurchaseInvoiceRecord) => void;
}) {
  return <DataTable>
    <DataTableHead><DataTableRow>
      {["رقم الفاتورة", "التاريخ", "المورد", "النوع", "الإجمالي", "المدفوع", "المتبقي", "الحالة", "الإجراءات"].map((header) => <DataTableHeaderCell key={header}>{header}</DataTableHeaderCell>)}
    </DataTableRow></DataTableHead>
    <DataTableBody>{purchases.map((purchase) => {
      const draft = purchase.status === "draft";
      const cancellable = ["confirmed", "partially_paid", "paid"].includes(purchase.status);
      return <DataTableRow key={purchase.id}>
        <DataTableCell className="font-bold text-[var(--text-primary)]"><span className="inline-flex items-center gap-2">{purchase.invoice_number}{Boolean(purchase.is_edited) && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">معدلة</span>}</span></DataTableCell>
        <DataTableCell>{purchase.invoice_date}</DataTableCell>
        <DataTableCell>{purchase.supplier_name ?? "-"}</DataTableCell>
        <DataTableCell>{typeLabels[purchase.invoice_type]}</DataTableCell>
        <DataTableCell>{money(purchase.total)}</DataTableCell>
        <DataTableCell>{money(purchase.paid_amount)}</DataTableCell>
        <DataTableCell>{money(purchase.remaining_amount)}</DataTableCell>
        <DataTableCell><PurchaseStatusBadge status={purchase.status as never} /></DataTableCell>
        <DataTableCell><div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" startIcon={<Eye size={15} />} onClick={() => onView(purchase)}>استعراض</Button>
          {(draft || cancellable) && <Button size="sm" variant="danger" startIcon={draft ? <Trash2 size={15} /> : <XCircle size={15} />} onClick={() => onDelete(purchase)}>{draft ? "حذف" : "إلغاء"}</Button>}
        </div></DataTableCell>
      </DataTableRow>;
    })}</DataTableBody>
  </DataTable>;
}
