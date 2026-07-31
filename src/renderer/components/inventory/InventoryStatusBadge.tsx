import { StatusBadge } from "../ui";
import type { InventoryStatus } from "./types";

type Props = {
  status: InventoryStatus;
};

const config: Record<
  InventoryStatus,
  {
    label: string;
    variant: "success" | "warning" | "danger";
  }
> = {
  available: {
    label: "متوفر",
    variant: "success",
  },
  low: {
    label: "مخزون منخفض",
    variant: "warning",
  },
  out: {
    label: "نافد",
    variant: "danger",
  },
};

export default function InventoryStatusBadge({ status }: Props) {
  const item = config[status];

  return (
    <StatusBadge variant={item.variant}>
      {item.label}
    </StatusBadge>
  );
}
