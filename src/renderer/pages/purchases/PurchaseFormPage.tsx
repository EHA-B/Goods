import { useMemo, useState } from "react";
import { Calculator, PackagePlus, Plus, Save, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BackButton, Button, Card, FormField, FormSection, Input, PageHeader, Select, Textarea } from "../../components/ui";
import { PATHS } from "../../routes/path";
import { purchasesService } from "./purchasesService";

type PurchaseItemForm = {
  product_id: number;
  productName: string;
  quantity: number;
  purchase_price: number;
  batch_code: string;
  received_date: string;
  expiry_date: string;
};

const emptyItem = (): PurchaseItemForm => ({
  product_id: 0,
  productName: "",
  quantity: 1,
  purchase_price: 0,
  batch_code: "",
  received_date: new Date().toISOString().slice(0, 10),
  expiry_date: "",
});

const money = (value: number) => value.toLocaleString("en-US");

export default function PurchaseFormPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [supplierId, setSupplierId] = useState(0);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceType, setInvoiceType] = useState<"standard" | "consignment">("standard");
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseItemForm[]>([emptyItem()]);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentCashboxId, setPaymentCashboxId] = useState(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));

  // Lookups loaded lazily once
  const [lookups, setLookups] = useState<{ suppliers: PartyApiRecord[]; cashboxes: CashboxApiRecord[]; products: ProductApiRecord[] } | null>(null);
  const loadLookups = () => {
    if (lookups) return;
    Promise.all([purchasesService.getLookups(), purchasesService.getProducts()])
      .then(([data, products]) => setLookups({ ...data, products }))
      .catch(() => {});
  };

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.purchase_price, 0), [items]);
  const total = Math.max(0, subtotal - discount);
  const remaining = Math.max(0, total - paymentAmount);

  const updateItem = (index: number, patch: Partial<PurchaseItemForm>) =>
    setItems((curr) => curr.map((item, i) => i === index ? { ...item, ...patch } : item));

  const selectProduct = (index: number, productId: number) => {
    const product = lookups?.products.find((p) => p.id === productId);
    updateItem(index, { product_id: productId, productName: product?.name ?? "" });
  };

  const submit = async () => {
    setError("");
    if (!supplierId) { setError("اختر المورد"); return; }
    if (items.some((item) => !item.product_id || item.quantity <= 0 || item.purchase_price < 0)) {
      setError("راجع الأصناف — المنتج والكمية والسعر مطلوبة");
      return;
    }

    const input: CreatePurchaseInvoiceInput = {
      supplier_id: supplierId,
      invoice_number: invoiceNumber.trim() || undefined,
      invoice_date: invoiceDate,
      invoice_type: invoiceType,
      discount_amount: discount,
      notes: notes || undefined,
      items: items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        purchase_price: item.purchase_price,
        batch_code: item.batch_code || undefined,
        received_date: item.received_date || undefined,
        expiry_date: item.expiry_date || undefined,
      })),
      initial_payment: paymentAmount > 0 && paymentCashboxId
        ? { cashbox_id: paymentCashboxId, amount: paymentAmount, payment_date: paymentDate }
        : undefined,
    };

    setLoading(true);
    try {
      const result = await purchasesService.createFull(input);
      navigate(`/purchases/${result.invoice.id}`);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setLoading(false);
    }
  };

  return <>
    <PageHeader
      title="فاتورة شراء جديدة"
      description="أدخل بيانات المورد والأصناف ودفعات المخزون والمبالغ المالية."
      actions={<BackButton to={PATHS.PURCHASES} />}
    />
    <div className="space-y-5 pb-24" onClick={loadLookups}>
      {error && <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
      <FormSection title="بيانات الفاتورة" description="المورد ونوع الفاتورة والتاريخ." icon={<PackagePlus size={18} />}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField label="رقم الفاتورة" htmlFor="invoiceNumber">
            <Input id="invoiceNumber" value={invoiceNumber} placeholder="يُنشأ تلقائيًا عند تركه فارغًا" onChange={(e) => setInvoiceNumber(e.target.value)} />
          </FormField>
          <FormField label="تاريخ الفاتورة" htmlFor="invoiceDate" required>
            <Input id="invoiceDate" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </FormField>
          <FormField label="المورد" htmlFor="supplier" required>
            <Select id="supplier" value={String(supplierId)} options={[{ value: "0", label: "اختر المورد" }, ...(lookups?.suppliers ?? []).map((s) => ({ value: String(s.id), label: s.name }))]} onChange={(e) => setSupplierId(Number(e.target.value))} />
          </FormField>
          <FormField label="نوع الفاتورة" htmlFor="purchaseType">
            <Select id="purchaseType" value={invoiceType} options={[{ value: "standard", label: "فاتورة عادية" }, { value: "consignment", label: "فاتورة أمانة" }]} onChange={(e) => setInvoiceType(e.target.value as "standard" | "consignment")} />
          </FormField>
          <FormField label="ملاحظات" htmlFor="notes" className="md:col-span-2 xl:col-span-4">
            <Textarea id="notes" value={notes} placeholder="ملاحظات عامة..." onChange={(e) => setNotes(e.target.value)} />
          </FormField>
        </div>
      </FormSection>

      <Card padding={false} header="أصناف الفاتورة" description="أضف المنتجات وحدد الكمية وسعر الشراء وبيانات دفعة المخزون.">
        <div className="space-y-4 p-4">
          {items.map((item, index) => (
            <div key={index} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FormField label="المنتج" required>
                  <Select value={String(item.product_id)} options={[{ value: "0", label: "اختر المنتج" }, ...(lookups?.products ?? []).map((p) => ({ value: String(p.id), label: `${p.name} — ${p.code ?? ""}` }))]} onChange={(e) => selectProduct(index, Number(e.target.value))} />
                </FormField>
                <FormField label="الكمية" required>
                  <Input type="number" min="0.001" step="0.001" value={item.quantity} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })} />
                </FormField>
                <FormField label="سعر الشراء" required>
                  <Input type="number" min="0" value={item.purchase_price} onChange={(e) => updateItem(index, { purchase_price: Number(e.target.value) })} />
                </FormField>
                <FormField label="إجمالي السطر">
                  <Input readOnly value={money(item.quantity * item.purchase_price)} />
                </FormField>
                <FormField label="كود الدفعة">
                  <Input placeholder="اختياري — يُنشأ تلقائيًا" value={item.batch_code} onChange={(e) => updateItem(index, { batch_code: e.target.value })} />
                </FormField>
                <FormField label="تاريخ الاستلام" required>
                  <Input type="date" value={item.received_date} onChange={(e) => updateItem(index, { received_date: e.target.value })} />
                </FormField>
                <FormField label="تاريخ الانتهاء">
                  <Input type="date" value={item.expiry_date} onChange={(e) => updateItem(index, { expiry_date: e.target.value })} />
                </FormField>
                <div className="flex items-end">
                  <Button variant="danger" startIcon={<Trash2 size={16} />} disabled={items.length === 1} onClick={() => setItems((curr) => curr.filter((_, i) => i !== index))}>حذف</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--border)] p-4">
          <Button variant="secondary" startIcon={<Plus size={17} />} onClick={() => setItems((curr) => [...curr, emptyItem()])}>إضافة صنف</Button>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <FormSection title="الدفع الأولي" description="يمكن تسجيل دفعة مع إنشاء الفاتورة." icon={<Calculator size={18} />}>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="المبلغ المدفوع">
              <Input type="number" min="0" max={total} value={paymentAmount} onChange={(e) => setPaymentAmount(Number(e.target.value))} />
            </FormField>
            <FormField label="الصندوق">
              <Select value={String(paymentCashboxId)} options={[{ value: "0", label: "اختر الصندوق" }, ...(lookups?.cashboxes ?? []).map((c) => ({ value: String(c.id), label: c.name }))]} onChange={(e) => setPaymentCashboxId(Number(e.target.value))} />
            </FormField>
            <FormField label="تاريخ الدفع">
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </FormField>
          </div>
        </FormSection>

        <Card header="ملخص الفاتورة" className="h-fit">
          <div className="space-y-3 text-sm">
            {[["المجموع الفرعي", subtotal], ["الخصم", -discount], ["المدفوع", paymentAmount], ["المتبقي", remaining]].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between">
                <span className="text-[var(--text-muted)]">{label}</span>
                <strong>{money(Number(value))}</strong>
              </div>
            ))}
            <div className="border-t border-[var(--border)] pt-3">
              <div className="flex justify-between text-base">
                <strong>الإجمالي النهائي</strong>
                <strong className="text-[var(--primary)]">{money(total)}</strong>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3">
            <FormField label="الخصم">
              <Input type="number" min="0" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
            </FormField>
          </div>
        </Card>
      </div>
    </div>

    <div className="fixed bottom-0 left-0 right-[260px] z-20 border-t border-[var(--border)] bg-[var(--surface)]/95 px-6 py-3 backdrop-blur">
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={() => navigate(PATHS.PURCHASES)}>إلغاء</Button>
        <Button startIcon={<Save size={17} />} disabled={loading} onClick={() => submit()}>
          {loading ? "جاري الحفظ..." : "حفظ الفاتورة"}
        </Button>
      </div>
    </div>
  </>;
}
