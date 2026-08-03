import { AlertTriangle, Package, Truck, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DashboardClock from "../../components/dashboard/DashboardClock";
import QuickActionsCard from "../../components/dashboard/QuickActionsCard";
import RecentTransactionsCard from "../../components/dashboard/RecentTransactionsCard";
import StatCard from "../../components/dashboard/StatCard";
import StatsGrid from "../../components/dashboard/StatsGrid";
import type { FinancialTransaction } from "../../components/transactions/types";
import { Button, EmptyState, PageHeader } from "../../components/ui";
import { PATHS } from "../../routes/path";
import { transactionsService } from "../transactions/transactionsService";

type DashboardData = { products: number; customers: number; suppliers: number; lowStock: number; transactions: FinancialTransaction[] };
const emptyData: DashboardData = { products: 0, customers: 0, suppliers: 0, lowStock: 0, transactions: [] };

function DashboardPage() {
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true); setError("");
      const [products, customers, suppliers, stockSummary, transactionData] = await Promise.all([
        window.stockliteApi.products.list() as Promise<unknown[]>,
        window.stockliteApi.customers.list() as Promise<unknown[]>,
        window.stockliteApi.suppliers.list() as Promise<unknown[]>,
        window.stockliteApi.stockBatches.summary() as Promise<Record<string, unknown>>,
        transactionsService.loadAll(),
      ]);
      setData({
        products: products.length,
        customers: customers.length,
        suppliers: suppliers.length,
        lowStock: Number(stockSummary.low_stock_count ?? stockSummary.lowStockCount ?? 0),
        transactions: transactionData.transactions.sort((a, b) => `${b.transactionDate}-${b.id}`.localeCompare(`${a.transactionDate}-${a.id}`)),
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل بيانات لوحة التحكم.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadDashboard(); }, []);

  const stats = useMemo(() => [
    { title: "المنتجات", value: loading ? "—" : data.products, suffix: "منتج", description: "إجمالي المنتجات المسجلة", icon: Package, to: PATHS.PRODUCTS },
    { title: "العملاء", value: loading ? "—" : data.customers, suffix: "عميل", description: "إجمالي العملاء المسجلين", icon: Users, to: PATHS.CUSTOMERS },
    { title: "الموردون", value: loading ? "—" : data.suppliers, suffix: "مورد", description: "إجمالي الموردين المسجلين", icon: Truck, to: PATHS.SUPPLIERS },
    { title: "مخزون منخفض", value: loading ? "—" : data.lowStock, suffix: "منتج", description: "بحسب الحد المعتمد في النظام", icon: AlertTriangle, to: PATHS.INVENTORY },
  ], [data, loading]);

  return <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
    <PageHeader title="لوحة التحكم" description="نظرة عامة على البيانات المرتبطة حاليًا دون أرقام وهمية." actions={<DashboardClock />} />
    {error && <EmptyState title="تعذر تحديث لوحة التحكم" description={error} action={<Button variant="secondary" onClick={() => void loadDashboard()}>إعادة المحاولة</Button>} />}
    <StatsGrid>{stats.map((stat) => <StatCard key={stat.title} {...stat} />)}</StatsGrid>
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]"><RecentTransactionsCard items={data.transactions} loading={loading} /><QuickActionsCard /></div>
  </div>;
}
export default DashboardPage;
