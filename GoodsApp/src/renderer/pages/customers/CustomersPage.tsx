import { Plus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TableFooter from "../../components/common/TableFooter";
import CustomersTable from "../../components/customers/CustomersTable";
import CustomersToolbar from "../../components/customers/CustomersToolbar";
import type { Customer } from "../../components/customers/types";
import { Button, Card, ConfirmDialog, EmptyState, PageHeader } from "../../components/ui";
import { useCustomers } from "./CustomersContext";

export default function CustomersPage() {
  const navigate = useNavigate();
  const { customers, deleteCustomer } = useCustomers();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerToDelete, setCustomerToDelete] = useState<Customer>();
  const filteredCustomers = useMemo(() => { const q = searchQuery.trim().toLowerCase(); return customers.filter((c) => { const search = !q || c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q) || c.address.toLowerCase().includes(q); const status = statusFilter === "all" || (statusFilter === "active" && c.isActive) || (statusFilter === "inactive" && !c.isActive) || (statusFilter === "debtor" && c.balance > 0) || (statusFilter === "creditor" && c.balance < 0); return search && status; }); }, [customers, searchQuery, statusFilter]);
  const clear = () => { setSearchQuery(""); setStatusFilter("all"); };
  return <><PageHeader title="العملاء" description="إدارة بيانات العملاء وأرصدة الحسابات وحركات البيع والشراء." actions={<Button startIcon={<Plus size={17} />} onClick={() => navigate("/customers/new")}>إضافة عميل</Button>} /><Card padding={false}><CustomersToolbar searchQuery={searchQuery} statusFilter={statusFilter} filtersAreActive={Boolean(searchQuery.trim()) || statusFilter !== "all"} onSearchChange={setSearchQuery} onStatusChange={setStatusFilter} onClearFilters={clear} />{filteredCustomers.length ? <><CustomersTable customers={filteredCustomers} onView={(c) => navigate(`/customers/${c.id}`)} onEdit={(c) => navigate(`/customers/${c.id}/edit`)} onDelete={setCustomerToDelete} /><TableFooter visibleCount={filteredCustomers.length} totalCount={customers.length} entityName="عميل" /></> : <EmptyState icon={<Users size={40} />} title="لا توجد نتائج مطابقة" description="لم نعثر على عميل يطابق البحث أو حالة الحساب المحددة." action={<Button variant="secondary" onClick={clear}>عرض جميع العملاء</Button>} />}</Card><ConfirmDialog open={Boolean(customerToDelete)} title="حذف العميل" message={`هل أنت متأكد من حذف العميل «${customerToDelete?.name ?? ""}»؟`} onCancel={() => setCustomerToDelete(undefined)} onConfirm={() => { if (customerToDelete) deleteCustomer(customerToDelete.id); setCustomerToDelete(undefined); }} /></>;
}
