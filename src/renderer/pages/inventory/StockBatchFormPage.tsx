import { notifyError, notifySuccess, notifyValidation } from "../../lib/notifications";
import { Save } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton, Button, Card, FormField, Input, LoadingSpinner, NumberInput, PageHeader, Select, Textarea } from "../../components/ui";
import { suppliersService, type Supplier } from "../suppliers/suppliersService";
import { getInventoryErrorMessage, inventoryService, type InventoryItem } from "./inventoryService";
import { purchasesService } from "../purchases/purchasesService";

export default function StockBatchFormPage() {
  const { productId } = useParams(); const navigate = useNavigate(); const id = Number(productId);
  const [product, setProduct] = useState<InventoryItem>(); const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [batchCode, setBatchCode] = useState(""); const [supplierId, setSupplierId] = useState(""); const [quantity, setQuantity] = useState<number>(0); const [purchasePrice, setPurchasePrice] = useState<number>(0); const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split("T")[0]); const [expiryDate, setExpiryDate] = useState(""); const [notes, setNotes] = useState("");
  const [registrationMode, setRegistrationMode] = useState<"new" | "existing">("new");
  const [existingInvoiceId, setExistingInvoiceId] = useState("");
  const [supplierInvoices, setSupplierInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true); const [isSaving, setIsSaving] = useState(false); const [error, setError] = useState("");

  useEffect(() => {
    if (registrationMode === "existing" && supplierId) {
      purchasesService.list({ supplier_id: Number(supplierId) }, { limit: 100 })
        .then(res => {
          setSupplierInvoices(res.items.filter((inv: any) => inv.status !== 'cancelled' && !(inv.invoice_type === 'consignment' && inv.settlement_status === 'settled')));
        })
        .catch(console.error);
    } else {
      setSupplierInvoices([]);
      setExistingInvoiceId("");
    }
  }, [registrationMode, supplierId]);

  useEffect(() => { let cancelled = false; (async () => { try { const [details, supplierRows] = await Promise.all([inventoryService.productDetails(id), suppliersService.list()]); if (!cancelled) { setProduct(details.item); setSuppliers(supplierRows.filter((x) => x.isActive)); } } catch (e) { if (!cancelled) setError(getInventoryErrorMessage(e)); } finally { if (!cancelled) setIsLoading(false); } })(); return () => { cancelled = true; }; }, [id]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supplierId) return setError("يرجى اختيار المورد.");
    if (quantity <= 0) return setError("أدخل كمية صحيحة.");
    if (purchasePrice < 0) return setError("أدخل سعر شراء صحيح.");
    if (!receivedDate) return setError("تاريخ الاستلام مطلوب.");
    if (registrationMode === "existing" && !existingInvoiceId) return setError("يرجى اختيار فاتورة شراء.");
    if (expiryDate && expiryDate < receivedDate) { setError("تاريخ الانتهاء يجب أن يكون بعد تاريخ الاستلام."); notifyValidation("تاريخ الانتهاء يجب أن يكون بعد تاريخ الاستلام."); return; }
    try { 
      setIsSaving(true); setError(""); 
      const item = {
        product_id: id,
        quantity,
        purchase_price: purchasePrice,
        batch_code: batchCode || undefined,
        received_date: receivedDate || undefined,
        expiry_date: expiryDate || undefined,
        notes: notes || undefined,
      };

      if (registrationMode === "new") {
        await purchasesService.createFull({
          supplier_id: Number(supplierId),
          invoice_type: "standard",
          invoice_date: receivedDate,
          currency: "SYP",
          exchange_rate: 1,
          items: [item]
        });
      } else {
        await purchasesService.addItems(Number(existingInvoiceId), [item]);
      }
      notifySuccess("تم إضافة الدفعة بنجاح"); 
      navigate(`/inventory/${id}`); 
    }
    catch (e) { const message = getInventoryErrorMessage(e); setError(message); notifyError(message); } finally { setIsSaving(false); }
  }

  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner size="lg" /></div>;
  if (!product) return <Card><p className="text-sm text-[var(--danger)]">{error || "تعذر العثور على المادة."}</p></Card>;
  return <form onSubmit={submit} className="space-y-6">
    <PageHeader title="إضافة دفعة مخزون" description="ربط دفعة حقيقية بالمادة والمورد." actions={<BackButton />} />
    <Card header="المادة المحددة"><div className="grid gap-4 md:grid-cols-3"><Info label="المادة" value={product.productName} /><Info label="الكود" value={product.productCode} /><Info label="الرصيد الحالي" value={`${product.totalQuantity.toLocaleString()} ${product.unit}`} /></div></Card>
    <Card header="بيانات الدفعة"><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <FormField label="رقم الدفعة" hint="اختياري"><Input dir="ltr" value={batchCode} placeholder="مثال: BAT-2026-001" onChange={(e) => setBatchCode(e.target.value)} /></FormField>
      <FormField label="اسم المورد" required><Select value={supplierId} placeholder="اختر المورد" options={suppliers.map((s) => ({ value: String(s.id), label: s.name }))} onChange={(e) => setSupplierId(e.target.value)} /></FormField>
      <FormField label="إجراء الشراء" required>
        <Select value={registrationMode} options={[{ value: "new", label: "إنشاء فاتورة شراء جديدة" }, { value: "existing", label: "إضافة إلى فاتورة شراء حالية" }]} onChange={(e) => setRegistrationMode(e.target.value as "new" | "existing")} />
      </FormField>
      {registrationMode === "existing" && (
        <FormField label="فاتورة الشراء" required>
          <Select value={existingInvoiceId} placeholder="اختر الفاتورة" options={supplierInvoices.map((inv) => ({ value: String(inv.id), label: `${inv.invoice_number} (${inv.invoice_date})` }))} onChange={(e) => setExistingInvoiceId(e.target.value)} disabled={!supplierId || supplierInvoices.length === 0} />
        </FormField>
      )}
      <FormField label="الكمية" required><NumberInput min={0.001} step={0.001} value={String(quantity)} suffix={product.unit} onChange={(e) => setQuantity(Number(e.target.value))} /></FormField>
      <FormField label="سعر الشراء" required><NumberInput min={0} value={String(purchasePrice)} suffix="ل.س" onChange={(e) => setPurchasePrice(Number(e.target.value))} /></FormField>
      <FormField label="تاريخ الاستلام" required><Input type="date" dir="ltr" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} /></FormField>
      <FormField label="تاريخ الانتهاء"><Input type="date" dir="ltr" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} /></FormField>
      <div className="md:col-span-2 xl:col-span-3"><FormField label="ملاحظات"><Textarea rows={5} value={notes} placeholder="ملاحظات خاصة بالدفعة..." onChange={(e) => setNotes(e.target.value)} /></FormField></div>
      {error && <p className="md:col-span-2 xl:col-span-3 text-sm font-medium text-[var(--danger)]">{error}</p>}
    </div></Card>
    <div className="sticky bottom-0 z-10 flex justify-end gap-3 border-t border-[var(--border)] bg-[var(--background)] py-4"><Button variant="secondary" disabled={isSaving} onClick={() => navigate(-1)}>إلغاء</Button><Button type="submit" isLoading={isSaving} startIcon={<Save size={17} />}>حفظ الدفعة</Button></div>
  </form>;
}
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4"><p className="text-xs text-[var(--text-muted)]">{label}</p><p className="mt-1 font-bold">{value}</p></div>; }
