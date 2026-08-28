import { DataTableCell, DataTableRow } from "../common";

import InventoryActions from "./InventoryActions";
import InventoryStatusBadge from "./InventoryStatusBadge";
import type { InventoryItem } from "./types";

type Props = {
  item: InventoryItem;
  onViewDetails: (item: InventoryItem) => void;
  onAdjust: (item: InventoryItem) => void;
};

function getSuppliersLabel(names: string[]) {
  if (names.length === 0) return "بدون مورد";
  if (names.length === 1) return names[0];
  return `${names[0]} +${names.length - 1}`;
}

export default function InventoryRow({
  item,
  onViewDetails,
  onAdjust,
}: Props) {
  return (
    <DataTableRow>
      <DataTableCell>
        <div className="min-w-44">
          <p className="font-bold text-[var(--text-primary)]">
            {item.productName}
          </p>
          <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span dir="ltr">{item.productCode}</span>
            <span aria-hidden>•</span>
            <span>{item.categoryName}</span>
          </div>
        </div>
      </DataTableCell>

      <DataTableCell>
        <div>
          <span
            dir="ltr"
            className="inline-block text-base font-bold text-[var(--text-primary)]"
          >
            {item.totalQuantity.toLocaleString("en-US")} {item.unit}
          </span>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            الحد الأدنى {item.minimumStock.toLocaleString("en-US")}
          </p>
        </div>
      </DataTableCell>

      <DataTableCell>
        <div>
          <p className="font-medium text-[var(--text-primary)]">
            {getSuppliersLabel(item.supplierNames)}
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {item.batchesCount.toLocaleString("en-US")} دفعة
          </p>
        </div>
      </DataTableCell>

      <DataTableCell>
        <div>
          <span dir="ltr" className="inline-block font-bold text-[var(--text-primary)]">
            {item.stockValue.toLocaleString("en-US")} ل.س
          </span>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            متوسط الشراء {item.averagePurchasePrice.toLocaleString("en-US")} ل.س
          </p>
        </div>
      </DataTableCell>

      <DataTableCell>
        <InventoryStatusBadge status={item.status} />
      </DataTableCell>

      <DataTableCell>
        <InventoryActions
          item={item}
          onViewDetails={onViewDetails}
          onAdjust={onAdjust}
        />
      </DataTableCell>
    </DataTableRow>
  );
}
