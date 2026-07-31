import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "../common";
import { Button } from "../ui";

import StockMovementBadge from "./StockMovementBadge";
import type { StockMovement } from "./types";

type Props = {
  movements: StockMovement[];
  onView: (movement: StockMovement) => void;
};

export default function StockMovementsTable({ movements, onView }: Props) {
  return (
    <DataTable>
      <DataTableHead>
        <DataTableRow>
          <DataTableHeaderCell>التاريخ</DataTableHeaderCell>
          <DataTableHeaderCell>نوع الحركة</DataTableHeaderCell>
          <DataTableHeaderCell>الكمية</DataTableHeaderCell>
          <DataTableHeaderCell>الرصيد بعدها</DataTableHeaderCell>
          <DataTableHeaderCell>المورد</DataTableHeaderCell>
          <DataTableHeaderCell>الدفعة</DataTableHeaderCell>
          <DataTableHeaderCell>المرجع</DataTableHeaderCell>
          <DataTableHeaderCell />
        </DataTableRow>
      </DataTableHead>

      <DataTableBody>
        {movements.map((movement) => {
          const incoming = movement.quantity > 0;

          return (
            <DataTableRow key={movement.id}>
              <DataTableCell>
                <span dir="ltr" className="inline-block">{movement.createdAt}</span>
              </DataTableCell>

              <DataTableCell>
                <StockMovementBadge type={movement.type} />
              </DataTableCell>

              <DataTableCell>
                <span
                  dir="ltr"
                  className={`inline-block font-bold ${
                    incoming ? "text-[var(--success)]" : "text-[var(--danger)]"
                  }`}
                >
                  {incoming ? "+" : ""}{movement.quantity.toLocaleString()} {movement.unit}
                </span>
              </DataTableCell>

              <DataTableCell>
                <span dir="ltr" className="inline-block font-bold">
                  {movement.balanceAfter.toLocaleString()} {movement.unit}
                </span>
              </DataTableCell>

              <DataTableCell>{movement.supplierName ?? "—"}</DataTableCell>
              <DataTableCell>
                <span dir="ltr" className="inline-block">{movement.batchCode ?? "—"}</span>
              </DataTableCell>
              <DataTableCell>
                <span dir="ltr" className="inline-block">{movement.referenceNumber ?? "—"}</span>
              </DataTableCell>
              <DataTableCell>
                <Button size="sm" variant="secondary" onClick={() => onView(movement)}>
                  التفاصيل
                </Button>
              </DataTableCell>
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}
