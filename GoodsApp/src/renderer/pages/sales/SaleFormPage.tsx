import { useMemo, useState } from "react";
import { Calculator, Plus, ReceiptText, Save, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import type { PaymentMethod, SaleDraft, SaleItem, SaleStatus } from "../../components/sales/types";
import { BackButton, Button, Card, FormField, FormSection, Input, PageHeader, Select, Textarea } from "../../components/ui";
import { PATHS } from "../../routes/path";
import { salesService } from "./salesService";

const emptyItem = (): SaleItem => ({ id: 0, stockBatchId: 0, productName: "", batchCode: "", quantity: 1, availableQuantity: 0, unitPrice: 0, costPrice: 0, lineTotal: 0, profit: 0 });
export default function SaleFormPage() {
  const navigate = useNavigate();
  const { saleId } = useParams();
  const existing = saleId ? salesService.getById(Number(saleId)) : undefined;
  const lookups = salesService.getLookups();
  const [form, setForm] = useState<SaleDraft>({
    invoiceNumber: existing?.invoiceNumber ?? "",
    customerId: existing?.customerId ?? 0,
    customerName: existing?.customerName ?? "",
    saleTypeId: existing?.saleTypeId ?? 1,
    saleTypeName: existing?.saleTypeName ?? "",
    commissionPercentage: existing?.commissionPercentage ?? 0,
    cashboxId: existing?.cashboxId ?? 1,
    cashboxName: existing?.cashboxName,
    invoiceDate: existing?.invoiceDate ?? new Date().toISOString().slice(0, 10),
    discount: existing?.discount ?? 0,
    tax: existing?.tax ?? 0,
    status: existing?.status ?? "draft",
    notes: existing?.notes ?? "",
    items: existing?.items ?? [emptyItem()],
    initialPayment: 0,
    paymentMethod: "cash",
    paymentReference: "",
  });
  const totals = useMemo(() => {
    const subtotal = form.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const commission = subtotal * form.commissionPercentage / 100;
    return { subtotal, commission, total: Math.max(0, subtotal - form.discount + commission + form.tax), profit: form.items.reduce((sum, item) => sum + item.quantity * (item.unitPrice - item.costPrice), 0) };
  }, [form]);
  const updateItem = (index: number, patch: Partial<SaleItem>) => setForm((current) => ({ ...current, items: current.items.map((item, i) => i === index ? { ...item, ...patch } : item) }));
  const chooseBatch = (index: number, id: number) => {
    const batch = lookups.batches.find((item) => item.id === id);
    if (!batch) return updateItem(index, emptyItem());
    updateItem(index, { stockBatchId: batch.id, productName: batch.productName, batchCode: batch.batchCode, availableQuantity: batch.availableQuantity, costPrice: batch.costPrice, unitPrice: batch.suggestedPrice });
  };
  const save = (status: SaleStatus) => {
    if (!form.customerId || form.items.some((item) => !item.stockBatchId || item.quantity <= 0 || item.quantity > item.availableQuantity)) return;
    const saved = salesService.save({ ...form, status }, existing?.id);
    navigate(`/sales/${saved.id}`);
  };
  return <>
    <PageHeader title={existing ? "تعديل فاتورة البيع" : "فاتورة بيع جديدة"} description="إدخال بيانات الفاتورة والأصناف والإجماليات والدفع ضمن صفحة مستقلة." actions={<BackButton to={PATHS.SALES} />} />
    <div className="space-y-5">
      <FormSection title="معلومات الفاتورة" description="بيانات العميل ونوع البيع والتاريخ والصندوق." icon={<ReceiptText size={18} />}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField label="رقم الفاتورة" htmlFor="invoiceNumber"><Input id="invoiceNumber" value={form.invoiceNumber} placeholder="يُولّد تلقائيًا" onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} /></FormField>
          <FormField label="تاريخ الفاتورة" htmlFor="invoiceDate" required><Input id="invoiceDate" type="date" value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} /></FormField>
          <FormField label="العميل" htmlFor="customer" required><Select id="customer" value={String(form.customerId || "")} placeholder="اختر العميل" options={lookups.customers.map((item) => ({ value: String(item.id), label: item.name }))} onChange={(e) => setForm({ ...form, customerId: Number(e.target.value) })} /></FormField>
          <FormField label="نوع البيع" htmlFor="saleType" required><Select id="saleType" value={String(form.saleTypeId)} options={lookups.saleTypes.map((item) => ({ value: String(item.id), label: item.name }))} onChange={(e) => { const type = lookups.saleTypes.find((item) => item.id === Number(e.target.value))!; setForm({ ...form, saleTypeId: type.id, commissionPercentage: type.commissionPercentage }); }} /></FormField>
          <FormField label="الصندوق" htmlFor="cashbox"><Select id="cashbox" value={String(form.cashboxId ?? "")} options={lookups.cashboxes.map((item) => ({ value: String(item.id), label: item.name }))} onChange={(e) => setForm({ ...form, cashboxId: Number(e.target.value) })} /></FormField>
          <FormField label="نسبة العمولة" htmlFor="commission"><Input id="commission" type="number" min="0" value={form.commissionPercentage} onChange={(e) => setForm({ ...form, commissionPercentage: Number(e.target.value) })} /></FormField>
        </div>
      </FormSection>

      <Card header="أصناف الفاتورة" description="اختر دفعة المخزون، ثم أدخل الكمية وسعر البيع." actions={<Button size="sm" variant="secondary" startIcon={<Plus size={15} />} onClick={() => setForm({ ...form, items: [...form.items, emptyItem()] })}>إضافة صنف</Button>} padding={false}>
        <div className="overflow-x-auto"><table className="w-full text-right"><thead className="bg-[var(--surface-subtle)]"><tr>{["المنتج والدفعة", "المتاح", "الكمية", "سعر البيع", "التكلفة", "الإجمالي", "الربح", ""].map((item) => <th key={item} className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)]">{item}</th>)}</tr></thead><tbody>{form.items.map((item, index) => <tr key={index} className="border-t border-[var(--border)]"><td className="min-w-64 px-4 py-3"><Select value={String(item.stockBatchId || "")} placeholder="اختر المنتج والدفعة" options={lookups.batches.map((batch) => ({ value: String(batch.id), label: `${batch.productName} — ${batch.batchCode}` }))} onChange={(e) => chooseBatch(index, Number(e.target.value))} /></td><td className="px-4 py-3">{item.availableQuantity}</td><td className="w-32 px-4 py-3"><Input type="number" min="1" max={item.availableQuantity} value={item.quantity} error={item.quantity > item.availableQuantity} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })} /></td><td className="w-36 px-4 py-3"><Input type="number" min="0" value={item.unitPrice} onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })} /></td><td className="px-4 py-3">{item.costPrice.toLocaleString("en-US")}</td><td className="px-4 py-3 font-bold">{(item.quantity * item.unitPrice).toLocaleString("en-US")}</td><td className="px-4 py-3">{(item.quantity * (item.unitPrice - item.costPrice)).toLocaleString("en-US")}</td><td className="px-4 py-3"><Button size="sm" variant="danger" startIcon={<Trash2 size={14} />} disabled={form.items.length === 1} onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== index) })}>حذف</Button></td></tr>)}</tbody></table></div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <FormSection title="الدفع والملاحظات" description="يمكن تسجيل دفعة أولية عند حفظ الفاتورة.">
          <div className="grid gap-4 md:grid-cols-2"><FormField label="المبلغ المدفوع الآن" htmlFor="initialPayment"><Input id="initialPayment" type="number" min="0" max={totals.total} value={form.initialPayment} onChange={(e) => setForm({ ...form, initialPayment: Number(e.target.value) })} /></FormField><FormField label="طريقة الدفع" htmlFor="paymentMethod"><Select id="paymentMethod" value={form.paymentMethod} options={[{ value: "cash", label: "نقدي" }, { value: "bank", label: "تحويل بنكي" }, { value: "credit_card", label: "بطاقة" }, { value: "cheque", label: "شيك" }, { value: "online", label: "دفع إلكتروني" }]} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as PaymentMethod })} /></FormField><FormField label="رقم المرجع" htmlFor="reference"><Input id="reference" value={form.paymentReference} onChange={(e) => setForm({ ...form, paymentReference: e.target.value })} /></FormField><FormField label="ملاحظات" htmlFor="notes" className="md:col-span-2"><Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></FormField></div>
        </FormSection>
        <Card header={<span className="flex items-center gap-2"><Calculator size={18} className="text-[var(--primary)]" />ملخص الفاتورة</span>}>
          <div className="space-y-3 text-sm">{[["المجموع الفرعي", totals.subtotal], ["الخصم", -form.discount], ["العمولة", totals.commission], ["الضريبة", form.tax], ["إجمالي الربح", totals.profit]].map(([label, value]) => <div key={String(label)} className="flex justify-between"><span className="text-[var(--text-muted)]">{label}</span><strong>{Number(value).toLocaleString("en-US")}</strong></div>)}<div className="border-t border-[var(--border)] pt-3"><div className="flex justify-between text-base"><strong>الإجمالي النهائي</strong><strong className="text-[var(--primary)]">{totals.total.toLocaleString("en-US")}</strong></div></div></div>
        </Card>
      </div>
      <div className="flex justify-end gap-3"><Button variant="secondary" onClick={() => navigate(PATHS.SALES)}>إلغاء</Button>{existing ? <Button startIcon={<Save size={17} />} onClick={() => save(existing.status)}>حفظ التعديلات</Button> : <><Button variant="secondary" startIcon={<Save size={17} />} onClick={() => save("draft")}>حفظ كمسودة</Button><Button startIcon={<Save size={17} />} onClick={() => save("confirmed")}>حفظ وتأكيد</Button></>}</div>
    </div>
  </>;
}
