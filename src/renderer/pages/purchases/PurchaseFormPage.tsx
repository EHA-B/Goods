import { useEffect, useMemo, useState } from "react";
import { Calculator, PackagePlus, Plus, Save, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BackButton, Button, Card, Dialog, FormField, FormSection, Input, PageHeader, Select, Textarea } from "../../components/ui";
import { PATHS } from "../../routes/path";
import { purchasesService } from "./purchasesService";
import { getProductErrorMessage, productsService } from "../products/productsService";

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
  const [quickProductIndex, setQuickProductIndex] = useState<number | null>(null);
  const [quickProductSaving, setQuickProductSaving] = useState(false);
  const [quickProductError, setQuickProductError] = useState("");
  const [quickProduct, setQuickProduct] = useState({
    name: "",
    code: "",
    unit: "",
    category: "",
    description: "",
  });

  const [lookups, setLookups] = useState<{ suppliers: PartyApiRecord[]; cashboxes: CashboxApiRecord[]; products: ProductApiRecord[] } | null>(null);
  const [lookupsLoading, setLookupsLoading] = useState(true);

  useEffect(() => {
    Promise.all([purchasesService.getLookups(), purchasesService.getProducts()])
      .then(([data, products]) => {
        setLookups({ ...data, products });
        if (data.suppliers.length === 1) setSupplierId(data.suppliers[0].id);
      })
      .catch((err: Error) => setError(err.message || "تعذر تحميل الموردين والمنتجات والصناديق"))
      .finally(() => setLookupsLoading(false));
  }, []);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.purchase_price, 0), [items]);
  const total = Math.max(0, subtotal - discount);
  const remaining = Math.max(0, total - paymentAmount);

  const updateItem = (index: number, patch: Partial<PurchaseItemForm>) =>
    setItems((curr) => curr.map((item, i) => i === index ? { ...item, ...patch } : item));

  const selectProduct = (index: number, productId: number) => {
    const product = lookups?.products.find((p) => p.id === productId);
    updateItem(index, { product_id: productId, productName: product?.name ?? "" });
  };

  const openQuickProduct = (index: number) => {
    setQuickProductIndex(index);
    setQuickProductError("");
    setQuickProduct({ name: "", code: "", unit: "", category: "", description: "" });
  };

  const createQuickProduct = async () => {
    if (quickProductIndex === null) return;
    if (!quickProduct.name.trim() || !quickProduct.unit.trim()) {
      setQuickProductError("اسم المنتج والوحدة مطلوبان.");
      return;
    }

    try {
      setQuickProductSaving(true);
      setQuickProductError("");
      const created = await productsService.create({
        name: quickProduct.name,
        code: quickProduct.code,
        unit: quickProduct.unit,
        category: quickProduct.category,
        description: quickProduct.description,
        isActive: true,
      });

      const apiProduct: ProductApiRecord = {
        id: created.id,
        name: created.name,
        code: created.code,
        unit: created.unit,
        category: created.category,
        description: created.description,
        isActive: created.isActive,
      };

      setLookups((current) => current
        ? { ...current, products: [...current.products, apiProduct].sort((a, b) => a.name.localeCompare(b.name, "ar")) }
        : current);
      updateItem(quickProductIndex, { product_id: created.id, productName: created.name });
      setQuickProductIndex(null);
    } catch (createError) {
      setQuickProductError(getProductErrorMessage(createError));
    } finally {
      setQuickProductSaving(false);
    }
  };

  const submit = async () => {
    setError("");
    if (!supplierId) { setError("اختر المورد"); return; }
    if (!invoiceDate) { setError("تاريخ الفاتورة مطلوب"); return; }
    if (discount < 0 || discount > subtotal) { setError("الخصم غير صالح أو يتجاوز المجموع الفرعي"); return; }
    if (paymentAmount < 0 || paymentAmount > total) { setError("المبلغ المدفوع غير صالح أو يتجاوز إجمالي الفاتورة"); return; }
    if (paymentAmount > 0 && !paymentCashboxId) { setError("اختر الصندوق عند تسجيل دفعة أولية"); return; }
    const productIds = items.map((item) => item.product_id).filter(Boolean);
    if (new Set(productIds).size !== productIds.length) { setError("لا يمكن تكرار المنتج في أكثر من سطر. اجمع الكمية في سطر واحد"); return; }
    if (items.some((item) => !item.product_id || item.quantity <= 0 || item.purchase_price < 0 || !item.received_date || (item.expiry_date && item.expiry_date < item.received_date))) {
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
      if (!result?.invoice?.id) throw new Error("لم يرجع الباك رقم الفاتورة المنشأة");
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
    <div className="space-y-5 pb-24">
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
            <Select id="supplier" value={String(supplierId)} disabled={lookupsLoading} options={[{ value: "0", label: lookupsLoading ? "جاري تحميل الموردين..." : "اختر المورد" }, ...(lookups?.suppliers ?? []).map((s) => ({ value: String(s.id), label: s.name }))]} onChange={(e) => setSupplierId(Number(e.target.value))} />
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
            <div key={index} className="relative rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4 pt-14">
              <Button
                size="sm"
                variant="ghost"
                className="absolute left-3 top-3 h-8 border border-[var(--danger)]/30 px-2.5 text-[var(--danger)] hover:bg-[var(--danger-subtle)] hover:text-[var(--danger)]"
                startIcon={<Trash2 size={15} />}
                disabled={items.length === 1}
                onClick={() => setItems((curr) => curr.filter((_, i) => i !== index))}
              >
                حذف الصنف
              </Button>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FormField label="المنتج" required>
                  <div className="flex gap-2">
                    <div className="min-w-0 flex-1">
                      <Select value={String(item.product_id)} disabled={lookupsLoading} options={[{ value: "0", label: lookupsLoading ? "جاري تحميل المنتجات..." : "اختر المنتج" }, ...(lookups?.products ?? []).map((p) => ({ value: String(p.id), label: `${p.name} — ${p.code ?? ""}` }))]} onChange={(e) => selectProduct(index, Number(e.target.value))} />
                    </div>
                    <Button size="sm" variant="secondary" className="h-11 shrink-0 px-3" startIcon={<Plus size={15} />} onClick={() => openQuickProduct(index)}>منتج جديد</Button>
                  </div>
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
              <Select value={String(paymentCashboxId)} disabled={lookupsLoading || paymentAmount <= 0} options={[{ value: "0", label: paymentAmount <= 0 ? "لا توجد دفعة أولية" : lookupsLoading ? "جاري تحميل الصناديق..." : "اختر الصندوق" }, ...(lookups?.cashboxes ?? []).map((c) => ({ value: String(c.id), label: `${c.name} — ${Number(c.balance).toLocaleString("en-US")} ${c.currency}` }))]} onChange={(e) => setPaymentCashboxId(Number(e.target.value))} />
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

    <Dialog
      open={quickProductIndex !== null}
      title="إضافة منتج جديد"
      onClose={() => !quickProductSaving && setQuickProductIndex(null)}
      footer={<>
        <Button variant="secondary" disabled={quickProductSaving} onClick={() => setQuickProductIndex(null)}>إلغاء</Button>
        <Button isLoading={quickProductSaving} loadingText="جاري الإضافة..." startIcon={<Save size={16} />} onClick={() => void createQuickProduct()}>إضافة واختيار المنتج</Button>
      </>}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="اسم المنتج" required>
          <Input autoFocus value={quickProduct.name} placeholder="مثال: سكر أبيض 1 كغ" onChange={(e) => setQuickProduct((current) => ({ ...current, name: e.target.value }))} />
        </FormField>
        <FormField label="كود المنتج">
          <Input dir="ltr" value={quickProduct.code} placeholder="اختياري" onChange={(e) => setQuickProduct((current) => ({ ...current, code: e.target.value }))} />
        </FormField>
        <FormField label="الوحدة" required>
          <Input value={quickProduct.unit} placeholder="كغ، قطعة، عبوة..." onChange={(e) => setQuickProduct((current) => ({ ...current, unit: e.target.value }))} />
        </FormField>
        <FormField label="التصنيف">
          <Input value={quickProduct.category} placeholder="اختياري" onChange={(e) => setQuickProduct((current) => ({ ...current, category: e.target.value }))} />
        </FormField>
        <FormField label="الوصف" className="md:col-span-2">
          <Textarea value={quickProduct.description} placeholder="وصف أو ملاحظات إضافية..." onChange={(e) => setQuickProduct((current) => ({ ...current, description: e.target.value }))} />
        </FormField>
        {quickProductError && <p className="md:col-span-2 rounded-[var(--radius-sm)] bg-[var(--danger-subtle)] px-3 py-2 text-sm font-bold text-[var(--danger)]">{quickProductError}</p>}
      </div>
    </Dialog>

    <div className="fixed bottom-0 left-0 right-[260px] z-20 border-t border-[var(--border)] bg-[var(--surface)]/95 px-6 py-3 backdrop-blur">
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={() => navigate(PATHS.PURCHASES)}>إلغاء</Button>
        <Button startIcon={<Save size={17} />} disabled={loading || lookupsLoading} onClick={() => submit()}>
          {loading ? "جاري الحفظ..." : "حفظ الفاتورة"}
        </Button>
      </div>
    </div>
  </>;
}
