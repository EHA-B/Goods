import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeaderCell, DataTableRow } from "../common";
import { StatusBadge } from "../ui";
import SupplierActions from "./SupplierActions";
import type { Supplier } from "./types";

type Props = {
  suppliers: Supplier[];
  onView: (supplier: Supplier) => void;
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
};

const money = (value: number) => Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 2 });

export default function SuppliersTable({ suppliers, onView, onEdit, onDelete }: Props) {
  return (
    <DataTable className="min-w-[1080px]">
      <DataTableHead><DataTableRow>
        <DataTableHeaderCell>المورد</DataTableHeaderCell><DataTableHeaderCell>الهاتف</DataTableHeaderCell><DataTableHeaderCell>العنوان</DataTableHeaderCell><DataTableHeaderCell>الرصيد</DataTableHeaderCell><DataTableHeaderCell>الحالة</DataTableHeaderCell><DataTableHeaderCell>الإجراءات</DataTableHeaderCell>
      </DataTableRow></DataTableHead>
      <DataTableBody>{suppliers.map((supplier) => (
        <DataTableRow key={supplier.id}>
          <DataTableCell><p className="font-bold text-[var(--text-primary)]">{supplier.name}</p><p className="mt-1 text-xs text-[var(--text-muted)]">رقم المورد: {supplier.id}</p></DataTableCell>
          <DataTableCell><span dir="ltr" className="inline-block">{supplier.phone || "—"}</span></DataTableCell>
          <DataTableCell><span className="block max-w-56 truncate" title={supplier.address}>{supplier.address || "—"}</span></DataTableCell>
          <DataTableCell>{supplier.balance === 0 ? <span className="font-bold text-[var(--text-muted)]">متوازن</span> : supplier.balance > 0 ? <div><p className="font-bold text-[var(--danger)]">{money(supplier.balance)} ل.س</p><p className="mt-1 text-xs text-[var(--text-muted)]">له</p></div> : <div><p className="font-bold text-[var(--success)]">{money(supplier.balance)} ل.س</p><p className="mt-1 text-xs text-[var(--text-muted)]">عليه</p></div>}</DataTableCell>
          <DataTableCell><StatusBadge variant={supplier.isActive ? "success" : "danger"}>{supplier.isActive ? "نشط" : "غير نشط"}</StatusBadge></DataTableCell>
          <DataTableCell><SupplierActions supplier={supplier} onView={onView} onEdit={onEdit} onDelete={onDelete} /></DataTableCell>
        </DataTableRow>
      ))}</DataTableBody>
    </DataTable>
  );
}
