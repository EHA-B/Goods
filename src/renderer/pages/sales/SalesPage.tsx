import { getArabicErrorMessage } from "../../lib/errorNormalizer";
import { useEffect, useState } from "react";
import { Plus, ReceiptText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SalesSummaryCards from "../../components/sales/SalesSummaryCards";
import SalesTable from "../../components/sales/SalesTable";
import { Button, Card, ConfirmDialog, EmptyState, Input, PageHeader, Pagination, Select } from "../../components/ui";
import { PATHS } from "../../routes/path";
import { salesService } from "./salesService";

const emptyTotals = { total: 0, paid: 0, remaining: 0, profit: 0, count: 0 };

export default function SalesPage() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<SaleInvoiceRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [pendingCancel, setPendingCancel] = useState<SaleInvoiceRecord | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = async (page = pagination.page) => {
    setLoading(true); setError("");
    try {
      const result = await salesService.listFiltered(
        { search: query.trim() || undefined, status: status as InvoiceStatus | "" },
        { page, limit: pagination.limit },
      );
      setSales(result.items);
      setPagination(result.pagination);
    } catch (err: unknown) {
      setError(getArabicErrorMessage(err, "خطأ في تحميل الفواتير"));
      setSales([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { const timer = window.setTimeout(() => void load(1), 250); return () => window.clearTimeout(timer); }, [query, status]);

  const totals = sales.reduce((acc, item) => ({
    total: acc.total + Number(item.total ?? 0),
    paid: acc.paid + Number(item.paid_amount ?? 0),
    remaining: acc.remaining + Number(item.remaining_amount ?? 0),
    profit: acc.profit,
    count: pagination.total,
  }), { ...emptyTotals });

  const handleCancel = async () => {
    if (!pendingCancel) return;
    setCancelling(true);
    try {
      if (pendingCancel.status === "draft") await salesService.deleteDraft(pendingCancel.id);
      else {
        const reason = window.prompt("اكتب سبب إلغاء فاتورة البيع:", "إلغاء بطلب المستخدم");
        if (!reason?.trim()) { setCancelling(false); return; }
        await salesService.cancel(pendingCancel.id, reason.trim());
      }
      setPendingCancel(null); await load(pagination.page);
    } catch (err: unknown) { setError(getArabicErrorMessage(err, "تعذر تنفيذ العملية")); setPendingCancel(null); }
    finally { setCancelling(false); }
  };

  return <>
    <PageHeader title="المبيعات" description="إدارة فواتير البيع والمدفوعات وحالات الفواتير." actions={<Button startIcon={<Plus size={17} />} onClick={() => navigate(PATHS.SALE_NEW)}>فاتورة بيع جديدة</Button>} />
    <SalesSummaryCards {...(loading ? emptyTotals : totals)} />
    <Card padding={false} className="mt-5" header="فواتير المبيعات" description="البيانات محملة مباشرة من الباك مع بحث وفلترة وتقسيم صفحات.">
      <div className="grid gap-3 border-b border-[var(--border)] p-4 md:grid-cols-[1fr_220px_auto]">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث برقم الفاتورة أو اسم العميل" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: "", label: "كل الحالات" }, { value: "draft", label: "مسودة" }, { value: "confirmed", label: "مؤكدة" }, { value: "partially_paid", label: "مدفوعة جزئيًا" }, { value: "paid", label: "مدفوعة" }, { value: "cancelled", label: "ملغاة" }]} />
        <Button variant="secondary" onClick={() => { setQuery(""); setStatus(""); }}>مسح الفلاتر</Button>
      </div>
      {error && <div className="m-4 rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--danger-subtle)] px-4 py-3 text-sm font-bold text-[var(--danger)]">{error}</div>}
      {loading ? <div className="px-6 py-12 text-center text-sm text-[var(--text-muted)]">جاري التحميل...</div> : sales.length ? <>
        <SalesTable sales={sales} onView={(s) => navigate(`/sales/${s.id}`)} onDelete={setPendingCancel} />
        <div className="px-5 pb-5"><Pagination page={pagination.page} totalPages={Math.max(1, pagination.totalPages)} onChange={(page) => void load(page)} /></div>
      </> : <EmptyState icon={<ReceiptText size={32} />} title="لا توجد فواتير مطابقة" description="غيّر البحث أو الحالة، أو أنشئ فاتورة بيع جديدة." />}
    </Card>
    <ConfirmDialog open={Boolean(pendingCancel)} title={pendingCancel?.status === "draft" ? "حذف فاتورة البيع" : "إلغاء فاتورة البيع"} message={`هل تريد ${pendingCancel?.status === "draft" ? "حذف" : "إلغاء"} الفاتورة ${pendingCancel?.invoice_number ?? ""}؟`} onCancel={() => setPendingCancel(null)} onConfirm={handleCancel} loading={cancelling} />
  </>;
}
