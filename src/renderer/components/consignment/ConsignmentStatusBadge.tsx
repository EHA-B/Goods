import { Badge } from "../ui";
import type { SettlementStatus } from "../../pages/purchases/consignment/consignmentTypes";
import { statusLabels } from "../../pages/purchases/consignment/consignmentUtils";

export default function ConsignmentStatusBadge({ status }: { status: SettlementStatus }) {
  const variant = status === "settled" ? "success" : status === "reversed" ? "danger" : status === "partially_settled" ? "warning" : "gray";
  return <Badge variant={variant}>{statusLabels[status]}</Badge>;
}
