import { useEffect, useMemo, useState } from "react";
import { Plus, ReceiptText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TableFooter from "../../components/common/TableFooter";
import SalesSummaryCards from "../../components/sales/SalesSummaryCards";
import SalesTable from "../../components/sales/SalesTable";
import { Button, Card, ConfirmDialog, EmptyState, Input, PageHeader, Select } from "../../components/ui";
import { PATHS } from "../../routes/path";
import { salesService } from "./salesService";

const emptyTotals = { total: 0, paid: 0, remaining: 0, profit: 0, count: 0 };

export default function SalesPage() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<SaleInvoiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [pendingCancel, setPendingCancel] = useState<SaleInvoiceRecord | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await salesService.list();
      setSales(data);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "خطأ في تحميل الفواتير");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() =>
    sales.filter((sale) =>
      (!query.trim() || `${sale.invoice_number} ${sale.customer_name ?? ""}`.toLowerCase().includes(query.toLowerCase())) &&
      (status === "all" || sale.status === status)
    ),
    [sales, query, status]
  );

  const totals = useMemo(() => ({
    total:     sales.reduce((s, i) => s + Number(i.total ?? 0), 0),
    paid:      sales.reduce((s, i) => s + Number(i.paid_amount ?? 0), 0),
    remaining: sales.reduce((s, i) => s + Number(i.remaining_amount ?? 0), 0),
    profit:    0, // profit requires join with items — not in flat list
    count:     sales.length,
  }), [sales]);

  const handleCancel = async () => {
    if (!pendingCancel) return;
    setCancelling(true);
    try {
      if (pendingCancel.status === "draft") {
        await salesService.deleteDraft(pendingCancel.id);
      } else {
        await salesService.cancel(pendingCancel.id, "إلغاء من قائمة الفواتير");
      }
      setPendingCancel(null);
      await load();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "تعذر إلغاء الفاتورة");
      setPendingCancel(null);
    } finally {
      setCancelling(false);
    }
  };

  return <>
    <PageHeader
      title="المبيعات"
      description="إدارة فواتير البيع والمدفوعات والأرباح وحالات الفواتير."
      actions={<Button startIcon={<Plus size={17} />} onClick={() => navigate(PATHS.SALE_NEW)}>فاتورة بيع جديدة</Button>}
    />
    <SalesSummaryCards {...(loading ? emptyTotals : totals)} />
    <Card padding={false} className="mt-5" header="فواتير المبيعات" description="استعراض الفواتير وتصفية النتائج حسب العميل أو الحالة.">
      <div className="grid gap-3 border-b border-[var(--border)] p-4 md:grid-cols-[1fr_220px_auto]">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث برقم الفاتورة أو اسم العميل" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: "all", label: "كل الحالات" }, { value: "draft", label: "مسودة" }, { value: "confirmed", label: "مؤكدة" }, { value: "partially_paid", label: "مدفوعة جزئيًا" }, { value: "paid", label: "مدفوعة" }, { value: "cancelled", label: "ملغاة" }]} />
        <Button variant="secondary" onClick={() => { setQuery(""); setStatus("all"); }}>مسح الفلاتر</Button>
      </div>

      {error && <div className="m-4 rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

      {loading ? (
        <div className="px-6 py-12 text-center text-sm text-[var(--text-muted)]">جاري التحميل...</div>
      ) : filtered.length ? <>
        <SalesTable
          sales={filtered as never[]}
          onView={(sale) => navigate(`/sales/${(sale as SaleInvoiceRecord).id}`)}
          onEdit={(sale) => navigate(`/sales/${(sale as SaleInvoiceRecord).id}/edit`)}
          onDelete={(sale) => setPendingCancel(sale as SaleInvoiceRecord)}
        />
        <TableFooter visibleCount={filtered.length} totalCount={sales.length} entityName="فاتورة" />
      </> : (
        <EmptyState icon={<ReceiptText size={32} />} title="لا توجد فواتير مطابقة" description="غيّر البحث أو الحالة، أو أنشئ فاتورة بيع جديدة." />
      )}
    </Card>

    <ConfirmDialog
      open={Boolean(pendingCancel)}
      title={pendingCancel?.status === "draft" ? "حذف فاتورة البيع" : "إلغاء فاتورة البيع"}
      message={`هل تريد ${pendingCancel?.status === "draft" ? "حذف" : "إلغاء"} الفاتورة ${pendingCancel?.invoice_number ?? ""}؟`}
      onCancel={() => setPendingCancel(null)}
      onConfirm={handleCancel}
    />
  </>;
}
