import { Plus, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TableFooter from "../../components/common/TableFooter";
import SuppliersTable from "../../components/suppliers/SuppliersTable";
import SuppliersToolbar from "../../components/suppliers/SuppliersToolbar";
import type { Supplier } from "../../components/suppliers/types";
import { Button, Card, ConfirmDialog, EmptyState, PageHeader } from "../../components/ui";
import { useSuppliers } from "./SuppliersContext";

export default function SuppliersPage() {
  const navigate = useNavigate();
  const { suppliers, deleteSupplier } = useSuppliers();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier>();
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return suppliers.filter((supplier) => {
      const search = !q || [supplier.name, supplier.phone, supplier.email, supplier.address].some((value) => value.toLowerCase().includes(q));
      const status = statusFilter === "all" || (statusFilter === "active" && supplier.isActive) || (statusFilter === "inactive" && !supplier.isActive) || (statusFilter === "payable" && supplier.balance > 0) || (statusFilter === "advance" && supplier.balance < 0);
      return search && status;
    });
  }, [suppliers, searchQuery, statusFilter]);
  const clear = () => { setSearchQuery(""); setStatusFilter("all"); };

  return <>
    <PageHeader title="الموردون" description="إدارة بيانات الموردين وأرصدتهم وفواتير الشراء والدفعات المرتبطة بهم." actions={<Button startIcon={<Plus size={17} />} onClick={() => navigate("/suppliers/new")}>إضافة مورد</Button>} />
    <Card padding={false}>
      <SuppliersToolbar searchQuery={searchQuery} statusFilter={statusFilter} filtersAreActive={Boolean(searchQuery.trim()) || statusFilter !== "all"} onSearchChange={setSearchQuery} onStatusChange={setStatusFilter} onClearFilters={clear} />
      {filtered.length ? <><SuppliersTable suppliers={filtered} onView={(supplier) => navigate(`/suppliers/${supplier.id}`)} onEdit={(supplier) => navigate(`/suppliers/${supplier.id}/edit`)} onDelete={setSupplierToDelete} /><TableFooter visibleCount={filtered.length} totalCount={suppliers.length} entityName="مورد" /></> : <EmptyState icon={<Truck size={40} />} title="لا توجد نتائج مطابقة" description="لم نعثر على مورد يطابق البحث أو حالة الحساب المحددة." action={<Button variant="secondary" onClick={clear}>عرض جميع الموردين</Button>} />}
    </Card>
    <ConfirmDialog open={Boolean(supplierToDelete)} title="حذف المورد" message={`هل أنت متأكد من حذف المورد «${supplierToDelete?.name ?? ""}»؟`} onCancel={() => setSupplierToDelete(undefined)} onConfirm={() => { if (supplierToDelete) deleteSupplier(supplierToDelete.id); setSupplierToDelete(undefined); }} />
  </>;
}
