import {
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  ReceiptText,
} from "lucide-react";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

type SummaryCardProps = {
  title: string;
  value: string;
  unit?: string;
  icon: React.ReactNode;
};

function SummaryCard({ title, value, unit, icon }: SummaryCardProps) {
  return (
    <div className="min-w-0 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-xs font-bold text-[var(--text-muted)]">
          {title}
        </p>
        <div className="shrink-0 text-[var(--primary)]">{icon}</div>
      </div>

      <div
        dir="ltr"
        className="mt-3 flex min-w-0 items-baseline justify-end gap-1.5 text-[var(--text-primary)]"
      >
        <span className="truncate text-xl font-bold tabular-nums">{value}</span>
        {unit && (
          <span className="shrink-0 text-xs font-bold text-[var(--text-muted)]">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

export default function TransactionsSummaryCards({
  income,
  expense,
  count,
}: {
  income: number;
  expense: number;
  count: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        title="إجمالي الإيرادات"
        value={formatMoney(income)}
        unit="ل.س"
        icon={<ArrowDownLeft size={18} />}
      />
      <SummaryCard
        title="إجمالي المصروفات"
        value={formatMoney(expense)}
        unit="ل.س"
        icon={<ArrowUpRight size={18} />}
      />
      <SummaryCard
        title="صافي المعاملات"
        value={formatMoney(income - expense)}
        unit="ل.س"
        icon={<Calculator size={18} />}
      />
      <SummaryCard
        title="عدد المعاملات"
        value={new Intl.NumberFormat("en-US").format(count)}
        icon={<ReceiptText size={18} />}
      />
    </div>
  );
}
