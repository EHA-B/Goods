import { useMemo, useState } from "react";
import { PackageSearch } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TableFooter from "../../components/common/TableFooter";
import { InventoryStatsGrid, InventoryTable, InventoryToolbar } from "../../components/inventory";
import { Card, EmptyState, PageHeader } from "../../components/ui";
import { useInventory } from "./InventoryContext";

export default function InventoryPage() {
  const navigate = useNavigate();
  const { inventory, batches } = useInventory();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const filteredInventory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return inventory.filter((item) => (!query || item.productName.toLowerCase().includes(query) || item.productCode.toLowerCase().includes(query) || item.categoryName.toLowerCase().includes(query) || item.supplierNames.some((name) => name.toLowerCase().includes(query))) && (statusFilter === "all" || item.status === statusFilter));
  }, [inventory, searchQuery, statusFilter]);
  const summary = useMemo(() => ({
    totalUnits: inventory.reduce((sum, item) => sum + item.totalQuantity, 0),
    inventoryValue: inventory.reduce((sum, item) => sum + item.stockValue, 0),
    lowStockCount: inventory.filter((item) => item.status === "low").length,
    outOfStockCount: inventory.filter((item) => item.status === "out").length,
    expiringBatchesCount: batches.filter((batch) => batch.expiryDate && batch.expiryDate <= "2026-08-29").length,
  }), [inventory, batches]);
  const filtersAreActive = Boolean(searchQuery.trim()) || statusFilter !== "all";

  return <>
    <PageHeader title="المخزون" description="متابعة أرصدة المواد والدفعات والموردين وقيمة المخزون." />
    <InventoryStatsGrid {...summary} />
    <Card padding={false} className="mt-5" header="مواد المخزون" description="عرض مختصر للمواد، مع صفحة مستقلة لكل مادة وتفاصيلها.">
      <InventoryToolbar searchQuery={searchQuery} statusFilter={statusFilter} filtersAreActive={filtersAreActive} onSearchChange={setSearchQuery} onStatusChange={setStatusFilter} onClearFilters={() => { setSearchQuery(""); setStatusFilter("all"); }} />
      {filteredInventory.length ? <>
        <InventoryTable items={filteredInventory} onViewDetails={(item) => navigate(`/inventory/${item.productId}`)} onAdjust={(item) => navigate(`/inventory/${item.productId}/adjust`)} />
        <TableFooter visibleCount={filteredInventory.length} totalCount={inventory.length} entityName="مادة" />
      </> : <EmptyState icon={<PackageSearch size={32} />} title={filtersAreActive ? "لا توجد مواد مطابقة" : "لا توجد مواد في المخزون"} description={filtersAreActive ? "جرّب تغيير عبارة البحث أو حالة المخزون." : "ستظهر المواد هنا بعد إضافة دفعات أو أرصدة افتتاحية."} />}
    </Card>
  </>;
}
