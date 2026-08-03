import { CheckCircle2 } from "lucide-react";
import { Card } from "../ui";
import type { ConsignmentSettlement } from "../../pages/purchases/consignment/consignmentTypes";
import { money, policyLabels } from "../../pages/purchases/consignment/consignmentUtils";

export default function ConsignmentSettlementResult({ settlement }: { settlement: ConsignmentSettlement }) {
  const rows = [["رقم التسوية", settlement.settlement_number], ["تاريخ التسوية", settlement.settlement_date], ["إجمالي المبيعات", money(settlement.total_sales_amount, settlement.currency)], ["نسبة العمولة", `${settlement.commission_percentage}%`], ["قيمة العمولة", money(settlement.commission_amount, settlement.currency)], ["حصة المورد", money(settlement.supplier_share, settlement.currency)], ["الصندوق", settlement.cashbox_name], ["معالجة المتبقي", policyLabels[settlement.remaining_stock_policy]]] as const;
  return <Card><div className="mb-5 flex items-center gap-3"><CheckCircle2 size={34} className="text-[var(--success)]" /><div><h2 className="text-lg font-black">تمت تسوية فاتورة الأمانة</h2><p className="text-xs text-[var(--text-muted)]">تم حفظ نتيجة التسوية التجريبية داخل خدمة الواجهة.</p></div></div><div className="grid gap-4 sm:grid-cols-2">{rows.map(([label, value]) => <div key={label} className="rounded-lg bg-[var(--surface-subtle)] p-3"><p className="text-xs font-bold text-[var(--text-muted)]">{label}</p><p className="mt-1 text-sm font-black text-[var(--text-primary)]">{value}</p></div>)}</div>{settlement.notes && <p className="mt-4 rounded-lg border border-[var(--border)] p-3 text-sm text-[var(--text-secondary)]">{settlement.notes}</p>}</Card>;
}
