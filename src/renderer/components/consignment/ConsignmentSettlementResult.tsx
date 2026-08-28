import { CheckCircle2, RotateCcw } from "lucide-react";
import { Card } from "../ui";
import type { ConsignmentSettlement } from "../../pages/purchases/consignment/consignmentTypes";
import { money, policyLabels } from "../../pages/purchases/consignment/consignmentUtils";

export default function ConsignmentSettlementResult({ settlement }: { settlement: ConsignmentSettlement }) {
  const rows: [string, string][] = [
    ["رقم التسوية", settlement.settlement_number],
    ["تاريخ التسوية", settlement.settlement_date],
    ["إجمالي المبيعات", money(settlement.total_sales_amount, settlement.currency)],
    ["نسبة العمولة", `${Number(settlement.commission_percentage || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`],
    ["قيمة العمولة", money(settlement.commission_amount, settlement.currency)],
    ["حصة المورد من المبيعات", money(settlement.supplier_share, settlement.currency)],
  ];

  if (settlement.remaining_stock_policy === "spoilage" && settlement.spoilage_quantity > 0) {
    rows.push(["الكمية التالفة", String(settlement.spoilage_quantity)]);
    if (settlement.spoilage_value > 0) {
      rows.push(["القيمة التقديرية للتلف", money(settlement.spoilage_value, settlement.currency)]);
    }
  } else if (settlement.remaining_stock_policy === "return_to_supplier" && settlement.returned_quantity > 0) {
    rows.push(["الكمية المرتجعة", String(settlement.returned_quantity)]);
    rows.push(["قيمة المرتجع (مستردة للصندوق)", money(settlement.return_value, settlement.currency)]);
  }

  rows.push(["الصندوق", settlement.cashbox_name]);
  rows.push(["معالجة المتبقي", policyLabels[settlement.remaining_stock_policy]]);
  return <Card><div className="mb-5 flex items-center gap-3">{settlement.status === "reversed" ? <RotateCcw size={34} className="text-[var(--warning)]" /> : <CheckCircle2 size={34} className="text-[var(--success)]" />}<div><h2 className="text-lg font-black">{settlement.status === "reversed" ? "تم عكس تسوية فاتورة الأمانة" : "تمت تسوية فاتورة الأمانة"}</h2><p className="text-xs text-[var(--text-muted)]">البيانات محفوظة ومربوطة بالحركات المالية والمخزنية.</p></div></div><div className="grid gap-4 sm:grid-cols-2">{rows.map(([label, value]) => <div key={label} className="rounded-lg bg-[var(--surface-subtle)] p-3"><p className="text-xs font-bold text-[var(--text-muted)]">{label}</p><p className="mt-1 text-sm font-black text-[var(--text-primary)]">{value}</p></div>)}</div>{settlement.notes && <p className="mt-4 rounded-lg border border-[var(--border)] p-3 text-sm text-[var(--text-secondary)]">{settlement.notes}</p>}</Card>;
}
