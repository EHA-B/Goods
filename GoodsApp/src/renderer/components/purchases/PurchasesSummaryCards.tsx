import { Banknote, FileText, Receipt, WalletCards } from "lucide-react";
const money = (value: number) => value.toLocaleString("en-US");
export default function PurchasesSummaryCards({ total, paid, remaining, count }: { total: number; paid: number; remaining: number; count: number; }) {
  const cards = [
    { label: "إجمالي المشتريات", value: money(total), icon: Receipt },
    { label: "المبلغ المدفوع", value: money(paid), icon: Banknote },
    { label: "المبلغ المتبقي", value: money(remaining), icon: WalletCards },
    { label: "عدد الفواتير", value: count.toLocaleString("en-US"), icon: FileText },
  ];
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold text-[var(--text-muted)]">{label}</p><Icon size={18} className="text-[var(--primary)]" /></div><p className="mt-3 text-xl font-bold text-[var(--text-primary)]">{value}</p></div>)}</div>;
}
