import { useEffect, useMemo, useState } from "react";
import { Plus, ReceiptText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TableFooter from "../../components/common/TableFooter";
import PurchasesSummaryCards from "../../components/purchases/PurchasesSummaryCards";
import PurchasesTable from "../../components/purchases/PurchasesTable";
import { Button, Card, ConfirmDialog, EmptyState, Input, PageHeader, Select } from "../../components/ui";
import { PATHS } from "../../routes/path";
import { purchasesService } from "./purchasesService";

const emptyTotals = { total: 0, paid: 0, remaining: 0, count: 0 };

export default function PurchasesPage() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<PurchaseInvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [pendingDelete, setPendingDelete] = useState<PurchaseInvoiceRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await purchasesService.list();
      setPurchases(data);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "خطأ في تحميل الفواتير");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() =>
    purchases.filter((purchase) =>
      (!query.trim() || `${purchase.invoice_number} ${purchase.supplier_name ?? ""}`.toLowerCase().includes(query.toLowerCase())) &&
      (status === "all" || purchase.status === status) &&
      (type === "all" || purchase.invoice_type === type)
    ),
    [purchases, query, status, type]
  );

  const totals = useMemo(() => ({
    total:     purchases.reduce((sum, i) => sum + Number(i.total     ?? 0), 0),
    paid:      purchases.reduce((sum, i) => sum + Number(i.paid_amount    ?? 0), 0),
    remaining: purchases.reduce((sum, i) => sum + Number(i.remaining_amount ?? 0), 0),
    count:     purchases.length,
  }), [purchases]);

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      if (pendingDelete.status === "draft") {
        await purchasesService.deleteDraft(pendingDelete.id);
      } else {
        await purchasesService.cancel(pendingDelete.id, "حذف من قائمة الفواتير");
      }
      setPendingDelete(null);
      await load();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "تعذر حذف الفاتورة");
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return <>
    <PageHeader
      title="المشتريات"
      description="إدارة فواتير الشراء والموردين والدفعات ودفعات المخزون."
      actions={<Button startIcon={<Plus size={17} />} onClick={() => navigate(PATHS.PURCHASE_NEW)}>فاتورة شراء جديدة</Button>}
    />
    <PurchasesSummaryCards {...(loading ? emptyTotals : totals)} />
    <Card padding={false} className="mt-5" header="فواتير المشتريات" description="استعراض الفواتير وتصفية النتائج حسب المورد أو النوع أو الحالة.">
      <div className="grid gap-3 border-b border-[var(--border)] p-4 lg:grid-cols-[1fr_180px_180px_auto]">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث برقم الفاتورة أو اسم المورد" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: "all", label: "كل الحالات" }, { value: "draft", label: "مسودة" }, { value: "confirmed", label: "مؤكدة" }, { value: "partially_paid", label: "مدفوعة جزئيًا" }, { value: "paid", label: "مدفوعة" }, { value: "cancelled", label: "ملغاة" }]} />
        <Select value={type} onChange={(e) => setType(e.target.value)} options={[{ value: "all", label: "كل الأنواع" }, { value: "standard", label: "فاتورة عادية" }, { value: "consignment", label: "فاتورة أمانة" }]} />
        <Button variant="secondary" onClick={() => { setQuery(""); setStatus("all"); setType("all"); }}>مسح الفلاتر</Button>
      </div>

      {error && <div className="m-4 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

      {loading ? (
        <div className="px-6 py-12 text-center text-sm text-[var(--text-muted)]">جاري التحميل...</div>
      ) : filtered.length ? <>
        <PurchasesTable
          purchases={filtered as never[]}
          onView={(purchase) => navigate(`/purchases/${(purchase as PurchaseInvoiceRecord).id}`)}
          onEdit={(purchase) => navigate(`/purchases/${(purchase as PurchaseInvoiceRecord).id}/edit`)}
          onDelete={(purchase) => setPendingDelete(purchase as PurchaseInvoiceRecord)}
        />
        <div className="border-t border-[var(--border)] px-4 py-3">
          <p className="text-xs text-[var(--text-muted)]">
            ملاحظة: الحذف متاح للفواتير <strong className="text-[var(--text-secondary)]">المسودة</strong> فقط.
            الفواتير المؤكدة يمكن إلغاؤها مع الحفاظ على السجلات المالية.
          </p>
        </div>
        <TableFooter visibleCount={filtered.length} totalCount={purchases.length} entityName="فاتورة" />
      </> : (
        <EmptyState icon={<ReceiptText size={32} />} title="لا توجد فواتير مطابقة" description="غيّر البحث أو الفلاتر، أو أنشئ فاتورة شراء جديدة." />
      )}
    </Card>

    <ConfirmDialog
      open={Boolean(pendingDelete)}
      title={pendingDelete?.status === "draft" ? "حذف فاتورة الشراء" : "إلغاء فاتورة الشراء"}
      message={`هل تريد ${pendingDelete?.status === "draft" ? "حذف" : "إلغاء"} الفاتورة ${pendingDelete?.invoice_number ?? ""}؟`}
      onCancel={() => setPendingDelete(null)}
      onConfirm={handleDelete}
      loading={deleting}
    />
  </>;
}
