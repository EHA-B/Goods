import { StatusBadge } from "../ui";
import type { PurchaseStatus } from "./types";

const config = {
  draft: { label: "مسودة", variant: "primary" as const },
  confirmed: { label: "مؤكدة", variant: "warning" as const },
  paid: { label: "مدفوعة", variant: "success" as const },
  cancelled: { label: "ملغاة", variant: "danger" as const },
};

export default function PurchaseStatusBadge({ status }: { status: PurchaseStatus }) {
  const item = config[status];
  return <StatusBadge variant={item.variant}>{item.label}</StatusBadge>;
}
