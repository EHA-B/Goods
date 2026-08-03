import { AlertCircle } from "lucide-react";
import { Card } from "../ui";
import type { ConsignmentClosingPreview } from "../../pages/purchases/consignment/consignmentTypes";
import { money } from "../../pages/purchases/consignment/consignmentUtils";

export default function CommissionPreviewCard({ preview }: { preview: ConsignmentClosingPreview }) {
  const rows = [["إجمالي المبيعات", preview.total_sales_amount], ["قيمة العمولة", preview.commission_amount], ["حصة المورد", preview.supplier_share], ["رصيد الصندوق", preview.cashbox_balance], ["الرصيد بعد التسوية", preview.balance_after_settlement]] as const;
  return <Card header="معاينة التسوية" description="القيم الظاهرة تقديرية حتى يؤكدها الباك."><div className="space-y-3">{rows.map(([label, value]) => <div key={label} className="flex items-center justify-between text-sm"><span className="text-[var(--text-muted)]">{label}</span><strong className={label === "الرصيد بعد التسوية" && value < 0 ? "text-[var(--danger)]" : "text-[var(--text-primary)]"}>{money(value, preview.currency)}</strong></div>)}{preview.warnings.length > 0 && <div className="mt-4 rounded-lg border border-[var(--danger)] bg-[var(--danger-subtle)] p-3">{preview.warnings.map((warning) => <p key={warning} className="flex gap-2 text-xs font-bold text-[var(--danger)]"><AlertCircle size={16} />{warning}</p>)}</div>}</div></Card>;
}
