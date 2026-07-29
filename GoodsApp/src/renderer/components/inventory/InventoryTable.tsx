import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "../common";

import InventoryRow from "./InventoryRow";
import type { InventoryItem } from "./types";

type Props = {
  items: InventoryItem[];
  onViewDetails: (item: InventoryItem) => void;
  onAdjust: (item: InventoryItem) => void;
};

export default function InventoryTable({
  items,
  onViewDetails,
  onAdjust,
}: Props) {
  return (
    <DataTable>
      <DataTableHead>
        <DataTableRow>
          <DataTableHeaderCell>المادة</DataTableHeaderCell>
          <DataTableHeaderCell>الرصيد الحالي</DataTableHeaderCell>
          <DataTableHeaderCell>التوريد</DataTableHeaderCell>
          <DataTableHeaderCell>قيمة المخزون</DataTableHeaderCell>
          <DataTableHeaderCell>الحالة</DataTableHeaderCell>
          <DataTableHeaderCell>الإجراءات</DataTableHeaderCell>
        </DataTableRow>
      </DataTableHead>

      <DataTableBody>
        {items.map((item) => (
          <InventoryRow
            key={item.productId}
            item={item}
            onViewDetails={onViewDetails}
            onAdjust={onAdjust}
          />
        ))}
      </DataTableBody>
    </DataTable>
  );
}
