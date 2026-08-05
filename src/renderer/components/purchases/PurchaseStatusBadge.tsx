import { StatusBadge } from "../ui";
import type { PurchaseStatus } from "./types";

const config: Record<string, { label: string; variant: "primary" | "warning" | "success" | "danger" | "gray" }> = {
  draft: { label: "مسودة", variant: "primary" },
  confirmed: { label: "مؤكدة", variant: "warning" },
  partially_paid: { label: "مدفوعة جزئيًا", variant: "warning" },
  paid: { label: "مدفوعة", variant: "success" },
  cancelled: { label: "ملغاة", variant: "danger" },
};

export default function PurchaseStatusBadge({ status }: { status: PurchaseStatus | string }) {
  const item = config[status as string] || { label: status || "غير معروف", variant: "gray" };
  return <StatusBadge variant={item.variant}>{item.label}</StatusBadge>;
}
