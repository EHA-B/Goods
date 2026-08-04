import { HandCoins } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CommissionPreviewCard from "../../../components/consignment/CommissionPreviewCard";
import RemainingStockPolicySelector from "../../../components/consignment/RemainingStockPolicySelector";
import { BackButton, Button, Card, ConfirmDialog, FormField, Input, LoadingSpinner, PageHeader, Select, Textarea } from "../../../components/ui";
import { consignmentService } from "./consignmentService";
import type { CloseConsignmentInput, ConsignmentCashbox, ConsignmentClosingPreview, ConsignmentInvoiceSummary, RemainingStockPolicy } from "./consignmentTypes";
import { money, policyLabels } from "./consignmentUtils";

const today = new Date().toISOString().slice(0, 10);
export default function CloseConsignmentPage() {
  const { purchaseId } = useParams(); const id = Number(purchaseId); const navigate = useNavigate();
  const [summary, setSummary] = useState<ConsignmentInvoiceSummary | null>(null);
  const [cashboxes, setCashboxes] = useState<ConsignmentCashbox[]>([]);
  const [commission, setCommission] = useState("10"); const [cashboxId, setCashboxId] = useState(""); const [date, setDate] = useState(today);
  const [policy, setPolicy] = useState<RemainingStockPolicy>("return_to_supplier"); const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<ConsignmentClosingPreview | null>(null); const [loading, setLoading] = useState(true); const [submitting, setSubmitting] = useState(false); const [confirmOpen, setConfirmOpen] = useState(false); const [error, setError] = useState("");
  useEffect(() => { void (async () => { try { setError(""); const [s, c] = await Promise.all([consignmentService.getSummary(id), consignmentService.getCashboxes()]); setSummary(s); setCashboxes(c.map((c: any) => ({ ...c, isActive: !!c.isActive }))); const matching = c.find((x) => x.currency === s.invoice.currency); if (matching) setCashboxId(String(matching.id)); } catch (e) { setError(e instanceof Error ? e.message : "تعذر تحميل بيانات التسوية."); } finally { setLoading(false); } })(); }, [id]);
  const input = useMemo<CloseConsignmentInput>(() => ({ commission_percentage: Number(commission), cashbox_id: Number(cashboxId), settlement_date: date, remaining_stock_policy: policy, notes: notes.trim() || null }), [commission, cashboxId, date, policy, notes]);
  useEffect(() => { if (!summary || !cashboxId) return; void consignmentService.getClosingPreview(id, input).then(setPreview); }, [summary, id, input, cashboxId]);
  if (loading) return <div className="flex min-h-72 items-center justify-center"><LoadingSpinner /></div>;
  if (error || !summary) return <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger-subtle)] p-5 text-sm font-bold text-[var(--danger)]">{error || "تعذر تحميل بيانات التسوية."}</div>;
  const matchingCashboxes = cashboxes.filter((cashbox) => cashbox.currency === summary.invoice.currency);
  const submit = async () => { try { setSubmitting(true); setError(""); const result = await consignmentService.close(id, input); navigate(`/purchases/${id}/consignment-settlement`, { state: { settlement: result } }); } catch (e) { setError(e instanceof Error ? e.message : "تعذر إتمام التسوية."); } finally { setSubmitting(false); setConfirmOpen(false); } };
  return <>
    <PageHeader title="إغلاق وتسوية فاتورة الأمانة" description="راجع المبيعات والعمولة والصندوق ومصير الكمية المتبقية قبل التأكيد." actions={<BackButton to={`/purchases/${id}/consignment`} />} />
    {error && <div className="mb-4 rounded-lg border border-[var(--danger)] bg-[var(--danger-subtle)] p-3 text-sm font-bold text-[var(--danger)]">{error}</div>}
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <Card header="بيانات الفاتورة"><div className="grid gap-4 sm:grid-cols-3">{[["رقم الفاتورة", summary.invoice.invoice_number], ["المورد", summary.invoice.supplier_name], ["إجمالي المبيعات", money(summary.sales.total_sales_amount, summary.invoice.currency)], ["الكمية المباعة", summary.sales.sold_quantity], ["الكمية المتبقية", summary.stock.remaining_quantity], ["العملة", summary.invoice.currency]].map(([l, v]) => <div key={String(l)}><p className="text-xs font-bold text-[var(--text-muted)]">{l}</p><p className="mt-1 text-sm font-black">{v}</p></div>)}</div></Card>
        <Card header="بيانات التسوية"><div className="grid gap-4 sm:grid-cols-2"><FormField label="نسبة العمولة" required><Input type="number" min="0" max="100" value={commission} onChange={(e) => setCommission(e.target.value)} endContent={<span className="px-3 text-sm text-[var(--text-muted)]">%</span>} /></FormField><FormField label="تاريخ التسوية" required><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></FormField><FormField label="الصندوق" required><Select value={cashboxId} onChange={(e) => setCashboxId(e.target.value)} placeholder="اختر الصندوق" options={matchingCashboxes.map((cashbox) => ({ value: String(cashbox.id), label: `${cashbox.name} — ${money(cashbox.balance, cashbox.currency)}` }))} /></FormField><FormField label="الملاحظات"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات اختيارية حول التسوية" /></FormField></div></Card>
        <Card header="معالجة الكمية المتبقية" description="يجب تحديد مصير المتبقي بدل اعتباره تالفًا تلقائيًا."><RemainingStockPolicySelector value={policy} onChange={setPolicy} /></Card>
        <div className="flex justify-end"><Button startIcon={<HandCoins size={18} />} disabled={!preview?.can_submit || submitting} onClick={() => setConfirmOpen(true)}>مراجعة وتأكيد التسوية</Button></div>
      </div>
      {preview && <CommissionPreviewCard preview={preview} />}
    </div>
    <ConfirmDialog open={confirmOpen} title="تأكيد إغلاق فاتورة الأمانة" message={`سيتم اعتماد إجمالي مبيعات ${money(preview?.total_sales_amount ?? 0, summary.invoice.currency)}، وعمولة ${commission}%، وحصة مورد ${money(preview?.supplier_share ?? 0, summary.invoice.currency)}، ومعالجة المتبقي عبر: ${policyLabels[policy]}. هذه العملية تجريبية في الواجهة حاليًا.`} confirmText="تأكيد التسوية" cancelText="مراجعة" loading={submitting} onCancel={() => setConfirmOpen(false)} onConfirm={() => void submit()} />
  </>;
}
