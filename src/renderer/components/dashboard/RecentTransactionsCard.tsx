import { ArrowDownLeft, ArrowUpRight, ReceiptText } from "lucide-react";
import { Link } from "react-router-dom";
import type { FinancialTransaction } from "../transactions/types";
import { Button, Card, EmptyState } from "../ui";
import { PATHS } from "../../routes/path";

const money = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);

export default function RecentTransactionsCard({ items, loading }: { items: FinancialTransaction[]; loading: boolean }) {
  return (
    <Card header="آخر المعاملات المالية" description="أحدث السجلات المحفوظة في قاعدة البيانات" actions={<Link to={PATHS.TRANSACTIONS}><Button variant="ghost">عرض الكل</Button></Link>}>
      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-[var(--radius-sm)] bg-[var(--surface-subtle)]" />)}</div>
      ) : items.length ? (
        <div className="space-y-2">
          {items.slice(0, 5).map((item) => (
            <Link key={item.id} to={`/transactions/${item.id}`} className="flex items-center justify-between gap-4 rounded-[var(--radius-sm)] border border-[var(--border)] p-3 transition hover:bg-[var(--surface-hover)]">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${item.direction === "income" ? "bg-[var(--success-subtle)] text-[var(--success)]" : "bg-[var(--danger)]/10 text-[var(--danger)]"}`}>
                  {item.direction === "income" ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
                </span>
                <div className="min-w-0"><p className="truncate text-sm font-bold text-[var(--text-primary)]">{item.categoryName}</p><p className="truncate text-xs text-[var(--text-muted)]">{item.description || item.cashboxName}</p></div>
              </div>
              <div className="shrink-0 text-left"><p dir="ltr" className="text-sm font-bold tabular-nums">{money(item.amount)} ل.س</p><p dir="ltr" className="mt-1 text-xs text-[var(--text-muted)]">{item.transactionDate}</p></div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon={<ReceiptText size={34} />} title="لا توجد معاملات بعد" description="ستظهر هنا أحدث الإيرادات والمصروفات المسجلة." action={<Link to={PATHS.TRANSACTIONS}><Button>فتح المعاملات</Button></Link>} />
      )}
    </Card>
  );
}
