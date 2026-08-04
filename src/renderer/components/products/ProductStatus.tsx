import { StatusBadge } from "../ui";
import type { ProductStatus as ProductStatusValue } from "./ProductsTable";

type ProductStatusProps = {
  status: ProductStatusValue;
};

const STATUS = {
  active: {
    label: "نشط",
    variant: "success",
  },
  inactive: {
    label: "غير نشط",
    variant: "primary",
  },
} as const;

export default function ProductStatus({ status }: ProductStatusProps) {
  const current = STATUS[status];

  return (
    <StatusBadge variant={current.variant}>
      {current.label}
    </StatusBadge>
  );
}
