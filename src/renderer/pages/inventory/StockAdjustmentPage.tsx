import { PackageCheck } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { BackButton, Button, Card, FormField, LoadingSpinner, NumberInput, PageHeader, Select, Textarea } from "../../components/ui";
import { getInventoryErrorMessage, inventoryService, type InventoryItem, type StockBatch } from "./inventoryService";

const OPERATION_OPTIONS = [{ value: "add", label: "إضافة إلى الدفعة" }, { value: "subtract", label: "خصم من الدفعة" }];

export default function StockAdjustmentPage() {
  const { productId } = useParams(); const navigate = useNavigate(); const id = Number(productId);
  const [product, setProduct] = useState<InventoryItem>(); const [batches, setBatches] = useState<StockBatch[]>([]);
  const [batchId, setBatchId] = useState(""); const [operation, setOperation] = useState<"add" | "subtract">("subtract"); const [quantity, setQuantity] = useState<number>(1); const [reason, setReason] = useState(""); const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true); const [isSaving, setIsSaving] = useState(false); const [error, setError] = useState("");

  useEffect(() => { let cancelled = false; (async () => { try { const details = await inventoryService.productDetails(id); if (!cancelled) { setProduct(details.item); const active = details.batches.filter((x) => x.isActive); setBatches(active); if (active.length) setBatchId(String(active[0].id)); } } catch (e) { if (!cancelled) setError(getInventoryErrorMessage(e)); } finally { if (!cancelled) setIsLoading(false); } })(); return () => { cancelled = true; }; }, [id]);

  const selectedBatch = useMemo(() => batches.find((x) => x.id === Number(batchId)), [batches, batchId]);
  const amount = quantity || 0;
  const expected = selectedBatch ? selectedBatch.remainingQuantity + (operation === "add" ? amount : -amount) : 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selectedBatch) return setError("اختر دفعة موجودة.");
    if (!Number.isFinite(amount) || amount <= 0) return setError("أدخل كمية أكبر من صفر.");
    if (!reason.trim()) return setError("سبب التسوية مطلوب.");
    if (operation === "subtract" && amount > selectedBatch.remainingQuantity) return setError("لا يمكن خصم كمية أكبر من رصيد الدفعة.");
    try { setIsSaving(true); setError(""); await inventoryService.adjust(id, { stock_batch_id: selectedBatch.id, type: operation, quantity: amount, reason: reason.trim(), notes: notes.trim() || null }); toast.success("تمت تسوية المخزون بنجاح"); navigate(`/inventory/${id}`); }
    catch (e) { const message = getInventoryErrorMessage(e); setError(message); toast.error(message); } finally { setIsSaving(false); }
  }

  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner size="lg" /></div>;
  if (!product) return <Card><p className="text-sm text-[var(--danger)]">{error || "تعذر العثور على المادة."}</p></Card>;
  return <form onSubmit={submit} className="space-y-6">
    <PageHeader title="تسوية المخزون" description="تنفيذ إضافة أو خصم على دفعة محددة مع تسجيل الرصيد قبل وبعد." actions={<BackButton />} />
    <Card header="المادة المحددة"><div className="grid gap-4 md:grid-cols-3"><Info label="المادة" value={product.productName} /><Info label="الكود" value={product.productCode} /><Info label="الرصيد الإجمالي" value={`${product.totalQuantity.toLocaleString()} ${product.unit}`} /></div></Card>
    <Card header="بيانات التسوية"><div className="grid gap-5 md:grid-cols-2">
      <FormField label="الدفعة" required><Select value={batchId} placeholder={batches.length ? "اختر الدفعة" : "لا توجد دفعات"} options={batches.map((b) => ({ value: String(b.id), label: `${b.batchCode} — المتبقي ${b.remainingQuantity.toLocaleString()} ${product.unit}` }))} onChange={(e) => { setBatchId(e.target.value); setError(""); }} /></FormField>
      <FormField label="نوع التسوية" required><Select value={operation} options={OPERATION_OPTIONS} onChange={(e) => { setOperation(e.target.value as "add" | "subtract"); setError(""); }} /></FormField>
      <FormField label="الكمية" required><NumberInput min={0.001} step={0.001} value={String(quantity)} suffix={product.unit} onChange={(e) => { setQuantity(Number(e.target.value)); setError(""); }} /></FormField>
      <FormField label="سبب التسوية" required><Textarea rows={3} value={reason} placeholder="مثال: تلف، فرق جرد، تصحيح إدخال" onChange={(e) => setReason(e.target.value)} /></FormField>
      <div className="md:col-span-2"><FormField label="ملاحظات"><Textarea rows={4} value={notes} placeholder="تفاصيل إضافية..." onChange={(e) => setNotes(e.target.value)} /></FormField></div>
      {error && <p className="md:col-span-2 text-sm font-medium text-[var(--danger)]">{error}</p>}
    </div></Card>
    <Card header="ملخص العملية"><div className="grid gap-4 md:grid-cols-3"><Info label="رصيد الدفعة قبل" value={`${selectedBatch?.remainingQuantity.toLocaleString() ?? 0} ${product.unit}`} /><Info label="التغيير" value={`${operation === "add" ? "+" : "-"}${amount.toLocaleString()} ${product.unit}`} /><Info label="الرصيد المتوقع" value={`${Math.max(expected, 0).toLocaleString()} ${product.unit}`} /></div></Card>
    <div className="sticky bottom-0 z-10 flex justify-end gap-3 border-t border-[var(--border)] bg-[var(--background)] py-4"><Button variant="secondary" disabled={isSaving} onClick={() => navigate(-1)}>إلغاء</Button><Button type="submit" disabled={!batches.length} isLoading={isSaving} startIcon={<PackageCheck size={17} />}>حفظ التسوية</Button></div>
  </form>;
}
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4"><p className="text-xs text-[var(--text-muted)]">{label}</p><p className="mt-1 font-bold text-[var(--text-primary)]">{value}</p></div>; }
