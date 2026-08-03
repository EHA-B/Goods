import { CircleDollarSign, PackageCheck, PackageOpen, ReceiptText } from "lucide-react";
import { Card } from "../ui";
import type { ConsignmentInvoiceSummary } from "../../pages/purchases/consignment/consignmentTypes";
import { money } from "../../pages/purchases/consignment/consignmentUtils";

export default function ConsignmentSummaryCards({ summary }: { summary: ConsignmentInvoiceSummary }) {
  const cards = [
    ["إجمالي المبيعات", money(summary.sales.total_sales_amount, summary.invoice.currency), CircleDollarSign],
    ["عدد عمليات البيع", summary.sales.sales_count.toLocaleString("en-US"), ReceiptText],
    ["الكمية المباعة", summary.sales.sold_quantity.toLocaleString("en-US"), PackageCheck],
    ["الكمية المتبقية", summary.stock.remaining_quantity.toLocaleString("en-US"), PackageOpen],
  ] as const;
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, Icon]) => <Card key={label}><div className="flex items-center gap-3"><div className="rounded-xl bg-[var(--primary-subtle)] p-3 text-[var(--primary)]"><Icon size={20} /></div><div><p className="text-xs font-bold text-[var(--text-muted)]">{label}</p><p className="mt-1 text-lg font-black text-[var(--text-primary)]">{value}</p></div></div></Card>)}</div>;
}
