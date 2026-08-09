import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "../common";
import type { StockBatch } from "./types";

type Props = {
  batches: StockBatch[];
  unit: string;
};

export default function StockBatchesTable({ batches, unit }: Props) {
  return (
    <DataTable>
      <DataTableHead>
        <DataTableRow>
          <DataTableHeaderCell>رقم الدفعة</DataTableHeaderCell>
          <DataTableHeaderCell>المورد</DataTableHeaderCell>
          <DataTableHeaderCell>الكمية الأصلية</DataTableHeaderCell>
          <DataTableHeaderCell>المتبقي</DataTableHeaderCell>
          <DataTableHeaderCell>سعر الشراء</DataTableHeaderCell>
          <DataTableHeaderCell>الاستلام</DataTableHeaderCell>
          <DataTableHeaderCell>الانتهاء</DataTableHeaderCell>
        </DataTableRow>
      </DataTableHead>

      <DataTableBody>
        {batches.map((batch) => (
          <DataTableRow key={batch.id}>
            <DataTableCell><span dir="ltr">{batch.batchCode}</span></DataTableCell>
            <DataTableCell>{batch.supplierName ?? "بدون مورد"}</DataTableCell>
            <DataTableCell><span dir="ltr">{batch.quantity.toLocaleString()} {unit}</span></DataTableCell>
            <DataTableCell><span dir="ltr" className="font-bold">{batch.remainingQuantity.toLocaleString()} {unit}</span></DataTableCell>
            <DataTableCell><span dir="ltr">{batch.purchasePrice.toLocaleString()} ل.س</span></DataTableCell>
            <DataTableCell><span dir="ltr">{batch.receivedDate}</span></DataTableCell>
            <DataTableCell><span dir="ltr">{batch.expiryDate ?? "—"}</span></DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
