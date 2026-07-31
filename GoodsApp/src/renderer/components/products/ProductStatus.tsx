import { StatusBadge } from "../ui";
import type { ProductStatus } from "./ProductsTable";

type ProductStatusProps = {
  status: ProductStatus;
};

const STATUS = {
  available: {
    label: "متوفر",
    variant: "success",
  },
  low: {
    label: "كمية منخفضة",
    variant: "warning",
  },
  out: {
    label: "غير متوفر",
    variant: "danger",
  },
} as const;

export default function ProductStatus({
  status,
}: ProductStatusProps) {
  const current = STATUS[status];

  return (
    <StatusBadge variant={current.variant}>
      {current.label}
    </StatusBadge>
  );
}