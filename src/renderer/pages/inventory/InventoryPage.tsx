import { AlertCircle, PackageSearch, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TableFooter from "../../components/common/TableFooter";
import { InventoryStatsGrid, InventoryTable, InventoryToolbar } from "../../components/inventory";
import { Button, Card, EmptyState, LoadingSpinner, PageHeader } from "../../components/ui";
import { getInventoryErrorMessage, inventoryService, type InventoryItem, type InventorySummary } from "./inventoryService";
import { RECORDS_PAGE_SIZE, useClientPagination } from "../../lib/pagination";

const emptySummary: InventorySummary = { totalUnits: 0, inventoryValue: 0, lowStockCount: 0, outOfStockCount: 0, expiringBatchesCount: 0 };

export default function InventoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState(emptySummary);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setIsLoading(true); setError("");
      const [summaryResult, listResult] = await Promise.all([inventoryService.summary(), inventoryService.list(1, 500)]);
      setSummary(summaryResult); setItems(listResult.items);
    } catch (err) { setError(getInventoryErrorMessage(err)); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch = !query || [item.productName, item.productCode, item.categoryName, ...item.supplierNames].some((value) => value.toLowerCase().includes(query));
      return matchesSearch && (statusFilter === "all" || item.status === statusFilter);
    });
  }, [items, searchQuery, statusFilter]);

  const {
    page,
    setPage,
    totalPages,
    paginatedItems,
  } = useClientPagination(
    filtered,
    {
      pageSize: RECORDS_PAGE_SIZE,
      resetKey: `${searchQuery}|${statusFilter}`,
    },
  );

  const filtersAreActive = Boolean(searchQuery.trim()) || statusFilter !== "all";
  return <>
    <PageHeader title="المخزون" description="متابعة أرصدة المواد والدفعات والموردين وقيمة المخزون من قاعدة البيانات." />
    <InventoryStatsGrid {...summary} />
    <Card padding={false} className="mt-5" header="مواد المخزون" description="الأرصدة مجمعة من الدفعات الفعلية لكل مادة.">
      <InventoryToolbar searchQuery={searchQuery} statusFilter={statusFilter} filtersAreActive={filtersAreActive} onSearchChange={setSearchQuery} onStatusChange={setStatusFilter} onClearFilters={() => { setSearchQuery(""); setStatusFilter("all"); }} />
      {isLoading ? <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-[var(--text-muted)]"><LoadingSpinner size="lg" /><p className="text-sm">جاري تحميل المخزون...</p></div>
      : error ? <EmptyState icon={<AlertCircle size={28} />} title="تعذر تحميل المخزون" description={error} action={<Button variant="secondary" startIcon={<RefreshCw size={16} />} onClick={() => void load()}>إعادة المحاولة</Button>} />
      : filtered.length ? <><InventoryTable items={paginatedItems} onViewDetails={(item) => navigate(`/inventory/${item.productId}`)} onAdjust={(item) => navigate(`/inventory/${item.productId}/adjust`)} /><TableFooter visibleCount={paginatedItems.length} totalCount={filtered.length} entityName="مادة" page={page} totalPages={totalPages} pageSize={RECORDS_PAGE_SIZE} onPageChange={setPage} /></>
      : <EmptyState icon={<PackageSearch size={32} />} title={filtersAreActive ? "لا توجد مواد مطابقة" : "لا توجد مواد في المخزون"} description={filtersAreActive ? "جرّب تغيير البحث أو حالة المخزون." : "أضف دفعة مخزون لتظهر الكميات هنا."} />}
    </Card>
  </>;
}
