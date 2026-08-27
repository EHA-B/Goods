import { notifyValidation } from "../../lib/notifications";
import { getArabicErrorMessage } from "../../lib/errorNormalizer";
import { getInvoiceEditErrorMessage } from "../../lib/invoiceEditErrors";
import { useEffect, useMemo, useRef, useState } from "react";
import { Calculator, Plus, Save, ShoppingCart, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { BackButton, Button, Card, Dialog, FormField, FormSection, Input, PageHeader, SearchableSelect, Select, Textarea } from "../../components/ui";
import { PATHS } from "../../routes/path";
import { salesService } from "./salesService";
import InvoiceEditPasswordDialog from "../../components/invoices/InvoiceEditPasswordDialog";
import {
  clearInvoiceDraft,
  consumeInvoiceDraft,
  invoiceDraftFingerprint,
  invoiceDraftKey,
  saveInvoiceDraft,
} from "../../lib/invoiceDrafts";
import { customersService } from "../customers/customersService";

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
  const { saleId } = useParams();
  const editingId = Number(saleId || 0);
  const isEdit = editingId > 0;
  const draftKey = invoiceDraftKey("sale", isEdit ? "edit" : "new", editingId || undefined);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [pendingInput, setPendingInput] = useState<CreateSaleInvoiceInput | null>(null);
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [draftInitialized, setDraftInitialized] = useState(false);
  const draftBaselineRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customerId, setCustomerId] = useState(0);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<SaleItemForm[]>([emptyItem()]);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [existingPaidAmount, setExistingPaidAmount] = useState(0);
  const [paymentCashboxId, setPaymentCashboxId] = useState(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentExchangeRate, setPaymentExchangeRate] = useState("");
  const [currency, setCurrency] = useState("SYP");
  const [exchangeRate, setExchangeRate] = useState(1);
  const [lookups, setLookups] = useState<{ customers: PartyApiRecord[]; cashboxes: CashboxApiRecord[]; products: ProductApiRecord[] } | null>(null);

  // ── Quick customer dialog state ───────────────────────────────────────────
  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);
  const [quickCustomerSaving, setQuickCustomerSaving] = useState(false);
  const [quickCustomerError, setQuickCustomerError] = useState("");
  const [quickCustomer, setQuickCustomer] = useState({ name: "", phone: "", notes: "" });

  useEffect(() => {
    let active = true;
    Promise.all([salesService.getLookups(), salesService.getProducts()])
      .then(([data, products]) => { if (active) setLookups({ ...data, products }); })
      .catch((err: Error) => { if (active) setError(getArabicErrorMessage(err, "تعذر تحميل بيانات النموذج")); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!isEdit || !lookups) return;
    let active = true;
    salesService.getDetails(editingId).then(async (data) => {
      if (!active) return;
      const draft = consumeInvoiceDraft<any>(draftKey);
      const source = draft ?? {
        customerId: Number(data.invoice.customer_id ?? 0), invoiceNumber: data.invoice.invoice_number, invoiceDate: data.invoice.invoice_date, discount: Number(data.invoice.discount_amount ?? data.invoice.discount ?? 0), notes: data.invoice.notes ?? "", currency: data.invoice.currency ?? "SYP", exchangeRate: Number(data.invoice.exchange_rate ?? 1),
        items: await Promise.all(data.items.map(async (row: any) => { const productId = Number(row.product_id ?? 0); const batches = await salesService.getAvailableBatches(productId); const current = { id: Number(row.stock_batch_id), batch_code: row.batch_code, remaining_quantity: Number(row.batch_remaining ?? 0) + Number(row.quantity ?? 0), purchase_price: Number(row.batch_cost ?? 0), purchase_price_base: Number(row.cost_price ?? row.batch_cost ?? 0), product_id: productId, isActive: 1 } as StockBatchRecord; const merged = [current, ...batches.filter((b) => b.id !== current.id)]; return { product_id: productId, productName: String(row.product_name ?? ""), stock_batch_id: current.id, batchCode: String(row.batch_code ?? ""), availableBatches: merged, quantity: Number(row.quantity ?? 1), sale_price: Number(row.unit_price ?? 0), cost_price: Number(row.cost_price ?? 0) }; }))
      };
      setCustomerId(source.customerId); setInvoiceNumber(source.invoiceNumber); setInvoiceDate(source.invoiceDate); setDiscount(source.discount); setNotes(source.notes); setCurrency(source.currency); setExchangeRate(source.exchangeRate); setItems(source.items); setPaymentAmount(0); setExistingPaidAmount(Number(data.invoice.paid_amount ?? 0)); setRestoredDraft(Boolean(draft)); setDraftInitialized(true);
    }).catch((err: Error) => setError(getArabicErrorMessage(err, "تعذر تحميل الفاتورة للتعديل")));
    return () => { active = false; };
  }, [isEdit, editingId, lookups, draftKey]);

  useEffect(() => {
    if (isEdit || draftInitialized) return;
    const draft = consumeInvoiceDraft<any>(draftKey);
    if (!draft) { setDraftInitialized(true); return; }
    setCustomerId(draft.customerId ?? 0); setInvoiceNumber(draft.invoiceNumber ?? ""); setInvoiceDate(draft.invoiceDate ?? invoiceDate); setDiscount(draft.discount ?? 0); setNotes(draft.notes ?? ""); setItems(draft.items ?? [emptyItem()]); setPaymentAmount(draft.paymentAmount ?? 0); setPaymentCashboxId(draft.paymentCashboxId ?? 0); setPaymentDate(draft.paymentDate ?? paymentDate); setPaymentExchangeRate(draft.paymentExchangeRate ?? ""); setCurrency(draft.currency ?? "SYP"); setExchangeRate(draft.exchangeRate ?? 1); setRestoredDraft(true); setDraftInitialized(true);
  }, [isEdit, draftKey, draftInitialized]);

  useEffect(() => {
    if (!draftInitialized) {
      return;
    }

    const draftData = {
      customerId,
      invoiceNumber,
      invoiceDate,
      discount,
      notes,
      items,
      paymentAmount,
      paymentCashboxId,
      paymentDate,
      paymentExchangeRate,
      currency,
      exchangeRate,
    };

    const fingerprint =
      invoiceDraftFingerprint(
        draftData,
      );

    /*
     * أول لقطة بعد الدخول هي خط الأساس، ولا تتحول لمسودة تلقائيًا.
     */
    if (
      draftBaselineRef.current ===
      null
    ) {
      draftBaselineRef.current =
        fingerprint;
      return;
    }

    if (
      fingerprint ===
      draftBaselineRef.current
    ) {
      clearInvoiceDraft(draftKey);
      return;
    }

    const timer =
      window.setTimeout(() => {
        saveInvoiceDraft(
          draftKey,
          draftData,
        );
      }, 700);

    return () =>
      window.clearTimeout(timer);
  }, [
    draftInitialized,
    draftKey,
    customerId,
    invoiceNumber,
    invoiceDate,
    discount,
    notes,
    items,
    paymentAmount,
    paymentCashboxId,
    paymentDate,
    paymentExchangeRate,
    currency,
    exchangeRate,
  ]);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.sale_price, 0), [items]);
  const total = Math.max(0, subtotal - discount);
  const effectivePaidAmount = isEdit ? existingPaidAmount : paymentAmount;
  const remaining = Math.max(0, total - effectivePaidAmount);
  const activeCashboxes = useMemo(
    () => (lookups?.cashboxes ?? []).filter((cashbox) => Boolean(cashbox.isActive)),
    [lookups],
  );
  const totalBase = currency === "SYP" ? total : total * exchangeRate;


  const updateItem = (index: number, patch: Partial<SaleItemForm>) =>
    setItems((curr) => curr.map((item, i) => i === index ? { ...item, ...patch } : item));

  const openQuickCustomer = () => {
    setQuickCustomerOpen(true);
    setQuickCustomerError("");
    setQuickCustomer({ name: "", phone: "", notes: "" });
  };

  const createQuickCustomer = async () => {
    if (!quickCustomer.name.trim()) {
      setQuickCustomerError("اسم العميل مطلوب.");
      return;
    }
    try {
      setQuickCustomerSaving(true);
      setQuickCustomerError("");
      const created = await customersService.create({
        name: quickCustomer.name,
        phone: quickCustomer.phone,
        notes: quickCustomer.notes,
        isActive: true,
      });
      const newRecord: PartyApiRecord = {
        id: created.id, name: created.name,
        phone: null,
        email: null,
        address: null,
        balance: null,
        notes: null,
        isActive: 0,
        created_at: null,
        updated_at: null
      };
      setLookups((curr) =>
        curr
          ? {
              ...curr,
              customers: [...curr.customers, newRecord].sort((a, b) =>
                a.name.localeCompare(b.name, "ar"),
              ),
            }
          : curr,
      );
      setCustomerId(created.id);
      setQuickCustomerOpen(false);
    } catch (err) {
      const e = err as Error;
      setQuickCustomerError(e.message || "حدث خطأ أثناء إضافة العميل.");
    } finally {
      setQuickCustomerSaving(false);
    }
  };

  const selectProduct = async (index: number, productId: number) => {
    const product = lookups?.products.find((p) => p.id === productId);
    updateItem(index, { product_id: productId, productName: product?.name ?? "", stock_batch_id: 0, batchCode: "", availableBatches: [], sale_price: 0, cost_price: 0 });
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

    if (!batch) {
      updateItem(index, {
        stock_batch_id: 0,
        batchCode: "",
        cost_price: 0,
      });
      return;
    }

    updateItem(index, {
      stock_batch_id: batch.id,
      batchCode: batch.batch_code ?? "",
      cost_price: Number(batch.purchase_price_base ?? batch.purchase_price ?? 0),
    });
  };

  const submit = async () => {
    setError("");
    if (items.some((item) => !item.product_id || !item.stock_batch_id || item.quantity <= 0 || item.sale_price < 0)) {
      setError("راجع الأصناف — المنتج والدفعة والكمية وسعر البيع الصحيح مطلوبة"); notifyValidation("راجع الأصناف — المنتج والدفعة والكمية وسعر البيع الصحيح مطلوبة"); return;
    }
    if (items.some((item) => { const batch = item.availableBatches.find((b) => b.id === item.stock_batch_id); return batch && item.quantity > Number(batch.remaining_quantity) + 0.001; })) { setError("إحدى الكميات أكبر من المتوفر في الدفعة"); notifyValidation("إحدى الكميات أكبر من المتوفر في الدفعة"); return; }
    if (discount < 0 || discount > subtotal) { setError("قيمة الخصم غير صحيحة"); notifyValidation("قيمة الخصم غير صحيحة"); return; }
    if (
      !isEdit &&
      (
        paymentAmount < 0 ||
        paymentAmount > total + 0.001
      )
    ) {
      setError(
        "قيمة الدفعة الأولية غير صحيحة",
      );
      notifyValidation(
        "قيمة الدفعة الأولية غير صحيحة",
      );
      return;
    }
    if (currency !== "SYP" && (!Number.isFinite(exchangeRate) || exchangeRate <= 0)) { setError("سعر الصرف مطلوب ويجب أن يكون أكبر من صفر"); notifyValidation("سعر الصرف مطلوب ويجب أن يكون أكبر من صفر"); return; }
    if (
      !isEdit &&
      paymentAmount > 0 &&
      !paymentCashboxId
    ) {
      setError(
        "اختر صندوق الدفعة الأولية",
      );
      notifyValidation(
        "اختر صندوق الدفعة الأولية",
      );
      return;
    }
    const selectedCashbox = activeCashboxes.find((c) => c.id === paymentCashboxId);
    if (
      !isEdit &&
      paymentAmount > 0 &&
      selectedCashbox &&
      selectedCashbox.currency !==
        currency &&
      !paymentExchangeRate
    ) {
      setError(
        "يجب إدخال سعر الصرف للدفعة الأولية",
      );
      notifyValidation(
        "يجب إدخال سعر الصرف للدفعة الأولية",
      );
      return;
    }
    if (
      !customerId &&
      effectivePaidAmount <
        total - 0.001
    ) {
      const message = isEdit
        ? "لا يمكن حفظ البيع النقدي بهذا التعديل لأن إجمالي الفاتورة أصبح أكبر من المبلغ المدفوع فعليًا. عالج الدفعات المرتبطة أولًا أو أبقِ الإجمالي ضمن المبلغ المدفوع."
        : "يجب تحديد عميل للبيع الآجل. البيع النقدي يتطلب دفع المبلغ كاملًا.";

      setError(message);
      notifyValidation(message);
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
      })),
      initial_payment:
        !isEdit &&
        paymentAmount > 0 &&
        paymentCashboxId
          ? {
              cashbox_id:
                paymentCashboxId,
              amount:
                paymentAmount,
              payment_date:
                paymentDate,
              exchange_rate:
                Number(
                  paymentExchangeRate,
                ) || undefined,
            }
          : undefined,
      currency: currency,
      exchange_rate: currency === "SYP" ? 1 : exchangeRate,
    };

    if (isEdit) { setPendingInput(input); setPasswordOpen(true); return; }

    setLoading(true);
    try {
      const result = await salesService.createProcess(input);
      clearInvoiceDraft(draftKey);
      navigate(`/sales/${result.invoice.id}`);
    } catch (err: unknown) {
      const e = err as Error;
      setError(getArabicErrorMessage(e, "حدث خطأ أثناء الحفظ"));
    } finally {
      setLoading(false);
    }
  };

  return <>
    <PageHeader
      title={isEdit ? "تعديل فاتورة بيع" : "فاتورة بيع جديدة"}
      description={isEdit ? "تعديل محمي بكلمة مرور مع حفظ سجل كامل للتغييرات." : "أدخل بيانات العميل والأصناف ودفعات المخزون والمبالغ."}
      actions={<BackButton to={PATHS.SALES} />}
    />
    <div className="space-y-5 pb-24">
      {restoredDraft && <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"><span>تم تحميل آخر مسودة غير مكتملة.</span><Button size="sm" variant="secondary" onClick={() => { clearInvoiceDraft(draftKey); window.location.reload(); }}>تجاهل المسودة</Button></div>}
      {isEdit && <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--text-secondary)]">الدفعات الموجودة لا تُعدّل من هنا. أي تغيير بالعملة أو العميل بعد وجود دفعات سيتم رفضه للحفاظ على السجل المالي.</div>}
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
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <SearchableSelect
                  id="customer"
                  value={String(customerId)}
                  placeholder="بيع نقدي (بدون عميل)"
                  searchPlaceholder="ابحث باسم العميل..."
                  emptyMessage="لا يوجد عميل مطابق للبحث"
                  options={[
                    { value: "0", label: "بيع نقدي (بدون عميل)" },
                    ...(lookups?.customers ?? []).map((c) => ({
                      value: String(c.id),
                      label: c.name,
                      keywords: c.name,
                    })),
                  ]}
                  onValueChange={(value) => setCustomerId(Number(value))}
                />
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="h-11 shrink-0 px-3"
                startIcon={<Plus size={15} />}
                onClick={openQuickCustomer}
              >
                عميل جديد
              </Button>
            </div>
          </FormField>
          <FormField label="العملة" required>
            <Select value={currency} options={[{ value: "SYP", label: "ل.س (SYP)" }, { value: "USD", label: "دولار (USD)" }]} onChange={(e) => {
              const newCur = e.target.value;
              setCurrency(newCur);
              setExchangeRate(newCur === "SYP" ? 1 : 0);
              const defaultBox = lookups?.cashboxes.find((c) => Boolean(c.isActive) && c.currency === newCur);
              setPaymentCashboxId(defaultBox?.id ?? 0);
            }} />
          </FormField>
          {currency !== "SYP" && (
            <FormField label={`سعر 1 ${currency} بالليرة السورية`} required>
              <Input type="number" min="0.000001" step="any" value={exchangeRate} onChange={(e) => setExchangeRate(Number(e.target.value))} />
            </FormField>
          )}
          <FormField label="ملاحظات" htmlFor="notes" className="md:col-span-2 xl:col-span-4">
            <Textarea id="notes" value={notes} placeholder="ملاحظات عامة..." onChange={(e) => setNotes(e.target.value)} />
          </FormField>
        </div>
      </FormSection>

      <Card padding={false} header="أصناف الفاتورة" description="أضف المنتجات وحدد الدفعة والكمية وسعر البيع.">
        <div className="space-y-4 p-4">
          {items.map((item, index) => (
            <div key={index} className="relative rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4 pt-14">
              <Button size="sm" variant="ghost" className="absolute left-3 top-3 h-8 border border-[var(--danger)]/30 px-2.5 text-[var(--danger)] hover:bg-[var(--danger-subtle)] hover:text-[var(--danger)]" startIcon={<Trash2 size={15} />} disabled={items.length === 1} onClick={() => setItems((curr) => curr.filter((_, i) => i !== index))}>حذف الصنف</Button>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FormField label="المنتج" required>
                  <SearchableSelect
                    value={String(item.product_id)}
                    placeholder="اختر المنتج"
                    searchPlaceholder="ابحث باسم المنتج..."
                    emptyMessage="لا يوجد منتج مطابق للبحث"
                    options={[
                      {
                        value: "0",
                        label: "اختر المنتج",
                      },
                      ...(lookups?.products ?? []).map(
                        (product) => ({
                          value: String(product.id),
                          label: product.name,
                          keywords: product.name,
                        }),
                      ),
                    ]}
                    onValueChange={(value) =>
                      void selectProduct(
                        index,
                        Number(value),
                      )
                    }
                  />
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
                <FormField label="تكلفة الوحدة الأساسية (SYP)">
                  <Input readOnly value={`${money(item.cost_price)} SYP`} />
                  {(() => {
                    const selectedBatch = item.availableBatches.find((batch) => batch.id === item.stock_batch_id);
                    if (!selectedBatch || !selectedBatch.purchase_currency || selectedBatch.purchase_currency === "SYP") return null;
                    return (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        سعر الشراء الأصلي: {money(Number(selectedBatch.purchase_price ?? 0))} {selectedBatch.purchase_currency}
                        {Number(selectedBatch.purchase_exchange_rate ?? 0) > 0
                          ? ` — سعر الصرف: ${money(Number(selectedBatch.purchase_exchange_rate))}`
                          : ""}
                      </p>
                    );
                  })()}
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
        {!isEdit ? <FormSection title="الدفع الأولي" description="يمكن تسجيل دفعة مع إنشاء الفاتورة." icon={<Calculator size={18} />}>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="المبلغ المدفوع">
              <Input type="number" min="0" max={total} value={paymentAmount} onChange={(e) => setPaymentAmount(Number(e.target.value))} />
            </FormField>
            <FormField label="الصندوق">
              <Select value={String(paymentCashboxId)} options={[{ value: "0", label: "اختر الصندوق" }, ...activeCashboxes.map((c) => ({ value: String(c.id), label: `${c.name} — ${Number(c.balance ?? 0).toLocaleString("en-US")} ${c.currency}` }))]} onChange={(e) => setPaymentCashboxId(Number(e.target.value))} />
            </FormField>
            {paymentCashboxId > 0 && activeCashboxes.find((c) => c.id === paymentCashboxId)?.currency !== currency && (
              <FormField label="سعر صرف الدفعة" required>
                <Input type="number" min="0" step="any" value={paymentExchangeRate} onChange={(e) => setPaymentExchangeRate(e.target.value)} placeholder={`سعر صرف ${activeCashboxes.find((c) => c.id === paymentCashboxId)?.currency} مقابل ${currency}`} />
              </FormField>
            )}
            <FormField label="تاريخ الدفع">
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </FormField>
          </div>
        </FormSection> : <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4 text-sm text-[var(--text-secondary)]">الدفعات السابقة تبقى كما هي ولا يتم تعديلها من نموذج الفاتورة.</div>}

        <Card header="ملخص الفاتورة" className="h-fit">
          <div className="space-y-3 text-sm">
            {[["المجموع الفرعي", subtotal], ["الخصم", -discount], ["المدفوع", effectivePaidAmount], ["المتبقي", remaining]].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between">
                <span className="text-[var(--text-muted)]">{label}</span>
                <strong>{money(Number(value))}</strong>
              </div>
            ))}
            <div className="border-t border-[var(--border)] pt-3">
              <div className="flex justify-between text-base">
                <strong>الإجمالي النهائي</strong>
                <strong className="text-[var(--primary)]">{money(total)} {currency}</strong>
              </div>
              {currency !== "SYP" && (
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">القيمة بالعملة الأساسية</span>
                  <strong>{money(totalBase)} SYP</strong>
                </div>
              )}
              {currency !== "SYP" && (
                <p className="mt-2 text-xs text-[var(--text-muted)]">1 {currency} = {money(exchangeRate)} SYP</p>
              )}
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

    {/* ── Quick Customer Dialog ─────────────────────────────────────── */}
    <Dialog
      open={quickCustomerOpen}
      title="إضافة عميل جديد"
      onClose={() => !quickCustomerSaving && setQuickCustomerOpen(false)}
      footer={
        <>
          <Button
            variant="secondary"
            disabled={quickCustomerSaving}
            onClick={() => setQuickCustomerOpen(false)}
          >
            إلغاء
          </Button>
          <Button
            isLoading={quickCustomerSaving}
            loadingText="جاري الإضافة..."
            startIcon={<Save size={16} />}
            onClick={() => void createQuickCustomer()}
          >
            إضافة واختيار العميل
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <FormField label="اسم العميل" required>
          <Input
            autoFocus
            value={quickCustomer.name}
            placeholder="اسم العميل..."
            onChange={(e) =>
              setQuickCustomer((c) => ({ ...c, name: e.target.value }))
            }
          />
        </FormField>
        <FormField label="رقم الهاتف">
          <Input
            dir="ltr"
            value={quickCustomer.phone}
            placeholder="اختياري"
            onChange={(e) =>
              setQuickCustomer((c) => ({ ...c, phone: e.target.value }))
            }
          />
        </FormField>
        <FormField label="ملاحظات">
          <Input
            value={quickCustomer.notes}
            placeholder="اختياري"
            onChange={(e) =>
              setQuickCustomer((c) => ({ ...c, notes: e.target.value }))
            }
          />
        </FormField>
        {quickCustomerError && (
          <p className="rounded-[var(--radius-sm)] bg-[var(--danger-subtle)] px-3 py-2 text-sm font-bold text-[var(--danger)]">
            {quickCustomerError}
          </p>
        )}
      </div>
    </Dialog>

    <div className="fixed bottom-0 left-0 right-[260px] z-20 border-t border-[var(--border)] bg-[var(--surface)]/95 px-6 py-3 backdrop-blur">
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={() => navigate(PATHS.SALES)}>إلغاء</Button>
        <Button startIcon={<Save size={17} />} disabled={loading} onClick={submit}>
          {loading ? "جاري الحفظ..." : "حفظ الفاتورة"}
        </Button>
      </div>
    </div>
  <InvoiceEditPasswordDialog open={passwordOpen} loading={loading} error={error} onClose={() => setPasswordOpen(false)} onConfirm={async (password) => { if (!pendingInput) return; setLoading(true); setError(""); try { const result = await salesService.update(editingId, pendingInput, password); clearInvoiceDraft(draftKey); setPasswordOpen(false); navigate(`/sales/${result.invoice.id}`); } catch (err: unknown) { setError(getInvoiceEditErrorMessage(err)); } finally { setLoading(false); } }} />
    </>;
}
