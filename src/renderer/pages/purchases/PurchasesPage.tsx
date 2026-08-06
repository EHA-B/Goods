import { getArabicErrorMessage } from "../../lib/errorNormalizer";
import { useEffect, useState } from "react";
import { Plus, ReceiptText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PurchasesSummaryCards from "../../components/purchases/PurchasesSummaryCards";
import PurchasesTable from "../../components/purchases/PurchasesTable";
import { Button, Card, ConfirmDialog, EmptyState, Input, PageHeader, Pagination, Select } from "../../components/ui";
import { PATHS } from "../../routes/path";
import { purchasesService } from "./purchasesService";

const emptyTotals = { total: 0, paid: 0, remaining: 0, count: 0 };

export default function PurchasesPage() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<PurchaseInvoiceRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [pendingDelete, setPendingDelete] = useState<PurchaseInvoiceRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async (page = pagination.page) => {
    setLoading(true); setError("");
    try {
      const result = await purchasesService.list(
        { search: query.trim() || undefined, status: status as InvoiceStatus | "", invoice_type: type || undefined },
        { page, limit: pagination.limit },
      );
      setPurchases(result.items);
      setPagination(result.pagination);
    } catch (err: unknown) {
      setError(getArabicErrorMessage(err, "خطأ في تحميل الفواتير"));
      setPurchases([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { const timer = window.setTimeout(() => void load(1), 250); return () => window.clearTimeout(timer); }, [query, status, type]);

  const totals = purchases.reduce((acc, item) => ({
    total: acc.total + Number(item.total ?? 0),
    paid: acc.paid + Number(item.paid_amount ?? 0),
    remaining: acc.remaining + Number(item.remaining_amount ?? 0),
    count: pagination.total,
  }), { ...emptyTotals });

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      if (pendingDelete.status === "draft") await purchasesService.deleteDraft(pendingDelete.id);
      else {
        const reason = window.prompt("اكتب سبب إلغاء فاتورة الشراء:", "إلغاء بطلب المستخدم");
        if (!reason?.trim()) { setDeleting(false); return; }
        await purchasesService.cancel(pendingDelete.id, reason.trim());
      }
      setPendingDelete(null); await load(pagination.page);
    } catch (err: unknown) { setError(getArabicErrorMessage(err, "تعذر تنفيذ العملية")); setPendingDelete(null); }
    finally { setDeleting(false); }
  };

  return <>
    <PageHeader title="المشتريات" description="إدارة فواتير الشراء والموردين والدفعات ودفعات المخزون." actions={<Button startIcon={<Plus size={17} />} onClick={() => navigate(PATHS.PURCHASE_NEW)}>فاتورة شراء جديدة</Button>} />
    <PurchasesSummaryCards {...(loading ? emptyTotals : totals)} />
    <Card padding={false} className="mt-5" header="فواتير المشتريات" description="البيانات محملة مباشرة من الباك مع بحث وفلترة وتقسيم صفحات.">
      <div className="grid gap-3 border-b border-[var(--border)] p-4 lg:grid-cols-[1fr_180px_180px_auto]">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث برقم الفاتورة أو اسم المورد" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: "", label: "كل الحالات" }, { value: "draft", label: "مسودة" }, { value: "confirmed", label: "مؤكدة" }, { value: "partially_paid", label: "مدفوعة جزئيًا" }, { value: "paid", label: "مدفوعة" }, { value: "cancelled", label: "ملغاة" }]} />
        <Select value={type} onChange={(e) => setType(e.target.value)} options={[{ value: "", label: "كل الأنواع" }, { value: "standard", label: "فاتورة عادية" }, { value: "consignment", label: "فاتورة أمانة" }]} />
        <Button variant="secondary" onClick={() => { setQuery(""); setStatus(""); setType(""); }}>مسح الفلاتر</Button>
      </div>
      {error && <div className="m-4 rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--danger-subtle)] px-4 py-3 text-sm font-bold text-[var(--danger)]">{error}</div>}
      {loading ? <div className="px-6 py-12 text-center text-sm text-[var(--text-muted)]">جاري التحميل...</div> : purchases.length ? <>
        <PurchasesTable purchases={purchases} onView={(p) => navigate(`/purchases/${p.id}`)} onDelete={setPendingDelete} />
        <div className="px-5 pb-5"><Pagination page={pagination.page} totalPages={Math.max(1, pagination.totalPages)} onChange={(page) => void load(page)} /></div>
      </> : <EmptyState icon={<ReceiptText size={32} />} title="لا توجد فواتير مطابقة" description="غيّر البحث أو الفلاتر، أو أنشئ فاتورة شراء جديدة." />}
    </Card>
    <ConfirmDialog open={Boolean(pendingDelete)} title={pendingDelete?.status === "draft" ? "حذف فاتورة الشراء" : "إلغاء فاتورة الشراء"} message={`هل تريد ${pendingDelete?.status === "draft" ? "حذف" : "إلغاء"} الفاتورة ${pendingDelete?.invoice_number ?? ""}؟`} onCancel={() => setPendingDelete(null)} onConfirm={handleDelete} loading={deleting} />
  </>;
}
