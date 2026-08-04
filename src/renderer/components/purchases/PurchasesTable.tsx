import { Eye, Pencil, Trash2 } from "lucide-react";
import DataTable from "../common/DataTable";
import DataTableBody from "../common/DataTableBody";
import DataTableCell from "../common/DataTableCell";
import DataTableHead from "../common/DataTableHead";
import DataTableHeaderCell from "../common/DataTableHeaderCell";
import DataTableRow from "../common/DataTableRow";
import { Button } from "../ui";
import PurchaseStatusBadge from "./PurchaseStatusBadge";

const money = (value: number) => value.toLocaleString("en-US");
const typeLabels = { standard: "عادية", consignment: "أمانة" };

export default function PurchasesTable({
  purchases,
  onView,
  onEdit,
  onDelete
}: {
  purchases: PurchaseInvoiceRecord[];
  onView: (purchase: PurchaseInvoiceRecord) => void;
  onEdit: (purchase: PurchaseInvoiceRecord) => void;
  onDelete: (purchase: PurchaseInvoiceRecord) => void;
}) {
  return (
    <DataTable>
      <DataTableHead>
        <DataTableRow>
          {["رقم الفاتورة", "التاريخ", "المورد", "نوع الفاتورة", "الإجمالي", "المدفوع", "المتبقي", "الحالة", "الإجراءات"].map((header) => (
            <DataTableHeaderCell key={header}>{header}</DataTableHeaderCell>
          ))}
        </DataTableRow>
      </DataTableHead>
      <DataTableBody>
        {purchases.map((purchase) => {
          const editable = purchase.status === "draft";
          return (
            <DataTableRow key={purchase.id}>
              <DataTableCell className="font-bold text-[var(--text-primary)]">{purchase.invoice_number}</DataTableCell>
              <DataTableCell>{purchase.invoice_date}</DataTableCell>
              <DataTableCell>{purchase.supplier_name}</DataTableCell>
              <DataTableCell>{typeLabels[purchase.invoice_type]}</DataTableCell>
              <DataTableCell>{money(purchase.total)}</DataTableCell>
              <DataTableCell>{money(purchase.paid_amount)}</DataTableCell>
              <DataTableCell>{money(purchase.remaining_amount)}</DataTableCell>
              <DataTableCell>
                <PurchaseStatusBadge status={purchase.status as never} />
              </DataTableCell>
              <DataTableCell>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" startIcon={<Eye size={15} />} onClick={() => onView(purchase)}>استعراض</Button>
                  <Button size="sm" variant="secondary" startIcon={<Pencil size={15} />} disabled={!editable} title={!editable ? "التعديل متاح للفواتير المسودة فقط" : undefined} onClick={() => onEdit(purchase)}>تعديل</Button>
                  <Button size="sm" variant="danger" startIcon={<Trash2 size={15} />} disabled={!editable} title={!editable ? "الحذف متاح للفواتير المسودة فقط" : undefined} onClick={() => onDelete(purchase)}>حذف</Button>
                </div>
              </DataTableCell>
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}
