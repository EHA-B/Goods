import { CircleDollarSign, HandCoins, PackageCheck, PackageOpen } from "lucide-react";
import { Card } from "../ui";
import type { ConsignmentInvoiceSummary } from "../../pages/purchases/consignment/consignmentTypes";
import { money } from "../../pages/purchases/consignment/consignmentUtils";

export default function ConsignmentSummaryCards({ summary }: { summary: ConsignmentInvoiceSummary }) {
  const isSettled = summary.invoice.settlement_status === "settled";
  const cards = [
    ["الكمية المستلمة", summary.stock.received_quantity.toLocaleString("en-US"), PackageOpen],
    [
      isSettled ? "الكمية المباعة (مسواة)" : "الكمية المباعة",
      isSettled ? summary.sales.sold_quantity.toLocaleString("en-US") : "تُحدَّد عند الإغلاق",
      PackageCheck,
    ],
    [
      isSettled ? "إجمالي المبيعات (مسواة)" : "إجمالي المبيعات",
      isSettled ? money(summary.sales.total_sales_amount, summary.invoice.currency) : "تُحدَّد عند الإغلاق",
      CircleDollarSign,
    ],
    [
      "المدفوع مسبقاً للمورد",
      money(summary.invoice.paid_amount, summary.invoice.currency),
      HandCoins,
    ],
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value, Icon]) => (
        <Card key={label}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[var(--primary-subtle)] p-3 text-[var(--primary)]">
              <Icon size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--text-muted)]">{label}</p>
              <p className="mt-1 text-base font-black text-[var(--text-primary)]">{value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
