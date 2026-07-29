import { Eye, Pencil, Trash2 } from "lucide-react";
import DataTable from "../common/DataTable";
import DataTableBody from "../common/DataTableBody";
import DataTableCell from "../common/DataTableCell";
import DataTableHead from "../common/DataTableHead";
import DataTableHeaderCell from "../common/DataTableHeaderCell";
import DataTableRow from "../common/DataTableRow";
import { Button } from "../ui";
import SaleStatusBadge from "./SaleStatusBadge";
import type { SaleInvoice } from "./types";

const money = (value: number) => value.toLocaleString("en-US");

export default function SalesTable({
  sales,
  onView,
  onEdit,
  onDelete,
}: {
  sales: SaleInvoice[];
  onView: (sale: SaleInvoice) => void;
  onEdit: (sale: SaleInvoice) => void;
  onDelete: (sale: SaleInvoice) => void;
}) {
  return (
    <DataTable>
      <DataTableHead>
        <DataTableRow>
          <DataTableHeaderCell>رقم الفاتورة</DataTableHeaderCell>
          <DataTableHeaderCell>التاريخ</DataTableHeaderCell>
          <DataTableHeaderCell>العميل</DataTableHeaderCell>
          <DataTableHeaderCell>نوع البيع</DataTableHeaderCell>
          <DataTableHeaderCell>الإجمالي</DataTableHeaderCell>
          <DataTableHeaderCell>المدفوع</DataTableHeaderCell>
          <DataTableHeaderCell>المتبقي</DataTableHeaderCell>
          <DataTableHeaderCell>الحالة</DataTableHeaderCell>
          <DataTableHeaderCell>الإجراءات</DataTableHeaderCell>
        </DataTableRow>
      </DataTableHead>
      <DataTableBody>
        {sales.map((sale) => (
          <DataTableRow key={sale.id}>
            <DataTableCell className="font-bold text-[var(--text-primary)]">{sale.invoiceNumber}</DataTableCell>
            <DataTableCell>{sale.invoiceDate}</DataTableCell>
            <DataTableCell>{sale.customerName}</DataTableCell>
            <DataTableCell>{sale.saleTypeName}</DataTableCell>
            <DataTableCell>{money(sale.total)}</DataTableCell>
            <DataTableCell>{money(sale.paidAmount)}</DataTableCell>
            <DataTableCell>{money(Math.max(0, sale.total - sale.paidAmount))}</DataTableCell>
            <DataTableCell><SaleStatusBadge status={sale.status} /></DataTableCell>
            <DataTableCell>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" startIcon={<Eye size={15} />} onClick={() => onView(sale)}>استعراض</Button>
                <Button size="sm" variant="secondary" startIcon={<Pencil size={15} />} onClick={() => onEdit(sale)}>تعديل</Button>
                <Button size="sm" variant="danger" startIcon={<Trash2 size={15} />} onClick={() => onDelete(sale)}>حذف</Button>
              </div>
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
