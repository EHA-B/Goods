import { useMemo, useState } from "react";
import { Plus, ReceiptText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TableFooter from "../../components/common/TableFooter";
import PurchasesSummaryCards from "../../components/purchases/PurchasesSummaryCards";
import PurchasesTable from "../../components/purchases/PurchasesTable";
import type { PurchaseInvoice } from "../../components/purchases/types";
import { Button, Card, ConfirmDialog, EmptyState, Input, PageHeader, Select } from "../../components/ui";
import { PATHS } from "../../routes/path";
import { purchasesService } from "./purchasesService";

export default function PurchasesPage() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState(purchasesService.list());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [pendingDelete, setPendingDelete] = useState<PurchaseInvoice | null>(null);
  const filtered = useMemo(() => purchases.filter((purchase) => (!query.trim() || `${purchase.invoiceNumber} ${purchase.supplierName}`.toLowerCase().includes(query.toLowerCase())) && (status === "all" || purchase.status === status) && (type === "all" || purchase.purchaseType === type)), [purchases, query, status, type]);
  const totals = useMemo(() => ({ total: purchases.reduce((sum, item) => sum + item.total, 0), paid: purchases.reduce((sum, item) => sum + item.paidAmount, 0), remaining: purchases.reduce((sum, item) => sum + Math.max(0, item.total - item.paidAmount), 0), count: purchases.length }), [purchases]);
  return <>
    <PageHeader title="المشتريات" description="إدارة فواتير الشراء والموردين والدفعات ودفعات المخزون." actions={<Button startIcon={<Plus size={17} />} onClick={() => navigate(PATHS.PURCHASE_NEW)}>فاتورة شراء جديدة</Button>} />
    <PurchasesSummaryCards {...totals} />
    <Card padding={false} className="mt-5" header="فواتير المشتريات" description="استعراض الفواتير وتصفية النتائج حسب المورد أو النوع أو الحالة.">
      <div className="grid gap-3 border-b border-[var(--border)] p-4 lg:grid-cols-[1fr_180px_180px_auto]"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث برقم الفاتورة أو اسم المورد" /><Select value={status} onChange={(event) => setStatus(event.target.value)} options={[{ value: "all", label: "كل الحالات" }, { value: "draft", label: "مسودة" }, { value: "confirmed", label: "مؤكدة" }, { value: "paid", label: "مدفوعة" }, { value: "cancelled", label: "ملغاة" }]} /><Select value={type} onChange={(event) => setType(event.target.value)} options={[{ value: "all", label: "كل الأنواع" }, { value: "standard", label: "فاتورة عادية" }, { value: "consignment", label: "فاتورة أمانة" }]} /><Button variant="secondary" onClick={() => { setQuery(""); setStatus("all"); setType("all"); }}>مسح الفلاتر</Button></div>
      {filtered.length ? <><PurchasesTable purchases={filtered} onView={(purchase) => navigate(`/purchases/${purchase.id}`)} onEdit={(purchase) => navigate(`/purchases/${purchase.id}/edit`)} onDelete={setPendingDelete} /><div className="border-t border-[var(--border)] px-4 py-3"><p className="text-xs text-[var(--text-muted)]">ملاحظة: التعديل والحذف متاحان للفواتير <strong className="text-[var(--text-secondary)]">المسودة</strong> فقط، بينما الفواتير المؤكدة والمدفوعة تكون للقراءة فقط حفاظًا على سلامة المخزون والبيانات المالية.</p></div><TableFooter visibleCount={filtered.length} totalCount={purchases.length} entityName="فاتورة" /></> : <EmptyState icon={<ReceiptText size={32} />} title="لا توجد فواتير مطابقة" description="غيّر البحث أو الفلاتر، أو أنشئ فاتورة شراء جديدة." />}
    </Card>
    <ConfirmDialog open={Boolean(pendingDelete)} title="حذف فاتورة الشراء" message={`هل تريد حذف الفاتورة ${pendingDelete?.invoiceNumber ?? ""}؟`} onCancel={() => setPendingDelete(null)} onConfirm={() => { if (pendingDelete) purchasesService.remove(pendingDelete.id); setPurchases(purchasesService.list()); setPendingDelete(null); }} />
  </>;
}
