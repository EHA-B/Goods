import { PencilLine } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton, Button, Card, EmptyState, PageHeader, Select, StatusBadge } from "../../components/ui";
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeaderCell, DataTableRow } from "../../components/common";
import { useCustomers } from "./CustomersContext";

const options = [{ value: "all", label: "كل الحركات" }, { value: "sale", label: "مبيعات" }, { value: "purchase", label: "مشتريات" }];
const money = (value: number) => value.toLocaleString("en-US", { maximumFractionDigits: 2 });

export default function CustomerDetailsPage() {
  const navigate = useNavigate();
  const { customerId } = useParams();
  const id = Number(customerId);
  const { getCustomer, movements } = useCustomers();
  const customer = getCustomer(id);
  const [filter, setFilter] = useState("all");
  const rows = useMemo(() => movements.filter((m) => m.customerId === id && (filter === "all" || m.type === filter)), [movements, id, filter]);

  if (!customer) return <EmptyState title="العميل غير موجود" description="تعذر العثور على بيانات العميل المطلوبة." action={<Button onClick={() => navigate("/customers")}>العودة للعملاء</Button>} />;

  return (
    <>
      <PageHeader title={customer.name} description="بيانات العميل وجميع حركات البيع والشراء المرتبطة به." actions={<div className="flex gap-2"><BackButton to="/customers" label="العودة إلى العملاء" /><Button variant="secondary" startIcon={<PencilLine size={17} />} onClick={() => navigate(`/customers/${id}/edit`)}>تعديل</Button></div>} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card><p className="text-xs text-[var(--text-muted)]">رقم الهاتف</p><p className="mt-2 font-bold" dir="ltr">{customer.phone || "—"}</p></Card>
        <Card><p className="text-xs text-[var(--text-muted)]">الرصيد الحالي</p><p className="mt-2 text-lg font-bold">{money(Math.abs(customer.balance))} ل.س</p><p className="mt-1 text-xs text-[var(--text-muted)]">{customer.balance > 0 ? "على العميل" : customer.balance < 0 ? "للعميل" : "متوازن"}</p></Card>
        <Card><p className="text-xs text-[var(--text-muted)]">الحالة</p><div className="mt-2"><StatusBadge variant={customer.isActive ? "success" : "danger"}>{customer.isActive ? "نشط" : "غير نشط"}</StatusBadge></div></Card>
      </div>
      <Card padding={false} className="mt-5">
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4"><div><h2 className="font-bold">حركات العميل</h2><p className="mt-1 text-xs text-[var(--text-muted)]">فواتير البيع والشراء المرتبطة بهذا العميل.</p></div><Select value={filter} options={options} onChange={(e) => setFilter(e.target.value)} /></div>
        {rows.length ? <DataTable className="min-w-[900px]"><DataTableHead><DataTableRow><DataTableHeaderCell>النوع</DataTableHeaderCell><DataTableHeaderCell>المرجع</DataTableHeaderCell><DataTableHeaderCell>التاريخ</DataTableHeaderCell><DataTableHeaderCell>الإجمالي</DataTableHeaderCell><DataTableHeaderCell>المدفوع</DataTableHeaderCell><DataTableHeaderCell>المتبقي</DataTableHeaderCell></DataTableRow></DataTableHead><DataTableBody>{rows.map((m) => <DataTableRow key={m.id}><DataTableCell><StatusBadge variant={m.type === "sale" ? "success" : "warning"}>{m.type === "sale" ? "بيع" : "شراء"}</StatusBadge></DataTableCell><DataTableCell><span dir="ltr">{m.reference}</span></DataTableCell><DataTableCell>{m.date}</DataTableCell><DataTableCell>{money(m.total)}</DataTableCell><DataTableCell>{money(m.paid)}</DataTableCell><DataTableCell>{money(m.remaining)}</DataTableCell></DataTableRow>)}</DataTableBody></DataTable> : <EmptyState title="لا توجد حركات" description="لا توجد حركات مطابقة لهذا العميل." />}
      </Card>
    </>
  );
}
