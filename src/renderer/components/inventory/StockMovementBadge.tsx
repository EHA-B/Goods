import { StatusBadge } from "../ui";
import type { StockMovementType } from "./types";

type Props = {
  type: StockMovementType;
};

const labels: Record<StockMovementType, string> = {
  purchase: "فاتورة شراء",
  sale: "فاتورة بيع",
  sale_return: "مرتجع بيع",
  purchase_return: "مرتجع شراء",
  adjustment_in: "تسوية إضافة",
  adjustment_out: "تسوية خصم",
  opening_balance: "رصيد افتتاحي",
};

export default function StockMovementBadge({
  type,
}: Props) {
  const variant =
    type === "purchase" ||
    type === "sale_return" ||
    type === "adjustment_in" ||
    type === "opening_balance"
      ? "success"
      : type === "sale" ||
          type === "purchase_return"
        ? "primary"
        : "warning";

  return (
    <StatusBadge variant={variant}>
      {labels[type]}
    </StatusBadge>
  );
}
