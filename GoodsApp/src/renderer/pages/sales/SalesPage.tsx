import { useMemo, useState } from "react";
import { Plus, ReceiptText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TableFooter from "../../components/common/TableFooter";
import SalesSummaryCards from "../../components/sales/SalesSummaryCards";
import SalesTable from "../../components/sales/SalesTable";
import type { SaleInvoice } from "../../components/sales/types";
import { Button, Card, ConfirmDialog, EmptyState, Input, PageHeader, Select } from "../../components/ui";
import { PATHS } from "../../routes/path";
import { salesService } from "./salesService";

export default function SalesPage() {
  const navigate = useNavigate();
  const [sales, setSales] = useState(salesService.list());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [pendingDelete, setPendingDelete] = useState<SaleInvoice | null>(null);
  const filtered = useMemo(() => sales.filter((sale) => (!query.trim() || `${sale.invoiceNumber} ${sale.customerName}`.toLowerCase().includes(query.toLowerCase())) && (status === "all" || sale.status === status)), [sales, query, status]);
  const totals = useMemo(() => ({ total: sales.reduce((s, i) => s + i.total, 0), paid: sales.reduce((s, i) => s + i.paidAmount, 0), remaining: sales.reduce((s, i) => s + Math.max(0, i.total - i.paidAmount), 0), profit: sales.reduce((s, i) => s + i.items.reduce((v, item) => v + item.profit, 0), 0), count: sales.length }), [sales]);
  return <>
    <PageHeader title="المبيعات" description="إدارة فواتير البيع والمدفوعات والأرباح وحالات الفواتير." actions={<Button startIcon={<Plus size={17} />} onClick={() => navigate(PATHS.SALE_NEW)}>فاتورة بيع جديدة</Button>} />
    <SalesSummaryCards {...totals} />
    <Card padding={false} className="mt-5" header="فواتير المبيعات" description="استعراض الفواتير وتصفية النتائج حسب العميل أو الحالة.">
      <div className="grid gap-3 border-b border-[var(--border)] p-4 md:grid-cols-[1fr_220px_auto]"><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث برقم الفاتورة أو اسم العميل" /><Select value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: "all", label: "كل الحالات" }, { value: "draft", label: "مسودة" }, { value: "confirmed", label: "مؤكدة" }, { value: "paid", label: "مدفوعة" }, { value: "cancelled", label: "ملغاة" }]} /><Button variant="secondary" onClick={() => { setQuery(""); setStatus("all"); }}>مسح الفلاتر</Button></div>
      {filtered.length ? <><SalesTable sales={filtered} onView={(sale) => navigate(`/sales/${sale.id}`)} onEdit={(sale) => navigate(`/sales/${sale.id}/edit`)} onDelete={setPendingDelete} /><TableFooter visibleCount={filtered.length} totalCount={sales.length} entityName="فاتورة" /></> : <EmptyState icon={<ReceiptText size={32} />} title="لا توجد فواتير مطابقة" description="غيّر البحث أو الحالة، أو أنشئ فاتورة بيع جديدة." />}
    </Card>
    <ConfirmDialog open={Boolean(pendingDelete)} title="حذف فاتورة البيع" message={`هل تريد حذف الفاتورة ${pendingDelete?.invoiceNumber ?? ""}؟`} onCancel={() => setPendingDelete(null)} onConfirm={() => { if (pendingDelete) salesService.remove(pendingDelete.id); setSales(salesService.list()); setPendingDelete(null); }} />
  </>;
}
