import { Banknote, CircleDollarSign, FileText, TrendingUp, WalletCards } from "lucide-react";
const money = (value: number) => value.toLocaleString("en-US");
export default function SalesSummaryCards({ total, paid, remaining, profit, count }: { total: number; paid: number; remaining: number; profit: number; count: number; }) {
  const cards = [
    { label: "إجمالي المبيعات", value: money(total), icon: CircleDollarSign },
    { label: "المبلغ المقبوض", value: money(paid), icon: Banknote },
    { label: "المبلغ المتبقي", value: money(remaining), icon: WalletCards },
    { label: "إجمالي الربح", value: money(profit), icon: TrendingUp },
    { label: "عدد الفواتير", value: count.toLocaleString("en-US"), icon: FileText },
  ];
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{cards.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold text-[var(--text-muted)]">{label}</p><Icon size={18} className="text-[var(--primary)]" /></div><p className="mt-3 text-xl font-bold text-[var(--text-primary)]">{value}</p></div>)}</div>;
}
