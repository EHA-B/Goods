import { useMemo, useState } from "react";
import { Calculator, Plus, Save, ShoppingCart, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BackButton, Button, Card, FormField, FormSection, Input, PageHeader, Select, Textarea } from "../../components/ui";
import { PATHS } from "../../routes/path";
import { salesService } from "./salesService";

type SaleItemForm = {
  product_id: number;
  productName: string;
  stock_batch_id: number;
  batchCode: string;
  availableBatches: StockBatchRecord[];
  quantity: number;
  sale_price: number;
  cost_price: number;
};

const emptyItem = (): SaleItemForm => ({
  product_id: 0,
  productName: "",
  stock_batch_id: 0,
  batchCode: "",
  availableBatches: [],
  quantity: 1,
  sale_price: 0,
  cost_price: 0,
});

const money = (value: number) => value.toLocaleString("en-US");

export default function SaleFormPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customerId, setCustomerId] = useState(0);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<SaleItemForm[]>([emptyItem()]);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentCashboxId, setPaymentCashboxId] = useState(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [lookups, setLookups] = useState<{ customers: PartyApiRecord[]; cashboxes: CashboxApiRecord[]; products: ProductApiRecord[] } | null>(null);

  const loadLookups = () => {
    if (lookups) return;
    Promise.all([salesService.getLookups(), salesService.getProducts()])
      .then(([data, products]) => setLookups({ ...data, products }))
      .catch(() => {});
  };

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.sale_price, 0), [items]);
  const total = Math.max(0, subtotal - discount);
  const remaining = Math.max(0, total - paymentAmount);

  const updateItem = (index: number, patch: Partial<SaleItemForm>) =>
    setItems((curr) => curr.map((item, i) => i === index ? { ...item, ...patch } : item));

  const selectProduct = async (index: number, productId: number) => {
    const product = lookups?.products.find((p) => p.id === productId);
    updateItem(index, { product_id: productId, productName: product?.name ?? "", stock_batch_id: 0, batchCode: "", availableBatches: [], sale_price: 0 });
    if (!productId) return;
    try {
      const batches = await salesService.getAvailableBatches(productId);
      updateItem(index, { availableBatches: batches });
    } catch (err) {
      // Ignore lookup errors
    }
  };

  const selectBatch = (index: number, batchId: number) => {
    const item = items[index];
    const batch = item.availableBatches.find((b) => b.id === batchId);
    if (!batch) return;
    updateItem(index, {
      stock_batch_id: batchId,
      batchCode: batch.batch_code ?? "",
      cost_price: batch.purchase_price,
    });
  };

  const submit = async () => {
    setError("");
    if (items.some((item) => !item.product_id || !item.stock_batch_id || item.quantity <= 0)) {
      setError("راجع الأصناف — المنتج والدفعة والكمية مطلوبة");
      return;
    }
    if (!customerId && paymentAmount < total - 0.001) {
      setError("يجب تحديد عميل للبيع الآجل. البيع النقدي يتطلب دفع المبلغ كاملًا.");
      return;
    }

    const input: CreateSaleInvoiceInput = {
      customer_id: customerId || null,
      invoice_number: invoiceNumber.trim() || undefined,
      invoice_date: invoiceDate,
      discount_amount: discount,
      notes: notes || undefined,
      items: items.map((item) => ({
        product_id: item.product_id,
        stock_batch_id: item.stock_batch_id,
        quantity: item.quantity,
        sale_price: item.sale_price,
        cost_price: item.cost_price || undefined,
      })),
      initial_payment: paymentAmount > 0 && paymentCashboxId
        ? { cashbox_id: paymentCashboxId, amount: paymentAmount, payment_date: paymentDate }
        : undefined,
    };

    setLoading(true);
    try {
      const result = await salesService.createProcess(input);
      navigate(`/sales/${result.invoice.id}`);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setLoading(false);
    }
  };

  return <>
    <PageHeader
      title="فاتورة بيع جديدة"
      description="أدخل بيانات العميل والأصناف ودفعات المخزون والمبالغ."
      actions={<BackButton to={PATHS.SALES} />}
    />
    <div className="space-y-5 pb-24" onClick={loadLookups}>
      {error && <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
      <FormSection title="بيانات الفاتورة" description="العميل والتاريخ ورقم الفاتورة." icon={<ShoppingCart size={18} />}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField label="رقم الفاتورة" htmlFor="invoiceNumber">
            <Input id="invoiceNumber" value={invoiceNumber} placeholder="يُنشأ تلقائيًا عند تركه فارغًا" onChange={(e) => setInvoiceNumber(e.target.value)} />
          </FormField>
          <FormField label="تاريخ الفاتورة" htmlFor="invoiceDate" required>
            <Input id="invoiceDate" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </FormField>
          <FormField label="العميل" htmlFor="customer">
            <Select id="customer" value={String(customerId)} options={[{ value: "0", label: "بيع نقدي (بدون عميل)" }, ...(lookups?.customers ?? []).map((c) => ({ value: String(c.id), label: c.name }))]} onChange={(e) => setCustomerId(Number(e.target.value))} />
          </FormField>
          <FormField label="ملاحظات" htmlFor="notes" className="md:col-span-2 xl:col-span-4">
            <Textarea id="notes" value={notes} placeholder="ملاحظات عامة..." onChange={(e) => setNotes(e.target.value)} />
          </FormField>
        </div>
      </FormSection>

      <Card padding={false} header="أصناف الفاتورة" description="أضف المنتجات وحدد الدفعة والكمية وسعر البيع.">
        <div className="space-y-4 p-4">
          {items.map((item, index) => (
            <div key={index} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FormField label="المنتج" required>
                  <Select value={String(item.product_id)} options={[{ value: "0", label: "اختر المنتج" }, ...(lookups?.products ?? []).map((p) => ({ value: String(p.id), label: p.name }))]} onChange={(e) => selectProduct(index, Number(e.target.value))} />
                </FormField>
                <FormField label="الدفعة (المخزن)" required>
                  <Select
                    value={String(item.stock_batch_id)}
                    options={[
                      { value: "0", label: item.availableBatches.length === 0 ? "اختر المنتج أولًا" : "اختر الدفعة" },
                      ...item.availableBatches.map((b) => ({
                        value: String(b.id),
                        label: `${b.batch_code ?? "—"} — كمية متاحة: ${b.remaining_quantity}`
                      })),
                    ]}
                    disabled={item.availableBatches.length === 0}
                    onChange={(e) => selectBatch(index, Number(e.target.value))}
                  />
                </FormField>
                <FormField label="الكمية" required>
                  <Input type="number" min="0.001" step="0.001" value={item.quantity} onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })} />
                </FormField>
                <FormField label="سعر البيع" required>
                  <Input type="number" min="0" value={item.sale_price} onChange={(e) => updateItem(index, { sale_price: Number(e.target.value) })} />
                </FormField>
                <FormField label="إجمالي السطر">
                  <Input readOnly value={money(item.quantity * item.sale_price)} />
                </FormField>
                <FormField label="تكلفة الوحدة">
                  <Input readOnly value={money(item.cost_price)} />
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
        <Button variant="secondary" onClick={() => navigate(PATHS.SALES)}>إلغاء</Button>
        <Button startIcon={<Save size={17} />} disabled={loading} onClick={submit}>
          {loading ? "جاري الحفظ..." : "حفظ الفاتورة"}
        </Button>
      </div>
    </div>
  </>;
}
