import { AlertTriangle, PackageCheck, RotateCcw } from "lucide-react";
import type { RemainingStockPolicy } from "../../pages/purchases/consignment/consignmentTypes";

const options = [
  { value: "return_to_supplier" as const, title: "إعادة المتبقي للمورد", description: "إخراج الكمية المتبقية من المخزون وتسجيلها كمرتجع للمورد.", icon: RotateCcw },
  { value: "spoilage" as const, title: "اعتبار المتبقي تالفًا", description: "إخراج الكمية من المخزون وتسجيل تسوية تلف.", icon: AlertTriangle },
  { value: "carry_forward" as const, title: "ترحيل المتبقي", description: "إبقاء الكمية متاحة لفترة تسوية لاحقة. خيار تجريبي إلى أن يدعمه الباك.", icon: PackageCheck },
];

export default function RemainingStockPolicySelector({ value, onChange }: { value: RemainingStockPolicy; onChange: (value: RemainingStockPolicy) => void }) {
  return <div className="grid gap-3 lg:grid-cols-3">{options.map(({ value: option, title, description, icon: Icon }) => <button key={option} type="button" onClick={() => onChange(option)} className={["rounded-[var(--radius-md)] border p-4 text-right transition", value === option ? "border-[var(--primary)] bg-[var(--primary-subtle)]" : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]"].join(" ")}><div className="flex items-start gap-3"><Icon size={20} className="mt-0.5 shrink-0 text-[var(--primary)]" /><div><p className="text-sm font-black text-[var(--text-primary)]">{title}</p><p className="mt-1 text-xs leading-6 text-[var(--text-muted)]">{description}</p></div></div></button>)}</div>;
}
