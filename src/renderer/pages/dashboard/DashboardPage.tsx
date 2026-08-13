import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  ShoppingCart,
  TrendingUp,
  Truck,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardClock from "../../components/dashboard/DashboardClock";
import NotificationBell from "../../components/notifications/NotificationBell";
import QuickActionsCard from "../../components/dashboard/QuickActionsCard";
import StatCard from "../../components/dashboard/StatCard";
import StatsGrid from "../../components/dashboard/StatsGrid";
import { Button, Card, EmptyState, PageHeader } from "../../components/ui";
import { PATHS } from "../../routes/path";

type DashboardData = Awaited<ReturnType<typeof window.stockliteApi.dashboard.get>>;
type ActivityTab = "sales" | "purchases" | "transactions" | "inventory";

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const count = (value: number) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const statusLabel = (status: string) =>
  ({
    paid: "مدفوعة",
    partially_paid: "مدفوعة جزئيًا",
    confirmed: "مؤكدة",
    draft: "مسودة",
    cancelled: "ملغاة",
  })[status] || status;

function SoftTabs({
  value,
  onChange,
}: {
  value: ActivityTab;
  onChange: (value: ActivityTab) => void;
}) {
  const tabs: Array<{ value: ActivityTab; label: string }> = [
    { value: "sales", label: "المبيعات" },
    { value: "purchases", label: "المشتريات" },
    { value: "transactions", label: "المعاملات" },
    { value: "inventory", label: "المخزون" },
  ];

  return (
    <div
      className="flex max-w-full gap-1 overflow-x-auto rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] p-1"
      role="tablist"
      aria-label="آخر نشاط في النظام"
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={`shrink-0 rounded-[calc(var(--radius-sm)-2px)] px-3 py-1.5 text-xs font-medium transition ${
            value === tab.value
              ? "bg-[var(--surface)] text-[var(--primary)] shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-16 animate-pulse rounded-[var(--radius-sm)] bg-[var(--surface-subtle)]"
        />
      ))}
    </div>
  );
}

function EmptyRows({ message }: { message: string }) {
  return (
    <p className="py-12 text-center text-sm text-[var(--text-muted)]">
      {message}
    </p>
  );
}

function ActivityCard({
  data,
  loading,
  tab,
  onTabChange,
}: {
  data: DashboardData | null;
  loading: boolean;
  tab: ActivityTab;
  onTabChange: (value: ActivityTab) => void;
}) {
  return (
    <Card
      header="آخر النشاط"
      description="أحدث العمليات المسجلة في النظام"
      actions={<SoftTabs value={tab} onChange={onTabChange} />}
    >
      {loading ? (
        <LoadingRows />
      ) : tab === "sales" ? (
        (data?.recentSales || []).length ? (
          <div className="space-y-2">
            {data!.recentSales.slice(0, 5).map((item) => (
              <Link
                key={item.id}
                to={`/sales/${item.id}`}
                className="flex items-center justify-between gap-4 rounded-[var(--radius-sm)] border border-[var(--border)] p-3 transition hover:bg-[var(--surface-hover)]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                    <ShoppingCart size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                      {item.invoice_number}
                    </p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {item.customer_name || "بيع نقدي"} · {statusLabel(item.status)}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-left">
                  <p dir="ltr" className="text-sm font-bold tabular-nums">
                    {money(item.total)} {item.currency === "SYP" ? "ل.س" : item.currency}
                  </p>
                  <p dir="ltr" className="mt-1 text-xs text-[var(--text-muted)]">
                    {item.invoice_date}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyRows message="لا توجد فواتير بيع بعد." />
        )
      ) : tab === "purchases" ? (
        (data?.recentPurchases || []).length ? (
          <div className="space-y-2">
            {data!.recentPurchases.slice(0, 5).map((item) => (
              <Link
                key={item.id}
                to={`/purchases/${item.id}`}
                className="flex items-center justify-between gap-4 rounded-[var(--radius-sm)] border border-[var(--border)] p-3 transition hover:bg-[var(--surface-hover)]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
                    <Truck size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                      {item.invoice_number}
                    </p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {item.supplier_name || "—"} · {statusLabel(item.status)}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-left">
                  <p dir="ltr" className="text-sm font-bold tabular-nums">
                    {money(item.total)} {item.currency === "SYP" ? "ل.س" : item.currency}
                  </p>
                  <p dir="ltr" className="mt-1 text-xs text-[var(--text-muted)]">
                    {item.invoice_date}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyRows message="لا توجد فواتير شراء بعد." />
        )
      ) : tab === "transactions" ? (
        (data?.recentTransactions || []).length ? (
          <div className="space-y-2">
            {data!.recentTransactions.slice(0, 5).map((item) => {
              const isIncome = item.type === "income";
              return (
                <Link
                  key={item.id}
                  to={`/transactions/${item.id}`}
                  className="flex items-center justify-between gap-4 rounded-[var(--radius-sm)] border border-[var(--border)] p-3 transition hover:bg-[var(--surface-hover)]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        isIncome
                          ? "bg-[var(--success-subtle)] text-[var(--success)]"
                          : "bg-[var(--danger)]/10 text-[var(--danger)]"
                      }`}
                    >
                      {isIncome ? (
                        <ArrowDownLeft size={17} />
                      ) : (
                        <ArrowUpRight size={17} />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                        {item.category_name || item.description || "معاملة مالية"}
                      </p>
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        {item.cashbox_name || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-left">
                    <p dir="ltr" className="text-sm font-bold tabular-nums">
                      {money(item.amount)} {item.currency === "SYP" ? "ل.س" : item.currency}
                    </p>
                    <p dir="ltr" className="mt-1 text-xs text-[var(--text-muted)]">
                      {item.transaction_date}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyRows message="لا توجد معاملات مالية بعد." />
        )
      ) : (data?.alerts || []).length ? (
        <div className="space-y-2">
          {data!.alerts.slice(0, 5).map((item) => (
            <Link
              key={item.id}
              to={PATHS.INVENTORY}
              className="flex items-center justify-between gap-4 rounded-[var(--radius-sm)] border border-[var(--border)] p-3 transition hover:bg-[var(--surface-hover)]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    item.quantity <= 0
                      ? "bg-[var(--danger)]/10 text-[var(--danger)]"
                      : "bg-[var(--warning-subtle)] text-[var(--warning)]"
                  }`}
                >
                  {item.quantity <= 0 ? (
                    <AlertTriangle size={17} />
                  ) : (
                    <Package size={17} />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                    {item.name}
                  </p>
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    {item.quantity <= 0 ? "المنتج نافد" : "المخزون منخفض"}
                  </p>
                </div>
              </div>
              <p dir="ltr" className="shrink-0 text-sm font-bold tabular-nums">
                {count(item.quantity)}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyRows message="لا توجد تنبيهات مخزون حاليًا." />
      )}
    </Card>
  );
}

function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activityTab, setActivityTab] = useState<ActivityTab>("sales");

  const loadDashboard = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      setError("");
      const response = await window.stockliteApi.dashboard.get();
      setData(response);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "تعذر تحميل بيانات لوحة التحكم.",
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard(true);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadDashboard(false);
      }
    }, 60_000);

    const handleFocus = () => void loadDashboard(false);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void loadDashboard(false);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadDashboard]);

  const summary = data?.summary;

  const stats = useMemo(
    () => [
      {
        title: "مبيعات اليوم",
        value: loading ? "—" : money(summary?.salesToday || 0),
        suffix: "ل.س",
        description: `${count(summary?.salesTodayCount || 0)} فاتورة · الشهر ${money(
          summary?.salesMonth || 0,
        )} ل.س`,
        icon: ShoppingCart,
        to: PATHS.SALES,
      },
      {
        title: "مشتريات اليوم",
        value: loading ? "—" : money(summary?.purchasesToday || 0),
        suffix: "ل.س",
        description: `${count(summary?.purchasesTodayCount || 0)} فاتورة · الشهر ${money(
          summary?.purchasesMonth || 0,
        )} ل.س`,
        icon: Truck,
        to: PATHS.PURCHASES,
      },
      {
        title: "ربح اليوم",
        value: loading ? "—" : money(summary?.profitToday || 0),
        suffix: "ل.س",
        description: `ربح الشهر ${money(summary?.profitMonth || 0)} ل.س`,
        icon: TrendingUp,
        to: PATHS.SALES,
      },
      {
        title: "أرصدة الصناديق",
        value: loading ? "—" : money(summary?.cashBalance || 0),
        suffix: "ل.س",
        description: data?.cashByCurrency?.length
          ? data.cashByCurrency
              .map((item) => `${money(item.balance)} ${item.currency === "SYP" ? "ل.س" : item.currency}`)
              .join(" · ")
          : `${count(summary?.cashboxesCount || 0)} صندوق نشط`,
        icon: WalletCards,
        to: PATHS.CASHBOXES,
      },
    ],
    [data, loading, summary],
  );

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
      <PageHeader
        title="لوحة التحكم"
        description="نظرة سريعة على أهم مؤشرات العمل والعمليات الأخيرة."
        actions={
          <div dir="rtl" className="flex items-center gap-2">
            <NotificationBell />
            <DashboardClock />
          </div>
        }
      />

      {error && !data && (
        <EmptyState
          title="تعذر تحميل لوحة التحكم"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void loadDashboard(true)}>
              إعادة المحاولة
            </Button>
          }
        />
      )}

      <StatsGrid>
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </StatsGrid>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <ActivityCard
          data={data}
          loading={loading}
          tab={activityTab}
          onTabChange={setActivityTab}
        />
        <QuickActionsCard />
      </div>

      {error && data && (
        <div className="text-center text-xs text-[var(--text-muted)]">
          تعذر التحديث التلقائي الأخير، وسيحاول التطبيق مجددًا تلقائيًا.
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
