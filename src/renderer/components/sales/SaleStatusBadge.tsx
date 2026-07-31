import { StatusBadge } from "../ui";
import type { SaleStatus } from "./types";

const config = {
  draft: { label: "مسودة", variant: "info" as const },
  confirmed: { label: "مؤكدة", variant: "warning" as const },
  paid: { label: "مدفوعة", variant: "success" as const },
  cancelled: { label: "ملغاة", variant: "danger" as const },
};
export default function SaleStatusBadge({ status }: { status: SaleStatus }) {
  const item = config[status];
  return <StatusBadge variant={item.variant}>{item.label}</StatusBadge>;
}
